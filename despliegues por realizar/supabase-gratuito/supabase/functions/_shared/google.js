import { ApiError, assert } from './errors.js';
const encoder=new TextEncoder();
const base64=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes)));
const base64url=bytes=>base64(bytes).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
const unbase64=value=>Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
const jsonPart=value=>base64url(encoder.encode(JSON.stringify(value)));

export function googleTokenProvider(serviceAccount, fetcher=fetch) {
  assert(serviceAccount?.project_id==='ruwa-jay' && typeof serviceAccount.private_key==='string' && serviceAccount.client_email?.endsWith('.iam.gserviceaccount.com'),500,'configuration','Configura una cuenta de servicio exclusiva de ruwa-jay.');
  let cached, pending, signingKey;
  const refresh=async()=>{
    const now=Math.floor(Date.now()/1000);
    signingKey ||= await crypto.subtle.importKey('pkcs8',unbase64(serviceAccount.private_key.replace(/-----[^-]+-----|\s/g,'')),{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);
    const input=jsonPart({alg:'RS256',typ:'JWT'})+'.'+jsonPart({iss:serviceAccount.client_email,scope:'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/firebase.messaging',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600});
    const signature=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',signingKey,encoder.encode(input));
    const response=await fetcher('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},signal:AbortSignal.timeout(15000),body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:input+'.'+base64url(signature)})});
    assert(response.ok,503,'unavailable','No se pudo autorizar el servidor de Firebase.');
    const token=await response.json(); assert(typeof token.access_token==='string',503,'unavailable','Respuesta OAuth inválida.');
    cached={token:token.access_token,expires:Date.now()+Number(token.expires_in||3600)*1000};return cached.token;
  };
  return async()=>{if(cached&&cached.expires>Date.now()+60000)return cached.token;pending ||= refresh().finally(()=>{pending=null;});return pending;};
}

export function firebaseVerifier(projectId, {fetcher=fetch, emulatorHost=null}={}) {
  assert(projectId==='ruwa-jay'||projectId.startsWith('demo-'),500,'configuration','Proyecto Firebase no permitido.');
  assert(!emulatorHost||projectId.startsWith('demo-'),500,'configuration','No mezclar emuladores con producción.');
  let keys=[],expires=0,lastRefresh=0,pendingKeys;
  return async token=>{
    try {
      assert(typeof token==='string' && token.length<16000,401,'unauthenticated','Debes iniciar sesión.');
      const parts=token.split('.');assert(parts.length===3,401,'unauthenticated','Sesión inválida.');
      const header=JSON.parse(new TextDecoder().decode(unbase64(parts[0]))),claims=JSON.parse(new TextDecoder().decode(unbase64(parts[1])));
      const now=Math.floor(Date.now()/1000);
      assert(claims.aud===projectId && claims.iss==='https://securetoken.google.com/'+projectId && typeof claims.sub==='string' && claims.sub.length>0 && claims.sub.length<=128 && !claims.sub.includes('/') && Number.isFinite(claims.exp) && claims.exp>now && Number.isFinite(claims.iat) && claims.iat<=now+60 && Number.isFinite(claims.auth_time) && claims.auth_time<=now+60,401,'unauthenticated','La sesión no corresponde a RuwaJay o caducó.');
      if(emulatorHost) {
        const response=await fetcher('http://'+emulatorHost+'/identitytoolkit.googleapis.com/v1/accounts:lookup?key=demo-key',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken:token})});
        const data=await response.json();assert(response.ok&&data.users?.[0]?.localId===claims.sub,401,'unauthenticated','Sesión de emulador inválida.');
      } else {
        assert(header.alg==='RS256' && typeof header.kid==='string',401,'unauthenticated','Firma de sesión inválida.');
        if(Date.now()>expires || (!keys.some(key=>key.kid===header.kid)&&Date.now()-lastRefresh>60000)) {
          pendingKeys ||= (async()=>{
          const response=await fetcher('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com',{signal:AbortSignal.timeout(15000)});
          assert(response.ok,503,'unavailable','No se pudo verificar la sesión.');
          keys=(await response.json()).keys||[];lastRefresh=Date.now();expires=lastRefresh+3600000;
          })().finally(()=>{pendingKeys=null;});await pendingKeys;
        }
        const jwk=keys.find(key=>key.kid===header.kid);assert(jwk,401,'unauthenticated','Firma de sesión desconocida.');
        const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
        assert(await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,unbase64(parts[2]),encoder.encode(parts[0]+'.'+parts[1])),401,'unauthenticated','Firma de sesión inválida.');
      }
      return {uid:claims.sub,email:claims.email||'',claims};
    } catch(error) { if(error instanceof ApiError)throw error;throw new ApiError(401,'unauthenticated','Sesión inválida.'); }
  };
}
