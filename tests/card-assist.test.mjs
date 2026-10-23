import test from 'node:test';import assert from 'node:assert/strict';
import {arrange,sortedHand,suggest,meld,options} from '../apps/client/src/card-assist.mjs';
import {meld as serverMeld} from '../packages/game-core/tables.mjs';
import {knockPlan} from '../packages/game-core/thai-rummy.mjs';
test('arrangement preserves every card and separates non-overlapping legal groups',()=>{
 const hand=[0,1,2,13,26,39,11,24];const before=[...hand];const plan=arrange(hand);
 assert.deepEqual([...plan.groups.flat(),...plan.loose].sort((a,b)=>a-b),[...hand].sort((a,b)=>a-b));assert.deepEqual(hand,before);assert.ok(plan.groups.every(serverMeld));
 for(const mode of ['groups','rank','suit'])assert.deepEqual(sortedHand(hand,mode,'rummy').sort((a,b)=>a-b),[...hand].sort((a,b)=>a-b));
});
test('assist suggests only valid row pickups and public meld layoffs',()=>{
 const hand=[0,1,11,24,7,20,40];const pick=suggest(hand,'rummy',{stage:'DRAW',discards:[2]});assert.equal(pick.rowIndex,0);assert.ok(serverMeld([...pick.cards,2]));
 const lay=suggest([3,11,24],'rummy',{stage:'DISCARD',melds:[{cards:[0,1,2]}]});assert.equal(lay.meldIndex,0);assert.deepEqual(lay.cards,[3]);
});
test('knock recommendations agree with server and never peek at hidden hands',()=>{
 let seed=73;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/2**32;};
 for(let n=0;n<120;n++){const deck=Array.from({length:52},(_,i)=>i);for(let i=51;i>0;i--){const j=Math.floor(random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}const hand=n===0?[0,1,2,13,14,15,40]:deck.slice(0,8);const a=suggest(hand,'rummy',{stage:'DISCARD'});if(a.text.includes('กดน็อก'))assert.ok(knockPlan(hand));assert.ok(a.cards.every(c=>hand.includes(c)));assert.deepEqual(a,suggest(hand,'rummy',{stage:'DISCARD',hands:{other:[4,5,6]},stock:[7,8,9]}));assert.ok(options(hand).every(m=>meld(m)&&serverMeld(m)));}
});
test('mixed ten grouping uses exact house pairs and never mutates hand',()=>{const h=[0,8,1,7,9,22];const a=arrange(h,'mixed10');assert.equal(a.groups.length,3);assert.equal(a.loose.length,0);assert.equal(suggest([0,5,6,10,11],'mixed10',{stage:'DRAW',discard:8}).text,'แนะนำหยิบใบทิ้ง เข้าคู่กับไพ่ในมือ');});
