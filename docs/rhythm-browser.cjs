/* Isolated real-browser harness: no Firebase, accounts or production writes. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
async function main(){
 const source=fs.readFileSync(process.env.RHY_INDEX||path.join(__dirname,'../index.html'),'utf8'),a=source.indexOf('const RHY_SONGS ='),b=source.indexOf('/* ---------- V10.6：農場翻牌',a);
 const css=source.match(/<style>([\s\S]*?)<\/style>/)[1],guardStart=source.indexOf('/* Shared game native-action guard */'),guard=source.slice(guardStart,source.indexOf('function openSheet',guardStart)),script=source.slice(a,b)+guard;
 const browser=await chromium.launch(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage'],headless:true}:{headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.text().startsWith('rendered'))console.log(m.text());});
 if(process.env.FONT_CSS_ROOT)await page.route('http://rhythm.test/qa-font/**',r=>r.fulfill({path:path.join(process.env.FONT_CSS_ROOT,'files',r.request().url().split('/').pop())}));
 await page.route('http://rhythm.test/',r=>r.fulfill({contentType:'text/html; charset=utf-8',body:`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><script>
 const $=s=>document.querySelector(s); const DIFF_N=['簡單','中級','高級'];let PRACTICE=true,PRACTICE_D=1;const diffOf=()=>PRACTICE?PRACTICE_D:1;
 const AUD={on:true,ctx:null,mus:null,unlock(){if(!this.on)return;if(!this.ctx){this.ctx=new AudioContext();this.mus=this.ctx.createGain();this.mus.gain.value=.11;this.mus.connect(this.ctx.destination);}this.ctx.resume();}};
 const MUSIC={stop(){}},THEME={stop(){}};const SND={tick(){},win(){},lose(){},bad(){}};function noise(){}function closeSheet(){window.closed=(window.closed||0)+1;}window.results=[];
 ${script}
 window.testApi={songs:RHY_SONGS,arrange:typeof rhyArrangement==='function'?rhyArrangement:null,chart:typeof rhyChart==='function'?rhyChart:null,time:typeof rhyTime==='function'?rhyTime:null,bank:typeof rhyVoiceBank==='function'?rhyVoiceBank:null};
 </script>`}));
 await page.goto('http://rhythm.test/');
 if(process.env.FONT_CSS_ROOT){await page.addStyleTag({content:fs.readFileSync(path.join(process.env.FONT_CSS_ROOT,'400.css'),'utf8').replaceAll('./files/','/qa-font/')+'body{font-family:"Noto Sans TC",sans-serif}'});}
 await page.evaluate(()=>rhythmGame(r=>results.push(r)));
 await page.evaluate(()=>document.fonts.ready);
 assert.equal(await page.locator('#rhSongs [data-song]').count(),12,'all twelve songs are selectable');
 assert.equal(await page.locator('#rhDifficulties button').count(),3,'practice has three difficulties');
 await page.locator('#rhSongs [data-song="cafe"]').click();
 assert.match(await page.locator('#rhSelected').innerText(),/月台爵士館/);
 await page.screenshot({path:'/tmp/rhythm-library.png'});
 await page.locator('#rhPreview').click();
 assert.equal(await page.locator('#rhPreview').getAttribute('aria-pressed'),'true');
 await page.locator('#rhSongs [data-song="earth"]').click();
 assert.equal(await page.locator('#rhPreview').getAttribute('aria-pressed'),'false','switch stops preview');
 assert.equal(await page.evaluate(()=>results.length),0,'selecting and preview never completes a challenge');
 await page.locator('#rhDifficulties [data-d="2"]').click();
 assert.equal(await page.evaluate(()=>PRACTICE_D),2);
 await page.locator('#rhStart').click();
 assert.equal(await page.locator('#rhSongOv').count(),0);
 assert.equal(await page.locator('#rhyOv').count(),1);
 const protectedTouch=await page.locator('.rh-b').first().evaluate(el=>{const e=new Event('touchstart',{bubbles:true,cancelable:true});el.dispatchEvent(e);const menu=new Event('contextmenu',{bubbles:true,cancelable:true});el.dispatchEvent(menu);return e.defaultPrevented&&menu.defaultPrevented;});
 assert.equal(protectedTouch,true,'harvest pads retain native long-press protection');
 await page.waitForTimeout(2300);
 assert.match(await page.locator('#rhInfo').innerText(),/大地採收祭/);
 await page.screenshot({path:'/tmp/rhythm-game.png'});
 await page.locator('#rhPause').click();
 assert.equal(await page.locator('#rhResume').isVisible(),true);
 await page.locator('#rhResume').click();
 assert.equal(await page.locator('#rhResume').isVisible(),false);
 await page.locator('#rhyX').click();
 assert.equal(await page.locator('#rhyOv').count(),0);
 assert.equal(await page.evaluate(()=>results.length),0,'quit does not grant result');
 await page.evaluate(()=>{PRACTICE=false;rhythmGame(r=>results.push(r));});
 assert.equal(await page.locator('#rhDifficulties button').count(),0,'formal difficulty cannot be changed');
 assert.match(await page.locator('#rhDifficulties').innerText(),/中級/);
 await page.locator('#rhSongX').click();
 // Simulate a slow mobile audio unlock; a preview must not claim to play silently.
 await page.evaluate(async()=>{await AUD.ctx.suspend();window.realResume=AUD.ctx.resume.bind(AUD.ctx);AUD.ctx.resume=()=>new Promise(resolve=>setTimeout(()=>realResume().then(resolve),250));rhythmGame(r=>results.push(r));});
 await page.locator('#rhPreview').click();
 assert.equal(await page.locator('#rhPreview').getAttribute('aria-pressed'),'false','preview waits for audio unlock');
 await page.locator('#rhSongs [data-song="velvet"]').click();
 await page.waitForTimeout(400);
 assert.equal(await page.locator('#rhPreview').getAttribute('aria-pressed'),'false','a stale unlock cannot restart a cancelled preview');
 await page.evaluate(()=>{AUD.ctx.resume=realResume;});
 await page.locator('#rhSongX').click();
 console.log('PASS: chooser/game UI');
 const rendered=await page.evaluate(async()=>{
  const stats=[];
  for(const song of testApi.songs){
   const c=new OfflineAudioContext(1,44100*8,44100),g=c.createGain();g.gain.value=.11;g.connect(c.destination);
   const bank=testApi.bank(c,g,song.style),events=testApi.arrange(song).events,from=4*60/song.bpm;
   events.filter(e=>e.t>=from&&e.t<from+7.5).forEach(e=>bank.play(e,e.t-from));
   const audio=await c.startRendering(),data=audio.getChannelData(0);let energy=0,peak=0;
   for(const x of data){energy+=x*x;peak=Math.max(peak,Math.abs(x));}
   stats.push({id:song.id,rms:Math.sqrt(energy/data.length),peak});console.log('rendered',song.id);
  }
  const c=new OfflineAudioContext(1,44100,44100),g=c.createGain();g.connect(c.destination);const bank=testApi.bank(c,g,'rock');
  bank.play({voice:'chord',m:60,vol:.5,dur:.5},.2);bank.stop();const stopped=await c.startRendering();
  return {stats,stoppedPeak:Math.max(...stopped.getChannelData(0))};
 });
 assert.equal(rendered.stats.length,12);
 for(const r of rendered.stats){assert.ok(r.rms>.005,`${r.id} is audible`);assert.ok(r.peak<.95,`${r.id} does not clip`);}
 assert.equal(rendered.stoppedPeak,0,'stopping removes even future-scheduled voices');
 console.log('Audio render:',JSON.stringify(rendered.stats));
 // A real AudioContext verifies clock and mute without replacing the player with a mock.
 const lifecycle=await page.evaluate(async()=>{
  AUD.unlock();await AUD.ctx.resume();const p=rhyPlayer(testApi.songs[0]),an=AUD.ctx.createAnalyser();an.fftSize=2048;AUD.mus.connect(an);
  const wait=ms=>new Promise(r=>setTimeout(r,ms)),peak=()=>{const a=new Float32Array(2048);an.getFloatTimeDomainData(a);return Math.max(...a.map(Math.abs));};
  p.start(3);await wait(180);const before=p.now();p.pause();await wait(130);const frozen=p.now();await wait(100);const still=p.now();p.resume();await wait(150);const resumed=p.now();
  AUD.on=false;await wait(400);const muted=peak();const mutedClock=p.now();p.stop();AUD.on=true;await wait(200);const stopped=peak();an.disconnect();return {before,frozen,still,resumed,muted,mutedClock,stopped};
 });
 assert.equal(lifecycle.still,lifecycle.frozen,'pause freezes the song clock');
 assert.ok(lifecycle.resumed>lifecycle.frozen,'resume continues instead of resetting');
 assert.ok(lifecycle.mutedClock>lifecycle.resumed,'muting preserves timing');
 assert.ok(lifecycle.muted<.0001,'mute silences rhythm music');assert.ok(lifecycle.stopped<.0001,'stop silences rhythm music');
 const recovered=await page.evaluate(async()=>{
  const old=AUD.ctx;AUD.on=false;AUD.ctx=null;AUD.mus=null;const p=rhyPlayer(testApi.songs[0]);p.start(3);
  const wait=ms=>new Promise(r=>setTimeout(r,ms));await wait(150);const before=p.now();AUD.on=true;AUD.unlock();await AUD.ctx.resume();
  const an=AUD.ctx.createAnalyser();an.fftSize=2048;AUD.mus.connect(an);let peak=0;
  for(let i=0;i<10;i++){await wait(100);const a=new Float32Array(2048);an.getFloatTimeDomainData(a);peak=Math.max(peak,...a.map(Math.abs));}
  const after=p.now();p.stop();an.disconnect();await old.close();return {before,after,peak};
 });
 const resumeStarts=await page.evaluate(async()=>{
  const originalPlayer=rhyPlayer,originalResume=AUD.ctx.resume.bind(AUD.ctx);let starts=0;
  rhyPlayer=s=>{const p=originalPlayer(s),start=p.start;p.start=function(...args){starts++;return start.apply(this,args);};return p;};
  AUD.ctx.resume=()=>new Promise(resolve=>setTimeout(()=>originalResume().then(resolve),250));
  rhyRun(r=>results.push(r),testApi.songs[0],0);document.querySelector('#rhPause').click();document.querySelector('#rhResume').click();document.querySelector('#rhResume').click();
  await new Promise(r=>setTimeout(r,3100));document.querySelector('#rhyX').click();rhyPlayer=originalPlayer;AUD.ctx.resume=originalResume;return starts;
 });
 console.log('Recovery:',JSON.stringify({recovered,resumeStarts}));
 assert.ok(recovered.peak>.001,'turning sound on during a cold muted start restores actual music');
 assert.ok(recovered.after>recovered.before&&recovered.after<recovered.before+1.5,'audio adoption preserves the song timeline');
 assert.equal(resumeStarts,1,'double resume during countdown starts the song exactly once');
 await page.setViewportSize({width:320,height:568});
 await page.evaluate(()=>{PRACTICE=true;rhythmGame(r=>results.push(r));});
 await page.locator('#rhSongs [data-song="earth"]').click();
 assert.ok(await page.locator('#rhStart').evaluate(el=>el.getBoundingClientRect().bottom<=innerHeight),'start is reachable on a short phone');
 assert.ok(await page.locator('#rhSongOv').evaluate(el=>el.scrollWidth<=innerWidth),'no horizontal overflow');
 await page.screenshot({path:'/tmp/rhythm-small.png'});
 await page.locator('#rhSongX').click();
 await page.clock.install();
 await page.evaluate(()=>{AUD.on=false;AUD.ctx=null;rhyRun(r=>results.push(r),testApi.songs[0],0);});
 await page.clock.runFor(2200);await page.clock.fastForward(60000);await page.clock.runFor(100);
 const completed=await page.evaluate(()=>results);
 assert.equal(completed.length,1,'completion invokes exactly one existing result callback');
 assert.equal(completed[0].score,5,'a missed run preserves the existing score floor');
 assert.match(completed[0].detail,/漏接 32/);
 assert.equal(await page.locator('#rhyOv').count(),0,'completion cleans the game overlay');
 assert.deepEqual(errors,[]);
 console.log('PASS: chooser, preview switching, difficulty boundaries, gameplay, pause/resume and quit');
 await browser.close();
}
main().catch(e=>{console.error(e);process.exit(1)});
