// Pure client assistance. Accepts only the player's visible hand and public table.
export const rank=c=>c%13+1,suit=c=>Math.floor(c/13);
export const value=c=>[2,12].includes(rank(c))?50:Math.min(rank(c),10);
export const points=h=>h.reduce((n,c)=>n+Math.min(rank(c),10),0)%10;
export function meld(h){const r=h.map(rank).sort((a,b)=>a-b);return h.length>=3&&new Set(h).size===h.length&&(h.length<=4&&r.every(n=>n===r[0])||h.every(c=>suit(c)===suit(h[0]))&&r.every((n,i)=>!i||n===r[i-1]+1));}
export function options(h,game='rummy'){
 const out=[];
 if(game==='mixed10'){for(let i=0;i<h.length;i++)for(let j=i+1;j<h.length;j++)if(rank(h[i])+rank(h[j])===10||rank(h[i])>=10&&rank(h[i])===rank(h[j]))out.push([h[i],h[j]]);return out;}
 for(let r=1;r<=13;r++){const a=h.filter(c=>rank(c)===r);if(a.length>=3){out.push(a);if(a.length===4)for(const c of a)out.push(a.filter(x=>x!==c));}}
 for(let s=0;s<4;s++){const a=h.filter(c=>suit(c)===s).sort((a,b)=>a-b);for(let i=0;i<a.length;i++)for(let j=i+2;j<a.length;j++){const m=a.slice(i,j+1);if(m.every((c,k)=>rank(c)===rank(a[i])+k))out.push(m);else break;}}
 return out;
}
export function arrange(hand,game='rummy'){
 const memo=new Map();let budget=4000;
 function visit(h){if(!h.length)return {groups:[],loose:[],cost:0};const key=h.join(',');if(memo.has(key))return memo.get(key);
 const first=h[0];if(--budget<0)return {groups:[],loose:h,cost:h.reduce((n,c)=>n+value(c),0)};
 const rest=visit(h.slice(1));let best={groups:rest.groups,loose:[first,...rest.loose],cost:value(first)+rest.cost};
 for(const m of options(h,game).filter(m=>m.includes(first))){const tail=visit(h.filter(c=>!m.includes(c)));if(tail.cost<best.cost||tail.cost===best.cost&&tail.loose.length<best.loose.length)best={groups:[m,...tail.groups],loose:tail.loose,cost:tail.cost};}
 memo.set(key,best);return best;
 }
 return visit([...hand].sort((a,b)=>a-b));
}
export function sortedHand(hand,mode,game){if(mode==='groups'){const a=arrange(hand,game);return [...a.groups.flat(),...a.loose];}return [...hand].sort(mode==='suit'?(a,b)=>a-b:(a,b)=>rank(a)-rank(b)||a-b);}
export function describeHand(hand,game){if(!hand.length)return '';if(game==='pok')return (hand.length===2&&points(hand)>=8?'ป๊อก ':'แต้ม ')+points(hand);if(game==='kao'){const r=hand.map(rank).sort((a,b)=>a-b),flush=hand.every(c=>suit(c)===suit(hand[0])),straight=r.every((n,i)=>!i||n===r[i-1]+1)||r.join(',')==='1,12,13';return r.every(n=>n===r[0])?'ตอง':straight&&flush?'เรียงสี':r.every(n=>n>=11)?'เซียน':straight?'เรียง':flush?'สี':'แต้ม '+points(hand);}return '';}
export function suggest(hand,game,t={}){
 if(!hand.length)return {cards:[],text:'รอแจกไพ่'};
 if(game==='pok')return {cards:[],text:describeHand(hand,game)+' • '+(points(hand)<5?'แนะนำจั่ว':'แนะนำอยู่')};
 if(game==='kao')return {cards:[],text:describeHand(hand,game)+' • ตรวจชิปที่ต้องตามก่อนเลือกเล่น'};
 if(t.stage==='DRAW'){
  if(game==='mixed10'){const c=t.discard;if(c!=null&&options([...hand,c],game).some(m=>m.includes(c)))return {cards:[],text:'แนะนำหยิบใบทิ้ง เข้าคู่กับไพ่ในมือ'};}
  else for(let i=(t.discards?.length||0)-1;i>=0;i--){const c=t.discards[i],m=options([...hand,c]).find(m=>m.includes(c));if(m)return {cards:m.filter(x=>x!==c),rowIndex:i,text:'เลือกให้แล้ว • กดเก็บและเกิด'};}
  return {cards:[],text:'แนะนำจั่วจากกอง'};
 }
 const a=arrange(hand,game);
 if(game==='rummy'){
  if(a.loose.length<=1)return {cards:a.loose,text:'ไพ่จัดครบแล้ว • กดน็อก'};
  for(let i=0;i<(t.melds?.length||0);i++){const c=a.loose.find(c=>meld([...t.melds[i].cards,c]));if(c!=null)return {cards:[c],meldIndex:i,text:'เลือกให้แล้ว • กดฝากไพ่ที่ชุดเรืองแสง'};}
  if(a.groups.length)return {cards:a.groups[0],text:'เลือกชุดให้แล้ว • กดลงชุดที่เลือก'};
 }
 const loose=a.loose.length?a.loose:hand;
 // Prefer discarding isolated expensive cards. Advice is a heuristic, not a win guarantee.
 const usefulness=c=>hand.filter(x=>x!==c).reduce((n,x)=>n+(rank(x)===rank(c)?4:suit(x)===suit(c)&&Math.abs(rank(x)-rank(c))<=2?3:0),0);
 const c=[...loose].sort((a,b)=>usefulness(a)-usefulness(b)||value(b)-value(a))[0];
 return {cards:[c],text:'แนะนำทิ้งใบที่เลือก • คุณเปลี่ยนได้'};
}
