const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{execFileSync}=require('node:child_process'),assert=require('node:assert/strict'),{test}=require('node:test');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),a=html.indexOf('const RHY_SONGS ='),b=html.indexOf('/* ---------- V10.6：農場翻牌',a),c=vm.createContext({console,Math,setInterval,clearInterval,setTimeout,clearTimeout});
vm.runInContext(html.slice(a,b)+';globalThis.api={songs:RHY_SONGS,chart:rhyChart};',c);
const expected=[['cloud-drums','雲城戰鼓',45],['wind-claps','追風擊掌',30],['thunder-stomp','雷霆踏步',40]];
test('three percussion recordings follow Wulin without removing the existing originals',()=>{
 assert.equal(c.api.songs.length,16);assert.equal(c.api.songs[0].id,'wulin');assert.equal(c.api.songs.filter(s=>!s.audio).length,12);
 for(let i=0;i<expected.length;i++){const [id,title,duration]=expected[i],s=c.api.songs[i+1];assert.equal(s.id,id);assert.equal(s.n,title);assert.equal(s.duration,duration);}
});
test('each added excerpt decodes to its exact requested length and audible content',()=>{
 for(const [id,title,seconds] of expected){const s=c.api.songs.find(s=>s.id===id);assert.ok(s,`${title} exists`);
  const file=path.join(root,s.audio),pcm=execFileSync('ffmpeg',['-v','error','-i',file,'-ac','1','-ar','8000','-f','s16le','pipe:1'],{maxBuffer:2e6});
  assert.equal(pcm.length,seconds*8000*2,`${title} decoded duration`);let energy=0;for(let i=0;i<pcm.length;i+=2)energy+=(pcm.readInt16LE(i)/32768)**2;assert.ok(Math.sqrt(energy/(pcm.length/2))>.03);
  let previous=0;for(let d=0;d<3;d++){const chart=c.api.chart(s,d);assert.equal(chart.length,seconds);assert.ok(chart.ripe>previous);previous=chart.ripe;
   assert.ok(chart.notes.every(n=>n.t>=2.6&&n.t<=seconds-.5));assert.deepEqual(chart,c.api.chart(s,d));
   for(let l=0;l<3;l++){const notes=chart.notes.filter(n=>n.l===l);for(let i=1;i<notes.length;i++)assert.ok(notes[i].t-notes[i-1].t>=.24-1e-8);}
  }
 }
});
