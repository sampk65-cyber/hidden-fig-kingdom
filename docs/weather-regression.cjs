// Run: node docs/weather-regression.cjs [path/to/index.html]
// Isolated rendering: no network, Firebase, login, saves, or player mutations.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const html = fs.readFileSync(process.argv[2] || path.join(__dirname, '../index.html'), 'utf8');
const slice = (start, end) => html.slice(html.indexOf(start), html.indexOf(end, html.indexOf(start)));
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
new vm.Script(script); // Parse the complete production script, not just tested functions.
const nodes = {};
const element = () => ({innerHTML:'', querySelector:()=>null, querySelectorAll:()=>[]});
const context = vm.createContext({
  console, Number, Math, Date, JSON, Array,
  $: id => nodes[id] || (nodes[id] = element()),
  document:{hidden:false,documentElement:{dataset:{}}},
  matchMedia:()=>({matches:false}),
  setInterval:fn=>{context.tick=fn;return 1;},clearInterval:()=>{},
  localStorage:{removeItem:()=>{}},
  DB:{get:async()=>null,set:()=>{throw Error('Unexpected Firebase write');}},
  fetch:async()=>{throw Error('No network in regression tests');},
  AbortSignal, today:()=> '2026-10-24', chSlot:()=>5,
  P:{daily:{ch:{},chTried:[],chTry:0,tapped:{}}},
  WF_SVG:'fly', MYNA_SVG:'bird', WX_VIS:null,
  skyTone:()=> 'day', ZONES:[{id:'pine',g:'松濤',x:100,y:300,stage:'成長'}],
  STAGE:{'成長':{c:'green'}},zName:z=>z.g+'溫室',chZone:()=> 'pine',czName:()=> '松濤溫室',
  zBadge:()=>'', TREES_N:10, MAP_BRIDGE:'', MAP_FALLS:'<g id="original-waterfall"/>',MAP_CASTLE_LB:'',MAP_MILLS:'',
  MAP_BIRDS:'',badgeHint:()=>'',knightMark:()=>'',chapter:()=>({icon:''}),avatar:()=>'<svg></svg>',placeMe:()=>{},
  playMenu:()=>{},toast:()=>{},startChallenge:()=>{},
});
vm.runInContext(slice('let WX = ', '/* ---------- 挑戰小遊戲 ---------- */') + '\n' +
  slice('function renderMap(){','// 主角在金葉小徑上') + '\n' +
  slice('function chMark(){','const CH_PAL = ') + '\n' +
  html.split('\n').find(line=>line.startsWith('function esc(t)')), context);
const run = s=>vm.runInContext(s,context);
let failures=0, passed=0;
function check(name, fn){try{fn();passed++;console.log('PASS '+name);}catch(e){failures++;console.log('FAIL '+name+' — '+e.message);}}
function setup(weather, player={ch:{},chTried:[],chTry:0,tapped:{}}){
  run('WX='+JSON.stringify(weather)+'; WX_VIS=null; P.daily='+JSON.stringify(player));
}
const observed={temp:21.8,rain:49,wind:2,pests:[],src:'神岡實測',weather:'陰'};

check('49 mm accumulated with overcast weather must not render falling rain',()=>{
  setup(observed);run('renderMap()');
  assert.ok(!nodes['#mapSvg'].innerHTML.includes('class="nature-rain"'),'overcast still renders falling rain');
  assert.ok(nodes['#mapSvg'].innerHTML.includes('original-waterfall'));
});
check('daily accumulation must not drive the heavy-rain waterfall effect',()=>{
  setup(observed);assert.equal(run('weatherVisual().wet'),0);
});
check('weather card explicitly identifies daily accumulation',()=>{
  setup(observed);run('renderWeather()');
  assert.match(nodes['#wxBox'].innerHTML,/日累積[^<]*49\s*mm/);
});
check('rain observation still renders rain even when accumulation is zero',()=>{
  setup({...observed,rain:0,weather:'陰有雨'});run('renderMap()');
  assert.ok(nodes['#mapSvg'].innerHTML.includes('class="nature-rain"'));
});
check('ordinary observed rain is not upgraded to a downpour by accumulated 49 mm',()=>{
  setup({...observed,weather:'陰有雨'});run('renderMap()');
  assert.ok(nodes['#mapSvg'].innerHTML.includes('class="nature-rain"'));
  assert.ok(!nodes['#mapSvg'].innerHTML.includes('class="wx-ground-spray"'));
});
check('missing phenomenon must not turn daily accumulation into a downpour',()=>{
  setup({...observed,weather:'-99'});run('renderMap()');
  assert.ok(!nodes['#mapSvg'].innerHTML.includes('class="nature-rain"'));
});
check('explicit large thunderstorm keeps the existing heavy-rain visual',()=>{
  setup({...observed,weather:'陰大雷雨'});run('renderMap()');
  assert.ok(nodes['#mapSvg'].innerHTML.includes('class="wx-ground-spray"'));
  run('renderWeather()');assert.match(nodes['#wxBox'].innerHTML,/出現豪雨/);
});
check('manual heavy-rain visuals retain all existing effects',()=>{
  setup({...observed,rain:30,src:'手動模擬'});run('renderMap()');
  assert.ok(nodes['#mapSvg'].innerHTML.includes('class="wx-ground-spray"'));
  assert.equal(run('weatherVisual().wet'),1);
});
check('2 m/s rotation remains playable but is identified as a new challenge',()=>{
  setup(observed,{ch:{rain:'ok'},chTried:['rain'],chTry:4,tapped:{}});
  // Fixed date/slot yields wind after rain has been completed.
  assert.equal(run('activeCh()[0]'),'wind');
  assert.equal(run('CH.wind.when(WX)'),false);
  run('renderWeather()');
  assert.match(nodes['#wxBox'].innerHTML,/data-ch="wind"/);
  assert.ok(!nodes['#wxBox'].innerHTML.includes('出現強風'));
  assert.match(nodes['#wxBox'].innerHTML,/新挑戰/);
  assert.match(run('chMark()'),/新挑戰/);
  assert.ok(!nodes['#wxBox'].innerHTML.includes('演練'));
});
check('real strong wind keeps weather-triggered wording',()=>{
  setup({...observed,rain:0,wind:12});run('renderWeather()');
  assert.match(nodes['#wxBox'].innerHTML,/出現強風/);
});
check('daily rain challenge remains available without claiming current heavy rain',()=>{
  setup(observed);assert.equal(run('activeCh()[0]'),'rain');run('renderWeather()');
  assert.match(nodes['#wxBox'].innerHTML,/data-ch="rain"/);
  assert.ok(!nodes['#wxBox'].innerHTML.includes('出現豪雨'));
});
check('weather transition uses phenomenon without changing observed values or player records',()=>{
  setup(observed);const before=run('JSON.stringify(P)');
  run('startWeatherTransition()');
  assert.equal(run('WX_VIS.rain'),0);
  assert.equal(run('WX.rain'),49);
  assert.equal(run('WX.wind'),2);
  assert.equal(run('JSON.stringify(P)'),before);
  assert.equal(run('fruitMult()'),0.63);
});
check('manual and fallback weather never receive a measured daily-rain label',()=>{
  for(const src of ['手動模擬','模擬備援']){
    setup({...observed,src,rain:30});run('renderWeather();renderMap()');
    assert.ok(!nodes['#wxBox'].innerHTML.includes('日累積'));
    assert.ok(nodes['#mapSvg'].innerHTML.includes('class="wx-ground-spray"'));
  }
});
check('non-weather pest challenges retain their original caption',()=>{
  setup({...observed,rain:0});
  assert.equal(run("chCaption('whitefly')"),'松濤溫室出現銀葉粉蝨！');
});
check('weather title changes while Shenkang source stays visible',()=>{
  setup(observed);run('renderWeather()');
  assert.match(nodes['#wxBox'].innerHTML,/王國天氣/);
  assert.match(nodes['#wxBox'].innerHTML,/神岡實測/);
  assert.ok(!nodes['#wxBox'].innerHTML.includes('今日神岡'));
});
check('publishing and expiring a challenge updates the map with unchanged weather',()=>{
  setup(observed);run('startWeatherTransition()');
  run("WX.challenges=['wind'];renderWeather();startWeatherTransition()");
  assert.match(nodes['#wxBox'].innerHTML,/data-ch="wind"/);
  assert.match(nodes['#mapSvg'].innerHTML,/aria-label="松濤溫室出現新挑戰：強風！"/);
  run('WX.challenges=[];renderWeather();startWeatherTransition()');
  assert.match(nodes['#mapSvg'].innerHTML,/aria-label="松濤溫室出現新挑戰：豪雨！"/);
  nodes['#mapSvg'].innerHTML='unchanged map';run('startWeatherTransition()');
  assert.equal(nodes['#mapSvg'].innerHTML,'unchanged map','unchanged polling must not rebuild the map');
});
console.log(`${passed} passed; ${failures} failed`);
process.exitCode=failures?1:0;
