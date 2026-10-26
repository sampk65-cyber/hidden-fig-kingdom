"""Generate managed-browser QA from production code; no Firebase/accounts."""
from pathlib import Path
import runpy,shutil
root=Path(__file__).resolve().parents[1]
runpy.run_path(str(root/'docs/wulin-browser-qa.py'))
h=(root/'qa/green.html').read_text()
runner=r'''
async function runMusicalSync(){
 QA.lines=[];AUD.on=true;AUD.unlock();await AUD.ctx.resume();
 const nativeCreate=AUD.ctx.createBufferSource.bind(AUD.ctx);let starts=[];
 AUD.ctx.createBufferSource=()=>{const source=nativeCreate(),start=source.start.bind(source);source.start=(...args)=>{starts.push({args,render:AUD.ctx.currentTime});return start(...args);};return source;};
 try{
 for(const song of RHY_SONGS.filter(s=>s.audio)){
  await rhyLoadAudio(song);starts=[];
  const chart=rhyChart(song,1),target=chart.notes.find(n=>n.t>song.duration*.65),offset=target.t-.55;
  rhyRun(()=>{},song,1);const player=QA.player,start=player.start.bind(player);player.start=()=>start(offset);
  await wait(2220);
  const scheduled=starts.find(s=>s.args.length===3);check(!!scheduled,song.n+' schedules the actual decoded recording');
  check(Math.abs(scheduled.args[1]-offset)<.001&&Math.abs(scheduled.args[0]-scheduled.render-.08)<.01,song.n+' source uses the render clock and exact seek offset');
  let clockError=0;
  for(let i=0;i<12;i++){await wait(25);const time=player.now(),context=AUD.ctx,stamp=context.getOutputTimestamp?.();
    if(time>offset+.15&&stamp?.contextTime>0){const expected=stamp.contextTime+(performance.now()-stamp.performanceTime)/1000-.006-(scheduled.args[0]-offset);clockError=Math.max(clockError,Math.abs(expected-time));}}
  check(clockError<.025,song.n+' audible clock stays within 25 ms of the output timestamp');
  // Freeze only the QA player's display/judgment clock at the known target.
  // This tests production DOM geometry independently of cloud RAF throttling.
  const realNow=player.now;player.now=()=>target.t;
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  const field=document.querySelector('#rhF'),line=field.getBoundingClientRect().top+field.clientTop+field.clientHeight*.82;
  const figs=[...document.querySelectorAll(`.rh-lane[data-l="${target.l}"] .rh-fig`)];
  const geometryError=Math.min(...figs.map(el=>{const r=el.getBoundingClientRect();return Math.abs(r.top+r.height/2-line);}));
  check(geometryError<2,song.n+' controlled musical target places fruit centre on the harvest line');
  tap(target.l);check(document.querySelector('#rhJ').textContent==='Perfect',song.n+' same target clock judges Perfect');
  player.now=realNow;
  QA.lines.push('MEASURE '+song.id+' pixels='+geometryError.toFixed(2)+' clock_ms='+(clockError*1000).toFixed(2));
  document.querySelector('#rhyX').click();await wait(70);
 }
 QA.lines.push('MUSICAL SYNC COMPLETE');
 }catch(e){QA.lines.push('FAILED '+e.message);document.querySelector('#rhyX')?.click();}
 finally{AUD.ctx.createBufferSource=nativeCreate;document.querySelector('#qaLog').textContent=QA.lines.join('\n');}
}
document.querySelector('#sync').onclick=runMusicalSync;
'''
h=h.replace('<div id="qaControls">','<div id="qaControls"><button id="sync">驗證逐首拍點與果實過線</button>')
h=h.replace('</script></body>',runner+'</script></body>')
preview=root/'.preview';(preview/'qa').mkdir(exist_ok=True)
(preview/'qa/rhythm-grid.html').write_text(h)
shutil.copytree(root/'audio',preview/'audio',dirs_exist_ok=True)
shutil.copy2(root/'index.html',preview/'index.html')
print('Prepared .preview/qa/rhythm-grid.html')
