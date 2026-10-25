// Run: node docs/game-touch-regression.cjs [path/to/index.html]
// Executes the shared native-action guard with isolated DOM/event boundaries.
// This does not emulate Android's native UI or prove physical-device rendering.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const html=fs.readFileSync(process.argv[2]||path.join(__dirname,'../index.html'),'utf8');
new vm.Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]);
const marker='/* Shared game native-action guard */',end='/* End game native-action guard */';
const start=html.indexOf(marker),code=start<0?'':html.slice(start,html.indexOf(end,start));
const listeners={},roots=[];
class Element{
 constructor(tag='div',id='',classes='',parent=null){this.nodeType=1;this.tagName=tag;this.id=id;this.classes=classes.split(' ');this.parentElement=parent;this.hidden=false;this.editable=false;}
 matches(selector){return selector.split(',').some(s=>{
  s=s.trim();if(s==='[id$="Ov"]')return this.id.endsWith('Ov');
  if(s==='[hidden]')return this.hidden;
  if(s.startsWith('[contenteditable]'))return this.editable;
  if(s.startsWith('#'))return this.id===s.slice(1);
  if(s.startsWith('.'))return this.classes.includes(s.slice(1));
  return this.tagName===s;
 });}
 closest(selector){for(let e=this;e;e=e.parentElement)if(e.matches(selector))return e;return null;}
 getClientRects(){return this.closest('.hide,[hidden]')?[]:[{}];}
}
const document={addEventListener(type,fn,options){(listeners[type]||=[]).push({fn,options});},querySelectorAll(selector){return roots.filter(r=>r.matches(selector));}};
vm.runInNewContext(code,{document,Array});
function fire(type,target){const e={type,target,cancelable:true,defaultPrevented:false,stopped:false,preventDefault(){this.defaultPrevented=true;},stopPropagation(){this.stopped=true;}};for(const h of listeners[type]||[])h.fn(e);return e;}
function surface(id,cls='',tag='div'){roots.length=0;const root=new Element(tag,id,cls);roots.push(root);return root;}
let passed=0,failed=0;
function check(name,fn){try{fn();passed++;console.log('PASS '+name);}catch(e){failed++;console.log('FAIL '+name+' — '+e.message);}}
const overlays=['ghOv','emOv','famOv','hockOv','weedOv','woodOv','pickOv','mycoOv','rhyOv','memOv'];
for(const id of overlays)check(id+' blocks long-press menus on nested artwork',()=>{
 const root=surface(id),svg=new Element('svg','', '',root),image=new Element('image','','',svg);
 assert.equal(fire('contextmenu',image).defaultPrevented,true);
 assert.equal(fire('dragstart',image).defaultPrevented,true);
 assert.equal(fire('selectstart',image).defaultPrevented,true);
});
check('all seven weather games protect their shared play surface',()=>{
 for(const kind of ['whitefly','rust','rain','drought','heat','wind','myna']){
  const mg=surface('mg'),target=new Element(kind==='myna'?'canvas':'svg','','',mg);
  assert.equal(fire('contextmenu',target).defaultPrevented,true,kind);
 }
});
check('black knight protects its arena before and during play',()=>{
 const arena=surface('','arena'),image=new Element('image','','',arena);
 assert.equal(fire('contextmenu',image).defaultPrevented,true);
 assert.equal(fire('touchstart',image).defaultPrevented,true);
});
check('pointer-driven play regions cancel native touch defaults without stopping events',()=>{
 for(const [id,cls] of [['mg',''],['ghCv',''],['ghJoy',''],['emCv',''],['emJoy',''],['famOv',''],['hockOv',''],['woSvg',''],['pkCv',''],['','rh-lane'],['','tut-svg'],['','fert-layer']]){
  const area=surface(id,cls),child=new Element('span','','',area),e=fire('touchstart',child);
  assert.equal(e.defaultPrevented,true,id||cls);assert.equal(e.stopped,false,id||cls);
  for(const t of ['pointerdown','pointermove','pointerup','pointercancel'])assert.equal(fire(t,child).defaultPrevented,false,t);
 }
});
check('pointer buttons retain watering and rhythm gesture handling',()=>{
 for(const [id,cls,rootId] of [['holdB','holdb','mg'],['','rh-b','rhyOv']]){
  const root=surface(rootId),b=new Element('button',id,cls,root),icon=new Element('svg','','',b);
  assert.equal(fire('touchstart',icon).defaultPrevented,true,id||cls);
 }
});
check('click-based games and exit buttons retain the native tap-to-click path',()=>{
 for(const [rootId,buttonClass] of [['mg','tgt'],['mycoOv','my-c'],['memOv','mem-c'],['woodOv','wo-x'],['ghOv','em-x']]){
  const root=surface(rootId),button=new Element('button','',buttonClass,root),image=new Element('svg','','',button);
  assert.equal(fire('touchstart',image).defaultPrevented,false,buttonClass);
  assert.equal(fire('click',image).defaultPrevented,false,buttonClass);
  assert.equal(fire('contextmenu',image).defaultPrevented,true,buttonClass);
 }
});
check('knight text input and other editable fields preserve native editing menus',()=>{
 const arena=surface('','arena');
 for(const tag of ['input','textarea','select','div']){
  const input=new Element(tag,'kIn','',arena);input.editable=tag==='div';
  for(const type of ['touchstart','contextmenu','selectstart','dragstart'])assert.equal(fire(type,input).defaultPrevented,false,tag+' '+type);
 }
});
check('active games block menus retargeted to the background image',()=>{
 surface('','arena');const map=new Element('div','mapSvg'),image=new Element('image','background','',map);
 assert.equal(fire('contextmenu',image).defaultPrevented,true);
 assert.equal(fire('touchstart',image).defaultPrevented,false);
});
check('photos opened over an exploration game retain their native menu',()=>{
 surface('emOv');const sheet=new Element('div','sheetBox'),photo=new Element('img','photo','',sheet);
 assert.equal(fire('contextmenu',photo).defaultPrevented,false);
});
check('closed game markup cannot suppress menus elsewhere in the app',()=>{
 const sheet=new Element('div','sheet','hide'),mg=surface('mg');mg.parentElement=sheet;
 assert.equal(fire('contextmenu',new Element('img','photo')).defaultPrevented,false);
 assert.equal(fire('contextmenu',new Element('svg','','',mg)).defaultPrevented,false);
 roots.length=0;assert.equal(fire('contextmenu',new Element('img','photo')).defaultPrevented,false);
});
check('black knight controls keep ordinary button clicks and input focus',()=>{
 const arena=surface('','arena'),button=new Element('button','kSend','',arena);
 assert.equal(fire('touchstart',button).defaultPrevented,false);
 assert.equal(fire('click',button).defaultPrevented,false);
});
check('native action handlers can cancel events before nested game controls run',()=>{
 for(const type of ['contextmenu','selectstart','dragstart'])assert.ok(listeners[type]?.some(h=>h.options===true||h.options?.capture===true),type);
 assert.ok(listeners.touchstart?.some(h=>h.options?.capture===true&&h.options.passive===false));
});
console.log(`${passed} passed; ${failed} failed`);process.exitCode=failed?1:0;
