import GameLobby from './GameLobby';
import SicBo from './SicBo';
import PatchGate from './PatchGate';
import Tables,{games} from './Tables';
import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {io} from 'socket.io-client';
import {rewardedAds} from './ads';
import './style.css';
import {internalConnection,guestToken} from './internal';
const internal=import.meta.env.VITE_INTERNAL_TEST==='true';
const demo=import.meta.env.VITE_DEV_AUTH==='true';
const url=import.meta.env.VITE_SERVER_URL||'http://localhost:3001';
const names={small:'ต่ำ 4–10',big:'สูง 11–17',triple:'ตอง'};
const errors={CANNOT_KNOCK:'ไพ่ยังจัดชุดเพื่อน็อกไม่ได้',INVALID_BET:'จำนวนชิปหรือช่องที่เลือกไม่ถูกต้อง',READY_REQUIRED:'กดพร้อมเล่นก่อนเริ่มตา',ROUND_ACTIVE:'รอให้ตาปัจจุบันจบก่อน',JOIN_FIRST:'กดพร้อมเล่นก่อน',NOT_YOUR_TURN:'ยังไม่ถึงตาคุณ',INVALID_ACTION:'ทำรายการนี้ในจังหวะนี้ไม่ได้',RAISE_LIMIT:'เกทับครบ 2 ครั้งแล้ว',EMPTY_PILE:'ไม่มีไพ่ในกอง',DRAW_FIRST:'จั่วไพ่ก่อนครับ',INVALID_MELD:'ชุดไพ่ยังไม่ถูกต้อง',INVALID_CARD:'เลือกไพ่ในมือ',INVALID_GAME:'ไม่พบเกม',TABLE_FULL:'โต๊ะเต็ม รอผู้เล่นออก',STALE_ACTION:'สถานะโต๊ะเปลี่ยนแล้ว ลองใหม่อีกครั้ง',BETTING_CLOSED:'ปิดรับชิปแล้ว รอรอบถัดไป',ONE_BET_PER_ROUND:'ลงชิปได้หนึ่งครั้งต่อรอบ',INSUFFICIENT_OR_LIMIT:'ชิปไม่พอหรือเกินวงเงิน',REWARD_NOT_ELIGIBLE:'รับได้เมื่อชิปหมด ไม่มีเดิมพันค้าง และพ้น 2 นาที',RATE_LIMIT:'กรุณารอสักครู่',INVALID_RECIPIENT:'ไม่พบผู้รับ หรือส่งให้ตนเองไม่ได้'};
function App(){
 const [game,setGame]=useState(null),[walletOpen,setWalletOpen]=useState(false);
 const [socket,setSocket]=useState(null),[s,setS]=useState(null),[status,setStatus]=useState('ยังไม่เชื่อมต่อ'),[notice,setNotice]=useState(''),[stake,setStake]=useState(10),[pending,setPending]=useState(false),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[to,setTo]=useState('');
 useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(''),4500);return()=>clearTimeout(timer);},[notice]);
 function connect(token){
  socket?.disconnect();const c=internal?internalConnection(import.meta.env.VITE_INTERNAL_ENDPOINT,token):io(url,{auth:{token},transports:['websocket']});setSocket(c);
  c.on('connect',()=>setStatus('เชื่อมต่อแล้ว'));c.on('disconnect',()=>{setStatus('ขาดการเชื่อมต่อ • กดเข้าเล่นอีกครั้ง');setS(null);});c.on('connect_error',()=>setStatus('เชื่อมต่อไม่สำเร็จ ตรวจสอบบัญชีและเซิร์ฟเวอร์'));c.on('state',setS);
 }
 useEffect(()=>()=>socket?.disconnect(),[socket]);
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
  socket.timeout(8000).emit('command',{type,payload},(err,r)=>{setPending(false);setNotice(err?'ไม่ได้รับคำตอบ ตรวจสอบยอดก่อนทำรายการใหม่':r.error?(errors[r.error]||r.error):'ทำรายการสำเร็จ');});
 }
 async function refill(){if(!s){await login();return;}if(internal)command('internalRefill',{requestId:crypto.randomUUID()});else if(demo)command('demoReward');else try{await rewardedAds.show();}catch(e){setNotice(e.message);}}
 return <main className={'resort-app '+(game?'in-game':'in-lobby')}>
 <header className="resort-header"><button className="brand" onClick={()=>setGame(null)} aria-label="กลับล็อบบี้"><span className="brand-mark">♠</span><span>SOCIAL CASINO<small>ISLAND HUB</small></span></button><div className="header-wallet">{s?<><span className="coin-symbol">✦</span><strong>{s.wallet.chips.toLocaleString()}</strong><button aria-label="เติมชิปทดสอบ" disabled={pending} onClick={refill}>+</button></>:<button onClick={login}>เข้าเล่น</button>}</div><button className="gift-toggle" onClick={()=>setWalletOpen(!walletOpen)} aria-expanded={walletOpen}>ของขวัญ{s?.gifts.length?' • '+s.gifts.length:''}</button></header>
 <div className="connection-line"><span className={s?'online-dot':'offline-dot'}/>{status}<span>ชิปจำลองเท่านั้น • 0.3.4</span></div>
 {!game?<GameLobby onSelect={setGame}/>:<div className="room-heading"><button className="back-lobby" onClick={()=>setGame(null)}>‹ ล็อบบี้</button><h1>{games[game]}</h1><span>โต๊ะทดสอบ</span></div>}
 {!s&&game?<section className="panel login-panel"><h3>เข้าเล่นที่โต๊ะ</h3>{!demo&&!internal&&<><input aria-label="อีเมล" placeholder="อีเมลบัญชี Supabase ที่สร้างไว้" value={email} onChange={e=>setEmail(e.target.value)} type="email"/><input aria-label="รหัสผ่าน" placeholder="รหัสผ่าน" value={password} onChange={e=>setPassword(e.target.value)} type="password"/></>}<button onClick={login}>เข้าเล่น{demo?'แบบทดลอง':internal?'แบบผู้เยี่ยมชม':''}</button></section>:s&&game?<div className="game-layout">{game==='sicbo'?<SicBo s={s} stake={stake} setStake={setStake} command={command} pending={pending}/>:<Tables key={game} game={game} s={s} stake={stake} command={command} pending={pending}/>}
 <aside className="panel game-wallet"><span className="eyebrow">ชิปของคุณ</span><h2 className="balance">{s.wallet.chips.toLocaleString()}</h2><button disabled={pending||(!internal&&!demo&&s.wallet.chips!==0)} onClick={refill}>{internal||demo?'เติมชิปทดสอบ +10,000':'ดูโฆษณารับชิป'}</button><label>{game==='rummy'?'เรตโต๊ะ × แต้ม':'ชิปต่อครั้ง'}<input type="number" min="1" max={game==='sicbo'?s.wallet.chips:1000} value={stake} onChange={e=>setStake(Number(e.target.value))}/></label><div className="stake-presets">{(game==='rummy'?[1,5,10,20]:[10,50,100,500]).map(n=><button className={stake===n?'chosen':''} key={n} onClick={()=>setStake(n)}>{game==='rummy'?'×':''}{n}</button>)}</div></aside></div>:null}
 {walletOpen&&<div className="gift-overlay" onClick={()=>setWalletOpen(false)}><section className="panel gift-panel" role="dialog" aria-modal="true" aria-label="ของขวัญและชิป" onClick={e=>e.stopPropagation()}><button className="close-panel" aria-label="ปิดของขวัญ" onClick={()=>setWalletOpen(false)}>×</button><h2>ของขวัญและชิป</h2>{s?<><div className="gift-illustration" aria-hidden="true">🎁</div><p>ส่ง 100 ชิป ผู้รับแปลงได้ 50 ชิป</p><input aria-label="รหัสผู้รับ" placeholder="วางรหัสผู้รับ" value={to} onChange={e=>setTo(e.target.value)}/><button disabled={pending} onClick={()=>command('gift',{requestId:crypto.randomUUID(),to,cost:100})}>ส่งของขวัญ 100 ชิป</button><p className="player-id">รหัสคุณ: {s.userId}</p>{s.gifts.map(g=><button key={g.id} disabled={pending} onClick={()=>command('claim',{giftId:g.id})}>รับของขวัญ {g.value} ชิป</button>)}<hr/><button disabled={pending||(!internal&&!demo&&s.wallet.chips!==0)} onClick={refill}>{internal||demo?'เติมชิปทดสอบ +10,000':'ดูโฆษณารับชิป'}</button></>:<button onClick={login}>เข้าเล่นเพื่อใช้ของขวัญ</button>}</section></div>}
 <p role="status" className={notice?"notice toast":"notice empty"}>{notice}</p><footer><a href="/privacy.html">นโยบายความเป็นส่วนตัว</a><br/>Social Casino Hub · Internal 0.3.4 · บอตมีป้ายกำกับเสมอ</footer></main>;
}
createRoot(document.getElementById('root')).render(<PatchGate><App/></PatchGate>);
