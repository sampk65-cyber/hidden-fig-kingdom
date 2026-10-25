// Isolated actual-scene rendering; no accounts, Firebase or gameplay writes.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(process.env.GH_INDEX||path.join(root,'index.html'),'utf8');
const fn=n=>{const a=source.indexOf('function '+n+'(');assert.ok(a>=0,n);return source.slice(a,source.indexOf('\n}',a)+2);};
const ordinary=source.slice(source.indexOf('const GH_LAYOUT ='),source.indexOf('/* ---------- 今日劇情：'));
const drawing=source.slice(source.indexOf('function lerpC('),source.indexOf('function mapMiniTrees'));
const zones=source.slice(source.indexOf('const ZONES ='),source.indexOf('// V8.2：'));
const out=process.env.GH_PREVIEW||path.join(root,'docs/preview');fs.mkdirSync(out,{recursive:true});
const css=source.match(/<style>([\s\S]*?)<\/style>/)[1];
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage'],headless:true}),page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 if(process.env.FONT_CSS_ROOT)await page.route('http://greenhouse.test/qa-font/**',r=>r.fulfill({path:path.join(process.env.FONT_CSS_ROOT,'files',r.request().url().split('/').pop())}));
 if(process.env.GH_AVATAR)await page.route('http://greenhouse.test/qa-avatar.webp',r=>r.fulfill({path:process.env.GH_AVATAR}));
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('http://greenhouse.test/art/gh/**',r=>{const file=path.join(process.env.GH_ASSETS||path.join(root,'art/gh'),r.request().url().split('/').pop());return fs.existsSync(file)?r.fulfill({path:file}):r.fulfill({status:404,body:''});});
 await page.route('http://greenhouse.test/',r=>r.fulfill({contentType:'text/html; charset=utf-8',body:`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><script>
 const $=s=>document.querySelector(s),TREES_N=12,GH_ROWGAP_UNUSED=0,EM_LEN=110,EM_ZL=22;let EM=null,curZone=null;
 const P={daily:{tapped:{z1:[],z2:[],z3:[],z4:[],z5:[],z6:[]}},pass:{best:{pick:0}}};
 const zName=z=>z.g+'溫室'; const today=()=> '2026-10-25',seedRand=()=>()=>.4,stamina=()=>15,closeSheet=()=>{},renderAll=()=>{},toast=()=>{},tapTree=idx=>{window.tappedTarget=idx;};
 function emAvatarImg(){const im=new Image();im.src='/qa-avatar.webp';return im;}
 ${zones}${drawing}${ordinary}${fn('openEmerald')}
 const realFillText=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(text,x,y,...rest){if(text==='點我找找 ▼')window.hintDraw={x,y,width:this.measureText(text).width,size:parseFloat(this.font.replace(/^[0-9]+ /,''))};return realFillText.call(this,text,x,y,...rest);};
 window.calls=[];const originalDraw=drawFigTree;drawFigTree=function(...args){if(calls.length<3000)calls.push({stage:args[5],x:args[2],z:args[3]});return originalDraw(...args);};
 </script>`}));
 await page.goto('http://greenhouse.test/');await page.waitForFunction(()=>GH_ART.ripe[0].complete&&GH_ART.ripe[0].naturalWidth>0&&GH_SOIL.complete&&GH_SOIL.naturalWidth>0);
 if(process.env.FONT_CSS_ROOT){await page.addStyleTag({content:fs.readFileSync(path.join(process.env.FONT_CSS_ROOT,'400.css'),'utf8').replaceAll('./files/','/qa-font/')+'body{font-family:"Noto Sans TC",sans-serif}'});await page.evaluate(()=>document.fonts.ready);}
 await page.evaluate(()=>{ZONES.find(z=>z.emerald).stage='剪枝';openEmerald();});await page.waitForTimeout(200);
 assert.ok(await page.evaluate(()=>calls.length>0&&calls.every(c=>c.stage==='採收')),'emerald paints mature trees even when its stored stage is pruning');
 assert.equal(await page.evaluate(()=>ZONES.find(z=>z.emerald).stage),'剪枝','scene does not rewrite rotation');
 await page.screenshot({path:path.join(out,'greenhouse-emerald.png')});
 for(const pos of [{px:0,pz:18,n:'forward'},{px:4.75,pz:25,n:'side'},{px:-8.25,pz:55,n:'left'}]){
  await page.evaluate(pos=>{EM.px=pos.px;EM.pz=pos.pz;},pos);await page.waitForTimeout(100);
  assert.ok(await page.locator('#emJoy').isVisible());
  await page.screenshot({path:path.join(out,'greenhouse-'+pos.n+'.png')});
 }
 await page.setViewportSize({width:320,height:568});await page.evaluate(()=>{EM.px=0;EM.pz=2;});await page.waitForTimeout(150);
 assert.ok(await page.locator('#emJoy').evaluate(el=>el.getBoundingClientRect().bottom<=innerHeight+2),'joystick fits short phone');
 await page.screenshot({path:path.join(out,'greenhouse-320.png')});await page.locator('#emX').click();await page.setViewportSize({width:390,height:844});
 for(const stage of ['剪枝','座果','採收','度冬']){
  await page.evaluate(stage=>{calls=[];ZONES[0].stage=stage;openGH3D('z1');},stage);await page.waitForTimeout(100);
  assert.ok(await page.evaluate(stage=>calls.length>0&&calls.every(c=>c.stage===stage),stage),'ordinary greenhouse follows '+stage);
  if(stage==='採收'){
   const hint=await page.evaluate(()=>hintDraw);assert.ok(hint.x-hint.width/2>=6&&hint.x+hint.width/2<=384,'nearest treasure label fits viewport horizontally');assert.ok(hint.y>=85&&hint.size<=18,'nearest label has legible bounded size below HUD');
   const target=await page.evaluate(()=>({...GH.nearHit}));await page.mouse.click((target.x0+target.x1)/2,(target.y0+target.y1)/2);assert.equal(await page.evaluate(()=>window.tappedTarget),target.idx,'bounded label still activates correct treasure');
   await page.screenshot({path:path.join(out,'greenhouse-harvest.png')});
  }
  await page.locator('#ghX').click();
 }
 assert.deepEqual(errors,[]);console.log('PASS: actual emerald and ordinary scene renderers, four stages, no persisted stage mutation');await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
