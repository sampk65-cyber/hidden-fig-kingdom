'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const {fixture,member}=require('./castle-level-test-helpers.cjs');
require('node:events').setMaxListeners(0);
class Element extends EventTarget{
 constructor(tag='div'){super();this.tagName=tag.toUpperCase();this.children=[];this.isConnected=true;this.hidden=false;this.className='';this.attrs={};this.style={};this.textContent='';this.classList={add:c=>this.className+=' '+c,remove:c=>this.className=this.className.split(' ').filter(x=>x!==c).join(' '),toggle:(c,on)=>{this.classList.remove(c);if(on)this.classList.add(c);}};}
 set innerHTML(html){this.children.forEach(c=>c.isConnected=false);this.children=[];this.html=html;for(const m of html.matchAll(/<(canvas|button|p|section|div)\b([^>]*)>/g)){const e=new Element(m[1]);for(const a of m[2].matchAll(/([\w-]+)(?:="([^"]*)")?/g))e.attrs[a[1]]=a[2]??'';e.className=e.attrs.class||'';e.hidden='hidden'in e.attrs;this.appendChild(e);}}
 get innerHTML(){return this.html||'';}
 appendChild(e){e.parent=this;this.children.push(e);return e;}
 remove(){this.isConnected=false;if(this.parent)this.parent.children=this.parent.children.filter(c=>c!==this);}
 matches(q){return q[0]==='.'?this.className.split(' ').includes(q.slice(1)):q[0]==='['?q.slice(1,-1)in this.attrs:this.tagName===q.toUpperCase();}
 querySelectorAll(q){return this.children.flatMap(c=>[...(c.matches(q)?[c]:[]),...c.querySelectorAll(q)]);}
 querySelector(q){return this.querySelectorAll(q)[0]||null;}
 focus(){}getContext(){return {}}getBoundingClientRect(){return {left:0,top:0,width:1024,height:1536}}setPointerCapture(){}
 dispatchEvent(e){const r=super.dispatchEvent(e);this['on'+e.type]?.(e);return r;}
}
async function harness({failImage=false}={}){
 const f=fixture(),host=new Element(),document=new Element(),frames=new Map(),calls=[],renders=[];document.hidden=false;document.createElement=tag=>new Element(tag);
 let clock=0,next=1,identity='A',loseTurn=false,imageFailure=failImage;
 class Image{set src(v){queueMicrotask(()=>{if(imageFailure){imageFailure=false;this.onerror();}else this.onload();});}}
 const context={document,Image,AbortController,structuredClone,console,setTimeout,clearTimeout,performance:{now:()=>clock},matchMedia:()=>({matches:false}),requestAnimationFrame:fn=>{const id=next++;frames.set(id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id),CastleTouch:require('../castle/touch-core'),CastleVIP:{cardHTML:()=>'<p>DEMO VIP</p>',download:async()=>{}},CastleTouchScene:{makeCastleScene:()=>({render:(_ctx,angle,colors,state)=>renders.push({angle,colors:structuredClone(colors),...structuredClone(state)})})}};context.window=context;
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../castle/level.js'),'utf8'),context);
 const controller=context.CastleLevel.mount(host,{identity:()=>identity,call:async(op,body)=>{calls.push(op);const result=await f.svc[op](member(),body);if(op==='turnDial'&&loseTurn){loseTurn=false;throw Error('response lost');}return result;}});
 const flush=()=>new Promise(resolve=>setImmediate(resolve));await flush();
 async function settle(){for(let i=0;i<15;i++){if(frames.size){clock+=1800;const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(clock));}await flush();}}
 function fire(type,p={}){const e=new Event(type,{cancelable:true});for(const[k,v]of Object.entries({pointerId:1,button:0,isPrimary:true,clientX:535,clientY:1140,...p}))Object.defineProperty(e,k,{value:v});host.querySelector('canvas').dispatchEvent(e);}
 const state=()=>[...f.db.data.values()].find(s=>s.kind==='castle-level-session');
 return {host,document,controller,calls,renders,frames,state,settle,flush,fire,lose:()=>loseTurn=true,switchIdentity:()=>identity='B',async swipe(direction){fire('pointerdown');fire('pointerup',{clientX:535+80*direction});await settle();},async stairs(){fire('pointerdown',{clientX:500,clientY:1000});fire('pointerup',{clientX:500,clientY:1000});await settle();}};
}
test('scene has no direction buttons and handles four swipes with a first staircase entry',async()=>{
 const h=await harness();assert.equal(h.host.querySelectorAll('button').filter(b=>!b.hidden).length,0);
 h.fire('pointerdown');h.fire('pointerup',{clientX:538});await h.settle();assert.equal(h.state().seq,0);
 h.fire('pointerdown');h.fire('pointercancel');h.fire('pointerup',{clientX:450});await h.settle();assert.equal(h.state().seq,0);
 await h.swipe(-1);assert.equal(h.state().ready,true);assert.equal(h.state().floor,0);await h.swipe(1);assert.equal(h.state().seq,1);
 await h.stairs();assert.equal(h.state().floor,1);assert(h.renders.some(x=>x.climb?.from===0));
 for(const d of [1,-1,1])await h.swipe(d);
 assert.equal(h.state().complete,true);assert.deepEqual(h.renders.at(-1).lit,[true,true,true,true]);assert(h.host.querySelector('.tower-victory'));h.controller.dispose();
});
test('committed turn with lost response synchronizes rather than repeating a step',async()=>{
 const h=await harness();h.lose();await h.swipe(-1);assert.equal(h.state().seq,1);assert.equal(h.host.querySelector('.touch-recover').hidden,false);
 h.host.querySelector('.touch-recover').dispatchEvent(new Event('click'));await h.settle();assert.equal(h.calls.filter(x=>x==='turnDial').length,1);assert.equal(h.host.querySelector('.touch-recover').hidden,true);
 await h.stairs();assert.equal(h.state().floor,1);assert.equal(h.state().seq,2);h.controller.dispose();
});
test('disposing or changing identity cancels scene updates after a pending turn',async()=>{
 const h=await harness();h.fire('pointerdown');h.fire('pointerup',{clientX:450});const count=h.renders.length;h.controller.dispose();await h.settle();assert.equal(h.frames.size,0);assert.equal(h.renders.length,count);
 const j=await harness();j.fire('pointerdown');j.fire('pointerup',{clientX:450});j.switchIdentity();const n=j.renders.length;await j.settle();assert.equal(j.renders.length,n);j.controller.dispose();
});
test('failed image loading retries through a single start request',async()=>{
 const h=await harness({failImage:true});await h.flush();assert.equal(h.host.querySelector('.touch-recover').hidden,false);
 const before=h.calls.filter(x=>x==='startLevel').length;h.host.querySelector('.touch-recover').dispatchEvent(new Event('click'));await h.settle();assert.equal(h.calls.filter(x=>x==='startLevel').length,before+1);assert(h.renders.length);assert.equal(h.host.querySelector('.touch-recover').hidden,true);await h.swipe(-1);assert.equal(h.state().ready,true);h.controller.dispose();
});
