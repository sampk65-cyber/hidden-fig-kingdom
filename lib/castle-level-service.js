'use strict';
const crypto=require('node:crypto');
const Core=require('../castle/level-core');
const {createService:createGate}=require('./castle-service');
const {LEVEL}=Core;
const fail=(code,msg)=>Object.assign(new Error(msg),{code});
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
// Fixed asset bases mirror ROLES/ROLE_MIGRATE in index.html. Never derive an
// image path from an unchecked member-editable role value.
const ROLE_BASES=new Set(['awu','alien','robot','hero','apo','knight','cat','teddy','dog','kiki','turtle','hen','poodle','golden','shiba','bunny']);
const ROLE_ALIASES=Object.freeze({traveler_f:'alien',traveler_m:'alien',scarecrow_f:'awu',scarecrow_m:'awu',tin_f:'robot',tin_m:'robot',lion_f:'apo',lion_m:'hero',witch_f:'knight',witch_m:'knight'});
function roleBase(role){const base=typeof role==='string'?(own(ROLE_ALIASES,role)?ROLE_ALIASES[role]:role.replace(/_[mf]$/,'')):'';return ROLE_BASES.has(base)?base:'awu';}
function levelId(body){if(!body||body.levelId!==LEVEL.id)throw fail('level','找不到這個隱花之巔關卡。');return LEVEL.id;}
function fields(body,allowed){if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!allowed.includes(k)))throw fail('bad','資料欄位不正確。');}
function text(value,max,{empty=true}={}){if(typeof value!=='string'||value.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)||(!empty&&!value.trim()))throw fail('bad','獎項文字格式或長度不正確。');return value.trim();}
function memberKey(me){if(!me||typeof me.pid!=='string'||!me.pid||me.pid.length>200||me.pid.includes('/'))throw fail('auth','會員驗證失敗。');return crypto.createHash('sha256').update(me.pid).digest('hex').slice(0,32);}
function settings(raw){return {limit:Number.isSafeInteger(raw?.limit)&&raw.limit>=0?raw.limit:LEVEL.defaultLimit,prizeName:typeof raw?.prizeName==='string'?raw.prizeName:'',prizeNote:typeof raw?.prizeNote==='string'?raw.prizeNote:''};}
function count(raw){return Number.isSafeInteger(raw?.issued)&&raw.issued>=0?raw.issued:0;}
function publicLevel(config,issued){return {id:LEVEL.id,title:LEVEL.title,thumbnail:LEVEL.thumbnail,limit:config.limit,issued,prizeName:config.prizeName,prizeNote:config.prizeNote};}
function publicSession(s,t){return {sid:s.sid,levelId:s.levelId,seq:s.seq,floor:s.floor,stopped:s.stopped.slice(),cycleStartedAt:s.cycleStartedAt,seed:s.seed,serverNow:t,failed:s.failed,complete:s.complete};}
function publicCard(c){
 const prize={name:c.prize.name,note:c.prize.note,status:c.prize.status};
 for(const key of ['assignedAt','redeemedAt'])if(Number.isFinite(c.prize[key]))prize[key]=c.prize[key];
 return {id:c.id,levelId:c.levelId,levelTitle:c.levelTitle,thumbnail:c.thumbnail,serialNumber:c.serialNumber,serial:c.serial,editionLimit:c.editionLimit,memberNo:c.memberNo,name:c.name,role:c.role,points:c.points,issuedAt:c.issuedAt,prize};
}
function createLevelService(db,{now=Date.now}={}){
 const gate=createGate(db,{now}),configRef=db.doc('srv/castle_level_config_'+LEVEL.id),counterRef=db.doc('srv/castle_level_counter_'+LEVEL.id);
 function refs(me){const key=memberKey(me),id=LEVEL.id+'-'+key;return {session:db.doc('srv/castle_level_session_'+id),card:db.doc('srv/castle_vip_'+id),id};}
 async function requireAdmin(me){if(!me||typeof me.uid!=='string'||!me.uid||me.uid.includes('/')||!(await db.doc('admins/'+me.uid).get()).exists)throw fail('admin','只有管理員可以管理關卡獎項。');}
 async function readState(tx,r){const [s,c,l,n]=await Promise.all([tx.get(r.session),tx.get(r.card),tx.get(configRef),tx.get(counterRef)]);return {session:s.exists?s.data():null,card:c.exists?c.data():null,config:settings(l.exists?l.data():null),issued:count(n.exists?n.data():null)};}
 function result(s,card,t,soldOut=false){const out={session:publicSession(s,t)};if(card)out.card=publicCard(card);if(soldOut)out.soldOut=true;return out;}
 // All inputs to allocation are read before the caller starts any writes. The
 // deterministic member/level document and shared counter are transaction locks.
 function allocate(tx,r,me,state,t){
  if(state.card)return {card:state.card,soldOut:false};
  if(state.issued>=state.config.limit)return {card:null,soldOut:true};
  const n=state.issued+1,p=me.player||{},card={kind:'castle-vip',id:r.id,levelId:LEVEL.id,levelTitle:LEVEL.title,thumbnail:LEVEL.thumbnail,serialNumber:n,serial:'T01-'+String(n).padStart(3,'0'),editionLimit:state.config.limit,memberNo:me.pid,name:typeof p.name==='string'?p.name.slice(0,40):'王國守護者',role:roleBase(p.role),points:Number.isFinite(p.points)?Math.max(0,Math.round(p.points)):0,issuedAt:t,prize:{name:'',note:'',status:'pending'}};
  tx.set(r.card,card);tx.set(counterRef,{issued:n});return {card,soldOut:false};
 }
 async function startLevel(me,body){
  levelId(body);if(own(body,'restart')&&typeof body.restart!=='boolean')throw fail('bad','重新挑戰設定不正確。');await gate.enter(me);const r=refs(me),t=now();
  return db.runTransaction(async tx=>{const state=await readState(tx,r);let s=state.session;if(!s||(body.restart&&s.complete)){
   // Completion entitlement survives a replay, including a sold-out first run.
   const earnedAt=Number.isFinite(s?.earnedAt)?s.earnedAt:s?.complete?(Number.isFinite(s.completedAt)?s.completedAt:t):null;
   s={kind:'castle-level-session',memberNo:me.pid,sid:crypto.randomBytes(18).toString('hex'),levelId:LEVEL.id,seq:0,floor:0,stopped:[null,null,null],cycleStartedAt:t,createdAt:t,lastStopAt:t,seed:crypto.randomInt(0,0x7fffffff),failed:false,complete:false};if(earnedAt!==null)s.earnedAt=earnedAt;tx.set(r.session,s)
  }return result(s,state.card,t,s.complete&&!state.card&&state.issued>=state.config.limit)});
 }
 function checkSession(state,body){const s=state.session;if(!s||typeof body.sid!=='string'||body.sid!==s.sid)throw fail('session','闖關狀態已更新，請重新載入關卡。');if(!Number.isSafeInteger(body.seq)||body.seq<1||body.seq>s.seq+1)throw fail('sequence','闖關步驟已更新，請重新載入關卡。');return s;}
 async function mutate(me,body,op){
  levelId(body);await gate.enter(me);const r=refs(me),t=now();
  return db.runTransaction(async tx=>{
   const state=await readState(tx,r),s=checkSession(state,body);
   if(body.seq<=s.seq)return result(s,state.card,t,s.complete&&!state.card&&state.issued>=state.config.limit);
   if(s.complete)return result(s,state.card,t,!state.card&&state.issued>=state.config.limit);
   if(op==='retry'){
    if(!s.failed)throw fail('retry','目前樓層無須重試。');
    s.seq++;s.stopped=[null,null,null];s.failed=false;s.cycleStartedAt=t;s.lastStopAt=t;tx.set(r.session,s);return result(s,state.card,t);
   }
   if(s.failed)throw fail('failed','顏色尚未吻合，請重試目前樓層。');
   const stopAt=own(body,'stopAt')?body.stopAt:t;
   if(!Number.isSafeInteger(stopAt)||stopAt>t||stopAt<Math.max(t-1200,s.cycleStartedAt,s.lastStopAt))throw fail('time','時間已更新，請再試一次。');
   const window=LEVEL.order.find(w=>s.stopped[w]===null);if(window===undefined)throw fail('session','闖關狀態已更新，請重新載入關卡。');
   s.stopped[window]=Core.colorAt(s,s.floor,window,stopAt);s.seq++;s.lastStopAt=stopAt;
   if(window===LEVEL.targetWindow){
    if(s.stopped[window]!==Core.targets[s.floor])s.failed=true;
    else {s.floor++;s.complete=s.floor===LEVEL.floors;s.stopped=[null,null,null];s.cycleStartedAt=t;s.lastStopAt=t;if(s.complete){s.completedAt=t;if(!Number.isFinite(s.earnedAt))s.earnedAt=t;}}
   }
   let award={card:state.card,soldOut:false};if(s.complete)award=allocate(tx,r,me,state,t);
   tx.set(r.session,s);return result(s,award.card,t,award.soldOut);
  });
 }
 const stopWindow=(me,body)=>mutate(me,body,'stop'),retryFloor=(me,body)=>mutate(me,body,'retry');
 async function claimCard(me,body){levelId(body);await gate.enter(me);const r=refs(me),t=now();return db.runTransaction(async tx=>{const state=await readState(tx,r),s=state.session;if(!s||(!s.complete&&!Number.isFinite(s.earnedAt)))throw fail('session','完成關卡後才能領取 VIP 卡。');const award=allocate(tx,r,me,state,t);return result(s,award.card,t,award.soldOut)});}
 async function levels(){const [l,n]=await Promise.all([configRef.get(),counterRef.get()]);return [publicLevel(settings(l.exists?l.data():null),count(n.exists?n.data():null))];}
 async function myCards(me){memberKey(me);const [rows,list]=await Promise.all([db.collection('srv').where('memberNo','==',me.pid).get(),levels()]);return {cards:rows.docs.map(d=>d.data()).filter(c=>c.kind==='castle-vip'&&c.memberNo===me.pid&&c.levelId===LEVEL.id).map(publicCard).sort((a,b)=>a.serialNumber-b.serialNumber),levels:list};}
 async function adminOverview(me){await requireAdmin(me);const [rows,list]=await Promise.all([db.collection('srv').where('kind','==','castle-vip').get(),levels()]);return {cards:rows.docs.map(d=>d.data()).filter(c=>c.levelId===LEVEL.id).map(publicCard).sort((a,b)=>a.serialNumber-b.serialNumber),levels:list};}
 async function adminSaveLevel(me,body){
  await requireAdmin(me);levelId(body);fields(body,['op','levelId','limit','prizeName','prizeNote']);
  if(own(body,'limit')&&(!Number.isSafeInteger(body.limit)||body.limit<0||body.limit>10000))throw fail('capacity','發行數量必須是 0 至 10000 的整數。');
  const change={};if(own(body,'limit'))change.limit=body.limit;if(own(body,'prizeName'))change.prizeName=text(body.prizeName,120);if(own(body,'prizeNote'))change.prizeNote=text(body.prizeNote,500);
  return db.runTransaction(async tx=>{const [l,n]=await Promise.all([tx.get(configRef),tx.get(counterRef)]),config={...settings(l.exists?l.data():null),...change},issued=count(n.exists?n.data():null);if(config.limit<issued)throw fail('capacity','發行數量不可低於已發出的卡片數。');tx.set(configRef,config);return {level:publicLevel(config,issued)}});
 }
 function awardRef(body){if(!body||typeof body.cardId!=='string'||!/^tower-01-[a-f0-9]{32}$/.test(body.cardId))throw fail('bad','VIP 卡編號不正確。');return db.doc('srv/castle_vip_'+body.cardId);}
 async function adminAssignPrize(me,body){
  await requireAdmin(me);fields(body,['op','cardId','name','note']);const ref=awardRef(body),name=text(body.name,120,{empty:false}),note=own(body,'note')?text(body.note,500):'',t=now();
  return db.runTransaction(async tx=>{const snap=await tx.get(ref);if(!snap.exists)throw fail('card','找不到這張 VIP 卡。');const card=snap.data();if(card.kind!=='castle-vip'||card.levelId!==LEVEL.id)throw fail('card','找不到這張 VIP 卡。');if(card.prize.status==='redeemed')throw fail('redeemed','這份獎項已兌換。');card.prize={name,note,status:'ready',assignedAt:t};tx.set(ref,card);return {card:publicCard(card)}});
 }
 async function adminRedeem(me,body){
  await requireAdmin(me);fields(body,['op','cardId']);const ref=awardRef(body),t=now();return db.runTransaction(async tx=>{const snap=await tx.get(ref);if(!snap.exists)throw fail('card','找不到這張 VIP 卡。');const card=snap.data();if(card.kind!=='castle-vip'||card.levelId!==LEVEL.id)throw fail('card','找不到這張 VIP 卡。');if(card.prize.status==='redeemed')throw fail('redeemed','這份獎項已兌換。');if(card.prize.status!=='ready')throw fail('prize','請先為這張 VIP 卡指定獎項。');card.prize={...card.prize,status:'redeemed',redeemedAt:t};tx.set(ref,card);return {card:publicCard(card)}});
 }
 return {startLevel,stopWindow,retryFloor,claimCard,myCards,adminOverview,adminSaveLevel,adminAssignPrize,adminRedeem};
}
module.exports={createLevelService};
