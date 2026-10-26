const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{execFileSync}=require('node:child_process'),assert=require('node:assert/strict'),{test}=require('node:test');
const root=path.join(__dirname,'..'),h=fs.readFileSync(path.join(root,'index.html'),'utf8'),a=h.indexOf('const RHY_SONGS ='),b=h.indexOf('/* ---------- V10.6：農場翻牌',a),c=vm.createContext({console,Math,setInterval,clearInterval,setTimeout,clearTimeout});
vm.runInContext(h.slice(a,b)+';globalThis.api={songs:RHY_SONGS,chart:rhyChart};',c);
const titles=[['moon-alone','月下獨行'],['neon-faultline','霓虹裂光'],['your-journey','由你啟程'],['shining-you','閃耀的你'],['unspoken-echoes','未說出口的回聲'],['lucky-walk','好運隨行'],['hear-me','聽我說']];
test('seven supplied songs replace the five pictured originals while keeping Wulin first',()=>{
 assert.equal(c.api.songs.length,18);assert.equal(c.api.songs[0].id,'wulin');assert.equal(c.api.songs.filter(s=>!s.audio).length,7);
 for(const id of ['velvet','dew','island','sunpath','cafe'])assert.ok(!c.api.songs.some(s=>s.id===id),`${id} replaced`);
 for(const [id,title] of titles){const s=c.api.songs.find(s=>s.id===id);assert.ok(s,`${title} exists`);assert.equal(s.n,title);assert.equal(s.duration,45);}
});
test('every new file contains exactly 45 audible seconds and has three deterministic playable charts',()=>{
 for(const [id,title] of titles){const s=c.api.songs.find(s=>s.id===id);assert.ok(s,`${title} exists`);
  const file=path.join(root,s.audio),pcm=execFileSync('ffmpeg',['-v','error','-i',file,'-ac','1','-ar','8000','-f','s16le','pipe:1'],{maxBuffer:2e6});assert.equal(pcm.length,720000,`${title} sample count`);
  let energy=0;for(let i=0;i<pcm.length;i+=2)energy+=(pcm.readInt16LE(i)/32768)**2;assert.ok(Math.sqrt(energy/(pcm.length/2))>.03,`${title} audible content`);
  let previous=0;for(let d=0;d<3;d++){const chart=c.api.chart(s,d);assert.equal(chart.length,45);assert.ok(chart.ripe>previous);previous=chart.ripe;assert.deepEqual(chart,c.api.chart(s,d));assert.ok(chart.notes.every(n=>n.t>=2.6&&n.t<=44.5));
   for(let l=0;l<3;l++){const notes=chart.notes.filter(n=>n.l===l);for(let i=1;i<notes.length;i++)assert.ok(notes[i].t-notes[i-1].t>=.24-1e-8);}
  }
 }
});
