import {randomInt,randomUUID} from 'node:crypto';
import {ensureUser,bet} from '../../../packages/game-core/index.mjs';
export class Bot {
 constructor(id){this.id=id;this.state='IDLE';this.roundId=null;this.due=0;}
 update(s,now,enabled){
   const r=s.round;
   if(!enabled||r.phase!=='BETTING'){this.state='IDLE';return;}
   if(this.roundId!==r.id){this.roundId=r.id;this.state='THINKING';this.due=now+randomInt(1500,6500);}
   if(r.bets[this.id]){this.state='WAIT_RESULT';return;}
   if(this.state!=='THINKING'||now<this.due)return;
   ensureUser(s,this.id,true);
   if(s.wallets[this.id].chips>=10){bet(s,this.id,{requestId:randomUUID(),roundId:r.id,kind:['small','big','triple'][randomInt(0,3)],stake:10},now);}
   this.state='WAIT_RESULT';
 }
}
