import { ApiError, assert, identifier, active, boundedText } from './errors.js';
import { SERVER_TIME } from './firestore.js';
import { parseMediaReference } from './storage.js';
import { validSchedule, permittedVisitTransition, roomId, slotId, matchesSearch } from './domain.js';
import { imageUrls, coordinatesOrNull, normalizeVisit, timestampMillis } from './contracts.js';
const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');
const photo=profile=>profile?.avatarImage||profile?.avatar||profile?.photoURL||'';
function conversation(visit){return{schemaVersion:2,participants:[visit.tenantId,visit.ownerId],seekerId:visit.tenantId,ownerId:visit.ownerId,propertyId:visit.propertyId,propertyTitle:visit.propertyTitle,propertyImage:visit.propertyImage||'',seekerName:visit.tenantName||'Interesado',ownerName:visit.ownerName||'Propietario',seekerEmail:visit.tenantEmail||'',ownerEmail:visit.ownerEmail||'',seekerPhoto:visit.tenantPhoto||'',ownerPhoto:visit.ownerPhoto||'',seekerPhone:visit.tenantPhone||'',ownerPhone:visit.ownerPhone||'',createdAt:SERVER_TIME,readAt:{},lastMessage:'',lastMessageTimestamp:SERVER_TIME};}
const propertyFields=['title','description','price','deposit','currency','type','status','images','thumbnail','thumbnails','coordinates','location','address','department','municipality','zone','approximateAddress','exactAddress','bedrooms','bathrooms','area','parking','features','maintenanceFee','furnished','petsAllowed','patio','servicesIncluded','amenities','rules','requirements','isNew'];

export class RuwaService {
  /** @param {{db:any,files:any,push?:(token:string,notice:any)=>Promise<any>,now?:()=>Date}} options */
  constructor({db,files,push=async(_token,_notice)=>undefined,now=()=>new Date()}){this.db=db;this.files=files;this.push=push;this.now=now;}
  async account(identity){
      const profile=await this.db.get('users/'+identifier(identity.uid));
      assert(profile.exists,412,'failed-precondition','Primero completa tu perfil de RuwaJay.');
      assert(active(profile.data),403,'permission-denied','Cuenta suspendida.');
      return{...profile.data,uid:identity.uid,email:identity.email,claimAdmin:identity.claims?.role==='admin',isAdmin:profile.data.role==='admin'||identity.claims?.role==='admin'};
  }
  job(tx,id,type,payload){tx.set('server_jobs/'+id,{type,payload,dueAt:this.now(),attempts:0},{create:true});}
  notices(tx,eventId,uids,title,body,path,extra={}){for(const uid of new Set(uids.filter(Boolean)))this.job(tx,'notice_'+eventId+'_'+uid,'notice',{uid,eventId,title,body:String(body||'').slice(0,160),path,senderName:title,type:'message',...extra});}
  async mutate(user,action,data,operation){
    const requestId=identifier(data.requestId);assert(requestId.length<=128,400,'invalid-argument','Solicitud inválida.');
    const key=await hash(user.uid+':'+requestId),digest=await hash(JSON.stringify({action,data}));
    return this.db.transaction(async tx=>{
      const prior=await tx.get('server_requests/'+key);
      if(prior.exists){assert(prior.data.digest===digest,409,'already-exists','La solicitud ya se utilizó para otra operación.');return prior.data.result;}
      const fresh=await tx.get('users/'+user.uid);assert(fresh.exists&&active(fresh.data),403,'permission-denied','Cuenta suspendida.');
      const current={...user,...fresh.data,uid:user.uid,email:user.email,isAdmin:fresh.data.role==='admin'||user.claimAdmin};
      const result=await operation(tx,current);
      tx.create('server_requests/'+key,{digest,result,createdAt:SERVER_TIME,expiresAt:new Date(this.now().getTime()+7*86400000)});
      return result;
    });
  }
  async call(identity,action,data){
    const user=await this.account(identity);
    if(action==='resolveMedia')return this.resolveMedia(user,data.reference);
    assert(['createVisit','changeVisitStatus','openConversation','sendMessage','saveProperty','updatePropertyStatus','updateProfile','notifyCall'].includes(action),404,'not-found','Operación desconocida.');
    return this.mutate(user,action,data,async(tx,actor)=>{
      if(action==='createVisit')return this.createVisit(tx,actor,data);
      if(action==='changeVisitStatus')return this.changeVisitStatus(tx,actor,data);
      if(action==='openConversation')return this.openConversation(tx,actor,data);
      if(action==='sendMessage')return this.sendMessage(tx,actor,data);
      if(action==='saveProperty')return this.saveProperty(tx,actor,data);
      if(action==='updatePropertyStatus')return this.updatePropertyStatus(tx,actor,data);
      if(action==='notifyCall')return this.notifyCall(tx,actor,data);
      return this.updateProfile(tx,actor,data);
    });
  }
  async createVisit(tx,user,data){
    const propertyId=identifier(data.propertyId),date=boundedText(data.date||data.visitDate,10),time=boundedText(data.time||data.visitTime,5);
    assert(validSchedule(date,time,this.now()),400,'invalid-argument','Selecciona una fecha y hora futuras válidas.');
    const property=await tx.get('properties/'+propertyId);
    assert(property.exists,404,'not-found','Vivienda inexistente.');
    assert(property.data.status==='disponible'&&property.data.ownerId!==user.uid,412,'failed-precondition','La vivienda no admite esta solicitud.');
    const owner=await tx.get('users/'+identifier(property.data.ownerId));assert(owner.exists&&active(owner.data),412,'failed-precondition','El propietario necesita una cuenta activa.');
    const slot=slotId(propertyId,date,time),reserved=await tx.get('visit_slots/'+slot);
    assert(!reserved.exists,409,'already-exists','Este horario ya está reservado.');
    const oldVisits=await tx.query('visits',[['propertyId','EQUAL',propertyId]]);
    assert(!oldVisits.some(v=>{const visit=normalizeVisit(v.data);return visit.date===date&&visit.time===time&&['pendiente','confirmada','aceptada'].includes(visit.status);}),409,'already-exists','Existe una reserva histórica en este horario.');
    const id=crypto.randomUUID(),house=property.data;
    const visit={schemaVersion:2,id,propertyId,propertyTitle:house.title||'Vivienda',propertyImage:house.thumbnail||imageUrls(house.images)[0]||'',propertyPrice:house.price,propertyZone:house.location?.approximateAddress||house.address?.approximate||'',propertyAddress:house.location?.approximateAddress||house.address?.approximate||'',ownerId:house.ownerId,ownerName:owner.data.name||'Propietario',ownerEmail:owner.data.email||'',ownerPhone:owner.data.phone||'',ownerPhoto:photo(owner.data),tenantId:user.uid,tenantName:user.name||'Interesado',tenantEmail:user.email,tenantPhone:user.phone||'',tenantPhoto:photo(user),date,time,notes:boundedText(data.notes),status:'pendiente',slotId:slot,createdAt:SERVER_TIME,createdAtIso:this.now().toISOString()};
    tx.create('visits/'+id,visit);tx.create('visit_slots/'+slot,{visitId:id,propertyId,date,time});
    this.notices(tx,'visit_'+id,[visit.ownerId],'Nueva solicitud de visita',visit.propertyTitle,'/perfil?tab=visitas');return{id};
  }
  async changeVisitStatus(tx,user,data){
    const id=identifier(data.visitId),snapshot=await tx.get('visits/'+id);assert(snapshot.exists,404,'not-found','Visita inexistente.');
    const visit=snapshot.data,status=data.status;assert(permittedVisitTransition(visit,user.uid,status),403,'permission-denied','Cambio de estado no permitido.');
    let conversationId=null;
    if(status==='confirmada'){
      const property=await tx.get('properties/'+identifier(visit.propertyId));
      assert(property.exists&&property.data.ownerId===user.uid&&visit.schemaVersion===2&&visit.tenantId!==visit.ownerId,412,'failed-precondition','La visita necesita identidades y datos verificados.');
      conversationId=roomId(visit.tenantId,visit.ownerId,visit.propertyId);
      if(!(await tx.get('conversations/'+conversationId)).exists)tx.create('conversations/'+conversationId,conversation(visit));
    }
    const canonicalSlot=slotId(visit.propertyId,normalizeVisit(visit).date,normalizeVisit(visit).time);
    if(['cancelada','rechazada'].includes(status)){const slot=await tx.get('visit_slots/'+canonicalSlot);if(slot.data?.visitId===id)tx.delete(slot.path);}
    tx.update(snapshot.path,{status,updatedAt:SERVER_TIME,...(conversationId?{conversationId,confirmedBy:user.uid}:{})});
    this.notices(tx,'visit_'+id+'_'+status,[visit.ownerId,visit.tenantId],'Visita '+status,visit.propertyTitle||'Vivienda','/perfil?tab=visitas');return{conversationId};
  }
  async openConversation(tx,user,data){
    const propertyId=identifier(data.propertyId),ownerId=identifier(data.ownerId),seekerId=identifier(data.seekerId||user.uid);
    assert(seekerId!==ownerId&&[seekerId,ownerId].includes(user.uid),403,'permission-denied','Participantes inválidos.');
    const property=await tx.get('properties/'+propertyId);assert(property.exists&&property.data.ownerId===ownerId,412,'failed-precondition','El propietario no coincide con la vivienda.');
    const visits=await tx.query('visits',[['propertyId','EQUAL',propertyId]]);
    const visit=visits.find(v=>v.data.ownerId===ownerId&&v.data.tenantId===seekerId&&['confirmada','aceptada'].includes(v.data.status)&&v.data.schemaVersion===2&&v.data.confirmedBy===ownerId);
    assert(visit,412,'failed-precondition','Primero debes tener una visita confirmada y verificada.');
    const rooms=await tx.query('conversations',[['propertyId','EQUAL',propertyId]]);
    const existing=rooms.find(r=>!r.data.migratedTo&&!r.data.archived&&r.data.participants?.length===2&&r.data.participants.includes(seekerId)&&r.data.participants.includes(ownerId));
    if(existing)return{id:existing.id};
    const id=roomId(seekerId,ownerId,propertyId);tx.create('conversations/'+id,conversation(visit.data));return{id};
  }
  async sendMessage(tx,user,data){
    const id=identifier(data.roomId),room=await tx.get('conversations/'+id);
    assert(room.exists&&!room.data.archived&&!room.data.migratedTo&&room.data.participants?.length===2&&room.data.participants.includes(user.uid),403,'permission-denied','No perteneces a esta conversación.');
    const type=data.type||'text';assert(['text','image','audio','video','location'].includes(type),400,'invalid-argument','Tipo de mensaje inválido.');
    let text=boundedText(data.text);assert(type!=='text'||text,400,'invalid-argument','Escribe un mensaje.');
    const messageId=crypto.randomUUID(),payload={type,text:text||(type==='audio'?'Audio':type==='video'?'Video':type==='image'?'Foto':'Ubicación'),senderId:user.uid,senderName:user.name||'Usuario',createdAt:SERVER_TIME,status:'sent'};
    if (type === 'location') {
      assert(Number.isFinite(data.latitude) && Math.abs(data.latitude) <= 90 && Number.isFinite(data.longitude) && Math.abs(data.longitude) <= 180,400,'invalid-argument','Ubicación inválida.');
      payload.latitude=data.latitude;payload.longitude=data.longitude;
    }
    if (data.replyTo != null) {
      const replyId=identifier(data.replyTo.id);
      const original=await tx.get('conversations/'+id+'/messages/'+replyId);
      assert(original.exists && !original.data.isDeleted,400,'invalid-argument','El mensaje citado ya no está disponible.');
      payload.replyTo={id:replyId,text:String(original.data.text||'').slice(0,4000),senderName:original.data.senderName||'Usuario',senderId:original.data.senderId};
    }
    if(['image','audio','video'].includes(type)){
      if(typeof data.mediaUrl==='string'&&data.mediaUrl.startsWith('https://')){
        payload.mediaUrl=data.mediaUrl;
      } else {
        const media=parseMediaReference(data.mediaUrl);
        assert(media.bucket==='chat-media'&&media.parts.length===4&&media.parts[0]==='chat'&&media.parts[1]===id&&media.parts[2]===user.uid,403,'permission-denied','El archivo no corresponde a esta conversación.');
        payload.mediaUrl=data.mediaUrl;
      }
    }
    const recipientUids = (room.data.participants || []).filter(uid => uid !== user.uid);
    const convUpdates = {
      lastMessage: payload.text,
      lastMessageTimestamp: SERVER_TIME,
      lastSenderId: user.uid,
      lastSenderName: user.name || 'Usuario',
      lastMessageId: messageId,
      [`unreadCount.${user.uid}`]: 0
    };
    for (const rId of recipientUids) {
      const current = typeof room.data?.unreadCount === 'object' && room.data?.unreadCount !== null ? (Number(room.data.unreadCount[rId]) || 0) : 0;
      convUpdates[`unreadCount.${rId}`] = current + 1;
    }
    tx.create('conversations/'+id+'/messages/'+messageId,payload);
    tx.update(room.path, convUpdates);
    this.notices(tx,'message_'+messageId,recipientUids,user.name||'Nuevo mensaje',payload.text.slice(0,160),'/chat?conversation='+encodeURIComponent(id));
    return{id:messageId};
  }
  async saveProperty(tx,user,data){
    const input=data.property;assert(input&&typeof input==='object'&&!Array.isArray(input),400,'invalid-argument','Vivienda inválida.');
    const id=identifier(input.id),existing=await tx.get('properties/'+id);
    assert(!existing.exists||existing.data.ownerId===user.uid||user.isAdmin,403,'permission-denied','No puedes editar esta vivienda.');
    assert(existing.exists||user.isAdmin||(user.verified===true&&user.verificationStatus==='aprobada'),403,'permission-denied','Completa la verificación de casero antes de publicar.');
    const images=imageUrls(input.images);assert(images.length>0&&images.length<=8,400,'invalid-argument','Sube entre una y ocho fotografías.');
    const coordinates=coordinatesOrNull(input.coordinates||input.location?.mapCoordinates);assert(coordinates,400,'invalid-argument','Selecciona la ubicación real de la vivienda.');
    const title=boundedText(input.title,200);assert(title&&typeof input.price==='number'&&Number.isFinite(input.price)&&input.price>0&&input.price<=1e9,400,'invalid-argument','Título o precio inválidos.');
    const ownerId=existing.data?.ownerId||user.uid,owner=ownerId===user.uid?user:(await tx.get('users/'+identifier(ownerId))).data;
    assert(input.ownerId===undefined||input.ownerId===ownerId,409,'failed-precondition','El propietario de la solicitud no coincide con la cuenta o vivienda.');
    const patch=Object.fromEntries(propertyFields.filter(key=>input[key]!==undefined).map(key=>[key,input[key]]));
    const result={...(existing.data||{}),...patch,title,images,coordinates,location:{...(input.location||existing.data?.location||{}),mapCoordinates:coordinates},ownerId,ownerName:owner?.name||'Propietario',ownerPhone:owner?.phone||'',ownerEmail:owner?.email||'',ownerPhoto:photo(owner),verified:existing.data?.verified===true,schemaVersion:2,thumbnail:images.includes(input.thumbnail)?input.thumbnail:images[0],updatedAt:SERVER_TIME,...(!existing.exists?{createdAt:SERVER_TIME}:{})};
    tx.set('properties/'+id,result,{create:!existing.exists});this.job(tx,'property_'+data.requestId+'_'+user.uid,'property',{propertyId:id,created:!existing.exists,beforePrice:existing.data?.price??null,eventId:await hash(data.requestId+user.uid)});return{id};
  }
  async updatePropertyStatus(tx,user,data){
    const id=identifier(data.propertyId),property=await tx.get('properties/'+id);assert(property.exists&&(property.data.ownerId===user.uid||user.isAdmin),403,'permission-denied','No puedes cambiar esta vivienda.');
    assert(['disponible','ocupada','reservada','pausada','alquilada'].includes(data.status),400,'invalid-argument','Estado inválido.');tx.update(property.path,{status:data.status,updatedAt:SERVER_TIME});return{id};
  }
  async updateProfile(tx,user,data){
    const input=data.profile;assert(input&&typeof input==='object',400,'invalid-argument','Perfil inválido.');
    const allowed=['name','phone','bio','avatarId','avatarImage','role'];assert(Object.keys(input).every(key=>allowed.includes(key)),400,'invalid-argument','Campo de perfil no permitido.');
    const patch={...input};if('name'in patch){patch.name=boundedText(patch.name,120);assert(patch.name,400,'invalid-argument','Escribe tu nombre.');}
    if('phone'in patch){assert(patch.phone===null||typeof patch.phone==='string',400,'invalid-argument','Teléfono inválido.');if(patch.phone!==null)patch.phone=boundedText(patch.phone,40);}
    if('bio'in patch)patch.bio=boundedText(patch.bio,2000);
    if('avatarImage'in patch)assert(typeof patch.avatarImage==='string'&&/^https:\/\//.test(patch.avatarImage),400,'invalid-argument','Foto de perfil inválida.');
    if('avatarId'in patch)assert(typeof patch.avatarId==='string'&&patch.avatarId.length<=120,400,'invalid-argument','Avatar inválido.');
    if('role'in patch)assert(['owner','seeker'].includes(patch.role)&&['owner','seeker'].includes(user.role),403,'permission-denied','No puedes elevar ni cambiar ese rol.');
    tx.update('users/'+user.uid,patch);this.job(tx,'profile_'+data.requestId+'_'+user.uid,'profile',{uid:user.uid});return{uid:user.uid};
  }
  async notifyCall(tx,user,data){
    const receiverId=identifier(data.receiverId);assert(receiverId&&receiverId!==user.uid,400,'invalid-argument','Destinatario inválido.');
    const callerName=user.name||data.callerName||'Usuario',propertyTitle=boundedText(data.propertyTitle||'Propiedad RuwaJay',120);
    const callId=identifier(data.callId||('call_'+Date.now())),roomId=data.roomId?identifier(data.roomId):'';
    const call=await tx.get('active_calls/'+callId);
    const room=roomId ? await tx.get('conversations/'+roomId) : null;
    assert(call.exists && call.data.callerId===user.uid && call.data.receiverId===receiverId && call.data.status==='calling'
      && room?.exists && room.data.participants?.includes(user.uid) && room.data.participants?.includes(receiverId)
      && call.data.roomId===roomId,403,'permission-denied','La llamada no corresponde a una conversación activa.');
    const eventId='call_'+callId;
    this.job(tx,'notice_'+eventId+'_'+receiverId,'notice',{
      uid:receiverId,
      eventId,
      type:'call',
      callId,
      callerId:user.uid,
      callerName,
      propertyTitle,
      roomId,
      title:'📞 Llamada entrante de '+callerName,
      body:'Te está llamando sobre: '+propertyTitle,
      path:'/chat?conversation='+encodeURIComponent(roomId)+'&callId='+encodeURIComponent(callId)+'&action=answer'
    });
    return{id:callId,ok:true};
  }
  async authorizeFile(user,bucket,parts,upload){
      if(bucket==='chat-media'){
        assert(parts.length===4&&parts[0]==='chat',400,'invalid-argument','Ruta de chat inválida.');
        const room=await this.db.get('conversations/'+identifier(parts[1]));
        assert(room.exists&&!room.data.archived&&!room.data.migratedTo&&room.data.participants?.length===2&&room.data.participants.includes(user.uid)&&(!upload||parts[2]===user.uid),403,'permission-denied','No tienes acceso a este archivo de chat.');
      } else if(bucket==='verification')assert(parts.length===3&&parts[0]==='verification'&&(parts[1]===user.uid||(!upload&&user.isAdmin)),403,'permission-denied','Documento privado.');
      else if(bucket==='profile-images')assert(upload&&parts.length===3&&parts[0]==='profiles'&&parts[1]===user.uid,403,'permission-denied','Foto de perfil ajena.');
      else if(bucket==='property-images'){
        assert(upload&&parts.length===4&&parts[0]==='properties'&&parts[2]===user.uid,403,'permission-denied','Fotografía ajena.');
        const property=await this.db.get('properties/'+identifier(parts[1]));
        assert(!property.exists||property.data.ownerId===user.uid||user.isAdmin,403,'permission-denied','No puedes subir fotos a esa vivienda.');
      } else throw new ApiError(400,'invalid-argument','Bucket desconocido.');
  }
  async upload(identity,{kind,roomId,propertyId,mime,bytes}){
    const user=await this.account(identity);const definitions={property:['property-images',['properties',propertyId,user.uid]],profile:['profile-images',['profiles',user.uid]],verification:['verification',['verification',user.uid]],chat:['chat-media',['chat',roomId,user.uid]]};
    assert(Object.hasOwn(definitions,kind),400,'invalid-argument','Tipo de archivo inválido.');
    const [bucket,prefix]=definitions[kind];prefix.forEach(identifier);const path=[...prefix,crypto.randomUUID()].join('/');
    mime=String(mime||'').split(';')[0].trim().toLowerCase();
    assert(bytes.byteLength>0&&bytes.byteLength<=(kind==='chat'?20:8)*1024*1024,400,'invalid-argument','Archivo vacío o demasiado grande.');
    assert(kind==='chat'?/^(image\/(jpeg|png|webp)|audio\/[a-zA-Z0-9.+-]+|video\/(webm|mp4|quicktime))$/.test(mime):/^image\/(jpeg|png|webp)$/.test(mime),400,'invalid-argument','Formato de archivo no permitido.');
    await this.authorizeFile(user,bucket,path.split('/'),true);return{url:await this.files.upload(bucket,path,bytes,mime)};
  }
  async resolveMedia(user,reference){const media=parseMediaReference(reference);await this.authorizeFile(user,media.bucket,media.parts,false);return this.files.signedUrl(media.bucket,media.path);}
  async runNotice(payload){
    const user=await this.db.get('users/'+identifier(payload.uid));if(!user.exists||!active(user.data))return;
    const ref='users/'+payload.uid+'/notifications/'+identifier(payload.eventId);
    if(!(await this.db.get(ref)).exists)await this.db.set(ref,{title:payload.title,body:payload.body,path:payload.path,type:payload.type||'message',createdAt:SERVER_TIME,readAt:null},{create:true}).catch(error=>{if(error.code!=='ALREADY_EXISTS')throw error;});
    const devices=await this.db.queryAll('users/'+payload.uid+'/devices');
    for(const device of devices){if(typeof device.data.token!=='string')continue;const status=await this.push(device.data.token,payload);if(status==='invalid')await this.db.remove(device.path);}
  }
  async runProperty(payload){
    const snapshot=await this.db.get('properties/'+identifier(payload.propertyId));if(!snapshot.exists)return;const property=snapshot.data;
    if(payload.created&&property.status==='disponible'){
      const searches=await this.db.queryAll('saved_searches',[['notifyPush','EQUAL',true]],{group:true});
      const recipients=new Set(searches.filter(s=>matchesSearch(property,s.data)).map(s=>s.path.split('/')[1]));
      for(const uid of recipients)await this.runNotice({uid,eventId:'property_'+payload.propertyId,title:'Nueva vivienda para tu búsqueda',body:property.title,path:'/propiedad/'+encodeURIComponent(payload.propertyId)});
    }
    if(payload.beforePrice!==null&&property.price<payload.beforePrice){
      const favorites=await this.db.queryAll('favorites',[['propertyId','EQUAL',payload.propertyId]],{group:true});
      for(const favorite of favorites)await this.runNotice({uid:favorite.path.split('/')[1],eventId:'price_'+payload.eventId,title:'Bajó el precio de una vivienda favorita',body:property.title,path:'/propiedad/'+encodeURIComponent(payload.propertyId)});
    }
  }
  async runProfile({uid}){
    const user=await this.db.get('users/'+identifier(uid));if(!user.exists)return;const profile=user.data;
    const [properties,rooms,ownedVisits,tenantVisits]=await Promise.all([this.db.queryAll('properties',[['ownerId','EQUAL',uid]]),this.db.queryAll('conversations',[['participants','ARRAY_CONTAINS',uid]]),this.db.queryAll('visits',[['ownerId','EQUAL',uid]]),this.db.queryAll('visits',[['tenantId','EQUAL',uid]])]);
    const updates=[];
    for(const property of properties)updates.push(this.db.write(property.path,{ownerName:profile.name||'Propietario',ownerPhone:profile.phone||'',ownerPhoto:photo(profile)},{update:true}));
    for(const room of rooms){const prefix=room.data.ownerId===uid?'owner':'seeker';updates.push(this.db.write(room.path,{[prefix+'Name']:profile.name||'Usuario',[prefix+'Phone']:profile.phone||'',[prefix+'Photo']:photo(profile)},{update:true}));}
    for(const [visits,prefix]of[[ownedVisits,'owner'],[tenantVisits,'tenant']])for(const visit of visits)updates.push(this.db.write(visit.path,{[prefix+'Name']:profile.name||'Usuario',[prefix+'Phone']:profile.phone||'',[prefix+'Photo']:photo(profile)},{update:true}));
    for(let i=0;i<updates.length;i+=200)await this.db.commit(updates.slice(i,i+200));
  }
  async drainJobs(max=5){
    const deadline=Date.now()+100000;
    const jobs=await this.db.query('server_jobs',[['dueAt','LESS_THAN_OR_EQUAL',this.now()]],{limit:max,orderBy:['dueAt']});let completed=0;
    for(const job of jobs){if(Date.now()>deadline)break;const claim=crypto.randomUUID();
      const leased=await this.db.transaction(async tx=>{const fresh=await tx.get(job.path);if(!fresh.exists||timestampMillis(fresh.data.dueAt)>this.now().getTime())return false;tx.update(job.path,{dueAt:new Date(this.now().getTime()+180000),claim});return fresh.data;});if(!leased)continue;
      try{if(leased.type==='notice')await this.runNotice(leased.payload);else if(leased.type==='property')await this.runProperty(leased.payload);else if(leased.type==='profile')await this.runProfile(leased.payload);else throw new Error('Unknown server job');
        await this.db.transaction(async tx=>{const fresh=await tx.get(job.path);if(fresh.data?.claim===claim)tx.delete(job.path);});completed++;
      }catch{await this.db.transaction(async tx=>{const fresh=await tx.get(job.path);if(fresh.data?.claim===claim)tx.update(job.path,{dueAt:new Date(this.now().getTime()+Math.min(3600000,60000*2**Math.min(6,Number(leased.attempts||0)))),attempts:Number(leased.attempts||0)+1});});}
    }
    return{completed};
  }
  async scheduled(){
    // Visit scans run hourly, in bounded pages, to preserve Spark read quotas.
    const state=await this.db.transaction(async tx=>{const ref='server_state/maintenance',current=await tx.get(ref);if(timestampMillis(current.data?.nextScan)>this.now().getTime())return null;tx.set(ref,{nextScan:new Date(this.now().getTime()+3600000)},{merge:true});return current.data||{};});
    if(state){
      const pending=await this.db.query('visits',[['status','EQUAL','pendiente']],{limit:100,orderBy:['__name__'],startAfter:state.cursor||null});
      for(const snapshot of pending){const created=timestampMillis(snapshot.data.createdAt||snapshot.data.createdAtIso);if(snapshot.data.schemaVersion!==2||!created||created>=this.now().getTime()-7*86400000)continue;
        await this.db.transaction(async tx=>{const fresh=await tx.get(snapshot.path);if(fresh.data?.status!=='pendiente')return;const visit=normalizeVisit(fresh.data),slot=await tx.get('visit_slots/'+slotId(visit.propertyId,visit.date,visit.time));
          tx.update(snapshot.path,{status:'vencida',updatedAt:SERVER_TIME});if(slot.data?.visitId===snapshot.id)tx.delete(slot.path);
          this.notices(tx,'visit_'+snapshot.id+'_vencida',[visit.ownerId,visit.tenantId],'Visita vencida',visit.propertyTitle||'Vivienda','/perfil?tab=visitas');});
      }
      await this.db.set('server_state/maintenance',{cursor:pending.length===100?pending.at(-1).path:null},{merge:true});
      const expired=await this.db.query('server_requests',[['expiresAt','LESS_THAN',this.now()]],{limit:100});for(const request of expired)await this.db.remove(request.path);
    }
    return this.drainJobs(10);
  }
}
