const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{test}=require('node:test');
const html=fs.readFileSync(process.env.RHY_INDEX||require('node:path').join(__dirname,'../index.html'),'utf8');
const start=html.indexOf('const RHY_SONGS ='),end=html.indexOf('/* ---------- V10.6：農場翻牌',start);
const ctx=vm.createContext({console,Math,setInterval,clearInterval,setTimeout,clearTimeout});
vm.runInContext(html.slice(start,end)+'\nglobalThis.api={songs:RHY_SONGS,arrange:typeof rhyArrangement==="function"?rhyArrangement:null,chart:typeof rhyChart==="function"?rhyChart:null,time:typeof rhyTime==="function"?rhyTime:null};',ctx);
const api=ctx.api;api.songs=api.songs.filter(s=>!s.audio);
test('swing time is shared by audio and notes without moving the downbeat',()=>{
 assert.equal(typeof api.time,'function');
 const fixture={bpm:120,swing:1/6};
 assert.equal(api.time(fixture,0),0);assert.equal(api.time(fixture,4),.5);
 assert.ok(Math.abs(api.time(fixture,2)-1/3)<1e-8);
});
