'use strict';
// Independent castle gate. No front-end fallback and no changes to the existing game API.
const admin=require('firebase-admin');
const {createService}=require('../lib/castle-service');
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method==='GET')return res.status(200).json({service:'hidden-fig-kingdom castle',version:'V15.16',configured:!!process.env.FIREBASE_SERVICE_ACCOUNT});
 if(req.method!=='POST'){res.setHeader('Allow','GET, POST');return res.status(405).json({error:'method',msg:'不支援此操作'});}
 try{
  const token=String(req.headers.authorization||'').replace(/^Bearer /,'');if(!/^Bearer \S+$/.test(req.headers.authorization||''))return res.status(401).json({error:'auth',msg:'請先登入王國帳號'});
  if(!admin.apps.length){const raw=process.env.FIREBASE_SERVICE_ACCOUNT;if(!raw)return res.status(503).json({error:'noconfig',msg:'城堡驗證服務尚未設定，請稍後再試。'});const sa=JSON.parse(raw);if(sa.private_key)sa.private_key=sa.private_key.replace(/\\n/g,'\n');admin.initializeApp({credential:admin.credential.cert(sa)});}
  let user;try{user=await admin.auth().verifyIdToken(token)}catch(_){return res.status(401).json({error:'auth',msg:'登入已過期，請重新登入'});}
  const db=admin.firestore(),u=await db.doc('users/'+user.uid).get(),pid=u.exists&&u.data().pid;
  if(typeof pid!=='string'||!pid||pid.includes('/'))return res.status(403).json({error:'auth',msg:'找不到會員帳號'});
  const p=await db.doc('players/'+pid).get();if(!p.exists||!(p.data().uids||[]).includes(user.uid))return res.status(403).json({error:'auth',msg:'會員驗證失敗'});
  let body;try{body=typeof req.body==='string'?JSON.parse(req.body):req.body||{}}catch(_){return res.status(400).json({error:'bad',msg:'資料格式錯誤'});}
  const service=createService(db),me={uid:user.uid,pid,player:p.data()};let out;
  if(body.op==='status')out=await service.status(me);else if(body.op==='issue')out=await service.issue(me);else if(body.op==='verify')out=await service.verify(me,body.code);else if(body.op==='enter')out=await service.enter(me);else return res.status(400).json({error:'bad',msg:'不支援此操作'});
  return res.status(200).json(out);
 }catch(e){const known=['rank','limit','code','used','expired','locked','verify'].includes(e.code);if(!known)console.error('Castle API:',e.code||e.name);return res.status(known?(e.code==='rank'?403:400):503).json({error:known?e.code:'unavailable',msg:known?e.message:'城堡服務暫時無法連線，請稍後再試。'});}
};
