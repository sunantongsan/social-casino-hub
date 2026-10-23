// House rules explicitly selected by the table owner. No real currency.
import {credit} from './core.mjs';
const rank=c=>c%13+1,suit=c=>Math.floor(c/13);
export const cardValue=c=>[2,12].includes(rank(c))?50:Math.min(rank(c),10);
export const handValue=cards=>cards.reduce((a,c)=>a+cardValue(c),0);
export function meldOptions(hand){
 const out=[];
 for(let r=1;r<=13;r++){const a=hand.filter(c=>rank(c)===r);if(a.length>=3){out.push(a);if(a.length===4)for(const c of a)out.push(a.filter(x=>x!==c));}}
 for(let s=0;s<4;s++){const a=hand.filter(c=>suit(c)===s).sort((a,b)=>rank(a)-rank(b));for(let i=0;i<a.length;i++)for(let j=i+2;j<a.length;j++){if(a.slice(i,j+1).every((c,k)=>rank(c)===rank(a[i])+k))out.push(a.slice(i,j+1));else break;}}
 return out.sort((a,b)=>b.length-a.length);
}
export function partition(hand){const failed=new Set();let budget=20000;function solve(h){if(!h.length)return [];if(--budget<=0)return null;const key=[...h].sort((a,b)=>a-b).join(',');if(failed.has(key))return null;for(const m of meldOptions(h).filter(m=>m.includes(h[0]))){const tail=solve(h.filter(c=>!m.includes(c)));if(tail)return [m,...tail];}failed.add(key);return null;}return solve(hand);}
export function knockPlan(hand){const all=partition(hand);if(all)return {groups:all,discard:null};for(const c of hand){const groups=partition(hand.filter(x=>x!==c));if(groups)return {groups,discard:c};}return null;}
export function rummySettlement(s,t,winner){
 if(t.phase!=='PLAY')return;
 const winnerDark=!t.opened[winner];const feed=t.pickup?.user===winner&&t.pickup?.from===t.seats[(t.turn+t.seats.length-1)%t.seats.length].id?t.pickup.from:null;
 const rows=t.seats.filter(p=>p.id!==winner).map(p=>{const points=handValue(t.hands[p.id]),dark=!t.opened[p.id],fool=p.id===feed,multiplier=(dark?2:1)*(winnerDark?2:1)*(fool?2:1),owed=points*t.stake*multiplier,paid=Math.min(owed,s.wallets[p.id].chips);return {id:p.id,points,rate:t.stake,dark,winnerDark,fool,multiplier,owed,paid,capped:paid<owed,net:-paid};});
 const gain=rows.reduce((a,r)=>a+r.paid,0);if(!Number.isSafeInteger(s.wallets[winner].chips+gain))throw Error('INSUFFICIENT_OR_LIMIT');
 for(const r of rows)credit(s,r.id,-r.paid,'rummy-loss:'+t.id);credit(s,winner,gain,'rummy-win:'+t.id);
 t.settlement={winner,winnerDark,feed,rows:[...rows,{id:winner,net:gain}]};t.phase='RESULT';t.winners=[winner];t.revision++;t.log.push('น็อก! คิดแต้มไพ่ค้างมือ × เรตโต๊ะ × ตัวคูณ');
}
export function takeRow(t,user,p,isMeld){
 const i=p.discardIndex,c=t.discards[i],own=p.cards;
 if(!Number.isInteger(i)||i<0||i>=t.discards.length||!Array.isArray(own)||own.length<2||new Set(own).size!==own.length||own.some(x=>!t.hands[user].includes(x))||!isMeld([...own,c]))throw Error('INVALID_MELD');
 const last=i===t.discards.length-1,from=t.discardOwners?.[i];
 t.hands[user]=t.hands[user].filter(c=>!own.includes(c));t.hands[user].push(...t.discards.slice(i+1));t.melds.push({owner:user,cards:[...own,c]});t.discards.splice(i);t.discardOwners.splice(i);t.opened[user]=true;t.pickup={user,from:last?from:null};
}
