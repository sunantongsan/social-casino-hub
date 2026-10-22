import {randomInt,randomUUID} from 'node:crypto';
import {gameCommand,gameView} from './games.mjs';
export const BETS = ['small','big','triple'];
export function payout(dice,kind,stake){
  if(!Array.isArray(dice)||dice.length!==3||dice.some(d=>!Number.isInteger(d)||d<1||d>6)) throw Error('INVALID_DICE');
  if(!BETS.includes(kind)||!Number.isSafeInteger(stake)||stake<1||stake>1000) throw Error('INVALID_BET');
  const sum=dice.reduce((a,b)=>a+b,0), triple=dice.every(d=>d===dice[0]);
  // Gross return includes original stake: small/big net +1:1, any triple net +30:1.
  const win=kind==='triple'?triple:!triple&&(kind==='small'?sum>=4&&sum<=10:sum>=11&&sum<=17);
  return win?stake*(kind==='triple'?31:2):0;
}
export const roll=()=>Array.from({length:3},()=>randomInt(1,7));
export function initial(now=Date.now()){
  return {wallets:{},gifts:{},receipts:{},ledger:[],tables:{},round:{id:randomUUID(),phase:'BETTING',endsAt:now+20000,bets:{},dice:null}};
}
function credit(s,id,delta,reason){
  const w=s.wallets[id]; if(!w||!Number.isSafeInteger(delta)||w.chips+delta<0||w.chips+delta>1e9) throw Error('INSUFFICIENT_OR_LIMIT');
  w.chips+=delta;s.ledger.push({id:randomUUID(),user:id,delta,reason,at:Date.now()});
}
export function ensureUser(s,id,bot=false){
  if(!s.wallets[id]){s.wallets[id]={chips:0,bot,lastReward:0};credit(s,id,bot?100000:1000,'welcome');}
}
function once(s,user,key,payload,fn){
  if(typeof key!=='string'||!/^[0-9a-f-]{36}$/i.test(key)) throw Error('INVALID_REQUEST_ID');
  const id=user+':'+key, fingerprint=JSON.stringify(payload), old=s.receipts[id];
  if(old){if(old.fingerprint!==fingerprint)throw Error('REQUEST_ID_REUSED');return old.result;}
  const result=fn();s.receipts[id]={fingerprint,result};return result;
}
export function bet(s,user,{requestId,roundId,kind,stake},now=Date.now()){
  return once(s,user,requestId,{roundId,kind,stake},()=>{
    const r=s.round;
    if(r.id!==roundId||r.phase!=='BETTING'||now>=r.endsAt)throw Error('BETTING_CLOSED');
    payout([1,2,3],kind,stake);
    if(r.bets[user])throw Error('ONE_BET_PER_ROUND');
    credit(s,user,-stake,'bet:'+r.id);r.bets[user]={kind,stake};return {accepted:true};
  });
}
export function tick(s,now=Date.now(),diceFactory=roll){
  const r=s.round;if(now<r.endsAt)return;
  if(r.phase==='BETTING'){
    r.dice=diceFactory();r.phase='RESULT';r.endsAt=now+7000;
    for(const [id,b] of Object.entries(r.bets))credit(s,id,payout(r.dice,b.kind,b.stake),'settle:'+r.id);
  }else{s.round=initial(now).round;}
}
export function sendGift(s,user,{requestId,to,cost}){
 return once(s,user,requestId,{to,cost},()=>{
   if(user===to||!Object.hasOwn(s.wallets,to)||s.wallets[to].bot||s.wallets[user]?.bot)throw Error('INVALID_RECIPIENT');
   if(!Number.isSafeInteger(cost)||cost<2||cost>10000)throw Error('INVALID_COST');
   credit(s,user,-cost,'gift');const id=randomUUID();s.gifts[id]={id,from:user,to,cost,value:Math.floor(cost/2),claimed:false};return {giftId:id};
 });
}
export function claimGift(s,user,{giftId}){
 const g=s.gifts[giftId];if(!g||g.to!==user)throw Error('INVALID_GIFT');
 if(!g.claimed){credit(s,user,g.value,'gift:'+giftId);g.claimed=true;}return {claimed:true};
}
// Call ONLY after provider SSV signature, app/ad-unit/user/amount verification.
// Provider transaction IDs are globally unique within the provider namespace.
export function verifiedReward(s,user,transactionId,now=Date.now()){
 const key='reward:'+transactionId;if(s.receipts[key])return s.receipts[key].result;
 const w=s.wallets[user];
 if(!w||w.bot||w.chips!==0||now-w.lastReward<120000||s.round.bets[user]&&s.round.phase==='BETTING')throw Error('REWARD_NOT_ELIGIBLE');
 credit(s,user,500,'reward:'+transactionId);w.lastReward=now;
 return (s.receipts[key]={result:{rewarded:500}}).result;
}
// serverNow lets clients correct for device clock skew when showing the countdown.
export function game(s,user,payload,now=Date.now()){return gameCommand(s,user,payload,credit,now);}
export function view(s,user,now=Date.now()){
 return {round:s.round,wallet:s.wallets[user],userId:user,serverNow:now,tables:gameView(s,user),gifts:Object.values(s.gifts).filter(g=>g.to===user&&!g.claimed)};
}
