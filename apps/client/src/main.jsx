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
const errors={BETTING_CLOSED:'ปิดรับชิปแล้ว รอรอบถัดไป',ONE_BET_PER_ROUND:'ลงชิปได้หนึ่งครั้งต่อรอบ',INSUFFICIENT_OR_LIMIT:'ชิปไม่พอหรือเกินวงเงิน',REWARD_NOT_ELIGIBLE:'รับได้เมื่อชิปหมด ไม่มีเดิมพันค้าง และพ้น 2 นาที',RATE_LIMIT:'กรุณารอสักครู่',INVALID_RECIPIENT:'ไม่พบผู้รับ หรือส่งให้ตนเองไม่ได้'};
function App(){
 const [socket,setSocket]=useState(null),[s,setS]=useState(null),[status,setStatus]=useState('ยังไม่เชื่อมต่อ'),[notice,setNotice]=useState(''),[stake,setStake]=useState(10),[pending,setPending]=useState(false),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[to,setTo]=useState('');
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
 const live=s?.round.phase==='BETTING';
 return <main className="max-w-5xl mx-auto p-5 md:p-10">
 <header className="flex justify-between items-center mb-9"><div><span className="eyebrow">PLAY • CONNECT • UNWIND</span><h1 className="text-2xl md:text-4xl font-bold">Social Casino <em>Hub</em></h1></div><span className="badge">ชิปจำลองเท่านั้น</span></header>
 <div className="hero"><div><span className="eyebrow">โต๊ะไฮโล / SIC BO</span><h2>พบเพื่อนใหม่<br/>ในทุกตาที่เล่น</h2><p>เพื่อความบันเทิง ไม่มีการถอนเงินหรือแลกรางวัลจริง</p></div><div className="hero-dice">⚄ ⚂ ⚅</div></div>
 <nav className="flex gap-2 overflow-x-auto py-5">{['ไฮโล','ไพ่ผสมสิบ','รัมมี่','ป๊อกเด้ง','เก้าเก','วงล้อ Roulette'].map((n,i)=><span key={n} className={'badge '+(!i?'active':'')}>{n}{i?' · เร็ว ๆ นี้':''}</span>)}</nav>
 <p className="text-sm mb-4 text-slate-400">{status} {demo?'• โหมดทดลอง ยอดไม่ใช่บัญชีจริง':internal?'• รุ่นทดสอบภายใน 0.2.0':''}</p>
 {!s?<section className="panel max-w-md"><h3>เข้าเล่นที่โต๊ะ</h3>{!demo&&!internal&&<><input aria-label="อีเมล" placeholder="อีเมลบัญชี Supabase ที่สร้างไว้" value={email} onChange={e=>setEmail(e.target.value)} type="email"/><input aria-label="รหัสผ่าน" placeholder="รหัสผ่าน" value={password} onChange={e=>setPassword(e.target.value)} type="password"/></>}<button onClick={login}>เข้าเล่น{demo?'แบบทดลอง':internal?'แบบผู้เยี่ยมชม':''}</button></section>:<div className="grid md:grid-cols-[2fr_1fr] gap-5"><section className="panel table"><div className="flex justify-between"><h3>โต๊ะกลาง</h3><span>{live?'เปิดรับชิป':'ผลรอบนี้'}</span></div><p className="text-sm text-slate-400">{Math.max(0,Math.ceil((s.round.endsAt-Date.now())/1000))} วินาที • รอบ {s.round.id.slice(0,6)}</p><div className="dice">{s.round.dice?s.round.dice.map((d,i)=><span key={i}>{['⚀','⚁','⚂','⚃','⚄','⚅'][d-1]}</span>):'⚀ ⚀ ⚀'}</div><div className="grid grid-cols-3 gap-2">{Object.entries(names).map(([k,n])=><button disabled={!live||pending||!!s.round.bets[s.userId]||stake>s.wallet.chips} key={k} onClick={()=>command('bet',{requestId:crypto.randomUUID(),roundId:s.round.id,kind:k,stake})}>{n}<small>{k==='triple'?'กำไร 30:1':'กำไร 1:1'}</small></button>)}</div><label>ชิปต่อครั้ง<input type="number" min="1" max="1000" value={stake} onChange={e=>setStake(Number(e.target.value))}/></label><p className="text-xs text-slate-400">ตองทำให้สูง/ต่ำแพ้ • ลงได้ 1 ครั้งต่อรอบ • สูงสุด 1,000 ชิป</p><div className="mt-6 flex flex-wrap gap-2">{s.players.map(p=><span className="badge" key={p.id}>{p.bot?'🤖 บอต':'👤 ผู้เล่น'} {p.id.slice(-4)}</span>)}</div></section>
 <aside className="panel"><span className="eyebrow">ชิปของคุณ</span><h2 className="balance">{s.wallet.chips.toLocaleString()}</h2><button disabled={pending||s.wallet.chips!==0} onClick={async()=>{if(internal)command('internalRefill',{requestId:crypto.randomUUID()});else if(demo)command('demoReward');else try{await rewardedAds.show();}catch(e){setNotice(e.message);}}}>{internal||demo?'เติมชิปทดสอบ (ไม่มีโฆษณา)':'ดูโฆษณารับชิป'}</button><hr/><h3>ส่งของขวัญ</h3><p className="text-xs">ส่ง 100 ชิป ผู้รับแปลงได้ 50 ชิป</p><input aria-label="รหัสผู้รับ" placeholder="รหัสผู้รับ" value={to} onChange={e=>setTo(e.target.value)}/><button disabled={pending} onClick={()=>command('gift',{requestId:crypto.randomUUID(),to,cost:100})}>ส่งของขวัญ 100 ชิป</button><p className="text-xs break-all mt-3">รหัสคุณ: {s.userId}</p>{s.gifts.map(g=><button key={g.id} disabled={pending} onClick={()=>command('claim',{giftId:g.id})}>รับของขวัญ {g.value} ชิป</button>)}</aside></div>}
 <p role="status" className="notice">{notice}</p><footer><a href="/privacy.html">นโยบายความเป็นส่วนตัว</a><br/>Social Casino Hub · Internal 0.2.0 · บอตมีป้ายกำกับเสมอ</footer></main>;
}
createRoot(document.getElementById('root')).render(<App/>);
