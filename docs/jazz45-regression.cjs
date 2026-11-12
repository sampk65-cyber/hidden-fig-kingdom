const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{test}=require('node:test');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),fixture=require('./jazz45-retained-fixture.json');
const hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
function harness(fetcher){const c=vm.createContext({console,Math,performance,setInterval,clearInterval,setTimeout,clearTimeout,fetch:fetcher|| (async url=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(path.join(root,url.split('?')[0]),'utf8'))}))});vm.runInContext(html.slice(html.indexOf('const RHY_SONGS ='),html.indexOf('/* ---------- V10.6：農場翻牌'))+';globalThis.api={songs:RHY_SONGS,chart:rhyChart,load:rhyLoadBeatmaps};',c);return c.api;}
test('only positions 18 and 19 are replaced: first 17 recordings and all 51 charts stay unchanged',async()=>{
 const a=harness();assert.equal(a.songs.length,25);await a.load();
 for(let i=0;i<17;i++){assert.equal(a.songs[i].id,fixture[i].id);assert.equal(hash(a.songs[i]),fixture[i].hash);for(let d=0;d<3;d++)assert.equal(hash(a.chart(a.songs[i],d)),fixture[i].charts[d]);}
 assert.ok(!a.songs.some(s=>['aurora','earth'].includes(s.id)));assert.equal(new Set(a.songs.map(s=>s.id)).size,25);
});
test('eight jazz recordings have independent loaded maps and three nested 45-second charts',async()=>{
 const a=harness(),songs=a.songs.filter(s=>s.audio?.startsWith('rhythm-jazz45/'));assert.equal(songs.length,8);await a.load(songs[0]);
 for(const s of songs){assert.equal(s.duration,45);assert.ok(s.beats.length>30);assert.ok(s.pulses.length>30);let previous=0;
  for(const beat of s.beats.filter(b=>b[3]%2===0))assert.equal(s.pulses[beat[3]/2],beat[0],'stage flash and main-note target share the same attack');
  const charts=[0,1,2].map(d=>a.chart(s,d));for(let d=0;d<3;d++){const c=charts[d];assert.equal(c.length,45);assert.ok(c.ripe>previous);previous=c.ripe;
   for(const n of c.notes){assert.ok(n.t>=c.fall&&n.t<=44.5);assert.ok(s.beats.some(b=>b[0]===n.t));if(d<2)assert.ok(charts[d+1].notes.some(m=>m.t===n.t&&m.l===n.l));}
  }
 }
});
test('every new MP3 decodes to exactly 45 seconds and matches the analyzed audio',()=>{
 const {execFileSync}=require('node:child_process'),reports=require('./jazz45-analysis.json');assert.equal(reports.length,8);
 for(const r of reports){const file=path.join(root,'rhythm-jazz45/audio',r.file);assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),r.audio_sha256);
  const pcm=execFileSync('ffmpeg',['-v','error','-i',file,'-ac','1','-ar','8000','-f','s16le','pipe:1'],{maxBuffer:2e6});assert.equal(pcm.length,720000,r.file);
 }
});
test('a failed jazz map does not poison the existing six-song pack and can be retried',async()=>{
 let fail=true;const calls=[];const a=harness(async url=>{calls.push(url);if(url.includes('jazz')&&fail)throw Error('jazz offline');return {ok:true,json:async()=>JSON.parse(fs.readFileSync(path.join(root,url.split('?')[0]),'utf8'))};});
 const jazz=a.songs.find(s=>s.audio?.startsWith('rhythm-jazz45/'));assert.ok(jazz);await assert.rejects(a.load(jazz),/jazz offline/);await a.load();assert.ok(a.songs.find(s=>s.id==='ukulele45').beats.length>0);fail=false;await a.load(jazz);assert.ok(jazz.beats.length>0);await a.load(jazz);assert.equal(calls.filter(u=>u.includes('jazz')).length,2);
});
