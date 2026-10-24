// Run: node docs/header-regression.cjs [path/to/index.html]
// Executes the real HUD renderer against DOM property adapters; no player saves.
const fs=require('node:fs'), vm=require('node:vm'), assert=require('node:assert/strict'), path=require('node:path');
const html=fs.readFileSync(process.argv[2]||path.join(__dirname,'../index.html'),'utf8');
const start=html.indexOf('function renderHud(){');
const renderer=html.slice(start,html.indexOf("document.querySelector('.hud-mid')",start));
const nodes={},writes=[];
function tracked(id){
  const e={dataset:{},style:{}};
  for(const prop of ['innerHTML','textContent']){
    let value='';Object.defineProperty(e,prop,{get:()=>value,set:v=>{value=String(v);writes.push(id+'.'+prop);}});
  }
  let width='';Object.defineProperty(e.style,'width',{get:()=>width,set:v=>{width=v;writes.push(id+'.width');}});
  return e;
}
const P={name:'碰碰',role:'teddy',mat:'silk',color:'#fff',points:1260,guest:false,streak:7,daily:{pts:12,chests:3}};
const ctx=vm.createContext({P,console,$:id=>nodes[id]||(nodes[id]=tracked(id)),
  LEVELS:[{min:1000,icon:'<svg><text>果</text></svg>',n:'青果粉絲'},{min:1400,n:'下一級'}],lvIndex:()=>0,
  CHAR_DATA:{},ROLES:[{id:'teddy',base:'teddy'},{id:'cat',base:'cat'}],roleBase:role=>role,
  stamina:()=>15,holdN:()=>3,HOLD_CAP:3,DAILY_CAP:60,CHEST_CAP:3,
  avatar:(role,mat,color)=>'<svg data-role="'+role+'" data-color="'+color+'"></svg>'});
vm.runInContext(renderer,ctx);
const draw=()=>vm.runInContext('renderHud()',ctx);
let passed=0,failed=0;
function check(name,fn){try{fn();passed++;console.log('PASS '+name);}catch(e){failed++;console.log('FAIL '+name+' — '+e.message);}}
check('initial render shows the existing player values',()=>{
 draw();assert.equal(nodes['#hudName'].textContent,'碰碰');assert.match(nodes['#hudLv'].innerHTML,/1260 分/);assert.equal(nodes['#hudSt'].textContent,'⚡15');
});
check('unchanged player updates do not replace the header image or text',()=>{
 writes.length=0;for(let i=0;i<20;i++)draw();
 assert.equal(writes.length,0,'unchanged updates wrote DOM '+writes.length+' times');
});
check('changing points updates the display without replacing the avatar',()=>{
 writes.length=0;P.points=1266;draw();
 assert.match(nodes['#hudLv'].innerHTML,/1266 分/);assert.ok(!writes.includes('#hudAv.innerHTML'));
});
check('changing the character updates the avatar exactly once',()=>{
 writes.length=0;P.role='cat';draw();draw();
 assert.match(nodes['#hudAv'].innerHTML,/cat/);assert.equal(writes.filter(x=>x==='#hudAv.innerHTML').length,1);
});
check('changing name or guest mode updates text without replacing avatar',()=>{
 writes.length=0;P.name='小果';P.guest=true;draw();
 assert.equal(nodes['#hudName'].textContent,'小果（訪客）');assert.ok(!writes.includes('#hudAv.innerHTML'));
});
console.log(`${passed} passed; ${failed} failed`);process.exitCode=failed?1:0;
