import {initial} from '../../../packages/game-core/index.mjs';
export async function createStore(){
 if(!process.env.DATABASE_URL){
   if(process.env.DEV_AUTH!=='true'||process.env.NODE_ENV==='production')throw Error('DATABASE_REQUIRED');
   let state=initial();let queue=Promise.resolve();
   return {run(fn){const result=queue.then(()=>{const next=structuredClone(state);const out=fn(next);state=next;return out;});queue=result.catch(()=>{});return result;}};
 }
 const {default:pg}=await import('pg');
 const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,max:5,ssl:{rejectUnauthorized:true,...(process.env.DATABASE_CA?{ca:process.env.DATABASE_CA}:{})}});
 return {async run(fn){
   const c=await pool.connect();try{
    await c.query('BEGIN');await c.query("SET LOCAL statement_timeout = '5s'");
    await c.query('INSERT INTO hub_private.state(id,data) VALUES(1,$1) ON CONFLICT DO NOTHING',[JSON.stringify(initial())]);
    const {rows}=await c.query('SELECT data FROM hub_private.state WHERE id=1 FOR UPDATE');
    const s=rows[0].data;const out=fn(s);
    await c.query('UPDATE hub_private.state SET data=$1 WHERE id=1',[JSON.stringify(s)]);
    await c.query('COMMIT');return out;
   }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 }};
}
