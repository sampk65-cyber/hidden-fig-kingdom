'use strict';
const test=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs'), path=require('node:path'), vm=require('node:vm');
const {memory}=require('./castle-level-test-helpers.cjs');
const file=path.join(__dirname,'../lib/pool-rules.js');
function rules(){assert.ok(fs.existsSync(file),'Shared period quota rules are not implemented');return require(file);}
const legacy={e:20,d:10,c:5,b:3,a:1,zEvery:3};
const input={e:20,d:10,c:2,b:1,a:1,z:1,periods:{c:7,b:3,a:14,z:30},tiers:{c:{r:'p10'}}};
const clone=x=>structuredClone(x);
function active(){return rules().prepareSave(legacy,null,{e:10,d:4,c:0,b:1,a:0,z:0},input,'2026-11-10',true);}
test('seven-day two-box quota carries unused balance across midnight and refills only on day eight',()=>{
 const R=rules(), p=active(); p.state.tiers.c.remaining=1;
 assert.equal(R.resolve(p.config,p.state,null,'2026-11-11').counts.c,1);
 assert.equal(R.resolve(p.config,p.state,null,'2026-11-16').counts.c,1);
 assert.equal(R.resolve(p.config,p.state,null,'2026-11-17').counts.c,2);
 assert.equal(R.resolve(p.config,p.state,null,'2026-11-17').state.tiers.c.start,'2026-11-17');
});
test('wood and iron refill daily while independent bronze and silver cycles keep their own dates',()=>{
 const R=rules(), p=active();for(const k of ['e','d','c','b'])p.state.tiers[k].remaining=0;
 const next=R.resolve(p.config,p.state,null,'2026-11-11'); assert.deepEqual([next.counts.e,next.counts.d,next.counts.c,next.counts.b],[20,10,0,0]);
 assert.equal(R.resolve(p.config,p.state,null,'2026-11-13').counts.b,1);
});
test('missed periods do not accumulate or drift to the next visit',()=>{
 const p=active(),v=rules().resolve(p.config,p.state,null,'2026-12-03');assert.equal(v.counts.c,2);assert.equal(v.state.tiers.c.start,'2026-12-01');
});
test('normal save retains depleted balance and previous boundary before applying changed days and quantities',()=>{
 const R=rules(),p=active();p.state.tiers.c.remaining=0;
 const v=R.prepareSave(p.config,p.state,null,{...input,c:4,periods:{...input.periods,c:10}},'2026-11-12',false);
 assert.equal(v.state.tiers.c.remaining,0);assert.equal(v.state.tiers.c.days,7);
 const next=R.resolve(v.config,v.state,null,'2026-11-17');assert.equal(next.counts.c,4);assert.equal(next.state.tiers.c.days,10);assert.equal(next.state.tiers.c.start,'2026-11-17');
});
test('legacy behavior and depleted day remain intact until the first new save',()=>{
 const R=rules(),p={e:3,d:2,c:0,b:1,a:0,z:0};assert.deepEqual(R.resolve(legacy,null,p,'2026-11-10').counts,p);
 const v=R.prepareSave(legacy,null,p,input,'2026-11-10',false);assert.equal(v.state.tiers.c.remaining,0);assert.equal(v.state.tiers.z.remaining,0);
 assert.equal(R.resolve(v.config,v.state,null,'2026-11-11').counts.c,2);assert.equal(R.resolve(v.config,v.state,null,'2026-11-11').counts.z,1);
});
test('reset explicitly refills and restarts every period today',()=>{
 const R=rules(),p=active();p.state.tiers.c.remaining=0;const v=R.prepareSave(p.config,p.state,null,input,'2026-11-12',true);
 assert.equal(v.state.tiers.c.remaining,2);assert.equal(v.state.tiers.c.start,'2026-11-12');assert.equal(v.state.tiers.c.days,7);
});
test('zero disables a tier; invalid or fractional period and quantity inputs are rejected',()=>{
 const R=rules(),p=R.prepareSave(legacy,null,null,{...input,c:0},'2026-11-10',true);assert.equal(R.resolve(p.config,p.state,null,'2026-12-10').counts.c,0);
 for(const value of [0,-1,1.5,366,Infinity,''])assert.throws(()=>R.prepareSave(legacy,null,null,{...input,periods:{...input.periods,c:value}},'2026-11-10',false));
 for(const value of [-1,1.5,51,NaN,''])assert.throws(()=>R.prepareSave(legacy,null,null,{...input,c:value},'2026-11-10',false));
});
test('Taiwan dates switch at UTC 16:00 and year boundaries advance correctly',()=>{
 const R=rules();assert.equal(R.day(Date.parse('2026-11-10T15:59:59Z')),'2026-11-10');assert.equal(R.day(Date.parse('2026-11-10T16:00:00Z')),'2026-11-11');assert.equal(R.addDays('2026-12-31',1),'2027-01-01');
});
test('period evaluation does not mutate inputs and missing state respects existing daily depletion',()=>{
 const R=rules(),p=active(),before=clone(p);R.resolve(p.config,p.state,null,'2027-01-01');assert.deepEqual(p,before);
 const v=R.resolve(p.config,null,{e:0,d:0,c:0,b:0,a:0,z:0},'2026-11-10');assert.equal(v.counts.c,0);
});
function server(db,now){
 const source=fs.readFileSync(path.join(__dirname,'../api/game.js'),'utf8');
 class Clock extends Date {constructor(...args){super(...(args.length?args:[now()]));}static now(){return now();}}
 const ctx={require:n=>n==='firebase-admin'?{}:n.startsWith('../')?require(path.join(__dirname,'../api',n)):require(n),module:{exports:{}},Date:Clock,console,process:{env:{}}};
 vm.createContext(ctx);vm.runInContext(source+'\nthis.claim=opChaseClaim;this.start=opChaseStart;',ctx);return ctx;
}
test('server claims share one quota across days, players and simultaneous requests',async()=>{
 const config={...legacy,...input,poolVersion:2},db=memory({'config/pool':config});let time=Date.parse('2026-11-10T04:00:00Z');const s=server(db,()=>time);
 async function claim(pid){db.data.set('srv/chs_'+pid,{sid:pid,tiers:['c'],t:time-4000,used:false,day:'2026-11-10'});return s.claim(db,{pid,player:{name:pid}},{sid:pid,idx:0});}
 const a=await claim('A');assert.equal(a.k,'c');time+=864e5;
 const results=await Promise.all(['B','C','D'].map(claim));assert.equal(results.filter(x=>x.ok&&x.k==='c').length,1);
 time=Date.parse('2026-11-17T04:00:00Z');assert.equal((await claim('E')).k,'c');
});
test('a consumed session cannot decrement period quota a second time',async()=>{
 const config={...legacy,...input,poolVersion:2},time=Date.parse('2026-11-10T04:00:00Z'),db=memory({'config/pool':config,'srv/chs_A':{sid:'A',tiers:['c'],t:time-4000,used:false}}),s=server(db,()=>time),me={pid:'A',player:{name:'A'}};
 await s.claim(db,me,{sid:'A',idx:0});await assert.rejects(s.claim(db,me,{sid:'A',idx:0}),e=>e.code==='session');assert.equal(db.data.get('pool/cycles').tiers.c.remaining,1);
});
