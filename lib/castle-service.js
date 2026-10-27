'use strict';
const crypto=require('node:crypto');
const fail=(code,msg)=>Object.assign(new Error(msg),{code});
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
function createService(db,{now=Date.now}={}){
 async function rank(me){
  if(!me.player || me.player.guest || !me.player.role)return 0;
  const [live,pub]=await Promise.all([db.collection('ranks').orderBy('points','desc').limit(10).get(),db.doc('config/rank').get()]);
  // Include every member tied at the query boundary before applying the PID tie order.
  // Equality uses the existing single-field index; deployment needs no new composite index.
  const candidates=live.docs.map(s=>s.data()),cutoff=candidates.at(-1)?.points;
  if(candidates.length===10&&Number.isFinite(cutoff)){const tied=await db.collection('ranks').where('points','==',cutoff).get();candidates.push(...tied.docs.map(s=>s.data()));}
  const m=new Map();for(const r of [...(pub.exists&&Array.isArray(pub.data().list)?pub.data().list:[]),...candidates]){
   if(typeof r.pid!=='string'||!r.pid||!Number.isFinite(r.points))continue;
   if(!m.has(r.pid)||r.points>=m.get(r.pid).points)m.set(r.pid,{pid:r.pid,points:r.points});
  }
  m.set(me.pid,{pid:me.pid,points:Math.round(me.player.points||0)});
  const rows=[...m.values()].sort((a,b)=>b.points-a.points||(a.pid<b.pid?-1:a.pid>b.pid?1:0)).slice(0,3);
  return rows.findIndex(r=>r.pid===me.pid)+1;
 }
 async function requireRank(me){const n=await rank(me);if(!n)throw fail('rank','隱花之巔城堡僅開放守護者積分榜前三名。');return n;}
 async function status(me){const n=await rank(me);if(!n)return {eligible:false,verified:false};const s=await db.doc('srv/castle_pass_'+me.pid).get();return {eligible:true,rank:n,verified:!!(s.exists&&s.data().verified)};}
 async function issue(me){
  const n=await requireRank(me),t=now(),code=String(crypto.randomInt(0,1000000)).padStart(6,'0'),salt=crypto.randomBytes(16).toString('hex');
  const ref=db.doc('srv/castle_code_'+me.pid),rate=db.doc('srv/castle_issue_'+me.pid);
  await db.runTransaction(async tx=>{const s=await tx.get(rate),r=s.exists?s.data():{},fresh=!Number.isFinite(r.start)||t-r.start>=3600000,count=fresh?0:r.n||0;if(count>=5)throw fail('limit','領取太頻繁，請稍後再試。');
   tx.set(rate,{start:fresh?t:r.start,n:count+1});tx.set(ref,{hash:hash(salt+':'+code),salt,pid:me.pid,uid:me.uid,created:t,expires:t+600000,attempts:0,used:false});
  });return {code,expires:t+600000,rank:n};
 }
 async function verify(me,input){
  const n=await requireRank(me),t=now(),code=typeof input==='string'?input.trim():'',ref=db.doc('srv/castle_code_'+me.pid);
  // Return errors from the transaction so incorrect-attempt writes commit instead of rolling back.
  const result=await db.runTransaction(async tx=>{const s=await tx.get(ref);if(!s.exists)return ['code','請先領取你的城堡密語。'];const c=s.data();
   if(c.used)return ['used','這組密語已使用，不能再次兌換。'];if(c.expires<=t)return ['expired','密語已過期，請重新領取。'];if(c.attempts>=5)return ['locked','錯誤次數已達上限，請重新領取密語。'];
   const actual=hash(c.salt+':'+code),ok=/^\d{6}$/.test(code)&&c.uid===me.uid&&c.pid===me.pid&&typeof c.hash==='string'&&c.hash.length===64&&crypto.timingSafeEqual(Buffer.from(actual),Buffer.from(c.hash));
   if(!ok){tx.update(ref,{attempts:(c.attempts||0)+1});return ['code','密語不正確，請重新輸入。'];}
   tx.update(ref,{used:true,usedAt:t});tx.set(db.doc('srv/castle_pass_'+me.pid),{verified:true,pid:me.pid,verifiedAt:t});return null;
  });if(result)throw fail(...result);return {ok:true,verified:true,rank:n};
 }
 async function enter(me){const n=await requireRank(me),s=await db.doc('srv/castle_pass_'+me.pid).get();if(!s.exists||!s.data().verified)throw fail('verify','請先完成一次性密語驗證。');return {ok:true,rank:n,name:(me.player.name||'王國守護者').slice(0,20)};}
 return {status,issue,verify,enter};
}
module.exports={createService};
