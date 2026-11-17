const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{test}=require('node:test');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),fixture=require('./peace-retained-fixture.json');
const maps=JSON.parse(fs.readFileSync(path.join(root,'rhythm45/beatmaps.json'))),key=Object.keys(maps).find(k=>k.includes('moment-of-peace')),report=require('./peace-hard-analysis.json');
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
function harness(fetcher){const c=vm.createContext({fetch:fetcher|| (async url=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(path.join(root,url.split('?')[0])))}))});
 vm.runInContext(html.slice(html.indexOf('const RHY_SONGS ='),html.indexOf('/* ---------- V10.6：農場翻牌'))+';this.api={songs:RHY_SONGS,load:rhyLoadBeatmaps,chart:rhyChart,pulse:rhyPulseIndex};',c);return c.api;}
test('all 25 songs remain; all 74 charts outside Peace advanced match V16.6 exactly',async()=>{
 const a=harness();await a.load();await a.load(a.songs[17]);assert.equal(a.songs.length,25);
 for(let i=0;i<25;i++){const s=a.songs[i];assert.equal(s.id,fixture[i].id);for(let d=0;d<3;d++){
  const actual=hash(a.chart(s,d));if(s.id==='peace45'&&d===2)assert.notEqual(actual,fixture[i].charts[d]);else assert.equal(actual,fixture[i].charts[d],s.id+' difficulty '+d);
 }}
});
test('advanced arrangement varies timing and lanes without increasing overall density',async()=>{
 const a=harness();await a.load();const song=a.songs.find(s=>s.id==='peace45'),chart=a.chart(song,2),n=chart.notes;
 assert.equal(chart.length,45);assert.equal(n.length,report.new_hard_notes);assert.ok(n.length>=95&&n.length<=120);
 assert.equal(n.length,song.hardBeats.length,'runtime does not drop or silently move the authored notes');
 for(let i=0;i<n.length;i++)assert.deepEqual([n[i].t,n[i].l],song.hardBeats[i].slice(0,2));
 const gaps=n.slice(1).map((v,i)=>v.t-n[i].t);assert.ok(gaps.filter(g=>g<.26).length>=10);assert.ok(gaps.filter(g=>g>.55).length>=10);
 for(let lane=0;lane<3;lane++){const ts=n.filter(v=>v.l===lane).map(v=>v.t);assert.ok(ts.length>=n.length*.25&&ts.length<=n.length*.4);for(let i=1;i<ts.length;i++)assert.ok(ts[i]-ts[i-1]>=.24);}
 const lanes=n.map(v=>v.l);for(let period=1;period<=8;period++){let run=0;for(let i=period;i<lanes.length;i++){run=lanes[i]===lanes[i-period]?run+1:0;assert.ok(run<=4,'no sustained short lane cycle');}}
 assert.ok(n[0].t>=2.6&&n.at(-1).t<=44.5);assert.ok(report.subdivision_notes>=8);
});
test('advanced main-beat pulse uses the same measured attacks; easy and medium retain original pulses',async()=>{
 const a=harness();await a.load();const s=a.songs.find(s=>s.id==='peace45');
 for(const n of report.notes.filter(n=>n.kind==='anchor')){const i=s.hardPulses.indexOf(n.t);assert.ok(i>=0);assert.equal(a.pulse(s,n.t,2),i);assert.equal(a.pulse(s,n.t-.00001,2),i-1);}
 for(let i=0;i<s.pulses.length;i++){assert.equal(a.pulse(s,s.pulses[i],0),i);assert.equal(a.pulse(s,s.pulses[i],1),i);}
});
test('invalid advanced overrides fail before partially replacing a loaded pack',async()=>{
 for(const bad of [[],[[3,5,1,0]],'invalid']){
  const modified=JSON.parse(JSON.stringify(maps));modified[key].hardBeats=bad;
  const a=harness(async()=>({ok:true,json:async()=>modified}));await assert.rejects(a.load(),/beatmap_hard/);assert.equal(a.songs.find(s=>s.id==='peace45').beats.length,0);
 }
});
test('analysis refers to the unchanged production recording',()=>{
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'rhythm45/audio',key))).digest('hex'),report.audio_sha256);
});
