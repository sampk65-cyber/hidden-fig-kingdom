'use strict';
const assert=require('node:assert/strict');
// Firestore is the external boundary. This double commits transactions atomically,
// serializes contenders, and rejects reads after writes like the real SDK.
function memory(seed={}){
 const data=new Map(Object.entries(structuredClone(seed))),writes=[];let queue=Promise.resolve();
 const snap=p=>({id:p.split('/').pop(),exists:data.has(p),data:()=>structuredClone(data.get(p))});
 const collection=p=>({filters:[],cap:Infinity,order:null,where(f,op,v){assert.equal(op,'==');this.filters.push([f,v]);return this},orderBy(f,d){this.order=[f,d];return this},limit(n){this.cap=n;return this},async get(){let docs=[...data.keys()].filter(k=>k.startsWith(p+'/')&&!k.slice(p.length+1).includes('/')).map(snap).filter(s=>this.filters.every(([f,v])=>s.data()[f]===v));if(this.order){const [f,d]=this.order;docs.sort((a,b)=>(a.data()[f]-b.data()[f])*(d==='desc'?-1:1))}return {docs:docs.slice(0,this.cap)}}});
 const db={data,writes,doc:p=>({path:p,get:async()=>snap(p)}),collection,runTransaction:fn=>{const job=queue.then(async()=>{const pending=[];let writing=false;const out=await fn({get:async r=>{assert.equal(writing,false,'Firestore requires all reads before writes');return snap(r.path)},set:(r,d,o)=>{writing=true;pending.push([r.path,structuredClone(d),o])},update:(r,d)=>{writing=true;pending.push([r.path,structuredClone(d),{merge:true}])}});for(const[p,d,o]of pending){data.set(p,o?.merge?{...data.get(p),...d}:d);writes.push(p)}return out});queue=job.catch(()=>{});return job}};
 return db;
}
const member=(pid='A',points=300)=>({uid:'uid-'+pid,pid,player:{uids:['uid-'+pid],pid,name:'守護者 '+pid,role:'hero',points,rtok:'never-share',token:'private'}});
function fixture(){let time=1_000_000;const db=memory({'ranks/A':{pid:'A',points:300},'ranks/B':{pid:'B',points:200},'ranks/C':{pid:'C',points:100},'ranks/D':{pid:'D',points:50},'srv/castle_pass_A':{verified:true},'srv/castle_pass_B':{verified:true},'srv/castle_pass_C':{verified:true},'admins/root':{enabled:true}});const file=require('node:path').join(__dirname,'../lib/castle-level-service.js');assert.ok(require('node:fs').existsSync(file),'Server-authoritative level service is missing');return {db,svc:require(file).createLevelService(db,{now:()=>time}),now:()=>time,at:t=>time=t,later:n=>time+=n};}
const input=(session,extra={})=>({levelId:'tower-01',sid:session.sid,seq:session.seq+1,...extra});
async function stop(f,me,s,want){const core=require('../castle/level-core.js');if(want!==undefined){let t=Math.max(f.now(),s.cycleStartedAt);for(let n=0;n<8&&core.colorAt(s,s.floor,1,t)!==want;n++)t+=core.PHASE_MS;f.at(t)}return f.svc.stopWindow(me,input(s,{stopAt:f.now()}));}
async function complete(f,me=member()){let out=await f.svc.startLevel(me,{levelId:'tower-01'});while(!out.session.complete){out=await stop(f,me,out.session);out=await stop(f,me,out.session);out=await stop(f,me,out.session,out.session.floor)}return out;}
module.exports={memory,member,fixture,input,stop,complete};
