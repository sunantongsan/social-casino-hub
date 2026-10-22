import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
const endpoint=process.env.HUB_ENDPOINT;
if(!endpoint)throw Error('HUB_ENDPOINT required');
const a='guest:'+randomBytes(32).toString('hex'),b='guest:'+randomBytes(32).toString('hex');
async function call(token,type='state',payload={}){const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,type,payload}),signal:AbortSignal.timeout(15000)});return r.json();}
const sa=await call(a),sb=await call(b);assert.equal(sa.ok,true);assert.equal(sb.ok,true);assert.equal(sa.state.wallet.chips,1000);assert.equal(sa.state.round.id,sb.state.round.id);
const req={requestId:randomUUID(),to:sb.state.userId,cost:100};
const gift=await call(a,'gift',req);assert.equal(gift.ok,true);const replay=await call(a,'gift',req);assert.equal(replay.result.giftId,gift.result.giftId);
const claimed=await call(b,'claim',{giftId:gift.result.giftId});assert.equal(claimed.state.wallet.chips,1050);
assert.equal((await call(a)).state.wallet.chips,900);
assert.equal((await call('invalid')).error,'AUTH_REQUIRED');assert.equal((await call(a,'payout',{chips:999999})).error,'UNSUPPORTED_COMMAND');
console.log('PASS cloud: 2 guest identities, shared round, durable gift and claim, replay and auth rejection');
