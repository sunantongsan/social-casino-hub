import React,{useState} from 'react';
// Tables for the card games and roulette. The server deals, runs the bots and settles chips;
// this component only renders the player's view and sends actions with the table's step counter.
const RANKS=['A','2','3','4','5','6','7','8','9','10','J','Q','K'],SUITS=['♠','♥','♦','♣'];
const RED=new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
export const GAME_INFO={
 pokdeng:{title:'ป๊อกเด้ง',rules:'แจก 2 ใบ แต้มรวมหลักหน่วย ได้ 8/9 สองใบคือ "ป๊อก" ชนะทันที • จั่วเพิ่มได้ 1 ใบ • ดอกเดียวกัน/คู่ = 2 เด้ง, สามใบดอกเดียวกัน = 3 เด้ง, เรียง/เซียน = 3 เด้ง, ตอง/สเตรทฟลัช = 5 เด้ง • แพ้เจ้ามือเสียตามเด้งของเจ้ามือ (ไม่เกินชิปที่มี)'},
 kaokae:{title:'เก้าเก',rules:'แจก 2 ใบ ใกล้ 9 ที่สุดชนะ (10/J/Q/K = 0) • ได้ 8/9 สองใบคือไพ่ตาย เปิดทันที • จั่วเพิ่มได้ 1 ใบ เจ้ามือจั่วเมื่อแต้ม 5 หรือน้อยกว่า • ชนะได้ 1 เท่า, "เก้าเก" (9 สองใบ) ได้ 2 เท่า, เสมอคืนชิป'},
 phasomsip:{title:'ไพ่ผสมสิบ',rules:'ลงไพ่ 1 ใบต่อตา ถ้าบวกกับไพ่บนโต๊ะได้ 10 เก็บทั้งคู่ (A=1) • 10/J/Q/K เก็บไพ่แต้มเดียวกัน • เก็บจนโต๊ะว่าง = สวีป +2 คะแนน • หมดสำรับ คะแนน = จำนวนไพ่ที่เก็บ + สวีป • ชนะบอตทั้งสองได้ 2 เท่า เสมอคืนชิป'},
 rummy:{title:'รัมมี่',rules:'ถือ 7 ใบ ทุกตาจั่ว 1 ใบ (กองกลางหรือกองทิ้ง) แล้วทิ้ง 1 ใบ • จัดครบ 7 ใบเป็นชุดก่อนชนะ: ตอง/โฟร์ (แต้มเดียวกัน 3–4 ใบ) หรือเรียงดอกเดียวกัน 3 ใบขึ้นไป (A ต่ำ) • ชนะได้ 2 เท่า • ครบ 40 รอบไม่มีใครชนะ คืนชิป'},
 roulette:{title:'วงล้อ Roulette',rules:'ช่อง 0–36 (ศูนย์เดียว) • แดง/ดำ คู่/คี่ 1–18/19–36 กำไร 1:1 • โหล 1–12/13–24/25–36 กำไร 2:1 • เลขเดียว กำไร 35:1 • 0 ทำให้เดิมพันแบบอื่นแพ้'},
};
const BETS={red:'แดง',black:'ดำ',odd:'คี่',even:'คู่',low:'1–18',high:'19–36',dozen1:'1–12',dozen2:'13–24',dozen3:'25–36',number:'เลขเดียว'};
export function Card({c,back,onClick,disabled,small}){
 if(back||c===undefined||c===null)return <span className={'card back'+(small?' small':'')}>🂠</span>;
 const s=Math.floor(c/13),Tag=onClick?'button':'span';
 return <Tag type={onClick?'button':undefined} className={'card'+(s===1||s===2?' red':'')+(small?' small':'')} onClick={onClick} disabled={disabled}>{RANKS[c%13]}<i>{SUITS[s]}</i></Tag>;
}
const backs=n=>Array.from({length:n||0},(_,i)=><Card key={i} back small/>);
const netText=n=>n>0?`ชนะ! +${n.toLocaleString()} ชิป`:n<0?`แพ้ −${(-n).toLocaleString()} ชิป`:'เสมอ คืนชิป';
const outcomeText={win:'ชนะ',lose:'แพ้',push:'เสมอ'};
function StakePicker({stake,setStake,chips}){
 return <div className="flex flex-wrap gap-2 items-center"><input className="stake" type="number" inputMode="numeric" min="1" max="1000" value={stake} onChange={e=>setStake(e.target.value)} aria-label="ชิปต่อตา"/>{[10,50,100,500,1000].map(v=><button type="button" className="chip" key={v} disabled={v>chips} onClick={()=>setStake(String(v))}>{v.toLocaleString()}</button>)}</div>;
}
export function GameTable({name,t,chips,pending,command}){
 const [stake,setStake]=useState('10'),[kind,setKind]=useState('red'),[number,setNumber]=useState('7');
 const info=GAME_INFO[name],active=t&&t.phase!=='done',n=Number(stake),num=Number(number);
 const stakeError=!(Number.isInteger(n)&&n>=1&&n<=1000)?'ใส่จำนวนเต็ม 1–1,000 ชิป':n>chips?'ชิปไม่พอ':name==='roulette'&&kind==='number'&&!(Number.isInteger(num)&&num>=0&&num<=36)?'เลือกเลข 0–36':'';
 const act=(action,extra={})=>command('game',{game:name,action,step:t.step,...extra});
 const begin=()=>command('game',{game:name,action:'start',stake:n,...(name==='roulette'?{kind,...(kind==='number'?{number:num}:{})}:{})});
 return <section className="panel table">
  <div className="flex justify-between items-center"><h3>{info.title}</h3><span className={'phase '+(active?'open':'closed')}>{active?'กำลังเล่น':'พร้อมเริ่ม'}</span></div>
  <p className="text-xs text-slate-400 mb-4">{info.rules}</p>
  {t&&<Board name={name} t={t} pending={pending} act={act}/>}
  {t?.phase==='done'&&<p className={'mybet '+(t.net>0?'win':t.net<0?'lose':'')}>ลง {t.stake.toLocaleString()} ชิป • {netText(t.net)}</p>}
  {!active&&<div className="mt-4">
   {name==='roulette'&&<><div className="grid grid-cols-5 gap-2 mb-3">{Object.entries(BETS).map(([k,label])=><button type="button" key={k} className={'chip'+(kind===k?' picked':'')+(k==='red'?' redchip':k==='black'?' blackchip':'')} onClick={()=>setKind(k)}>{label}</button>)}</div>
    {kind==='number'&&<label>เลข 0–36<input type="number" inputMode="numeric" min="0" max="36" value={number} onChange={e=>setNumber(e.target.value)}/></label>}</>}
   <label>ชิปต่อตา</label><StakePicker stake={stake} setStake={setStake} chips={chips}/>
   {stakeError&&<p className="text-xs warn">{stakeError}</p>}
   <button className="start" disabled={pending||!!stakeError} onClick={begin}>{name==='roulette'?'หมุนวงล้อ':t?'เล่นตาใหม่':'เริ่มเล่น'} ({n>0?n.toLocaleString():0} ชิป)</button>
  </div>}
 </section>;
}
function Seat({label,cards,count,note,bot}){
 return <div className="seat"><div className="seat-name">{bot?'🤖 ':''}{label}{note&&<b> • {note}</b>}</div><div className="cards">{cards?cards.map((c,i)=><Card key={i} c={c} small/>):backs(count)}</div></div>;
}
function Board({name,t,pending,act}){
 const done=t.phase==='done';
 if(name==='roulette')return <div className="text-center"><div className={'wheel '+(t.result===0?'green':RED.has(t.result)?'redbg':'blackbg')}>{t.result}</div>
  <p className="result">คุณแทง {BETS[t.kind]}{t.kind==='number'?' '+t.number:''}</p>
  <div className="flex flex-wrap gap-2 justify-center mb-2">{t.bots.map(b=><span className="badge" key={b.name}>🤖 {b.name}: {BETS[b.kind]}{b.kind==='number'?' '+b.number:''} • {b.win?'ชนะ':'แพ้'}</span>)}</div></div>;
 if(name==='pokdeng'||name==='kaokae'){
  const me=t.players[0];
  return <div>
   <Seat label="เจ้ามือ" bot cards={t.dealer} count={t.dealerCount} note={done?t.dealerHand.name:''}/>
   {t.players.slice(1).map((p,i)=><Seat key={p.name} label={p.name} bot cards={p.hand} count={p.handCount} note={done?t.results[i+1].hand.name+' • '+outcomeText[t.results[i+1].outcome]:''}/>)}
   <Seat label="คุณ" cards={me.hand} note={done?t.results[0].hand.name+' • '+outcomeText[t.results[0].outcome]+(t.results[0].hand.deng>1&&name==='pokdeng'?` ${t.results[0].hand.deng} เด้ง`:''):t.myHand?.name+(name==='pokdeng'&&t.myHand?.deng>1?` • ${t.myHand.deng} เด้ง`:'')}/>
   {!done&&<div className="grid grid-cols-2 gap-2 mt-3"><button disabled={pending||me.hand.length>2} onClick={()=>act('draw')}>จั่วเพิ่ม</button><button disabled={pending} onClick={()=>act('stand')}>ไม่จั่ว / เปิดไพ่</button></div>}
  </div>;
 }
 if(name==='phasomsip'){
  const me=t.players[0];
  return <div>
   {t.players.slice(1).map((p,i)=><Seat key={p.name} label={p.name} bot cards={done?[]:null} count={p.handCount} note={`เก็บ ${p.pile.length} ใบ${p.sweeps?` • สวีป ${p.sweeps}`:''}${done?` • ${t.scores[i+1]} คะแนน`:''}`}/>)}
   <div className="felt"><div className="seat-name">บนโต๊ะ • เหลือในสำรับ {t.deckCount} ใบ</div><div className="cards">{t.table.length?t.table.map((c,i)=><Card key={i} c={c}/>):<span className="text-slate-400 text-sm">โต๊ะว่าง</span>}</div></div>
   <div className="seat"><div className="seat-name">คุณ • เก็บ {me.pile.length} ใบ{me.sweeps?` • สวีป ${me.sweeps}`:''}{done?` • ${t.scores[0]} คะแนน`:''}</div><div className="cards">{me.hand.map((c,i)=><Card key={i} c={c} disabled={pending||done} onClick={done?undefined:()=>act('play',{card:i})}/>)}</div>{!done&&<p className="text-xs text-slate-400">แตะไพ่เพื่อลง</p>}</div>
   <Log t={t} render={e=>`${t.players[e.who].name} ลง ${label(e.card)}${e.captured!=null?` เก็บ ${label(e.captured)}${e.sweep?' • สวีป!':''}`:''}`}/>
  </div>;
 }
 const me=t.players[0],order=me.hand.map((c,i)=>[c,i]).sort((a,b)=>Math.floor(a[0]/13)-Math.floor(b[0]/13)||a[0]%13-b[0]%13),discarding=!done&&t.turnPhase==='discard';
 return <div>
  {t.players.slice(1).map((p,i)=><Seat key={p.name} label={p.name} bot cards={p.hand} count={p.handCount} note={done&&t.winner===i+1?'รัมมี่! ชนะ':''}/>)}
  <div className="felt flex gap-6 items-end"><div><div className="seat-name">กองกลาง {t.deckCount}</div><Card back onClick={undefined}/></div><div><div className="seat-name">กองทิ้ง</div><Card c={t.discardTop}/></div></div>
  <div className="seat"><div className="seat-name">คุณ • จัดชุดได้ {t.meldedCount}/7{done&&t.winner===0?' • รัมมี่! ชนะ':''}{done&&t.winner===-1?' • ครบ 40 รอบ เสมอ':''}</div>
   <div className="cards">{order.map(([c,i])=><Card key={c} c={c} disabled={pending||!discarding} onClick={discarding?()=>act('discard',{card:i}):undefined}/>)}</div>
   {!done&&(t.turnPhase==='draw'?<div className="grid grid-cols-2 gap-2 mt-3"><button disabled={pending} onClick={()=>act('draw',{from:'deck'})}>จั่วกองกลาง</button><button disabled={pending||t.discardTop==null} onClick={()=>act('draw',{from:'discard'})}>เก็บใบทิ้ง</button></div>:<p className="text-xs text-slate-400">แตะไพ่ 1 ใบเพื่อทิ้ง</p>)}
  </div>
  <Log t={t} render={e=>`${t.players[e.who].name} ทิ้ง ${label(e.discard)}`}/>
 </div>;
}
const label=c=>RANKS[c%13]+SUITS[Math.floor(c/13)];
function Log({t,render}){return t.log.length?<ul className="log">{t.log.slice(-4).reverse().map((e,i)=><li key={i}>{render(e)}</li>)}</ul>:null;}
