const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict'),{test}=require('node:test');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const maps=JSON.parse(fs.readFileSync(path.join(root,'rhythm45/beatmaps.json'),'utf8'));
function harness(fetcher){
 const c=vm.createContext({console,Math,performance,setInterval,clearInterval,setTimeout,clearTimeout,fetch:fetcher|| (async url=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(path.join(root,url.split('?')[0]),'utf8'))}))});
 vm.runInContext(html.slice(html.indexOf('const RHY_SONGS ='),html.indexOf('/* ---------- V10.6：農場翻牌'))+';globalThis.api={songs:RHY_SONGS,chart:rhyChart,pulse:rhyPulseIndex,load:typeof rhyLoadBeatmaps==="function"?rhyLoadBeatmaps:null};',c);return c.api;
}
test('six selectable recordings use the uploaded beatmaps without changing hit times or lanes',async()=>{
 const a=harness();assert.equal(a.songs.length,6,'only the six replacement tracks are selectable');
 assert.equal(typeof a.load,'function');await a.load();
 for(const s of a.songs){const file=path.basename(s.audio),source=maps[file];assert.ok(source);assert.ok(fs.existsSync(path.join(root,s.audio)));
  assert.equal(s.duration,45);assert.equal(JSON.stringify(s.beats),JSON.stringify(source.beats));
  const charts=[0,1,2].map(d=>a.chart(s,d));
  for(let d=0;d<3;d++){const chart=charts[d];assert.equal(chart.length,45);assert.ok(chart.ripe>=10);
   for(const n of chart.notes){assert.ok(source.beats.some(b=>b[0]===n.t&&b[1]===n.l));assert.ok(n.t>=chart.fall&&n.t<44.5);assert.equal(a.pulse(s,n.t),source.beats.findIndex(b=>b[0]===n.t));}
   if(d<2){assert.ok(chart.ripe<charts[d+1].ripe);for(const n of chart.notes)assert.ok(charts[d+1].notes.some(m=>m.t===n.t&&m.l===n.l));}
  }
 }
});
test('beatmap requests share one load and recover after a failed request',async()=>{
 let calls=0;const a=harness(async()=>{calls++;if(calls===1)throw Error('offline');return {ok:true,json:async()=>maps};});
 assert.equal(typeof a.load,'function');await assert.rejects(a.load(),/offline/);await Promise.all([a.load(),a.load()]);assert.equal(calls,2);await a.load();assert.equal(calls,2);
});
test('invalid or missing song maps cannot start a silently unsynchronized game',async()=>{
 const a=harness(async()=>({ok:true,json:async()=>({})}));assert.equal(typeof a.load,'function');await assert.rejects(a.load(),/beatmap/);
});
test('all six supplied MP3s decode to exactly 45 seconds of audible sound',()=>{
 const {execFileSync}=require('node:child_process');
 for(const file of Object.keys(maps)){
  const pcm=execFileSync('ffmpeg',['-v','error','-i',path.join(root,'rhythm45/audio',file),'-ac','1','-ar','8000','-f','s16le','pipe:1'],{maxBuffer:2e6});
  assert.equal(pcm.length,720000,file);let energy=0;for(let i=0;i<pcm.length;i+=2)energy+=(pcm.readInt16LE(i)/32768)**2;
  assert.ok(Math.sqrt(energy/(pcm.length/2))>.01,file+' has audible content');
 }
});
