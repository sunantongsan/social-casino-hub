import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {initial,ensureUser,game,view} from '../packages/game-core/index.mjs';
import {pokHand,kaoHand,melded} from '../packages/game-core/games.mjs';
const c=(r,suit=0)=>suit*13+r; // r: 0=A … 12=K
function fixture(){const s=initial(0);ensureUser(s,'alice');return s;}
const ledgerTotal=(s,id)=>s.ledger.filter(e=>e.user===id).reduce((a,e)=>a+e.delta,0);
// Plays one full hand with a simple strategy through the public view only.
function play(s,name,extra={}){
 game(s,'alice',{game:name,action:'start',stake:100,...extra});
 for(let guard=0;guard<500;guard++){
  const t=view(s,'alice').tables[name];if(t.phase==='done')return t;
  const step=t.step,me=t.players[0];
  if(name==='pokdeng'||name==='kaokae')game(s,'alice',{game:name,action:t.myHand.pts<=4?'draw':'stand',step});
  else if(name==='phasomsip')game(s,'alice',{game:name,action:'play',card:0,step});
  else if(t.turnPhase==='draw')game(s,'alice',{game:name,action:'draw',from:guard%2?'deck':'discard',step});
  else game(s,'alice',{game:name,action:'discard',card:me.hand.length-1,step});
 }
 assert.fail('hand did not finish');
}
test('pok deng hand ranking and deng multipliers',()=>{
 assert.deepEqual([pokHand([c(7),c(0,1)]).tier,pokHand([c(7),c(0,1)]).pts],[6,9]);
 assert.equal(pokHand([c(3),c(3,1)]).deng,2);
 assert.equal(pokHand([c(1),c(2)]).deng,2);
 assert.equal(pokHand([c(4),c(4,1),c(4,2)]).name,'ตอง');
 assert.equal(pokHand([c(2),c(3),c(4)]).name,'สเตรทฟลัช');
 assert.equal(pokHand([c(11),c(12,1),c(0,2)]).name,'เรียง');
 assert.equal(pokHand([c(10),c(10,1),c(12,2)]).name,'เซียน');
 assert.equal(pokHand([c(9),c(12,1),c(0,2)]).pts,1);
});
test('kao kae natural nine and points',()=>{
 assert.equal(kaoHand([c(3),c(4,1)]).name,'เก้าเก');assert.equal(kaoHand([c(3),c(4,1)]).natural,true);
 assert.equal(kaoHand([c(3),c(4,1),c(9)]).natural,false);
});
test('rummy melds: sets, A-low runs, and deadwood',()=>{
 assert.equal(melded([c(0),c(1),c(2),c(6),c(6,1),c(6,2),c(6,3)]),7);
 assert.equal(melded([c(4),c(5),c(6),c(7),c(9,1),c(9,2),c(9,3)]),7);
 assert.equal(melded([c(11),c(12),c(0),c(5,1),c(5,2),c(5,3),c(8)]),3);
 assert.equal(melded([c(0),c(2),c(4),c(6),c(8),c(10),c(12,1)]),0);
});
test('every game settles: wallet matches ledger, never negative, cards conserved',()=>{
 const s=fixture();
 for(let i=0;i<300;i++)for(const [name,extra] of [['pokdeng'],['kaokae'],['phasomsip'],['rummy'],['roulette',{kind:'red'}],['roulette',{kind:'number',number:17}]]){
  if(s.wallets.alice.chips<1000)s.wallets.alice.chips+=10000,s.ledger.push({user:'alice',delta:10000});
  const before=s.wallets.alice.chips,t=play(s,name,extra||{});
  assert.equal(s.wallets.alice.chips-before,t.net,name);assert.ok(s.wallets.alice.chips>=0);
  assert.equal(s.wallets.alice.chips,ledgerTotal(s,'alice'));
  if(name==='phasomsip')assert.equal(t.players.reduce((a,p)=>a+p.pile.length,0)+t.table.length,52);
  if(name==='rummy'){const raw=s.tables.alice.rummy;assert.equal(raw.deck.length+raw.discard.length+raw.players.reduce((a,p)=>a+p.hand.length,0),52);}
 }
});
test('roulette payouts follow the table',()=>{
 for(let i=0;i<200;i++){
  const s=fixture();game(s,'alice',{game:'roulette',action:'start',stake:10,kind:'number',number:7});
  const t=s.tables.alice.roulette;assert.equal(t.net,t.result===7?350:-10);
  const s2=fixture();game(s2,'alice',{game:'roulette',action:'start',stake:10,kind:'dozen2'});
  const t2=s2.tables.alice.roulette;assert.equal(t2.net,t2.result>=13&&t2.result<=24?20:-10);
 }
});
test('hidden cards, stale or duplicate actions, and active tables are rejected',()=>{
 const s=fixture();game(s,'alice',{game:'rummy',action:'start',stake:50});
 const v=view(s,'alice').tables.rummy;
 assert.equal(v.deck,undefined);assert.equal(v.discard,undefined);assert.equal(v.players[1].hand,undefined);assert.equal(v.players[1].handCount,7);
 assert.throws(()=>game(s,'alice',{game:'rummy',action:'start',stake:50}),/TABLE_ACTIVE/);
 game(s,'alice',{game:'rummy',action:'draw',from:'deck',step:0});
 assert.throws(()=>game(s,'alice',{game:'rummy',action:'draw',from:'deck',step:0}),/STALE_ACTION/);
 assert.throws(()=>game(s,'alice',{game:'rummy',action:'discard',card:9,step:1}),/INVALID_ACTION/);
 assert.throws(()=>game(s,'alice',{game:'poker',action:'start',stake:1}),/INVALID_GAME/);
 assert.throws(()=>game(s,'alice',{game:'roulette',action:'start',stake:1001,kind:'red'}),/INVALID_BET/);
 assert.throws(()=>game(s,'alice',{game:'roulette',action:'start',stake:10,kind:'number',number:37}),/INVALID_BET/);
 assert.equal(s.wallets.alice.chips,950);
 const p=fixture();game(p,'alice',{game:'pokdeng',action:'start',stake:10});
 const pv=view(p,'alice').tables.pokdeng;if(pv.phase!=='done'){assert.equal(pv.dealer,undefined);assert.equal(pv.players[1].hand,undefined);}
});
test('insufficient chips cannot start a table',()=>{
 const s=fixture();s.wallets.alice.chips=5;
 assert.throws(()=>game(s,'alice',{game:'pokdeng',action:'start',stake:10}),/INSUFFICIENT/);assert.equal(s.tables.alice,undefined);
});
test('edge function bundles identical copies of the game core',()=>{
 for(const [a,b] of [['packages/game-core/index.mjs','supabase/functions/social-casino-internal/core.mjs'],['packages/game-core/games.mjs','supabase/functions/social-casino-internal/games.mjs']])
  assert.equal(readFileSync(b,'utf8'),readFileSync(a,'utf8'),b+' must match '+a);
});
