// Isolated actual-scene rendering; no accounts, Firebase or gameplay writes.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(process.env.GH_INDEX||path.join(root,'index.html'),'utf8');
const fn=n=>{const a=source.indexOf('function '+n+'(');assert.ok(a>=0,n);return source.slice(a,source.indexOf('\n}',a)+2);};
const ordinary=source.slice(source.indexOf('const GH_LAYOUT ='),source.indexOf('/* ---------- 今日劇情：'));
const drawing=source.slice(source.indexOf('function lerpC('),source.indexOf('function mapMiniTrees'));
const zones=source.slice(source.indexOf('const ZONES ='),source.indexOf('// V8.2：'));
const css=source.match(/<style>([\s\S]*?)<\/style>/)[1];
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage'],headless:true}),page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('http://greenhouse.test/art/gh/**',r=>{const file=path.join(process.env.GH_ASSETS||path.join(root,'art/gh'),r.request().url().split('/').pop());return fs.existsSync(file)?r.fulfill({path:file}):r.fulfill({status:404,body:''});});
 await page.route('http://greenhouse.test/',r=>r.fulfill({contentType:'text/html; charset=utf-8',body:`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><script>
 const $=s=>document.querySelector(s),TREES_N=12,GH_ROWGAP_UNUSED=0,EM_LEN=110,EM_ZL=22;let EM=null,curZone=null;
 const P={daily:{tapped:{z1:[],z2:[],z3:[],z4:[],z5:[],z6:[]}},pass:{best:{pick:0}}};
 const zName=z=>z.g+'溫室'; const today=()=> '2026-10-25',seedRand=()=>()=>.4,stamina=()=>15,closeSheet=()=>{},renderAll=()=>{},toast=()=>{},tapTree=()=>{};
 function emAvatarImg(){return {complete:false};}
 ${zones}${drawing}${ordinary}${fn('openEmerald')}
 window.calls=[];const originalDraw=drawFigTree;drawFigTree=function(...args){if(calls.length<3000)calls.push({stage:args[5],x:args[2],z:args[3]});return originalDraw(...args);};
 </script>`}));
 await page.goto('http://greenhouse.test/');await page.waitForFunction(()=>GH_ART.ripe[0].complete&&GH_ART.ripe[0].naturalWidth>0);
 await page.evaluate(()=>{ZONES.find(z=>z.emerald).stage='剪枝';openEmerald();});await page.waitForTimeout(200);
 assert.ok(await page.evaluate(()=>calls.length>0&&calls.every(c=>c.stage==='採收')),'emerald paints mature trees even when its stored stage is pruning');
 assert.equal(await page.evaluate(()=>ZONES.find(z=>z.emerald).stage),'剪枝','scene does not rewrite rotation');
 await page.screenshot({path:'/tmp/greenhouse-emerald.png'});await page.locator('#emX').click();
 for(const stage of ['剪枝','座果','採收','度冬']){
  await page.evaluate(stage=>{calls=[];ZONES[0].stage=stage;openGH3D('z1');},stage);await page.waitForTimeout(100);
  assert.ok(await page.evaluate(stage=>calls.length>0&&calls.every(c=>c.stage===stage),stage),'ordinary greenhouse follows '+stage);
  if(stage==='採收')await page.screenshot({path:'/tmp/greenhouse-harvest.png'});
  await page.locator('#ghX').click();
 }
 assert.deepEqual(errors,[]);console.log('PASS: actual emerald and ordinary scene renderers, four stages, no persisted stage mutation');await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
