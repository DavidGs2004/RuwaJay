import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { resolveMediaUrl } from '../../lib/backendService';
export default function PrivateMedia({src,type='image',...props}){
  const {user}=useAuth();const uid=user?.id||null;
  const [state,setState]=useState({src:null,uid:null,url:null,error:null});
  useEffect(()=>{let active=true;let timer;
    const load=async()=>{try{const url=await resolveMediaUrl(src);if(active)setState({src,uid,url,error:null});}catch(error){if(active)setState({src,uid,url:null,error:error.message});}};
    if(src&&uid){load();if(src.startsWith('supabase://'))timer=setInterval(load,240000);}
    return()=>{active=false;clearInterval(timer);};
  },[src,uid]);
  const current=state.src===src&&state.uid===uid?state:null;
  if(current?.error)return <span className="text-xs text-red-700">Archivo no disponible</span>;
  if(!current?.url)return <span className="text-xs text-text-muted">Cargando archivo…</span>;
  return type==='audio'?<audio controls src={current.url} {...props}/>:<img src={current.url} {...props}/>;
}
