import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {io} from 'socket.io-client';
const origin='http://localhost:5173';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
test('two clients share round; gift persists on reconnect; forged payout rejected', {timeout:20000},async()=>{
 const port=32000+Math.floor(Math.random()*10000);
 const server=spawn(process.execPath,['apps/server/src/index.mjs'],{env:{...process.env,PORT:String(port),DEV_AUTH:'true',DATABASE_URL:'',NODE_ENV:'test',CLIENT_ORIGINS:origin},stdio:'pipe'});
 const clients=[];
 try{
  for(let i=0;i<40;i++){try{if((await fetch(`http://localhost:${port}/health`)).ok)break;}catch{}await delay(100);}
  async function connect(token){const s=io(`http://localhost:${port}`,{auth:{token},transports:['websocket'],extraHeaders:{Origin:origin}});clients.push(s);await new Promise((resolve,reject)=>{s.once('state',v=>{s.snapshot=v;resolve();});s.once('connect_error',reject);});s.on('state',v=>s.snapshot=v);return s;}
  const a=await connect('dev:'+randomUUID()),b=await connect('dev:'+randomUUID());
  assert.equal(a.snapshot.round.id,b.snapshot.round.id);
  const cmd=(s,type,payload)=>new Promise((resolve,reject)=>s.timeout(5000).emit('command',{type,payload},(err,r)=>err?reject(err):resolve(r)));
  const p={requestId:randomUUID(),to:b.snapshot.userId,cost:100};
  const gift=await cmd(a,'gift',p);assert.equal(gift.ok,true);
  await delay(300);const retry=await cmd(a,'gift',p);assert.equal(retry.result.giftId,gift.result.giftId);
  await delay(300);assert.equal((await cmd(b,'claim',{giftId:gift.result.giftId})).ok,true);
  await delay(300);assert.equal(a.snapshot.wallet.chips,900);assert.equal(b.snapshot.wallet.chips,1050);
  assert.ok((await cmd(a,'payout',{chips:999999})).error);
  const token=a.auth.token;a.disconnect();const a2=await connect(token);assert.equal(a2.snapshot.wallet.chips,900);
 }finally{clients.forEach(c=>c.disconnect());server.kill();}
});
