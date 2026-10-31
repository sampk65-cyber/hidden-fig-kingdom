const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function route({configured=true,tokenOK=true,uid='u1',pid='A',uids=['u1'],player=true}={}){
 const calls=[],admin={apps:configured?[{}]:[],auth:()=>({verifyIdToken:async()=>{if(!tokenOK)throw Error('invalid');return {uid}}}),firestore:()=>({doc:p=>({get:async()=>p.startsWith('users/')?{exists:true,data:()=>({pid})}:{exists:player,data:()=>({uids})}})})};
 const context={module:{exports:{}},require:n=>n==='firebase-admin'?admin:{createService:()=>({status:async me=>{calls.push(me);return {eligible:true}},verify:async()=>{throw Object.assign(Error('錯誤密語'),{code:'code'})}})},process:{env:configured?{FIREBASE_SERVICE_ACCOUNT:'fixture'}:{}},console:{error(){}}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../api/castle.js'),'utf8'),context);return {calls,async request({method='POST',headers={authorization:'Bearer fixture-token'},body={op:'status'}}={}){const out={headers:{}};await context.module.exports({method,headers,body},{setHeader:(k,v)=>out.headers[k]=v,status:n=>{out.status=n;return {json:d=>{out.body=d}}}});return out}};
}
test('castle route rejects missing bearer authentication',async()=>assert.equal((await route().request({headers:{}})).status,401));
test('castle route rejects invalid Firebase token',async()=>assert.equal((await route({tokenOK:false}).request()).status,401));
test('castle route rejects account mapping and ownership mismatch',async()=>{for(const conf of [{pid:'bad/path'},{uids:['another-user']},{player:false}])assert.equal((await route(conf).request()).status,403)});
test('castle route refuses unconfigured backend without a client fallback',async()=>assert.equal((await route({configured:false}).request()).status,503));
test('castle route rejects malformed JSON and unknown operations',async()=>{assert.equal((await route().request({body:'{bad'})).status,400);assert.equal((await route().request({body:{op:'anything'}})).status,400)});
test('castle route derives member identity from verified token and mapping',async()=>{const f=route(),r=await f.request({body:{op:'status',pid:'forged',rank:1}});assert.equal(r.status,200);assert.equal(f.calls[0].pid,'A');assert.equal(f.calls[0].uid,'u1');assert.equal(r.headers['Cache-Control'],'no-store')});
test('castle route maps code validation errors without accepting invalid codes',async()=>assert.equal((await route().request({body:{op:'verify',code:'123456'}})).status,400));
test('castle health and method handling have no player writes',async()=>{const f=route();assert.equal((await f.request({method:'GET'})).body.version,'V15.21.1');assert.equal((await f.request({method:'DELETE'})).status,405);assert.equal(f.calls.length,0)});
