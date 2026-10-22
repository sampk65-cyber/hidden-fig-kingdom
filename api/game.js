// 隱花王國尋寶 — 後端抽獎（Vercel Serverless Function）
// 免單、半價、折 200、自訂獎品等高價值獎項，全部由這裡（伺服器）決定與發放，手機端無法自己產生。
// 需要在 Vercel 專案設定環境變數 FIREBASE_SERVICE_ACCOUNT（Firebase 服務帳戶金鑰 JSON 全文）。
// Copyright © 2026 Sam pksun. All rights reserved.
const admin = require('firebase-admin');

function initAdmin(){
  if(admin.apps.length) return admin;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if(!raw) throw new Error('NO_SERVICE_ACCOUNT');
  const sa = JSON.parse(raw);
  if(sa.private_key) sa.private_key = sa.private_key.replace(/\\n/g, '\n');
  admin.initializeApp({ credential: admin.credential.cert(sa) });
  return admin;
}

// ---------- 規則參數（和遊戲畫面一致） ----------
const LEVEL_MIN = [0, 500, 1500, 6000];
const FREE_RATE = [0, 0, 1/100, 2/100];          // 一般寶箱：各等級開出免單的機率（原本在手機端的權重）
const LUCKY_DAILY = 6;                            // 每人每天最多檢查幾次（寶箱 3 + 劇情 + 其他獎勵）
const CHASE_DAILY = 5;                            // 寶箱追逐賽每天 5 次
const POOL_DEF = { e:20, d:10, c:5, b:3, a:1, zEvery:3 };
const TIER_F = { z:.3, a:.4, b:.6, c:.8, d:1, e:1 };
const RARE = ['z','a','b'];
const TCFG_DEF = { e:{r:'p10'}, d:{r:'p20'}, c:{r:'ship'}, b:{r:'c200'}, a:{r:'half'}, z:{r:'free'} };
const REWARDS = { p10:{n:'果友值 +10', pts:10}, p20:{n:'果友值 +20', pts:20}, ship:{n:'免運券', cp:'ship'}, c200:{n:'折 200 元券', cp:'c200'},
  half:{n:'半價券', cp:'half'}, free:{n:'免單券', cp:'free'}, custom:{n:'自訂獎品（現場兌換）', cp:'sp'} };
const CHEST = { e:{chest:'橡木小箱', icon:'📦'}, d:{chest:'鍛鐵寶箱', icon:'⚙️'}, c:{chest:'青銅寶箱', icon:'🥉'}, b:{chest:'月光銀箱', icon:'🥈'}, a:{chest:'黃金寶箱', icon:'🥇'}, z:{chest:'星鑽寶盒', icon:'💎'} };
const GIFT_PTS_MAX = 100;
const ALPH = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

// ---------- 小工具 ----------
const twDay = (t = Date.now())=>{ const d = new Date(t + 8*3600e3); return d.toISOString().slice(0, 10); };   // 台灣日期 YYYY-MM-DD
function seedRand(s){ let x = 7; for(const c of s) x = (x*31 + c.charCodeAt(0))>>>0; return ()=>{ x = (x*1664525 + 1013904223)>>>0; return x/4294967296; }; }
function rid(n){ const b = require('crypto').randomBytes(n); return Array.from(b, v=>ALPH[v % ALPH.length]).join(''); }
const rnd = ()=>require('crypto').randomInt(0, 1e9)/1e9;
function lvIndex(p){ let i = 0; LEVEL_MIN.forEach((m, k)=>{ if((p||0) >= m) i = k; }); return i; }
function fail(code, msg){ const e = new Error(msg || code); e.code = code; return e; }

async function whoAmI(req, db){
  const h = req.headers.authorization || '', tok = h.startsWith('Bearer ') ? h.slice(7) : '';
  if(!tok) throw fail('auth', '請重新登入');
  let u; try{ u = await admin.auth().verifyIdToken(tok); }catch(e){ throw fail('auth', '登入已過期，請重新整理頁面'); }
  const map = await db.doc('users/' + u.uid).get(); const pid = map.exists && map.data().pid;
  if(!pid) throw fail('auth', '找不到帳號');
  const ps = await db.doc('players/' + pid).get();
  if(!ps.exists || !(ps.data().uids || []).includes(u.uid)) throw fail('auth', '帳號驗證失敗');
  return { uid: u.uid, pid, player: ps.data() };
}

// 每日次數上限（伺服器端計數，手機改不了）
async function bump(db, key, max){
  const ref = db.doc('srv/' + key);
  return db.runTransaction(async tx=>{ const s = await tx.get(ref), n = s.exists ? (s.data().n || 0) : 0;
    if(n >= max) return false; tx.set(ref, { n: n + 1, t: Date.now() }, { merge: true }); return true; });
}

function couponDoc(type, name, extra = {}){
  const { days, ...more } = extra;
  const now = Date.now();
  return { t: type, exp: now + (days || 7) * 864e5, used: false, created: now, name: name || '', srv: true, ...more };
}

async function poolCfg(db){
  let c = { ...POOL_DEF }; try{ const s = await db.doc('config/pool').get(); if(s.exists) c = { ...c, ...s.data() }; }catch(e){}
  const tcfg = {}; for(const k of Object.keys(TCFG_DEF)) tcfg[k] = { ...TCFG_DEF[k], ...((c.tiers || {})[k] || {}) };
  return { c, tcfg };
}
function poolInit(c, day){ const z = seedRand('free' + day)() < 1/Math.max(1, +c.zEvery || 3) ? 1 : 0; return { e:+c.e, d:+c.d, c:+c.c, b:+c.b, a:+c.a, z }; }
function drawTier(p){
  const items = Object.keys(TIER_F).map(k=>({ k, w:(p[k] || 0) * TIER_F[k] })).filter(x=>x.w > 0), sum = items.reduce((a, b)=>a + b.w, 0);
  if(!sum) return null; let x = rnd() * sum; for(const it of items){ if((x -= it.w) <= 0) return it.k; } return items[items.length - 1].k;
}
function tierPrize(tcfg, k){ const t = tcfg[k] || {}, r = REWARDS[t.r] ? t.r : 'p10'; return { r, rw: REWARDS[r], prize: (t.name || '').trim() || REWARDS[r].n, note: (t.note || '').trim() }; }

// ---------- 1. 一般寶箱：伺服器決定有沒有藏免單 ----------
async function opLucky(db, me){
  const day = twDay();
  if(!(await bump(db, `lucky_${me.pid}_${day}`, LUCKY_DAILY))) return { win: false };
  const p = FREE_RATE[lvIndex(me.player.points)] || 0;
  if(!(p > 0) || rnd() >= p) return { win: false };
  const id = rid(4), c = couponDoc('free', me.player.name, { src: 'lucky' });
  await db.batch()
    .set(db.doc(`players/${me.pid}/coupons/${id}`), c)
    .set(db.doc(`players/${me.pid}/inbox/L${Date.now().toString(36)}`), { text: '🎉 寶箱底層還藏著一張「免單券」！已放進優惠券，有效 7 天。', created: Date.now(), read: false })
    .commit();
  return { win: true, coupon: { id, ...c } };
}

// ---------- 2. 寶箱追逐賽：伺服器抽寶箱等級、扣獎池、發獎 ----------
async function opChaseStart(db, me){
  const day = twDay();
  if(!(await bump(db, `chase_${me.pid}_${day}`, CHASE_DAILY))) throw fail('limit', '今天的寶箱追逐賽玩完了（每天 5 次），明天再來');
  const { c } = await poolCfg(db), init = poolInit(c, day);
  const ps = await db.doc('pool/' + day).get(), p = ps.exists ? ps.data() : init;
  const tiers = []; for(let i = 0; i < 3; i++){ const t = drawTier(p); if(t) tiers.push(t); }
  if(!tiers.length) return { tiers: [] };
  if(!tiers.some(t=>!RARE.includes(t)) && (p.e || p.d)) tiers[tiers.length - 1] = p.e ? 'e' : 'd';
  const sid = 'C' + Date.now().toString(36) + rid(3);
  await db.doc(`srv/chs_${me.pid}`).set({ sid, tiers, t: Date.now(), used: false, day });
  return { sid, tiers };
}
async function opChaseClaim(db, me, body){
  const ref = db.doc(`srv/chs_${me.pid}`), idx = Math.floor(+body.idx);
  const day = twDay(), { c, tcfg } = await poolCfg(db), init = poolInit(c, day), pref = db.doc('pool/' + day);
  const res = await db.runTransaction(async tx=>{
    const s = await tx.get(ref); if(!s.exists) throw fail('session', '找不到這一局，請重新開始');
    const S = s.data();
    if(S.used || S.sid !== body.sid) throw fail('session', '這一局已經領過了');
    if(!(idx >= 0 && idx < S.tiers.length)) throw fail('bad', '寶箱不存在');
    const age = Date.now() - S.t; if(age < 3000 || age > 180000) throw fail('time', '這一局已經超過時間');
    const ps = await tx.get(pref), p = ps.exists ? ps.data() : { ...init };
    let k = S.tiers[idx], ok = false;
    if(p[k] > 0){ p[k]--; ok = true; } else if(k !== 'e' && p.e > 0){ k = 'e'; p.e--; ok = true; }
    tx.set(ref, { used: true, usedAt: Date.now(), k, ok }, { merge: true });
    if(ok) tx.set(pref, p);
    return { k, ok };
  });
  if(!res.ok) return { ok: false, k: res.k };
  const R = tierPrize(tcfg, res.k), T = CHEST[res.k];
  if(R.rw.pts) return { ok: true, k: res.k, pts: R.rw.pts, prize: R.prize, note: R.note };
  const id = rid(4), extra = R.rw.cp === 'sp' ? { spN: R.prize, spD: R.note || '到農場出示此券兌換', spI: T.icon, days: 14, src: 'chase' } : { src: 'chase' };
  const cdoc = couponDoc(R.rw.cp, me.player.name, extra);
  await db.doc(`players/${me.pid}/coupons/${id}`).set(cdoc);
  return { ok: true, k: res.k, prize: R.prize, note: R.note, coupon: { id, ...cdoc } };
}

// ---------- 3. 公告／私訊附的寶箱：伺服器發券，一則只能領一次 ----------
async function opGift(db, me, body){
  const kind = body.kind, id = String(body.id || '').slice(0, 60);
  if(!/^[A-Za-z0-9_-]+$/.test(id)) throw fail('bad', '資料錯誤');
  let gift = null;
  if(kind === 'n'){
    const n = await db.doc('config/notice').get(); if(!n.exists || n.data().id !== id || !n.data().gift) throw fail('gone', '這則公告的寶箱已經結束了');
    gift = n.data().gift;
    const mark = db.doc(`srv/gn_${me.pid}_${id}`);
    const fresh = await db.runTransaction(async tx=>{ const s = await tx.get(mark); if(s.exists) return false; tx.set(mark, { t: Date.now() }); return true; });
    if(!fresh) throw fail('dup', '這個寶箱已經領過了');
  } else if(kind === 'm'){
    const mref = db.doc(`players/${me.pid}/inbox/${id}`);
    gift = await db.runTransaction(async tx=>{ const s = await tx.get(mref); if(!s.exists || !s.data().gift) throw fail('gone', '找不到這個寶箱');
      if(s.data().claimed) throw fail('dup', '這個寶箱已經領過了'); tx.update(mref, { read: true, claimed: true }); return s.data().gift; });
  } else throw fail('bad', '資料錯誤');
  const src = kind === 'n' ? '農場公告寶箱' : '農場私訊寶箱';
  if(gift.k === 'pts') return { pts: Math.min(GIFT_PTS_MAX, +gift.n || 0), src };
  const cid = rid(4);
  const cdoc = gift.k === 'sp' ? couponDoc('sp', me.player.name, { spN: gift.name || '農場特別獎', spD: gift.note || '到農場出示此券兌換', spI: '🎁', days: 14, src: 'gift' })
                               : couponDoc(gift.t, me.player.name, { days: 14, src: 'gift' });
  await db.doc(`players/${me.pid}/coupons/${cid}`).set(cdoc);
  return { coupon: { id: cid, ...cdoc }, src };
}

module.exports = async (req, res)=>{
  res.setHeader('Cache-Control', 'no-store');
  if(req.method === 'GET'){
    try{ initAdmin(); return res.status(200).json({ ok: true, service: 'hidden-fig-kingdom game api', time: new Date().toISOString() }); }
    catch(e){ return res.status(500).json({ ok: false, error: e.message === 'NO_SERVICE_ACCOUNT' ? '尚未設定 FIREBASE_SERVICE_ACCOUNT' : '金鑰格式錯誤' }); }
  }
  if(req.method !== 'POST') return res.status(405).json({ error: 'method' });
  try{
    initAdmin(); const db = admin.firestore();
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const me = await whoAmI(req, db);
    let out;
    if(body.op === 'lucky') out = await opLucky(db, me);
    else if(body.op === 'chaseStart') out = await opChaseStart(db, me);
    else if(body.op === 'chaseClaim') out = await opChaseClaim(db, me, body);
    else if(body.op === 'gift') out = await opGift(db, me, body);
    else throw fail('bad', '未知的操作');
    return res.status(200).json(out);
  }catch(e){
    if(e.message === 'NO_SERVICE_ACCOUNT') return res.status(503).json({ error: 'noconfig', msg: '後端尚未設定' });
    const code = e.code || 'err', st = code === 'auth' ? 401 : ['limit','dup','gone','session','time','bad'].includes(code) ? 400 : 500;
    if(st === 500) console.error(e);
    return res.status(st).json({ error: code, msg: st === 500 ? '伺服器忙碌，請稍後再試' : e.message });
  }
};
