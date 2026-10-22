import React,{useEffect,useState} from 'react';
import {Capacitor} from '@capacitor/core';
import {LiveUpdate} from '@capawesome/capacitor-live-update';
import {validPatch} from './patch-policy.mjs';
const manifest='https://raw.githubusercontent.com/sunantongsan/social-casino-hub/patches/latest.json';
export default function PatchGate({children}){
 const [done,setDone]=useState(false),[text,setText]=useState('กำลังตรวจสอบอัปเดต…'),[progress,setProgress]=useState(0);
 useEffect(()=>{let active=true,listener;async function boot(){
  if(!Capacitor.isNativePlatform()){setDone(true);return;}
  try{
   // The React tree and native bridge loaded successfully; stop the rollback timer.
   await LiveUpdate.ready();
   const response=await fetch(manifest+'?t='+Date.now(),{cache:'no-store',signal:AbortSignal.timeout(8000)});
   if(!response.ok)throw Error('NO_PATCH');const m=await response.json();
   const v=await LiveUpdate.getVersionCode();const code=Number(v.versionCode);
   if(!validPatch(m,code))throw Error('INCOMPATIBLE_PATCH');
   const current=await LiveUpdate.getCurrentBundle();
   const blocked=await LiveUpdate.getBlockedBundles();
   if(current.bundleId===m.id||blocked.bundleIds?.includes(m.id))return;
   if(m.sequence<Number(localStorage.getItem('hub-patch-sequence')||0))return;
   if(active)setText('กำลังดาวน์โหลดแพตช์เกม…');
   listener=await LiveUpdate.addListener('downloadBundleProgress',e=>{if(active)setProgress(Math.round(e.progress*100));});
   await LiveUpdate.downloadBundle({bundleId:m.id,url:m.url,checksum:m.sha256,artifactType:'zip'});
   await LiveUpdate.setNextBundle({bundleId:m.id});
   localStorage.setItem('hub-patch-sequence',String(m.sequence));
   if(active)setText('อัปเดตสำเร็จ กำลังเข้าเกม…');await LiveUpdate.reload();
  }catch{ /* Network or integrity failure: keep the last working bundled game. */ }
  finally{await listener?.remove();if(active)setDone(true);}
 }boot();return()=>{active=false;listener?.remove();};},[]);
 return <>{!done&&<main className="max-w-md mx-auto p-10"><h1>Social Casino Hub</h1><p role="status">{text}</p><progress max="100" value={progress} style={{width:'100%'}}/><p>{progress}%</p></main>}<div hidden={!done}>{children}</div></>;
}
