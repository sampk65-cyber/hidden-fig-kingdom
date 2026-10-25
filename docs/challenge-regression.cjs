// Run: node docs/challenge-regression.cjs [path/to/index.html]
// Real production handlers with isolated DOM, clock and persistence boundaries.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const html=fs.readFileSync(process.argv[2]||path.join(__dirname,'../index.html'),'utf8');
const slice=(a,b)=>{const s=html.indexOf(a);assert.ok(s>=0,a);const e=html.indexOf(b,s);assert.ok(e>s,b);return html.slice(s,e);};
new vm.Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]);
let passed=0,failed=0;
async function check(name,fn){try{await fn();passed++;console.log('PASS '+name);}catch(e){failed++;console.log('FAIL '+name+' — '+e.message);}}
function element(){return {style:{},innerHTML:'',textContent:'',value:'',handlers:{},addEventListener(type,fn,options){this.handlers[type]={fn,options};},fire(type){const e={defaultPrevented:false,preventDefault(){this.defaultPrevented=true;}};this.handlers[type]?.fn(e);this['on'+type]?.(e);return e;}};}
const nodes={},$=id=>nodes[id]||(nodes[id]=element());
const choices=[...slice('<div class="seg" id="wxPests">','<p class="lvtxt">規則').matchAll(/<input type="checkbox" value="([^"]+)"/g)].map(m=>({value:m[1],checked:false}));
for(const id of ['wxWhiteflyIcon','wxMynaIcon']){const m=html.match(new RegExp('<span[^>]*id="'+id+'"[^>]*>([\\s\\S]*?)</span>'));if(m)$('#'+id).innerHTML=m[1];}
let config=null,writes=[],timers=new Map(),nextTimer=0,finished=[];
const now=1792848000000,RealDate=Date;
class Clock extends RealDate{static now(){return now;}}
const ctx=vm.createContext({console,Date:Clock,Math:Object.assign(Object.create(Math),{random:()=>.5}),AbortSignal,
 $,document:{querySelectorAll:s=>s.includes('input:checked')?choices.filter(x=>x.checked):choices},
 localStorage:{removeItem(){}},DB:{get:async p=>{assert.equal(p,'config/weather');return config;},set:async(p,c)=>{writes.push({path:p,value:c});config=c;}},
 fetch:async()=>({ok:true,json:async()=>({stationId:'C0F9I0',temperature:22,rainfall:49,windSpeed:2,weather:'陰'})}),
 today:()=> '2026-10-24',chSlot:()=>5,P:{daily:{ch:{},chTried:[],chTry:0}},WF_SVG:'fly',MYNA_SVG:'bird',WX_VIS:null,
 toast:()=>{},renderWeather:()=>{},startWeatherTransition:()=>{},performance:{now:()=>0},
 setInterval:fn=>{timers.set(++nextTimer,fn);return nextTimer;},clearInterval:id=>timers.delete(id),
 setTimeout:fn=>{ctx.nextRound=fn;return 1;},SND:{good:()=>{}},finishChallenge:(k,ok)=>finished.push({k,ok})});
vm.runInContext(slice('let WX = ','// V15.4:')+'\n'+slice('const CH = ','// 越熱果越多')+'\n'+slice("$('#btnWx').onclick = async()=>{",'// Keep the active climate')+'\n'+slice('const DROUGHT_W = ','/* 高溫：')+'\n'+slice('const PRACTICE_LIST = [','function playMenu(){'),ctx);
const run=s=>vm.runInContext(s,ctx);
const reset=()=>{config=null;writes=[];choices.forEach(x=>x.checked=false);run('P.daily={ch:{},chTried:[],chTry:0}');};
async function publish(keys,mode='manual',hours=2){reset();choices.forEach(x=>x.checked=keys.includes(x.value));$('#wMode').value=mode;$('#wHours').value=hours;$('#wTemp').value=22;$('#wRain').value=0;$('#wWind').value=2;await $('#btnWx').onclick();}
(async()=>{
 await check('admin publishes all six screenshot challenges plus the existing myna',async()=>{
  await publish(['whitefly','rust','rain','drought','heat','wind','myna']);
  assert.equal(writes.length,1);assert.equal(writes[0].path,'config/weather');
  assert.deepEqual(Array.from(config.challenges||[]).sort(),['drought','heat','myna','rain','rust','whitefly','wind']);
  assert.deepEqual(Array.from(config.pests).sort(),['myna','rust','whitefly']);
 });
 await check('each selected challenge takes priority without fabricating weather',async()=>{
  for(const k of ['whitefly','rust','rain','drought','heat','wind','myna']){
   await publish([k]);assert.equal(run('activeCh()[0]'),k,k);
   assert.equal(run('WX.temp'),22);assert.equal(run('WX.rain'),0);assert.equal(run('WX.wind'),2);
  }
 });
 await check('automatic observations can carry a published challenge unchanged',async()=>{
  await publish(['wind'],'sim');assert.equal(run('activeCh()[0]'),'wind');
  assert.equal(run('WX.src'),'神岡實測');assert.equal(run('WX.rain'),49);assert.equal(run('WX.wind'),2);
 });
 await check('published challenges expire at the configured hour',async()=>{
  await publish(['wind'],'sim',2);assert.equal(config.expiresAt,now+7200000);
  config={...config,expiresAt:now};await run('loadWeather()');
  assert.deepEqual(Array.from(run('WX.challenges||[]')),[]);assert.equal(run('activeCh()[0]'),'rain');
 });
 await check('invalid duration cannot publish an automatic challenge',async()=>{
  await publish(['wind'],'sim',0);assert.equal(writes.length,0);
 });
 await check('unchecking everything clears previously published choices',async()=>{
  await publish(['wind']);choices.forEach(x=>x.checked=false);await $('#btnWx').onclick();
  assert.deepEqual(Array.from(config.challenges||[]),[]);assert.deepEqual(Array.from(run('WX.challenges||[]')),[]);
 });
 await check('old manual pest configurations still load',async()=>{
  reset();config={mode:'manual',date:'2026-10-24',temp:22,rain:0,wind:2,pests:['myna']};
  await run('loadWeather()');assert.equal(run('activeCh()[0]'),'myna');
 });
 await check('published order skips completed challenges without resetting player records',async()=>{
  await publish(['whitefly','rust','rain','drought','heat','wind','myna']);
  run("P.daily.ch={whitefly:'ok'};P.daily.chTried=['whitefly']");const before=run('JSON.stringify(P)');
  assert.equal(run('activeCh()[0]'),'rust');assert.equal(run('JSON.stringify(P)'),before);
 });
 await check('unknown published keys cannot become a challenge',async()=>{
  reset();config={mode:'manual',temp:22,rain:0,wind:2,pests:[],challenges:['unknown','wind'],expiresAt:now+3600000};
  await run('loadWeather()');assert.equal(run('activeCh()[0]'),'wind');
 });
 await check('play menu reuses the actual admin whitefly and myna artwork',()=>{
  for(const [key,id] of [['whitefly','wxWhiteflyIcon'],['myna','wxMynaIcon']]){
   const icon=$('#'+id).innerHTML;assert.match(icon,/<svg/);assert.equal(run('PRACTICE_LIST.find(g=>g.k==='+JSON.stringify(key)+').i'),icon);
  }
 });
 await check('watering cancels the browser touch default and image context menu',()=>{
  run("holdGame('drought',0)");const b=$('#holdB');
  assert.equal(b.fire('touchstart').defaultPrevented,true);assert.equal(b.handlers.touchstart.options.passive,false);
  assert.equal(b.fire('contextmenu').defaultPrevented,true);
 });
 await check('holding still raises water and release stops it',()=>{
  timers.clear();finished=[];run("holdGame('drought',0)");const b=$('#holdB');
  assert.equal(b.fire('pointerdown').defaultPrevented,true);assert.equal(timers.size,1);
  for(let i=0;i<10;i++)for(const fn of timers.values())fn();assert.ok(parseFloat($('#gf').style.height)>0);
  b.fire('pointerup');assert.equal(timers.size,0);assert.deepEqual(finished,[{k:'drought',ok:false}]);
 });
 await check('all three successful watering rounds keep the original win condition',()=>{
  timers.clear();finished=[];run("holdGame('drought',0)");
  for(let i=0;i<3;i++){
   $('#holdB').fire('pointerdown');while(parseFloat($('#gf').style.height||'0')<66)for(const fn of timers.values())fn();
   $('#holdB').fire('pointerup');if(i<2){$('#gf').style.height='0';ctx.nextRound();}
  }
  assert.deepEqual(finished,[{k:'drought',ok:true}]);assert.equal(timers.size,0);
 });
 console.log(`${passed} passed; ${failed} failed`);process.exitCode=failed?1:0;
})();
