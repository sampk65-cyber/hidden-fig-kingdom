const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict'),{test}=require('node:test');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const c=vm.createContext({console,Math,setInterval,clearInterval,setTimeout,clearTimeout,performance:{now:()=>10000}});
vm.runInContext(html.slice(html.indexOf('const RHY_SONGS ='),html.indexOf('/* ---------- V10.6：農場翻牌'))+';globalThis.api={songs:RHY_SONGS,chart:rhyChart,pulse:typeof rhyPulseIndex==="function"?rhyPulseIndex:null,output:typeof rhyOutputTime==="function"?rhyOutputTime:null};',c);
const api=c.api;
test('recorded easy chart follows recurring beats even when intervening sounds are louder',()=>{
 const beats=Array.from({length:28},(_,i)=>[3+i*.25,i%3,i%4===0?.4:2,i]);
 const s={audio:'fixture',duration:12,bpm:120,beats,pulses:Array.from({length:14},(_,i)=>3+i*.5)};
 const charts=[0,1,2].map(d=>api.chart(s,d));
 assert.deepEqual(Array.from(charts[0].notes,n=>n.t),[3,4,5,6,7,8,9]);
 for(let d=0;d<2;d++)for(const n of charts[d].notes)assert.ok(charts[d+1].notes.some(m=>m.t===n.t&&m.l===n.l),'difficulty adds beats without moving existing targets');
});
test('all recordings carry measured pulses, nested charts and musical subdivision coordinates',()=>{
 for(const s of api.songs.filter(s=>s.audio)){
  assert.ok(s.pulses?.length>30,`${s.id}: measured pulses`);
  assert.ok(s.beats.every(b=>Number.isInteger(b[3])),`${s.id}: musical subdivisions`);
  const charts=[0,1,2].map(d=>api.chart(s,d));
  for(let d=0;d<3;d++){
   const chart=charts[d];assert.ok(chart.ripe>20);let last=-1;
   for(const n of chart.notes){assert.ok(n.t>last);last=n.t;assert.ok(s.beats.some(b=>b[0]===n.t&&b[3]%[4,2,1][d]===0));}
   if(d<2)for(const n of chart.notes)assert.ok(charts[d+1].notes.some(m=>n.t===m.t&&n.l===m.l));
  }
 }
});
test('stage pulses use recorded phase and variable beat intervals, including before the first beat',()=>{
 assert.equal(typeof api.pulse,'function');
 const s={audio:'fixture',bpm:120,pulses:[.12,.61,1.13,1.64]};
 assert.equal(api.pulse(s,.1),-1);assert.equal(api.pulse(s,.60),0);assert.equal(api.pulse(s,.62),1);assert.equal(api.pulse(s,1.12),1);assert.equal(api.pulse(s,1.13),2);
 assert.equal(api.pulse({bpm:120},1.05),2);
});
test('audible clock uses output timestamp, not render-ahead time, including compressor delay',()=>{
 assert.equal(typeof api.output,'function');
 const ctx={currentTime:7.2,state:'running',getOutputTimestamp:()=>({contextTime:7.02,performanceTime:9980}),baseLatency:.01,outputLatency:.12};
 assert.ok(Math.abs(api.output(ctx)-7.034)<1e-8);
 const fallback={currentTime:7.2,state:'running',baseLatency:.01,outputLatency:.12};
 assert.ok(Math.abs(api.output(fallback)-7.064)<1e-8);
 for(const stamp of [{contextTime:0,performanceTime:0},{contextTime:9,performanceTime:9990},{contextTime:7,performanceTime:4000},{contextTime:NaN,performanceTime:9990}])assert.ok(Math.abs(api.output({...ctx,getOutputTimestamp:()=>stamp})-7.064)<1e-8);
});
