import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {initial,ensureUser,payout,bet,tick,sendGift,claimGift,verifiedReward} from '../packages/game-core/index.mjs';
import {Bot} from '../apps/server/src/bot.mjs';import {createStore} from '../apps/server/src/store.mjs';
function fixture(){const s=initial(0);ensureUser(s,'alice');ensureUser(s,'bob');return s;}
const b=(s,kind='small',stake=100)=>({requestId:randomUUID(),roundId:s.round.id,kind,stake});
test('all 216 dice combinations: 105 small, 105 big, 6 triples',()=>{
 let wins={small:0,big:0,triple:0};for(let a=1;a<=6;a++)for(let b=1;b<=6;b++)for(let c=1;c<=6;c++){
  const d=[a,b,c];for(const k in wins)if(payout(d,k,10)>0)wins[k]++;
  assert.equal(Object.keys(wins).filter(k=>payout(d,k,10)>0).length,1);
 }assert.deepEqual(wins,{small:105,big:105,triple:6});
});
test('reject forged/negative/fractional amounts and late or wrong rounds',()=>{
 for(const amount of [-1,0,1.2,NaN,Infinity,1001,'100']){const s=fixture();assert.throws(()=>bet(s,'alice',b(s,'small',amount),0),/INVALID_BET/);assert.equal(s.wallets.alice.chips,1000);}
 const s=fixture();assert.throws(()=>bet(s,'alice',b(s),20000),/CLOSED/);assert.equal(s.wallets.alice.chips,1000);
});
test('idempotent bet and settlement; no double payout',()=>{
 const s=fixture(),p=b(s);bet(s,'alice',p,1);bet(s,'alice',p,2);assert.equal(s.wallets.alice.chips,900);
 assert.throws(()=>bet(s,'alice',{...p,stake:50},3),/REUSED/);
 tick(s,20000,()=>[1,2,3]);assert.equal(s.wallets.alice.chips,1100);tick(s,20001);assert.equal(s.wallets.alice.chips,1100);
});
test('triple defeats both high and low, returns stake + 30x for triple',()=>{
 assert.equal(payout([2,2,2],'small',100),0);assert.equal(payout([6,6,6],'big',100),0);assert.equal(payout([3,3,3],'triple',10),310);
});
test('gift burns 50%, floors odd amounts, recipient-only and once',()=>{
 const s=fixture(),p={requestId:randomUUID(),to:'bob',cost:101};const {giftId}=sendGift(s,'alice',p);sendGift(s,'alice',p);
 assert.throws(()=>claimGift(s,'alice',{giftId}));claimGift(s,'bob',{giftId});claimGift(s,'bob',{giftId});
 assert.equal(s.wallets.alice.chips,899);assert.equal(s.wallets.bob.chips,1050);
});
test('reward rejects funded users, in-flight bets, cooldown, duplicates',()=>{
 const s=fixture();assert.throws(()=>verifiedReward(s,'alice','p:1',200000));
 bet(s,'alice',b(s,'big',1000),0);assert.throws(()=>verifiedReward(s,'alice','p:1',200000));tick(s,20000,()=>[1,2,3]);
 verifiedReward(s,'alice','p:1',200000);verifiedReward(s,'alice','p:1',200001);assert.equal(s.wallets.alice.chips,500);
 s.wallets.alice.chips=0;assert.throws(()=>verifiedReward(s,'alice','p:2',200002));
});
test('bots think before placing a single bet',()=>{
 const s=fixture(),bot=new Bot('bot:0');bot.update(s,0,true);assert.equal(bot.state,'THINKING');assert.equal(Object.keys(s.round.bets).length,0);
 bot.update(s,7000,true);bot.update(s,8000,true);assert.equal(Object.keys(s.round.bets).length,1);assert.equal(bot.state,'WAIT_RESULT');
});
test('transaction queue prevents concurrent overspend; rollback keeps balance',async()=>{
 process.env.DEV_AUTH='true';delete process.env.DATABASE_URL;const store=await createStore();
 await store.run(s=>{ensureUser(s,'alice');ensureUser(s,'bob');});
 const results=await Promise.allSettled(Array.from({length:20},()=>store.run(s=>sendGift(s,'alice',{requestId:randomUUID(),to:'bob',cost:100}))));
 assert.equal(results.filter(r=>r.status==='fulfilled').length,10);
 await assert.rejects(store.run(s=>{s.wallets.alice.chips=999;throw Error('rollback');}));
 assert.equal(await store.run(s=>s.wallets.alice.chips),0);
});
test('restart serialization preserves unresolved bet for recovery settlement',()=>{
 let s=fixture();bet(s,'alice',b(s),1);s=JSON.parse(JSON.stringify(s));tick(s,90000,()=>[1,2,3]);assert.equal(s.wallets.alice.chips,1100);
});
