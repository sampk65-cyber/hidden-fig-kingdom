const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{test}=require('node:test'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),rows=[-17,-13.5,-10,-6.5,-3,3,6.5,10,13.5,17];
function fn(n){const a=html.indexOf('function '+n+'(');assert.ok(a>=0,n+' exists');return html.slice(a,html.indexOf('\n}',a)+2);}
function api(){const c=vm.createContext({Math,performance:{now:()=>0}});vm.runInContext(['emeraldSurface','emeraldLowPipes','ghBeginFrame','ghEmeraldX'].map(fn).join('\n')+';this.api={surface:emeraldSurface,pipes:emeraldLowPipes,begin:ghBeginFrame,x:ghEmeraldX};',c);return c.api;}
function recorder(){let points=[];const fills=[],asked=[],noop=()=>{},cx=new Proxy({beginPath:()=>points=[],moveTo:(x,z)=>points.push([x,z]),lineTo:(x,z)=>points.push([x,z]),fill(){fills.push({color:this.fillStyle,points:[...points]});}},{get:(o,k)=>o[k]||noop,set:(o,k,v)=>(o[k]=v,true)});return {cx,fills,asked,pj:(x,y,z)=>(asked.push([x,y,z]),{x,y:z,s:20})};}
test('eight row-gap cloth strips and ten soil beds span the full visible longitudinal interval',()=>{
 const a=api(),r=recorder();a.surface(r.cx,r.pj,2,rows,110);
 const cloth=r.fills.filter(p=>p.color==='#D8DDD6'),soil=r.fills.filter(p=>p.color==='#73624A');assert.equal(cloth.length,8);assert.equal(soil.length,10);
 for(const p of [...cloth,...soil]){const zs=p.points.map(q=>q[1]);assert.equal(Math.min(...zs),2.6);assert.ok(Math.max(...zs)>=52);assert.equal(p.points.length,4);}
 for(const p of cloth){const xs=p.points.map(q=>q[0]);assert.ok(Math.abs(Math.max(...xs)-Math.min(...xs)-1.75)<1e-10);assert.ok(xs.every(x=>x<-3||x>3),'central rail aisle remains open');}
});
test('all ten rows receive longitudinal pipe bands at approximately half a metre',()=>{
 const a=api(),r=recorder();a.pipes(r.cx,r.pj,2,rows,110);assert.equal(r.fills.filter(p=>p.color==='#68726C').length,10);
 for(const row of rows)assert.ok(r.asked.some(([x,y,z])=>Math.abs(x-row-Math.sign(row)*.18)<1e-10&&y===.5&&z===2.8));
});
test('central aisle projection is twelve percent wider with unchanged outer row spacing',()=>{
 const a=api();assert.ok(Math.abs(a.x(3)-1.29*1.12)<1e-12);assert.equal(a.x(-3),-a.x(3));assert.ok(Math.abs(a.x(10)-a.x(6.5)-3.5*.70)<1e-12);
});
test('each emerald frame resets stale drawing state and clears its whole view before painting',()=>{
 const a=api(),calls=[],c={canvas:{width:780},globalAlpha:.2,globalCompositeOperation:'lighter',filter:'blur(8px)',reset(){calls.push('reset');},setTransform(...v){calls.push(v);},clearRect(...v){calls.push(['clear',...v]);},fillRect(...v){calls.push(['fill',...v]);},beginPath(){},setLineDash(){}};
 a.begin(c,2,390,844);assert.equal(c.globalAlpha,1);assert.equal(c.globalCompositeOperation,'source-over');assert.equal(c.filter,'none');assert.deepEqual(calls[1],[2,0,0,2,0,0]);assert.ok(calls.some(v=>Array.isArray(v)&&v.join(',')==='clear,0,0,390,844'));assert.ok(calls.some(v=>Array.isArray(v)&&v.join(',')==='fill,0,0,390,844'));
});
