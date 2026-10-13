import { ApiError, assert } from './errors.js';
export const SERVER_TIME=Object.freeze({__serverTime:true});
class StoredValue {
  constructor(value){this.value=value;}
  toMillis(){return Date.parse(this.value.timestampValue);}
  toDate(){return new Date(this.toMillis());}
}
function encode(value){
  if(value instanceof StoredValue)return value.value;
  if(value instanceof Date)return{timestampValue:value.toISOString()};
  if(value===null)return{nullValue:null};
  if(typeof value==='string')return{stringValue:value};
  if(typeof value==='boolean')return{booleanValue:value};
  if(typeof value==='number'){assert(Number.isFinite(value),400,'invalid-argument','Número inválido.');return Number.isSafeInteger(value)?{integerValue:String(value)}:{doubleValue:value};}
  if(Array.isArray(value))return{arrayValue:{values:value.map(encode)}};
  if(value&&typeof value==='object')return{mapValue:{fields:Object.fromEntries(Object.entries(value).filter(([,v])=>v!==undefined).map(([k,v])=>[k,encode(v)]))}};
  throw new ApiError(400,'invalid-argument','Valor no soportado.');
}
function decode(value){
  if('nullValue'in value)return null;if('stringValue'in value)return value.stringValue;if('booleanValue'in value)return value.booleanValue;
  if('integerValue'in value)return Number(value.integerValue);if('doubleValue'in value)return Number(value.doubleValue);
  if('arrayValue'in value)return(value.arrayValue.values||[]).map(decode);
  if('mapValue'in value)return Object.fromEntries(Object.entries(value.mapValue.fields||{}).map(([k,v])=>[k,decode(v)]));
  return new StoredValue(value);
}
const fieldName=key=>/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)?key:'`'+key.replaceAll('\\','\\\\').replaceAll('`','\\`')+'`';
function fieldsWithTransforms(data){const transforms=[];
  function visit(value,path){
    if(value===SERVER_TIME){transforms.push({fieldPath:path.map(fieldName).join('.'),setToServerValue:'REQUEST_TIME'});return undefined;}
    if(value&&typeof value==='object'&&!Array.isArray(value)&&!(value instanceof Date)&&!(value instanceof StoredValue)) {
      return{mapValue:{fields:Object.fromEntries(Object.entries(value).filter(([,v])=>v!==undefined).map(([k,v])=>[k,visit(v,[...path,k])]).filter(([,v])=>v!==undefined))}};
    }
    return encode(value);
  }
  const fields=Object.fromEntries(Object.entries(data).filter(([,v])=>v!==undefined).map(([k,v])=>[k,visit(v,[k])]).filter(([,v])=>v!==undefined));
  return{fields,transforms};
}
export class FirestoreRest {
  constructor({projectId,tokenProvider,emulatorHost=null,fetcher=fetch}){
    assert(!emulatorHost||projectId.startsWith('demo-'),500,'configuration','No mezclar emulador con datos reales.');
    this.projectId=projectId;this.tokenProvider=tokenProvider;this.fetcher=fetcher;
    this.base='projects/'+projectId+'/databases/(default)/documents';this.origin=emulatorHost?'http://'+emulatorHost:'https://firestore.googleapis.com';
  }
  name(path){assert(typeof path==='string' && !path.startsWith('/') && !path.endsWith('/') && path.split('/').every(part=>part&&part!=='.'&&part!=='..'),400,'invalid-argument','Ruta inválida.');return this.base+'/'+path;}
  async request(path,body=null,method=body?'POST':'GET'){
    const token=await this.tokenProvider();const response=await this.fetcher(this.origin+'/v1/'+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});
    const data=await response.json();if(!response.ok){const error=new ApiError(response.status===404?404:503,data.error?.status||'unavailable',response.status===404?'Documento inexistente.':'No se pudo completar la operación de datos.');throw error;}return data;
  }
  async get(path,transaction){
    try {
      let value;
      if(transaction){
        const rows=await this.request(this.base+':batchGet',{documents:[this.name(path)],transaction});
        value=rows.find(row=>row.found)?.found;
        if(!value)return{path,id:path.split('/').at(-1),exists:false,data:null};
      }else value=await this.request(this.name(path).split('/').map(encodeURIComponent).join('/'));
      return{path,id:path.split('/').at(-1),exists:true,data:Object.fromEntries(Object.entries(value.fields||{}).map(([k,v])=>[k,decode(v)])),updateTime:value.updateTime};
    }catch(error){if(error.status===404)return{path,id:path.split('/').at(-1),exists:false,data:null};throw error;}
  }
  async query(collection,filters=[],{group=false,limit=500,transaction=null,orderBy=[],startAfter=null,allowTruncated=false}={}){
    const parts=collection.split('/'),collectionId=parts.pop();const parent=parts.length?this.name(parts.join('/')):this.base;
    const where=filters.map(([field,op,value])=>({fieldFilter:{field:{fieldPath:field},op,value:encode(value)}}));
    const structuredQuery={from:[{collectionId,...(group?{allDescendants:true}:{})}],limit,...(where.length?{where:where.length===1?where[0]:{compositeFilter:{op:'AND',filters:where}}}:{}),...(orderBy.length?{orderBy:orderBy.map(field=>({field:{fieldPath:field},direction:'ASCENDING'}))}:{})};
    if(startAfter)structuredQuery.startAt={values:[{referenceValue:this.name(startAfter)}],before:false};
    const rows=await this.request(parent.split('/').map(encodeURIComponent).join('/')+':runQuery',{structuredQuery,...(transaction?{transaction}:{})});
    const documents=rows.filter(row=>row.document);
    assert(allowTruncated||limit!==500||documents.length<limit,503,'resource-exhausted','La consulta requiere paginación antes de continuar.');
    return documents.map(({document})=>{const path=document.name.slice(this.base.length+1);return{path,id:path.split('/').at(-1),exists:true,data:Object.fromEntries(Object.entries(document.fields||{}).map(([k,v])=>[k,decode(v)])),updateTime:document.updateTime};});
  }
  async queryAll(collection,filters=[],options={}){
    const result=[];let cursor=null;
    do{const page=await this.query(collection,filters,{...options,limit:200,orderBy:['__name__'],startAfter:cursor,allowTruncated:true});result.push(...page);assert(result.length<=10000,503,'resource-exhausted','Consulta demasiado grande para este proceso.');if(page.length<200)break;cursor=page.at(-1).path;}while(cursor);
    return result;
  }
  write(path,data,{create=false,merge=false,update=false,fields=null}={}){
    const value=fieldsWithTransforms(data);return{update:{name:this.name(path),fields:value.fields},...(merge||update?{updateMask:{fieldPaths:fields||Object.keys(data).filter(key=>data[key]!==undefined).map(fieldName)}}:{}),...(create?{currentDocument:{exists:false}}:update?{currentDocument:{exists:true}}:{}),...(value.transforms.length?{updateTransforms:value.transforms}:{})};
  }
  async commit(writes,transaction){if(!writes.length)return;assert(writes.length<=450,500,'resource-exhausted','Demasiadas escrituras en una operación.');return this.request(this.base+':commit',{writes,...(transaction?{transaction}:{})});}
  async set(path,data,options){return this.commit([this.write(path,data,options)]);}
  async remove(path){return this.commit([{delete:this.name(path)}]);}
  async transaction(operation){
    for(let attempt=0;attempt<5;attempt++){
      const {transaction}=await this.request(this.base+':beginTransaction',{});const writes=[];
      const tx={get:path=>this.get(path,transaction),query:(collection,filters,options)=>this.query(collection,filters,{...options,transaction}),create:(path,data)=>writes.push(this.write(path,data,{create:true})),set:(path,data,options)=>writes.push(this.write(path,data,options)),update:(path,data)=>writes.push(this.write(path,data,{update:true})),delete:path=>writes.push({delete:this.name(path)})};
      try{const result=await operation(tx);if(writes.length)await this.commit(writes,transaction);else await this.request(this.base+':rollback',{transaction});return result;}
      catch(error){await this.request(this.base+':rollback',{transaction}).catch(()=>{});if(['ABORTED','ALREADY_EXISTS'].includes(error.code)&&attempt<4){await new Promise(resolve=>setTimeout(resolve,50*(attempt+1)));continue;}throw error;}
    }
  }
}
