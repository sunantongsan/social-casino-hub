import {createHash,randomUUID} from 'node:crypto';
import {initial,ensureUser,tick,bet,sendGift,claimGift,verifiedReward,view,game} from './core.mjs';
const url=Deno.env.get('SUPABASE_URL')!, key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const headers={apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'};
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'content-type,apikey,authorization','Access-Control-Allow-Methods':'POST,OPTIONS','Cache-Control':'no-store','Content-Type':'application/json'};
const answer=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:cors});
async function load(){const r=await fetch(url+'/rest/v1/social_casino_internal_state?id=eq.1&select=data,version',{headers});if(!r.ok)throw Error('DB_UNAVAILABLE');return (await r.json())[0];}
function bots(s:any,now:number){
 const humans=Object.entries(s.presence||{}).filter(([,time])=>now-Number(time)<15000).map(([id])=>id);
 const ids=Array.from({length:Math.max(0,Math.min(3,4-humans.length))},(_,i)=>'bot:'+i);
 for(const id of ids){
  const delay=1500+parseInt(createHash('sha256').update(s.round.id+id).digest('hex').slice(0,6),16)%5000;
  if(s.round.phase!=='BETTING'||s.round.endsAt-now>20000-delay||s.round.bets[id])continue;
  ensureUser(s,id,true);
  if(s.wallets[id].chips>=10)bet(s,id,{requestId:randomUUID(),roundId:s.round.id,kind:['small','big','triple'][parseInt(createHash('sha256').update(id+s.round.id).digest('hex').slice(0,6),16)%3],stake:10},now);
 }
 return humans.map(id=>({id,bot:false})).concat(ids.map(id=>({id,bot:true})));
}
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{headers:cors});
 if(req.method!=='POST')return answer({error:'METHOD_NOT_ALLOWED'},405);
 try{
  if(Number(req.headers.get('content-length')||0)>4096)return answer({error:'PAYLOAD_TOO_LARGE'},413);
  const raw=await req.text();if(raw.length>4096)return answer({error:'PAYLOAD_TOO_LARGE'},413);
  const {token,type='state',payload={}}=JSON.parse(raw);
  // Own authentication: 256-bit device bearer secret; only its hash becomes user ID.
  // No arbitrary userId accepted. These internal guest accounts cannot be recovered after uninstall.
  if(typeof token!=='string'||!/^guest:[a-f0-9]{64}$/.test(token))return answer({error:'AUTH_REQUIRED'},401);
  const user=createHash('sha256').update(token).digest('hex');
  for(let attempt=0;attempt<12;attempt++){
   const row=await load();const s=row.data||initial();const now=Date.now();
   if(!s.wallets[user]&&Object.keys(s.wallets).length>=1000)return answer({error:'INTERNAL_TEST_CAPACITY'},403);
   if(Object.keys(s.receipts).length>=20000)return answer({error:'MAINTENANCE_REQUIRED'},503);
   ensureUser(s,user);s.presence??={};s.lastAction??={};s.presence[user]=now;
   for(const [id,time] of Object.entries(s.presence))if(now-Number(time)>60000)delete s.presence[id];
   tick(s,now);const players=bots(s,now);let result={};
   if(type!=='state'){
    if(now-(s.lastAction[user]||0)<300)return answer({error:'RATE_LIMIT'},429);
    if(type==='bet')result=bet(s,user,payload,now);
    else if(type==='gift')result=sendGift(s,user,payload);
    else if(type==='claim')result=claimGift(s,user,payload);
    else if(type==='game')result=game(s,user,payload,now);
    else if(type==='internalRefill'){
     if(typeof payload.requestId!=='string'||!/^[0-9a-f-]{36}$/i.test(payload.requestId))throw Error('INVALID_REQUEST_ID');
     result=verifiedReward(s,user,'internal:'+user+':'+payload.requestId,now);
    }else throw Error('UNSUPPORTED_COMMAND');
    s.lastAction[user]=now;
   }
   const saved=await fetch(url+`/rest/v1/social_casino_internal_state?id=eq.1&version=eq.${row.version}`,{method:'PATCH',headers:{...headers,Prefer:'return=representation'},body:JSON.stringify({data:s,version:row.version+1})});
   if(!saved.ok)throw Error('DB_UNAVAILABLE');
   if((await saved.json()).length)return answer({ok:true,result,state:{...view(s,user,now),players,demo:false,internal:true}});
  }
  return answer({error:'BUSY_RETRY'},503);
 }catch(e){const safe=['INVALID_BET','BETTING_CLOSED','ONE_BET_PER_ROUND','INSUFFICIENT_OR_LIMIT','INVALID_RECIPIENT','INVALID_COST','INVALID_GIFT','REWARD_NOT_ELIGIBLE','INVALID_REQUEST_ID','REQUEST_ID_REUSED','UNSUPPORTED_COMMAND','INVALID_GAME','TABLE_ACTIVE','NO_TABLE','STALE_ACTION','INVALID_ACTION'];return answer({error:safe.includes(e.message)?e.message:'SERVER_ERROR'},400);}
});
