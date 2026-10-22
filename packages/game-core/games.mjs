// Single-player tables against labelled bots: Pok Deng, Kao Kae, Phasom Sip, Rummy, Roulette.
// The server owns the deck and settles chips; view hides the deck and opponents' cards until the hand ends.
// Actions carry the table's step counter, so a retried request is rejected instead of applied twice.
import {randomInt} from 'node:crypto';
export const GAMES=['pokdeng','kaokae','phasomsip','rummy','roulette'];
const RED=new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
export const rank=c=>c%13, suit=c=>Math.floor(c/13);
const pip=c=>rank(c)>=9?0:rank(c)+1;
const points=h=>h.reduce((a,c)=>a+pip(c),0)%10;
function shuffled(){const d=Array.from({length:52},(_,i)=>i);for(let i=51;i>0;i--){const j=randomInt(0,i+1);[d[i],d[j]]=[d[j],d[i]];}return d;}
function fail(code){throw Error(code);}

// ---- Pok Deng ----
export function pokHand(h){
 const pts=points(h),rs=h.map(rank).sort((a,b)=>a-b),flush=h.every(c=>suit(c)===suit(h[0]));
 if(h.length===2){const pok=pts>=8;return {tier:pok?6:0,pts,deng:rs[0]===rs[1]||flush?2:1,name:(pok?'ป๊อก ':'')+pts+(pok?'':' แต้ม')};}
 const tong=rs[0]===rs[2],straight=!tong&&(rs[1]===rs[0]+1&&rs[2]===rs[1]+1||rs.join()==='0,11,12');
 if(tong)return {tier:5,pts,deng:5,name:'ตอง'};
 if(straight&&flush)return {tier:4,pts,deng:5,name:'สเตรทฟลัช'};
 if(straight)return {tier:3,pts,deng:3,name:'เรียง'};
 if(rs.every(r=>r>=10))return {tier:2,pts,deng:3,name:'เซียน'};
 return {tier:0,pts,deng:flush?3:1,name:pts+' แต้ม'};
}
const cmpPok=(a,b)=>a.tier!==b.tier?Math.sign(a.tier-b.tier):a.tier===0||a.tier===6?Math.sign(a.pts-b.pts):0;
// ---- Kao Kae: closest to 9, no deng; a two-card 9 ("เก้าเก") pays 2:1 ----
export function kaoHand(h){const pts=points(h),natural=h.length===2&&pts>=8;return {pts,natural,name:(h.length===2&&pts===9?'เก้าเก':natural?'ไพ่ตาย ':'')+(h.length===2&&pts===9?'':pts+' แต้ม')};}

// ---- Rummy: 7 cards, all must form sets (3–4 same rank) or runs (3+ same suit, A low) ----
// Returns the most cards that can be placed in melds.
// The lowest card is either deadwood or the bottom of a set/run, which keeps the search tiny.
export function melded(cards){
 if(cards.length<3)return 0;
 const [c,...rest]=[...cards].sort((a,b)=>rank(a)-rank(b)||a-b);let best=melded(rest);
 const take=g=>{best=Math.max(best,1+g.length+melded(rest.filter(x=>!g.includes(x))));};
 const same=rest.filter(x=>rank(x)===rank(c));
 for(let mask=1;mask<1<<same.length;mask++){const g=same.filter((_,i)=>mask>>i&1);if(g.length>=2)take(g);}
 const run=[];for(let r=rank(c)+1;r<13;r++){const n=suit(c)*13+r;if(!rest.includes(n))break;run.push(n);if(run.length>=2)take([...run]);}
 return best;
}
const rummyWin=h=>h.length===7&&melded(h)===7;
function bestDiscard(h){let pick=0,score=-1;h.forEach((c,i)=>{const v=melded(h.filter((_,j)=>j!==i))*100+rank(c);if(v>score){score=v;pick=i;}});return pick;}

// ---- Phasom Sip: capture a table card that adds to 10 (10/J/Q/K capture the same rank) ----
function captureIndex(table,card){
 const r=rank(card);return table.findIndex(t=>r>=9?rank(t)===r:rank(t)<9&&pip(t)+pip(card)===10);
}
function playSip(t,who,i){
 const p=t.players[who],card=p.hand.splice(i,1)[0],k=captureIndex(t.table,card);
 if(k<0){t.table.push(card);t.log.push({who,card,captured:null});return;}
 const got=t.table.splice(k,1)[0];p.pile.push(card,got);t.last=who;
 if(!t.table.length)p.sweeps++;t.log.push({who,card,captured:got,sweep:!t.table.length});
}
function botSip(t,who){
 const h=t.players[who].hand;let pick=-1,val=-1;
 h.forEach((c,i)=>{if(captureIndex(t.table,c)>=0&&rank(c)>val){val=rank(c);pick=i;}});
 if(pick<0)h.forEach((c,i)=>{if(pick<0||pip(c)<pip(h[pick]))pick=i;});
 playSip(t,who,pick);
}
const sipScore=p=>p.pile.length+2*p.sweeps;

// ---- Roulette (single zero) ----
const ROULETTE={red:n=>RED.has(n),black:n=>n>0&&!RED.has(n),odd:n=>n%2===1,even:n=>n>0&&n%2===0,low:n=>n>=1&&n<=18,high:n=>n>=19,dozen1:n=>n>=1&&n<=12,dozen2:n=>n>=13&&n<=24,dozen3:n=>n>=25};
const rouletteReturn=(kind,number,n,stake)=>kind==='number'?(n===number?stake*36:0):ROULETTE[kind](n)?stake*(kind.startsWith('dozen')?3:2):0;

const BOT_NAMES=['บอต 1','บอต 2','บอต 3'];
// amount = chips paid back after the stake was taken at start (stake + net). Pok Deng deng losses can make it
// negative; the extra loss is capped at the current balance so a wallet never goes below zero.
function settle(s,user,t,amount,credit){
 if(amount<0)amount=Math.max(amount,-s.wallets[user].chips);
 if(amount)credit(s,user,amount,'settle:'+t.game+':'+t.id);
 t.phase='done';t.net=amount-t.stake;
}
function finishPok(s,user,t,credit){
 const dealer=pokHand(t.dealer);t.results=t.players.map(p=>{const h=pokHand(p.hand),c=cmpPok(h,dealer);return {hand:h,outcome:c>0?'win':c<0?'lose':'push',net:c>0?t.stake*h.deng:c<0?-t.stake*dealer.deng:0};});
 t.dealerHand=dealer;settle(s,user,t,t.stake+t.results[0].net,credit);
}
function finishKao(s,user,t,credit){
 const dealer=kaoHand(t.dealer);t.results=t.players.map(p=>{const h=kaoHand(p.hand),c=Math.sign(h.pts-dealer.pts);return {hand:h,outcome:c>0?'win':c<0?'lose':'push',net:c>0?t.stake*(h.natural&&h.pts===9?2:1):c<0?-t.stake:0};});
 t.dealerHand=dealer;settle(s,user,t,t.stake+t.results[0].net,credit);
}
function finishSip(s,user,t,credit){
 if(t.table.length&&t.last>=0){t.players[t.last].pile.push(...t.table);t.table=[];}
 const scores=t.players.map(sipScore),top=Math.max(...scores),winners=scores.filter(v=>v===top).length;
 t.scores=scores;t.outcome=scores[0]<top?'lose':winners>1?'push':'win';
 settle(s,user,t,t.outcome==='win'?t.stake*3:t.outcome==='push'?t.stake:0,credit);
}
function dealSip(t){if(t.players.every(p=>!p.hand.length)&&t.deck.length)for(let n=0;n<4;n++)for(const p of t.players)if(t.deck.length)p.hand.push(t.deck.pop());}
function rummyDraw(t,p,fromDiscard){
 if(fromDiscard){p.hand.push(t.discard.pop());return;}
 if(!t.deck.length){const top=t.discard.pop();t.deck=t.discard;t.discard=[top];for(let i=t.deck.length-1;i>0;i--){const j=randomInt(0,i+1);[t.deck[i],t.deck[j]]=[t.deck[j],t.deck[i]];}}
 p.hand.push(t.deck.pop());
}
function rummyBots(s,user,t,credit){
 for(let who=1;who<t.players.length;who++){
  const p=t.players[who],top=t.discard.at(-1);
  rummyDraw(t,p,top!==undefined&&melded([...p.hand,top])>melded(p.hand));
  t.discard.push(p.hand.splice(bestDiscard(p.hand),1)[0]);t.log.push({who,discard:t.discard.at(-1)});
  if(rummyWin(p.hand)){t.winner=who;return settle(s,user,t,0,credit);}
 }
 t.turns++;if(t.turns>=40){t.winner=-1;return settle(s,user,t,t.stake,credit);}
 t.turnPhase='draw';
}

function start(s,user,game,p,credit,now){
 const stake=p.stake;
 if(!Number.isSafeInteger(stake)||stake<1||stake>1000)fail('INVALID_BET');
 if(game==='roulette'&&!(p.kind==='number'?Number.isInteger(p.number)&&p.number>=0&&p.number<=36:Object.hasOwn(ROULETTE,p.kind)))fail('INVALID_BET');
 credit(s,user,-stake,'game:'+game);
 const id=(s.tables[user]?.[game]?.id||0)+1,d=shuffled(),t={game,id,stake,phase:'play',step:0,at:now,log:[]};
 if(game==='roulette'){
  const n=randomInt(0,37),kinds=[...Object.keys(ROULETTE),'number'];
  Object.assign(t,{kind:p.kind,number:p.kind==='number'?p.number:null,result:n,bots:BOT_NAMES.map(name=>{const kind=kinds[randomInt(0,kinds.length)],number=kind==='number'?randomInt(0,37):null;return {name,kind,number,win:rouletteReturn(kind,number,n,10)>0};})});
  settle(s,user,t,rouletteReturn(p.kind,t.number,n,stake),credit);
 }else if(game==='pokdeng'||game==='kaokae'){
  t.players=[{name:'คุณ',hand:[]},{name:BOT_NAMES[0],hand:[]},{name:BOT_NAMES[1],hand:[]}].slice(0,game==='pokdeng'?3:2);t.dealer=[];
  for(let n=0;n<2;n++){for(const pl of t.players)pl.hand.push(d.pop());t.dealer.push(d.pop());}t.deck=d;
  const ended=game==='pokdeng'?pokHand(t.dealer).tier===6||pokHand(t.players[0].hand).tier===6:kaoHand(t.dealer).natural||kaoHand(t.players[0].hand).natural;
  if(ended)(game==='pokdeng'?finishPok:finishKao)(s,user,t,credit);
 }else if(game==='phasomsip'){
  t.players=['คุณ',BOT_NAMES[0],BOT_NAMES[1]].map(name=>({name,hand:[],pile:[],sweeps:0}));t.table=d.splice(-4);t.deck=d;t.last=-1;dealSip(t);
 }else{
  t.players=['คุณ',BOT_NAMES[0],BOT_NAMES[1]].map(name=>({name,hand:[]}));
  for(let n=0;n<7;n++)for(const pl of t.players)pl.hand.push(d.pop());t.discard=[d.pop()];t.deck=d;t.turnPhase='draw';t.turns=0;t.winner=null;
 }
 (s.tables[user]??={})[game]=t;return {started:true};
}

export function gameCommand(s,user,p,credit,now=Date.now()){
 s.tables??={};
 const game=p?.game;if(!GAMES.includes(game))fail('INVALID_GAME');
 const t=s.tables[user]?.[game];
 if(p.action==='start'){if(t&&t.phase!=='done')fail('TABLE_ACTIVE');return start(s,user,game,p,credit,now);}
 if(!t||t.phase==='done')fail('NO_TABLE');
 if(p.step!==t.step)fail('STALE_ACTION');
 const me=t.players[0];
 if(game==='pokdeng'||game==='kaokae'){
  if(p.action!=='draw'&&p.action!=='stand')fail('INVALID_ACTION');
  if(p.action==='draw')me.hand.push(t.deck.pop());
  const limit=game==='pokdeng'?4:5,score=game==='pokdeng'?h=>pokHand(h).tier===6?10:points(h):h=>points(h);
  for(const bot of t.players.slice(1))if(score(bot.hand)<=limit)bot.hand.push(t.deck.pop());
  if(score(t.dealer)<=limit)t.dealer.push(t.deck.pop());
  (game==='pokdeng'?finishPok:finishKao)(s,user,t,credit);
 }else if(game==='phasomsip'){
  if(p.action!=='play'||!Number.isInteger(p.card)||p.card<0||p.card>=me.hand.length)fail('INVALID_ACTION');
  playSip(t,0,p.card);for(let who=1;who<t.players.length;who++)botSip(t,who);
  dealSip(t);if(t.players.every(pl=>!pl.hand.length))finishSip(s,user,t,credit);
 }else if(game==='rummy'){
  if(t.turnPhase==='draw'){
   if(p.action!=='draw'||(p.from!=='deck'&&p.from!=='discard'))fail('INVALID_ACTION');
   rummyDraw(t,me,p.from==='discard');t.turnPhase='discard';
  }else{
   if(p.action!=='discard'||!Number.isInteger(p.card)||p.card<0||p.card>=me.hand.length)fail('INVALID_ACTION');
   t.discard.push(me.hand.splice(p.card,1)[0]);t.log.push({who:0,discard:t.discard.at(-1)});
   if(rummyWin(me.hand)){t.winner=0;settle(s,user,t,t.stake*3,credit);}else rummyBots(s,user,t,credit);
  }
 }else fail('INVALID_ACTION');
 t.step++;return {ok:true};
}

// What the player may see: the deck and opponents' cards stay hidden until the hand is done.
export function gameView(s,user){
 const out={};
 for(const [game,t] of Object.entries(s.tables?.[user]||{})){
  const done=t.phase==='done',v={...t,deck:undefined,deckCount:t.deck?.length};
  if(t.players)v.players=t.players.map((pl,i)=>({...pl,hand:i===0||done?pl.hand:undefined,handCount:pl.hand.length}));
  if(t.dealer){v.dealer=done?t.dealer:undefined;v.dealerCount=t.dealer.length;}
  if(game==='rummy'){v.discard=undefined;v.discardTop=t.discard.at(-1);v.meldedCount=melded(t.players[0].hand);}
  if(game==='pokdeng'&&!done)v.myHand=pokHand(t.players[0].hand);
  if(game==='kaokae'&&!done)v.myHand=kaoHand(t.players[0].hand);
  out[game]=v;
 }
 return out;
}
