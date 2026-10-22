import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {io} from 'socket.io-client';
import {rewardedAds} from './ads';
import './style.css';
import {internalConnection,guestToken} from './internal';
import {GameTable,GAME_INFO} from './games';
import {checkForPatch,bundleVersion} from './updater';
const internal=import.meta.env.VITE_INTERNAL_TEST==='true';
const demo=import.meta.env.VITE_DEV_AUTH==='true';
const url=import.meta.env.VITE_SERVER_URL||'http://localhost:3001';
const names={small:'ต่ำ 4–10',big:'สูง 11–17',triple:'ตอง'};
const faces=['⚀','⚁','⚂','⚃','⚄','⚅'];
const quick=[10,50,100,500,1000];
const errors={BETTING_CLOSED:'ปิดรับชิปแล้ว รอรอบถัดไป',ONE_BET_PER_ROUND:'ลงชิปได้หนึ่งครั้งต่อรอบ',INSUFFICIENT_OR_LIMIT:'ชิปไม่พอหรือเกินวงเงิน',REWARD_NOT_ELIGIBLE:'รับได้เมื่อชิปหมด ไม่มีเดิมพันค้าง และพ้น 2 นาที',RATE_LIMIT:'กรุณารอสักครู่',INVALID_RECIPIENT:'ไม่พบผู้รับ หรือส่งให้ตนเองไม่ได้',INVALID_BET:'จำนวนชิปต้องเป็นจำนวนเต็ม 1–1,000',INVALID_COST:'จำนวนชิปของขวัญไม่ถูกต้อง',INVALID_GIFT:'ไม่พบของขวัญนี้',REQUEST_ID_REUSED:'รายการซ้ำ กรุณาลองใหม่',INVALID_REQUEST_ID:'รายการไม่ถูกต้อง กรุณาลองใหม่',AUTH_REQUIRED:'กรุณาเข้าสู่ระบบใหม่',BUSY_RETRY:'เซิร์ฟเวอร์ไม่ว่าง กรุณาลองใหม่',SERVER_ERROR:'เซิร์ฟเวอร์ขัดข้อง กรุณาลองใหม่',REQUEST_FAILED:'ทำรายการไม่สำเร็จ กรุณาลองใหม่',INTERNAL_TEST_CAPACITY:'ผู้ทดสอบเต็มแล้ว',MAINTENANCE_REQUIRED:'ระบบกำลังปรับปรุง',UNSUPPORTED_COMMAND:'คำสั่งไม่รองรับ',INVALID_GAME:'ไม่พบเกมนี้',TABLE_ACTIVE:'ยังเล่นตานี้ไม่จบ',NO_TABLE:'ยังไม่ได้เริ่มเกม',STALE_ACTION:'ข้อมูลเก่า ลองอีกครั้ง',INVALID_ACTION:'ทำแบบนี้ไม่ได้ในตอนนี้'};
const done={game:'',bet:'ลงชิปแล้ว รอผลลูกเต๋า',gift:'ส่งของขวัญแล้ว',claim:'รับของขวัญแล้ว',internalRefill:'เติมชิปแล้ว',demoReward:'เติมชิปแล้ว'};
// Display-only mirror of game-core payout(); the server alone settles chips.
function outcome(dice){const sum=dice.reduce((a,b)=>a+b,0),triple=dice.every(d=>d===dice[0]);return {sum,triple,kind:triple?'triple':sum<=10?'small':'big'};}
function returned(dice,b){return outcome(dice).kind===b.kind?b.stake*(b.kind==='triple'?31:2):0;}
function App(){
 const [socket,setSocket]=useState(null),[s,setS]=useState(null),[status,setStatus]=useState('ยังไม่เชื่อมต่อ'),[notice,setNotice]=useState(''),[stakeText,setStakeText]=useState('10'),[pending,setPending]=useState(false),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[to,setTo]=useState(''),[,setClock]=useState(0),[tab,setTab]=useState('hilo'),[applyPatch,setApplyPatch]=useState(null);
 const offset=useRef(0),lastRound=useRef(null);
 function onState(v){if(Number.isFinite(v?.serverNow))offset.current=v.serverNow-Date.now();if(lastRound.current&&lastRound.current!==v.round.id)setNotice('');lastRound.current=v.round.id;setS(v);}
 function connect(token){
  socket?.disconnect();const c=internal?internalConnection(import.meta.env.VITE_INTERNAL_ENDPOINT,token):io(url,{auth:{token},transports:['websocket']});setSocket(c);
  c.on('connect',()=>setStatus('เชื่อมต่อแล้ว'));c.on('disconnect',()=>{setStatus('ขาดการเชื่อมต่อ • กดเข้าเล่นอีกครั้ง');setS(null);});c.on('connect_error',()=>setStatus('เชื่อมต่อไม่สำเร็จ ตรวจสอบบัญชีและเซิร์ฟเวอร์'));c.on('state',onState);
 }
 useEffect(()=>()=>socket?.disconnect(),[socket]);
 useEffect(()=>{checkForPatch(apply=>setApplyPatch(()=>apply)).catch(()=>{});},[]);
 // Re-render between server updates so the countdown runs smoothly (internal mode polls every 2s).
 const playing=!!s;
 useEffect(()=>{if(!playing)return;const t=setInterval(()=>setClock(Date.now()),250);return ()=>clearInterval(t);},[playing]);
 async function login(){
  try{
   if(internal){connect(guestToken());return;}
   if(demo){let id=localStorage.getItem('hub-demo-id');if(!id){id=crypto.randomUUID();localStorage.setItem('hub-demo-id',id);}connect('dev:'+id);return;}
   const response=await fetch(import.meta.env.VITE_SUPABASE_URL+'/auth/v1/token?grant_type=password',{method:'POST',headers:{'Content-Type':'application/json',apikey:import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY},body:JSON.stringify({email,password})});
   const data=await response.json();if(!response.ok)throw Error('เข้าสู่ระบบไม่สำเร็จ');connect(data.access_token);setPassword('');
  }catch(e){setNotice(e.message);}
 }
 function command(type,payload={}){
  if(!socket?.connected||pending)return;setPending(true);
  socket.timeout(8000).emit('command',{type,payload},(err,r)=>{setPending(false);setNotice(err?'ไม่ได้รับคำตอบ ตรวจสอบยอดก่อนทำรายการใหม่':r.error?(errors[r.error]||r.error):done[type]??'ทำรายการสำเร็จ');});
 }
 const live=s?.round.phase==='BETTING';
 const remaining=s?Math.max(0,Math.ceil((s.round.endsAt-(Date.now()+offset.current))/1000)):0;
 const myBet=s?.round.bets[s.userId];
 const stake=Number(stakeText);
 const stakeError=!s?'':!(stakeText!==''&&Number.isInteger(stake)&&stake>=1&&stake<=1000)?'ใส่จำนวนเต็ม 1–1,000 ชิป':stake>s.wallet.chips?'ชิปไม่พอ':'';
 const result=s?.round.dice&&outcome(s.round.dice);
 const won=myBet&&result?returned(s.round.dice,myBet):0;
 return <main className="max-w-5xl mx-auto p-5 md:p-10">
 {applyPatch&&<button className="patch" onClick={()=>applyPatch().catch(()=>setNotice('ติดตั้งอัปเดตไม่สำเร็จ จะลองใหม่เมื่อเปิดแอปครั้งถัดไป'))}>🎁 มีอัปเดตเกมใหม่ • แตะเพื่อโหลดเกมใหม่</button>}
 <header className="flex justify-between items-center mb-9"><div><span className="eyebrow">PLAY • CONNECT • UNWIND</span><h1 className="text-2xl md:text-4xl font-bold">Social Casino <em>Hub</em></h1></div><span className="badge">ชิปจำลองเท่านั้น</span></header>
 {!s&&<div className="hero"><div><span className="eyebrow">โต๊ะไฮโล / SIC BO</span><h2>พบเพื่อนใหม่<br/>ในทุกตาที่เล่น</h2><p>เพื่อความบันเทิง ไม่มีการถอนเงินหรือแลกรางวัลจริง</p></div><div className="hero-dice">⚄ ⚂ ⚅</div></div>}
 <nav className="flex gap-2 overflow-x-auto py-5">{[['hilo','ไฮโล'],...Object.entries(GAME_INFO).map(([k,g])=>[k,g.title])].map(([k,n])=><button type="button" key={k} className={'badge tab '+(tab===k?'active':'')} onClick={()=>setTab(k)}>{n}{s?.tables?.[k]&&s.tables[k].phase!=='done'?' •':''}</button>)}</nav>
 <p className="text-sm mb-4 text-slate-400">{status} {demo?'• โหมดทดลอง ยอดไม่ใช่บัญชีจริง':internal?'• รุ่นทดสอบภายใน 0.2.0':''}</p>
 {!s?<section className="panel max-w-md"><h3>เข้าเล่นที่โต๊ะ</h3>{!demo&&!internal&&<><input aria-label="อีเมล" placeholder="อีเมลบัญชี Supabase ที่สร้างไว้" value={email} onChange={e=>setEmail(e.target.value)} type="email"/><input aria-label="รหัสผ่าน" placeholder="รหัสผ่าน" value={password} onChange={e=>setPassword(e.target.value)} type="password"/></>}<button onClick={login}>เข้าเล่น{demo?'แบบทดลอง':internal?'แบบผู้เยี่ยมชม':''}</button></section>:<div className="grid md:grid-cols-[2fr_1fr] gap-5">{tab!=='hilo'?<GameTable key={tab} name={tab} t={s.tables?.[tab]} chips={s.wallet.chips} pending={pending} command={command}/>:<section className="panel table">
  <div className="flex justify-between items-center"><h3>โต๊ะกลาง</h3><span className={'phase '+(live?'open':'closed')}>{live?'เปิดรับชิป':'ผลรอบนี้'}</span></div>
  <p className="countdown"><b className={live&&remaining<=5?'urgent':''}>{remaining}</b> วินาที{live?' ก่อนปิดรับชิป':' ถึงรอบถัดไป'}<small> • รอบ {s.round.id.slice(0,6)}</small></p>
  <div className="timebar"><i style={{width:Math.min(100,remaining/(live?20:7)*100)+'%'}}/></div>
  <div className={'dice'+(result?'':' waiting')} aria-live="polite">{result?s.round.dice.map((d,i)=><span key={i}>{faces[d-1]}</span>):<><span>?</span><span>?</span><span>?</span></>}</div>
  <p className={'result'+(result?'':' muted')}>{result?`แต้มรวม ${result.sum} • ${result.triple?'ตอง!':names[result.kind]}`:'รอเขย่าลูกเต๋า…'}</p>
  {myBet&&<p className={'mybet '+(result?(won?'win':'lose'):'')}>คุณลง {names[myBet.kind]} {myBet.stake.toLocaleString()} ชิป{result?(won?` • ชนะ! ได้รับ ${won.toLocaleString()} ชิป`:` • แพ้ −${myBet.stake.toLocaleString()} ชิป`):' • รอผล'}</p>}
  <div className="grid grid-cols-3 gap-2">{Object.entries(names).map(([k,n])=><button className={myBet?.kind===k?'chosen':''} disabled={!live||pending||!!myBet||!!stakeError} key={k} onClick={()=>command('bet',{requestId:crypto.randomUUID(),roundId:s.round.id,kind:k,stake})}>{n}<small>{k==='triple'?'กำไร 30:1':'กำไร 1:1'}</small></button>)}</div>
  <label>ชิปต่อครั้ง<input type="number" inputMode="numeric" min="1" max="1000" step="1" value={stakeText} onChange={e=>setStakeText(e.target.value)}/></label>
  <div className="flex flex-wrap gap-2">{quick.map(v=><button type="button" className="chip" key={v} disabled={v>s.wallet.chips} onClick={()=>setStakeText(String(v))}>{v.toLocaleString()}</button>)}</div>
  {stakeError&&<p className="text-xs warn">{stakeError}</p>}
  <p className="text-xs text-slate-400 mt-3">ตองทำให้สูง/ต่ำแพ้ • ลงได้ 1 ครั้งต่อรอบ • สูงสุด 1,000 ชิป</p>
  <div className="mt-6 flex flex-wrap gap-2">{s.players.map(p=><span className="badge" key={p.id}>{p.bot?'🤖 บอต '+(Number(p.id.split(':')[1])+1):(p.id===s.userId?'⭐ คุณ ':'👤 ผู้เล่น ')+p.id.slice(-4)}{s.round.bets[p.id]?' • ลงแล้ว':''}</span>)}</div></section>}
 <aside className="panel"><span className="eyebrow">ชิปของคุณ</span><h2 className="balance">{s.wallet.chips.toLocaleString()}</h2><button disabled={pending||s.wallet.chips!==0} onClick={async()=>{if(internal)command('internalRefill',{requestId:crypto.randomUUID()});else if(demo)command('demoReward');else try{await rewardedAds.show();}catch(e){setNotice(e.message);}}}>{internal||demo?'เติมชิปทดสอบ (ไม่มีโฆษณา)':'ดูโฆษณารับชิป'}</button>{s.wallet.chips!==0&&<p className="text-xs text-slate-400">เติมได้เมื่อชิปหมด</p>}<hr/><h3>ส่งของขวัญ</h3><p className="text-xs">ส่ง 100 ชิป ผู้รับแปลงได้ 50 ชิป</p><input aria-label="รหัสผู้รับ" placeholder="รหัสผู้รับ" value={to} onChange={e=>setTo(e.target.value)}/><button disabled={pending||!to.trim()||s.wallet.chips<100} onClick={()=>command('gift',{requestId:crypto.randomUUID(),to:to.trim(),cost:100})}>ส่งของขวัญ 100 ชิป</button><p className="text-xs break-all mt-3">รหัสคุณ: {s.userId}</p>{s.gifts.map(g=><button key={g.id} disabled={pending} onClick={()=>command('claim',{giftId:g.id})}>รับของขวัญ {g.value} ชิป</button>)}</aside></div>}
 <p role="status" className="notice">{notice}</p><footer><a href="/privacy.html">นโยบายความเป็นส่วนตัว</a><br/>Social Casino Hub · Internal 0.3.0{bundleVersion?` · แพตช์ ${bundleVersion}`:''} · บอตมีป้ายกำกับเสมอ</footer></main>;
}
createRoot(document.getElementById('root')).render(<App/>);
