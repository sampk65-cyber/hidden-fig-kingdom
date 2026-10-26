const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict'),{test}=require('node:test');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const a=html.indexOf('const RHY_SONGS ='),b=html.indexOf('/* ---------- V10.6：農場翻牌',a);
const context=vm.createContext({console,Math,Map,setInterval,clearInterval,setTimeout,clearTimeout});
vm.runInContext(html.slice(a,b)+'\nglobalThis.api={songs:RHY_SONGS,arrange:rhyArrangement,chart:rhyChart};',context);
const {songs,arrange,chart}=context.api;
test('encoded recording contains the entire sixty-second passage',()=>{
 const {execFileSync}=require('node:child_process');
 const file=path.join(__dirname,'../audio/wulin-60.mp3');
 const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','json',file],{encoding:'utf8'}));
 assert.ok(Number(probe.format.duration)>=59.99&&Number(probe.format.duration)<=60.1,'encoded duration must remain sixty seconds after file transfer');
 const pcm=execFileSync('ffmpeg',['-v','error','-i',file,'-ac','1','-ar','8000','-f','s16le','pipe:1'],{maxBuffer:2e6});
 assert.equal(pcm.length,960000,'decoded sample count must be exactly 60 seconds');
 let energy=0;for(let i=0;i<pcm.length;i+=2)energy+=(pcm.readInt16LE(i)/32768)**2;
 assert.ok(Math.sqrt(energy/(pcm.length/2))>.03,'the passage must remain audible');
});
test('first track is the supplied 60-second recording and retains all twelve originals',()=>{
 assert.equal(songs[0].n,'一個人的武林');assert.equal(songs[0].duration,60);assert.equal(songs[0].audio,'audio/wulin-60.mp3');
 assert.equal(songs.filter(s=>!s.audio).length,12);assert.ok(fs.statSync(path.join(__dirname,'../',songs[0].audio)).size>100000);
});
test('recorded fruit arrives on acoustic accents with a full fall-in, bounded spacing and increasing density',()=>{
 const s=songs.find(s=>s.audio);assert.ok(s,'recorded track exists');
 const events=arrange(s).events;assert.ok(events.length>100);assert.equal(arrange(s).length,60);
 let previous=0;for(let d=0;d<3;d++){
  const c=chart(s,d);assert.equal(c.length,60);assert.deepEqual(c,chart(s,d));assert.ok(c.ripe>previous);previous=c.ripe;
  assert.ok(c.ripe>=25&&c.ripe<250);
  assert.ok(c.notes.every(n=>n.t>=2.6&&n.t<=59.5&&n.l>=0&&n.l<=2));
  for(const n of c.notes)assert.ok(events.some(e=>Math.abs(e.t-n.t)<.001),'each target follows a measured acoustic onset');
  for(let l=0;l<3;l++){const ns=c.notes.filter(n=>n.l===l);for(let i=1;i<ns.length;i++)assert.ok(ns[i].t-ns[i-1].t>=.24-1e-8);}
 }
});
