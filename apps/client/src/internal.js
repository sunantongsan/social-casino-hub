// Cloud internal-test transport: same command interface, durable server state.
// HTTP polling every 2s avoids keeping a server process alive; production Socket.IO stays available.
export function internalConnection(endpoint,token){
 const events={};let closed=false,timer,busy=false;
 const emit=(name,data)=>{for(const fn of events[name]||[])fn(data);};
 const c={connected:false,on(n,fn){(events[n]??=[]).push(fn);return c;},disconnect(){closed=true;clearTimeout(timer);c.connected=false;},timeout(){return c;},emit(n,msg,cb){request(msg.type,msg.payload).then(r=>cb(null,r)).catch(e=>cb(e));}};
 async function request(type='state',payload={}){
  const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,type,payload}),signal:AbortSignal.timeout(12000)});
  const d=await r.json();if(d.state&&!closed){if(!c.connected){c.connected=true;emit('connect');}emit('state',d.state);}return d;
 }
 async function poll(){if(closed)return;try{if(!busy){busy=true;const r=await request();if(r.error)throw Error(r.error);}}catch{emit('connect_error');}finally{busy=false;if(!closed)timer=setTimeout(poll,2000);}}
 timer=setTimeout(poll,0);return c;
}
export function guestToken(){let token=localStorage.getItem('hub-internal-token');if(!token){const bytes=crypto.getRandomValues(new Uint8Array(32));token='guest:'+Array.from(bytes,v=>v.toString(16).padStart(2,'0')).join('');localStorage.setItem('hub-internal-token',token);}return token;}
