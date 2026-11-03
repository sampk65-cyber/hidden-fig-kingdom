const test=require('node:test'),assert=require('node:assert/strict');
test('the final ten seconds approach the chapel and enter warm light without an early cut',()=>{
 const C=require('../castle/film');for(const t of [0,10,19.9,20])assert.deepEqual(C.frame(t,30),{scale:1,glow:0,wash:0,head:1,brightness:1});
 const a=C.frame(24,30),b=C.frame(28,30),c=C.frame(30,30);assert(a.scale>1&&b.scale>a.scale&&c.scale>b.scale);assert.equal(a.wash,0);assert(c.wash>.99);assert.equal(c.head,0);
 assert.equal(C.frame(29,30,true).scale,1);assert(C.frame(29,30,true).wash>0);assert.deepEqual(C.frame(0,NaN),C.frame(0,30));
});
test('film camera follows media time on seek and cancels frames on pause and teardown',()=>{
 const C=require('../castle/film'),v=new EventTarget(),screen={isConnected:true,style:{values:{},setProperty(k,v){this.values[k]=v}}},frames=new Map();let n=0;
 Object.assign(v,{currentTime:0,duration:30,paused:false,ended:false,isConnected:true});
 const f=C.mount(v,screen,{requestFrame:fn=>{frames.set(++n,fn);return n},cancelFrame:id=>frames.delete(id)});
 v.dispatchEvent(new Event('playing'));assert.equal(frames.size,1);v.currentTime=28;v.dispatchEvent(new Event('seeked'));assert(+screen.style.values['--film-scale']>1);v.paused=true;v.dispatchEvent(new Event('pause'));assert.equal(frames.size,0);
 v.currentTime=5;v.dispatchEvent(new Event('seeked'));assert.equal(screen.style.values['--film-scale'],'1');f.dispose();v.paused=false;v.dispatchEvent(new Event('playing'));assert.equal(frames.size,0);
});
