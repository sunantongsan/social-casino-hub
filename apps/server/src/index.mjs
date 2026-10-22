import {tableCommand,tickTables,tablesView,testRefill} from '../../../packages/game-core/tables.mjs';
import {createServer} from 'node:http';
import {randomUUID} from 'node:crypto';
import {Server} from 'socket.io';
import {createStore} from './store.mjs';
import {Bot} from './bot.mjs';
import {ensureUser,bet,tick,view,sendGift,claimGift,verifiedReward} from '../../../packages/game-core/index.mjs';
const dev=process.env.DEV_AUTH==='true';
if(dev&&process.env.NODE_ENV==='production')throw Error('DEV_AUTH_FORBIDDEN');
if(!dev&&(!process.env.SUPABASE_URL||!process.env.SUPABASE_PUBLISHABLE_KEY))throw Error('AUTH_CONFIG_REQUIRED');
const origins=(process.env.CLIENT_ORIGINS||'http://localhost:5173,https://localhost').split(',');
const store=await createStore();
const server=createServer((req,res)=>{res.writeHead(req.url==='/health'?200:404,{'Content-Type':'application/json'});res.end(JSON.stringify({service:'social-casino-hub',demo:dev}));});
const io=new Server(server,{cors:{origin:origins},maxHttpBufferSize:4096,allowRequest:(req,cb)=>cb(null,origins.includes(req.headers.origin))});
async function authenticate(token){
 if(typeof token!=='string'||token.length>8192)throw Error('AUTH_REQUIRED');
 if(dev){if(!/^dev:[0-9a-f-]{36}$/i.test(token))throw Error('INVALID_DEV_TOKEN');return token;}
 const r=await fetch(process.env.SUPABASE_URL+'/auth/v1/user',{headers:{apikey:process.env.SUPABASE_PUBLISHABLE_KEY,Authorization:'Bearer '+token},signal:AbortSignal.timeout(5000)});
 if(!r.ok)throw Error('AUTH_REQUIRED');const user=await r.json();if(!user.id||user.is_anonymous)throw Error('REGISTERED_ACCOUNT_REQUIRED');return user.id;
}
io.use(async(socket,next)=>{try{socket.data.user=await authenticate(socket.handshake.auth?.token);next();}catch{next(Error('AUTH_REQUIRED'));}});
const bots=Array.from({length:3},(_,i)=>new Bot('bot:'+i));
let busy=false;
function players(){return [...new Set([...io.sockets.sockets.values()].map(s=>s.data.user))];}
async function broadcast(){
 const snapshot=await store.run(s=>Object.fromEntries(players().map(id=>[id,{...view(s,id),...tablesView(s,id)}])));
 const humans=players();
 for(const socket of io.sockets.sockets.values())if(snapshot[socket.data.user])socket.emit('state',{...snapshot[socket.data.user],players:humans.map(id=>({id,bot:false})).concat(bots.slice(0,Math.max(0,4-humans.length)).map(b=>({id:b.id,bot:true,state:b.state}))),demo:dev});
}
io.on('connection',socket=>{
 let last=0;
 socket.on('command',async(msg,ack)=>{
   if(typeof ack!=='function')return;
   if(Date.now()-last<250)return ack({error:'RATE_LIMIT'});last=Date.now();
   try{
    // Recheck token on every balance-changing action (also prevents expired sessions).
    await authenticate(socket.handshake.auth.token);
    const result=await store.run(s=>{
     ensureUser(s,socket.data.user);const p=msg?.payload||{};
     switch(msg?.type){
      case 'table':return tableCommand(s,socket.data.user,p);
      case 'bet':return bet(s,socket.data.user,p);
      case 'gift':return sendGift(s,socket.data.user,p);
      case 'claim':return claimGift(s,socket.data.user,p);
      case 'demoReward':if(dev)return testRefill(s,socket.data.user,{requestId:randomUUID()});break;
     }throw Error('UNSUPPORTED_COMMAND');
    });ack({ok:true,result});await broadcast().catch(()=>console.error('broadcast failed'));
   }catch(e){const safe=['READY_REQUIRED','ROUND_ACTIVE','JOIN_FIRST','NOT_YOUR_TURN','INVALID_ACTION','RAISE_LIMIT','EMPTY_PILE','DRAW_FIRST','INVALID_MELD','INVALID_CARD','INVALID_GAME','TABLE_FULL','STALE_ACTION','BETTING_CLOSED','ONE_BET_PER_ROUND','INVALID_BET','INSUFFICIENT_OR_LIMIT','INVALID_RECIPIENT','INVALID_COST','REWARD_NOT_ELIGIBLE','AUTH_REQUIRED','INVALID_GIFT','REQUEST_ID_REUSED'];ack({error:safe.includes(e.message)?e.message:'REQUEST_FAILED'});}
 });
 store.run(s=>ensureUser(s,socket.data.user)).then(broadcast).catch(()=>socket.disconnect(true));
 const expiry=setTimeout(()=>socket.disconnect(true),15*60*1000);
 socket.on('disconnect',()=>clearTimeout(expiry));
});
setInterval(async()=>{
 if(busy)return;busy=true;
 try{const count=players().length;await store.run(s=>{const now=Date.now();tick(s,now);tickTables(s,now);bots.forEach((b,i)=>b.update(s,now,count>0&&i<Math.max(0,4-count)));});await broadcast();}
 catch(e){console.error('room tick failed:',e.code||e.name);}finally{busy=false;}
},1000);
server.listen(Number(process.env.PORT||3001),'0.0.0.0',()=>console.log('Hub listening; demo auth:',dev));
