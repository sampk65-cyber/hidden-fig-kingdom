const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{test}=require('node:test');
const html=fs.readFileSync(process.env.RHY_INDEX||require('node:path').join(__dirname,'../index.html'),'utf8');
const start=html.indexOf('const RHY_SONGS ='),end=html.indexOf('/* ---------- V10.6：農場翻牌',start);
const ctx=vm.createContext({console,Math,setInterval,clearInterval,setTimeout,clearTimeout});
vm.runInContext(html.slice(start,end)+'\nglobalThis.api={songs:RHY_SONGS,arrange:typeof rhyArrangement==="function"?rhyArrangement:null,chart:typeof rhyChart==="function"?rhyChart:null,time:typeof rhyTime==="function"?rhyTime:null};',ctx);
const api=ctx.api;api.songs=api.songs.filter(s=>!s.audio);
test('catalog offers twelve distinct playable originals across the seven requested styles',()=>{
 assert.equal(api.songs.length,12);assert.equal(new Set(api.songs.map(s=>s.id)).size,12);
 assert.equal(new Set(api.songs.map(s=>s.genre)).size,7);
 assert.equal(new Set(api.songs.map(s=>JSON.stringify(s.mel))).size,12);
 for(const s of api.songs){assert.ok(s.bpm>=72&&s.bpm<=150);assert.ok(s.mel.flat().filter(Boolean).length>=20);}
});
test('arrangements include bass, drums, harmony and melodies with different grooves',()=>{
 assert.equal(typeof api.arrange,'function','original arrangement engine is available');
 const signatures=new Set();for(const s of api.songs){const a=api.arrange(s);
  for(const voice of ['bass','kick','chord','lead'])assert.ok(a.events.some(e=>e.voice===voice),`${s.n}: ${voice}`);
  assert.ok(a.length>27&&a.length<58);assert.ok(a.events.every(e=>Number.isFinite(e.t)&&e.t>=0&&e.t<a.length));
  signatures.add(JSON.stringify(a.events.filter(e=>e.voice==='kick').map(e=>e.step)));
 }assert.ok(signatures.size>=7,'genre grooves cannot all share the same kick pattern');
});
test('all 36 charts are deterministic, audible, playable and get denser by difficulty',()=>{
 assert.equal(typeof api.chart,'function','fixed chart builder is available');
 for(const s of api.songs){let previous=0;const sounds=api.arrange(s).events;
  for(let d=0;d<3;d++){const a=api.chart(s,d),b=api.chart(s,d);assert.deepEqual(a,b);
   assert.ok(a.ripe>previous,`${s.id} difficulty ${d} increases density`);previous=a.ripe;
   assert.ok(a.notes.every(n=>n.t>=60/s.bpm*4&&n.t<a.length&&n.l>=0&&n.l<=2));
   if(d===0)assert.equal(a.notes.filter(n=>n.g).length,0);
   for(const n of a.notes.filter(n=>!n.g))assert.ok(sounds.some(e=>Math.abs(e.t-n.t)<1e-8),`${s.id} note is audible`);
   for(let l=0;l<3;l++){const lane=a.notes.filter(n=>n.l===l);for(let i=1;i<lane.length;i++)assert.ok(lane[i].t-lane[i-1].t>=.24-1e-8,`${s.id} lane spacing`);}
  }
 }
});
test('swing time is shared by audio and notes without moving the downbeat',()=>{
 assert.equal(typeof api.time,'function');
 const fixture={bpm:120,swing:1/6};
 assert.equal(api.time(fixture,0),0);assert.equal(api.time(fixture,4),.5);
 assert.ok(Math.abs(api.time(fixture,2)-1/3)<1e-8);
});
