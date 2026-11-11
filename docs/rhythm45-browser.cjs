const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const root=path.join(__dirname,'..'),source=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=source.match(/<style>([\s\S]*?)<\/style>/)[1],a=source.indexOf('const AUD = {'),audio=source.slice(a,source.indexOf('AUD.init();',a));
const rhythm=source.slice(source.indexOf('const RHY_SONGS ='),source.indexOf('/* ---------- V10.6：農場翻牌'));
const guardStart=source.indexOf('/* Shared game native-action guard */'),guard=source.slice(guardStart,source.indexOf('function openSheet',guardStart));
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('http://rhythm.test/**',r=>{const p=new URL(r.request().url()).pathname;if(p!=='/')return r.fulfill({path:path.join(root,p),contentType:p.endsWith('.json')?'application/json':'audio/mpeg'});
   return r.fulfill({contentType:'text/html; charset=utf-8',body:`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><script>
    const $=s=>document.querySelector(s),DIFF_N=['簡單','中級','高級'];let PRACTICE=true,PRACTICE_D=1;const diffOf=()=>PRACTICE?PRACTICE_D:1;
    const MUSIC={stop(){}},THEME={stop(){}},SND={win(){},lose(){}};function noise(){}function closeSheet(){}window.results=[];
    ${audio}\n${rhythm}\n${guard}
    const realPlayer=rhyPlayer;rhyPlayer=s=>{const p=realPlayer(s);window.activePlayer=p;return p;};
   </script>`});});
  await page.goto('http://rhythm.test/');
  await page.evaluate(()=>{localStorage.setItem('hfk_rhythm_song','wulin');rhythmGame(r=>results.push(r));});
  assert.equal(await page.locator('#rhSongs [data-song]').count(),19);assert.match(await page.locator('.rh-intro').innerText(),/新增 6 首 45 秒/);
  await page.locator('#rhPreview').click();await page.waitForFunction(()=>document.querySelector('#rhPreview').getAttribute('aria-pressed')==='true');
  const durations=await page.evaluate(async()=>{const out=[];for(const s of RHY_SONGS.filter(s=>s.audio?.startsWith('rhythm45/audio/'))){const b=await rhyLoadAudio(s);out.push({name:s.n,duration:b.duration,notes:[0,1,2].map(d=>rhyChart(s,d).ripe)});}return out;});
  for(const s of durations)assert.ok(Math.abs(s.duration-45)<.02,s.name);console.log('Decoded tracks:',JSON.stringify(durations));
  await page.locator('[data-song="sport45"]').click();assert.equal(await page.locator('#rhPreview').getAttribute('aria-pressed'),'false');
  await page.locator('[data-d="2"]').click();await page.locator('#rhStart').click();await page.waitForTimeout(2200);
  assert.equal(await page.locator('#rhyOv').count(),1);assert.match(await page.locator('#rhInfo').innerText(),/45 秒/);
  const protectedTouch=await page.locator('.rh-b').first().evaluate(el=>{const e=new Event('touchstart',{bubbles:true,cancelable:true});el.dispatchEvent(e);return e.defaultPrevented;});assert.ok(protectedTouch);
  await page.locator('#rhPause').click();const frozen=await page.evaluate(()=>activePlayer.now());await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>activePlayer.now()),frozen);await page.locator('#rhResume').click();
  const judged=await page.evaluate(async()=>{
   const target=rhyChart(RHY_SONGS.find(s=>s.id==='sport45'),2).notes[0];activePlayer.start(target.t-.3);
   return await new Promise(resolve=>{const step=()=>{const now=activePlayer.now();if(now<target.t)return requestAnimationFrame(step);document.querySelector(`.rh-b[data-l="${target.l}"]`).dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true}));resolve({delta:now-target.t,judge:document.querySelector('#rhJ').textContent,score:document.querySelector('#rhS').textContent});};requestAnimationFrame(step);});
  });assert.equal(judged.judge,'Perfect');assert.ok(judged.delta<.09);assert.equal(judged.score,'2');
  for(const selector of ['#rhS','#rhPerfect','#rhGood','#rhNG','.rh-b[data-l="0"]','.rh-b[data-l="1"]','.rh-b[data-l="2"]'])assert.ok(await page.locator(selector).isVisible());
  await page.screenshot({path:'/workspace/scratch/d278139ea50d/rhythm45-mobile.png'});
  await page.evaluate(()=>activePlayer.start(44.7));await page.waitForTimeout(180);assert.equal(await page.locator('#rhyOv').count(),1,'no early ending');await page.waitForTimeout(350);assert.equal(await page.locator('#rhyOv').count(),0,'ends at 45 seconds');assert.equal(await page.evaluate(()=>results.length),1);
  await page.evaluate(()=>{PRACTICE=false;rhythmGame(r=>results.push(r));});assert.equal(await page.locator('#rhDifficulties button').count(),0);await page.locator('#rhSongX').click();assert.equal(await page.evaluate(()=>results.length),1);
  assert.deepEqual(errors,[]);console.log('PASS: six tracks, real MP3 decode, preview cancellation, original beat Perfect, pause/resume, 45-second end, formal difficulty and mobile controls');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
