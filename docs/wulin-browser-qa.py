# Generate isolated browser checks from the current production source; no Firebase is loaded.
from pathlib import Path
import subprocess
root=Path(__file__).resolve().parents[1];qa=root/'qa';qa.mkdir(exist_ok=True)
runner=r'''
const QA={lines:[],time:0,player:null};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const check=(ok,text)=>{QA.lines.push((ok?'PASS ':'FAIL ')+text);document.querySelector('#qaLog').textContent=QA.lines.join('\n');if(!ok)throw Error(text);};
const originalPlayer=rhyPlayer;rhyPlayer=s=>{const p=originalPlayer(s);QA.player=p;return p;};
const tap=l=>document.querySelector(`.rh-b[data-l="${l}"]`).dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true}));
const meter=bus=>{const a=AUD.ctx.createAnalyser();a.fftSize=4096;bus.connect(a);return {peak(){const data=new Float32Array(a.fftSize);a.getFloatTimeDomainData(data);return Math.max(...data.map(Math.abs));},close(){bus.disconnect(a);a.disconnect();}};};
async function runFeedback(){
 AUD.on=true;AUD.unlock();await AUD.ctx.resume();const originalChart=rhyChart;
 rhyChart=()=>({notes:[{t:1,l:0,g:false},{t:2,l:1,g:false},{t:3,l:2,g:false},{t:4,l:1,g:true},{t:5,l:0,g:false}],length:10,fall:2.4,ripe:4});
 rhyRun(r=>QA.lines.push(JSON.stringify(r)),RHY_SONGS.find(s=>!s.audio),1);const p=QA.player;
 QA.time=.5;p.now=()=>QA.time;await wait(2250);const m=meter(AUD.sfx);
 tap(0);await wait(45);check(m.peak()<.0001,'empty tap produces no success/drum sound');check(document.querySelector('#rhNG').textContent==='1','empty tap increments NG');await wait(180);
 const tones=[];
 for(let l=0;l<3;l++){QA.time=l+1;tap(l);await wait(30);check(document.querySelector('#rhJ').textContent==='Perfect','lane '+l+' judges Perfect');check(m.peak()>.01,'lane '+l+' plays the shared success tone');
 const an=AUD.ctx.createAnalyser();an.fftSize=4096;an.smoothingTimeConstant=0;AUD.sfx.connect(an);await wait(15);const data=new Float32Array(an.frequencyBinCount);an.getFloatFrequencyData(data);let peakBin=0;for(let i=1;i<data.length;i++)if(data[i]>data[peakBin])peakBin=i;tones.push(peakBin*AUD.ctx.sampleRate/an.fftSize);AUD.sfx.disconnect(an);await wait(180);}
 check(Math.max(...tones)-Math.min(...tones)<50,'all three lanes share the same tone');check(document.querySelector('#rhS').textContent==='6','three correct hits accumulate six points');check(document.querySelector('#rhCombo').textContent==='3 COMBO','three correct hits accumulate combo');
 QA.time=4;tap(1);await wait(45);check(m.peak()<.0001,'green fruit plays no success tone');check(document.querySelector('#rhCombo').textContent==='0 COMBO','NG resets combo');
 QA.time=5.12;tap(0);await wait(35);check(document.querySelector('#rhJ').textContent==='Good','Good retains its timing window');check(document.querySelector('#rhS').textContent==='5','green penalty and Good points retain existing scoring');check(m.peak()>.01,'Good plays success sound');
 document.querySelector('#rhPause').click();await wait(150);check(m.peak()<.0001,'pause clears success tails');document.querySelector('#rhyX').click();m.close();rhyChart=originalChart;
 const c=new OfflineAudioContext(1,22050,44100),out=c.createGain();out.gain.value=.28*.85;out.connect(c.destination);const bank=rhyVoiceBank(c,out,'drums');bank.play({voice:'success',m:81,vol:.48,dur:.13},0);bank.play({voice:'success',m:86,vol:.555,dur:.13},.25);const signal=(await c.startRendering()).getChannelData(0);
 let peak=0;for(const x of signal)peak=Math.max(peak,Math.abs(x));check(peak>.01&&peak<.3,'combo-success audio has safe audible headroom');
 QA.lines.push('MEASURE success fundamentals '+JSON.stringify(tones)+'; peak '+peak.toFixed(4));
}
async function runRecording(){
 AUD.on=true;AUD.unlock();await AUD.ctx.resume();const song=RHY_SONGS[0];const raw=await(await fetch(song.audio)).arrayBuffer(),decoded=await AUD.ctx.decodeAudioData(raw.slice(0));QA.lines.push('DIAGNOSTIC bytes '+raw.byteLength+' seconds '+decoded.duration+' rate '+decoded.sampleRate);document.querySelector('#qaLog').textContent=QA.lines.join('\n');await rhyLoadAudio(song);check(Math.abs(RHY_AUDIO.get(song.audio).buffer.duration-60)<.01,'recording decodes to exactly 60 seconds');
 const p=rhyPlayer(song),m=meter(AUD.mus);p.start(12);await wait(250);check(m.peak()>.015,'recorded music plays through real music output');check(p.now()>12&&p.now()<12.5,'music clock starts at the requested offset');
 p.pause();const at=p.now();await wait(100);check(Math.abs(p.now()-at)<.001&&m.peak()<.0001,'pause freezes clock and stops the recording');p.resume();await wait(220);check(p.now()>at&&p.now()<at+.4&&m.peak()>.015,'resume restores the same recording position');
 AUD.set(false);await wait(320);check(m.peak()<.0001,'mute silences the recording');AUD.set(true);await wait(140);check(m.peak()>.015,'unmute restores the recording without restarting');p.stop();await wait(150);check(m.peak()<.0001,'quit removes owned recording sound');
 const realFetch=window.fetch;let calls=0;const retry={...song,audio:'qa-missing.mp3'};window.fetch=()=>++calls===1?Promise.resolve(new Response('',{status:503})):realFetch('/audio/wulin-60.mp3');let rejected=false;try{await rhyLoadAudio(retry);}catch(e){rejected=true;}check(rejected,'failed recording load rejects');await rhyLoadAudio(retry);check(calls===2&&RHY_AUDIO.get(retry.audio).buffer.duration>59.99,'failed recording load can retry');window.fetch=realFetch;
 // Start with no audio context, then enable sound during the track.
 await AUD.ctx.close();AUD.ctx=AUD.mus=AUD.sfx=null;AUD.on=false;const cold=rhyPlayer(song);cold.start(7);await wait(180);const silentAt=cold.now();AUD.set(true);await AUD.ctx.resume();const coldMeter=meter(AUD.mus);await wait(260);check(cold.now()>silentAt&&cold.now()<silentAt+.5&&coldMeter.peak()>.015,'cold-muted start joins the recording at its current position');cold.stop();coldMeter.close();
 // Switching away during a delayed start must never open a stale game.
 RHY_AUDIO.delete(song.audio);let release;window.fetch=()=>new Promise(r=>release=r);localStorage.removeItem('hfk_rhythm_song');rhySelect(()=>{});document.querySelector('#rhStart').click();await wait(25);document.querySelector('[data-song="velvet"]').click();release(await realFetch('/audio/wulin-60.mp3'));await wait(250);check(!document.querySelector('#rhyOv')&&document.querySelector('#rhSelected').textContent==='絨夜熟果','switching during load cancels the old start');window.fetch=realFetch;document.querySelector('#rhSongX').click();
 // Closing while preview loads must not start late music.
 RHY_AUDIO.delete(song.audio);window.fetch=()=>new Promise(r=>release=r);localStorage.removeItem('hfk_rhythm_song');rhySelect(()=>{});document.querySelector('#rhPreview').click();await wait(40);document.querySelector('#rhSongX').click();release(await realFetch('/audio/wulin-60.mp3'));await wait(250);const finalMeter=meter(AUD.mus);await wait(60);check(!document.querySelector('#rhSongOv')&&finalMeter.peak()<.0001,'closing during preview load prevents late playback');window.fetch=realFetch;finalMeter.close();
 RHY_AUDIO.delete(song.audio);window.fetch=()=>new Promise(r=>release=r);localStorage.removeItem('hfk_rhythm_song');rhySelect(()=>{});document.querySelector('#rhStart').click();await wait(25);document.querySelector('[data-d=\"2\"]').click();release(await realFetch('/audio/wulin-60.mp3'));await wait(250);check(!document.querySelector('#rhyOv')&&!document.querySelector('#rhStart').disabled,'changing difficulty while loading cancels stale start');window.fetch=realFetch;document.querySelector('#rhSongX').click();
 localStorage.removeItem('hfk_rhythm_song');rhySelect(()=>{});check(document.querySelector('#rhSongs [data-song]').dataset.song==='wulin','catalog displays 一個人的武林 first');check(document.querySelectorAll('#rhSongs [data-song]').length===13,'all thirteen tracks remain selectable');
}
document.querySelector('#feedback').onclick=async()=>{QA.lines=[];try{await runFeedback();QA.lines.push('FEEDBACK COMPLETE');}catch(e){QA.lines.push('FAILED '+e.message);}document.querySelector('#qaLog').textContent=QA.lines.join('\n');};
document.querySelector('#recording').onclick=async()=>{try{await runRecording();QA.lines.push('RECORDING COMPLETE');}catch(e){QA.lines.push('FAILED '+e.message);}document.querySelector('#qaLog').textContent=QA.lines.join('\n');};
document.querySelector('#catalog').onclick=()=>{localStorage.removeItem('hfk_rhythm_song');rhySelect(()=>{});};
'''
for mode,html in [('green',(root/'index.html').read_text()),('red',subprocess.check_output(['git','show','82ddb5e9723ca867fcea76c38b6a7f0dc3db12f8:index.html'],cwd=root).decode())]:
 a=html.index('const RHY_SONGS =');b=html.index('/* ---------- V10.6：農場翻牌',a)
 au=html.index('const AUD = {');ae=html.index('AUD.init();',au)
 styles='\n'.join(m.split('</style>')[0] for m in html.split('<style>')[1:])
 import re
 styles='\n'.join(re.findall(r'<style[^>]*>([\s\S]*?)</style>',html.split('</head>')[0]))
 output='<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base href="/"><title>Rhythm QA '+mode+'</title><style>'+styles+'</style><style>body{background:#faf7ef;padding:12px}#qaLog{white-space:pre-wrap;font:14px monospace;position:relative;z-index:1}#qaControls{display:flex;gap:12px;padding:10px}body{max-width:390px;margin:auto}</style><body><div id="qaControls"><button id="feedback">驗證答對音</button><button id="recording">驗證錄音</button><button id="catalog">選曲</button></div><pre id="qaLog">Ready '+mode+'</pre><script>const $=s=>document.querySelector(s),DIFF_N=["簡單","中級","高級"],MUSIC={stop(){}},THEME={stop(){}},SND={win(){},lose(){}};let PRACTICE=true,PRACTICE_D=1;const diffOf=()=>PRACTICE_D;function closeSheet(){}\n'+html[au:ae]+'\nAUD.init();\n'+html[a:b]+'\n'+runner+'</script></body></html>'
 (qa/(mode+'.html')).write_text(output)
print('Harnesses prepared with production rhythm, routing and Web Audio; Firebase excluded.')
