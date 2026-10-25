/* Rhythm-only acceptance: actual AUD routing / Web Audio, controlled UI clock, no account writes. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{test,before,after}=require('node:test');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const source=fs.readFileSync(process.env.RHY_INDEX||path.join(__dirname,'../index.html'),'utf8');
const start=source.indexOf('const RHY_SONGS ='),end=source.indexOf('/* ---------- V10.6：農場翻牌',start);
const css=source.match(/<style>([\s\S]*?)<\/style>/)[1],audioStart=source.indexOf('const AUD = {'),audio=source.slice(audioStart,source.indexOf('AUD.init();',audioStart));
let browser;before(async()=>{browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage'],headless:true});});after(async()=>{await browser?.close();});
async function open(viewport={width:390,height:844}){
 const page=await browser.newPage({viewport,isMobile:true,hasTouch:true});page.errors=[];page.on('pageerror',e=>page.errors.push(e.message));
 if(process.env.FONT_CSS_ROOT)await page.route('http://rhythm.test/qa-font/**',r=>r.fulfill({path:path.join(process.env.FONT_CSS_ROOT,'files',r.request().url().split('/').pop())}));
 await page.route('http://rhythm.test/',r=>r.fulfill({contentType:'text/html; charset=utf-8',body:`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><script>
 const $=s=>document.querySelector(s),DIFF_N=['簡單','中級','高級'];const MUSIC={stop(){}},THEME={stop(){}},SND={bad(){},win(){},lose(){}};function closeSheet(){}function noise(){};let PRACTICE=true,PRACTICE_D=1;const diffOf=()=>1;window.results=[];
 ${audio}\n${source.slice(start,end)}
 window.api={songs:RHY_SONGS,bank:rhyVoiceBank,arrange:rhyArrangement};const realPlayer=rhyPlayer;rhyPlayer=s=>{const p=realPlayer(s);window.activePlayer=p;return p;};
 </script>`}));await page.goto('http://rhythm.test/');
 if(process.env.FONT_CSS_ROOT)await page.addStyleTag({content:fs.readFileSync(path.join(process.env.FONT_CSS_ROOT,'400.css'),'utf8').replaceAll('./files/','/qa-font/')+'body{font-family:"Noto Sans TC",sans-serif}'});
 return page;
}
const tap=(page,l)=>page.locator(`.rh-b[data-l="${l}"]`).dispatchEvent('pointerdown');
async function at(page,seconds){const now=await page.evaluate(()=>activePlayer.now());const delta=Math.round((seconds-now)*1000);assert.ok(delta>=0,`clock cannot rewind ${now} to ${seconds}`);await page.clock.runFor(delta);}
async function fixture(page){await page.clock.install({time:new Date(0)});await page.clock.pauseAt(new Date(1000));await page.evaluate(()=>{AUD.on=false;rhyChart=()=>({notes:[{t:1,l:0,g:false},{t:2,l:1,g:false},{t:3,l:2,g:false},{t:4,l:0,g:false},{t:5,l:1,g:true},{t:6,l:2,g:false}],length:7,fall:2.4,ripe:5});rhyRun(r=>results.push(r),api.songs[0],1);});await page.clock.runFor(2200);}
async function state(page){return page.evaluate(()=>({score:document.querySelector('#rhS')?.textContent,judge:document.querySelector('#rhJ')?.textContent,perfect:document.querySelector('#rhPerfect')?.textContent,good:document.querySelector('#rhGood')?.textContent,ng:document.querySelector('#rhNG')?.textContent,combo:document.querySelector('#rhCombo')?.textContent}));}
test('timing boundaries produce visible Perfect/Good/NG counts and preserve reward points',async()=>{
 const p=await open();try{await fixture(p);
 await at(p,.911);await tap(p,0);assert.deepEqual(await state(p),{score:'2',judge:'Perfect',perfect:'1',good:'0',ng:'0',combo:'1 COMBO'});
 await at(p,1.909);await tap(p,1);assert.equal((await state(p)).judge,'Good');assert.equal((await state(p)).score,'3');await p.screenshot({path:path.join(__dirname,'rhythm-drums-good.png')});
 await at(p,2.781);await tap(p,2);assert.equal((await state(p)).good,'2');assert.equal((await state(p)).score,'4');
 await at(p,3.779);await tap(p,0);assert.equal((await state(p)).judge,'NG');assert.equal((await state(p)).ng,'1');assert.equal((await state(p)).score,'4','outside window never awards points');await p.screenshot({path:path.join(__dirname,'rhythm-drums-ng.png')});
 await at(p,4.25);assert.equal((await state(p)).ng,'2','missed note contributes exactly one NG');await at(p,4.6);assert.equal((await state(p)).ng,'2','later frames do not recount a missed note');
 await at(p,5);await tap(p,1);assert.equal((await state(p)).ng,'3');assert.equal((await state(p)).score,'2','green fruit keeps existing two-point penalty');
 await at(p,6);await tap(p,2);assert.equal((await state(p)).perfect,'2');assert.equal((await state(p)).score,'4');
 await at(p,6.5);await tap(p,0);await tap(p,0);assert.equal((await state(p)).ng,'5');assert.equal((await state(p)).score,'4','empty tap spam cannot award points');
 await at(p,7.4);const results=await p.evaluate(()=>window.results);assert.equal(results.length,1);assert.equal(results[0].score,40);assert.match(results[0].detail,/完美 2・不錯 2・漏接 1/);assert.deepEqual(p.errors,[]);
 }finally{await p.close();}
});
test('both phone sizes keep fig artwork, cumulative score, feedback and three drum pads visible',async()=>{
 for(const viewport of [{width:390,height:844},{width:320,height:568}]){const p=await open(viewport);try{await fixture(p);await at(p,.6);await p.evaluate(()=>document.fonts.ready);
 assert.ok(await p.locator('.rh-fig svg').count()>0,'notes use shaped SVG figs');
 for(const selector of ['#rhS','#rhJ','#rhPerfect','#rhGood','#rhNG','.rh-b[data-l="0"]','.rh-b[data-l="1"]','.rh-b[data-l="2"]'])assert.ok(await p.locator(selector).evaluate(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth;}),`${selector} remains in ${viewport.width}×${viewport.height}`);
 assert.match(await p.locator('.rh-btns').innerText(),/低音鼓[\s\S]*中音鼓[\s\S]*高音鼓/);assert.ok(await p.locator('#rhS').evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>=26));assert.ok(await p.locator('#rhJ').evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>=24));
 await at(p,.911);await tap(p,0);await p.screenshot({path:path.join(__dirname,`rhythm-drums-${viewport.width}.png`)});assert.deepEqual(p.errors,[]);
 }finally{await p.close();}}
});
test('three drum voices have separated low/mid/high fundamentals, bass harmonics and safe headroom',async()=>{
 const p=await open();try{const rendered=await p.evaluate(async()=>{
 const stats=[];for(const voice of ['kick','midTom','highTom']){const c=new OfflineAudioContext(1,22050,44100),out=c.createGain();out.gain.value=.28*.85;out.connect(c.destination);const bank=api.bank(c,out,'drums');bank.play({voice,m:36,vol:.9,dur:.42},0);const data=(await c.startRendering()).getChannelData(0);
 let peak=0,energy=0;for(const x of data){peak=Math.max(peak,Math.abs(x));energy+=x*x;}
 const spectrum=[];for(let hz=36;hz<=600;hz+=2){let re=0,im=0;for(let i=3969;i<12348;i++){const x=data[i]*Math.sin(Math.PI*(i-3969)/8379);re+=x*Math.cos(2*Math.PI*hz*i/44100);im-=x*Math.sin(2*Math.PI*hz*i/44100);}spectrum.push([hz,re*re+im*im]);}
 spectrum.sort((a,b)=>b[1]-a[1]);const band=(a,b)=>spectrum.filter(x=>x[0]>=a&&x[0]<=b).reduce((s,x)=>s+x[1],0);stats.push({voice,peak,rms:Math.sqrt(energy/data.length),dominant:spectrum[0][0],low:band(36,90),harmonics:band(95,240)});
 }return stats;});
 console.log('drum spectra',JSON.stringify(rendered));assert.ok(rendered[0].dominant>=45&&rendered[0].dominant<=60,'kick settles into physical bass range');assert.ok(rendered[1].dominant>=130&&rendered[1].dominant<=200,'middle drum stays in mid range');assert.ok(rendered[2].dominant>=260&&rendered[2].dominant<=380,'high drum has a distinctly higher fundamental');assert.ok(rendered[0].harmonics/rendered[0].low>.025,'bass retains audible upper harmonics for phone speakers');
 for(const d of rendered){assert.ok(d.peak<.75,'each pad leaves mix headroom');assert.ok(d.rms>.015,'each pad produces audible energy');}
 const layers=await p.evaluate(()=>api.songs.map(s=>({id:s.id,hasHigh:api.arrange(s).events.some(e=>e.voice==='highTom')})));assert.ok(layers.every(s=>s.hasHigh),'all twelve accompaniments include the high drum layer');assert.deepEqual(p.errors,[]);
 }finally{await p.close();}
});
test('empty taps play all three drums; mute, pause, quit, and cold sound recovery own their audio',async()=>{
 const p=await open();try{await p.evaluate(async()=>{AUD.unlock();await AUD.ctx.resume();window.an=AUD.ctx.createAnalyser();an.fftSize=4096;AUD.sfx.connect(an);window.peak=()=>{const a=new Float32Array(4096);an.getFloatTimeDomainData(a);return Math.max(...a.map(Math.abs));};rhyRun(r=>results.push(r),api.songs[0],0);});await p.waitForTimeout(2200);
 for(let lane=0;lane<3;lane++){await tap(p,lane);await p.waitForTimeout(45);assert.ok(await p.evaluate(()=>peak())>.01,`empty lane ${lane} has an immediate drum sound`);await p.waitForTimeout(480);}
 assert.equal((await state(p)).score,'0');
 const mixPeak=await p.evaluate(async()=>{const mix=AUD.ctx.createAnalyser();mix.fftSize=4096;AUD.mus.connect(mix);AUD.sfx.connect(mix);let peak=0;for(let i=0;i<10;i++){for(let lane=0;lane<3;lane++)activePlayer.drum(lane);await new Promise(r=>setTimeout(r,45));const a=new Float32Array(4096);mix.getFloatTimeDomainData(a);peak=Math.max(peak,...a.map(Math.abs));}AUD.mus.disconnect(mix);AUD.sfx.disconnect(mix);mix.disconnect();return peak;});console.log('rapid three-pad mix peak',mixPeak);assert.ok(mixPeak>.02&&mixPeak<.95,'rapid simultaneous drums plus music retain headroom');
 await tap(p,0);await p.locator('#rhPause').click();await p.waitForTimeout(140);assert.ok(await p.evaluate(()=>peak())<.0001,'pause removes drum tails');await tap(p,0);await p.waitForTimeout(60);assert.ok(await p.evaluate(()=>peak())<.0001,'paused pad stays silent');await p.locator('#rhResume').click();
 await tap(p,0);await p.evaluate(()=>AUD.set(false));await p.waitForTimeout(220);assert.ok(await p.evaluate(()=>peak())<.0001,'mute silences current drum');await tap(p,1);await p.waitForTimeout(70);assert.ok(await p.evaluate(()=>peak())<.0001,'muted taps stay silent');await p.evaluate(()=>AUD.set(true));await tap(p,0);await p.waitForTimeout(50);assert.ok(await p.evaluate(()=>peak())>.01,'sound toggling restores pad');await p.locator('#rhyX').click();await p.waitForTimeout(150);assert.ok(await p.evaluate(()=>peak())<.0001,'quit removes pad tails');assert.equal(await p.evaluate(()=>results.length),0);
 await p.evaluate(async()=>{await AUD.ctx.close();AUD.ctx=AUD.mus=AUD.sfx=null;AUD.on=false;rhyRun(r=>results.push(r),api.songs[0],0);});await p.waitForTimeout(2200);await tap(p,0);assert.equal((await state(p)).ng,'1');await p.evaluate(async()=>{AUD.set(true);await AUD.ctx.resume();an=AUD.ctx.createAnalyser();an.fftSize=4096;AUD.sfx.connect(an);});await p.waitForTimeout(80);await tap(p,1);await p.waitForTimeout(45);assert.ok(await p.evaluate(()=>peak())>.01,'cold-muted start later restores pads');await p.locator('#rhyX').click();assert.deepEqual(p.errors,[]);
 }finally{await p.close();}
});
