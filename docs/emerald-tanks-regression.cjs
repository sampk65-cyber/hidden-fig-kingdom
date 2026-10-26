const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{test}=require('node:test'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function fn(n){const a=html.indexOf('function '+n+'(');assert.ok(a>=0,n+' exists');return html.slice(a,html.indexOf('\n}',a)+2);}
function scene(){const c=vm.createContext({Math,EM_LEN:110});vm.runInContext(fn('ghEmeraldTreeItems')+'\n'+fn('ghEmeraldTankItems')+'\n'+fn('ghEmeraldTank')+';this.trees=ghEmeraldTreeItems;this.tanks=ghEmeraldTankItems;this.draw=ghEmeraldTank;',c);return c;}
test('emerald has exactly three large tanks behind the walking limit and clear of the rear door',()=>{
 const tanks=scene().tanks();assert.equal(tanks.length,3);assert.equal(new Set(tanks.map(t=>t.n)).size,3);
 for(const t of tanks){assert.equal(t.k,'tank');assert.ok(t.z-t.r>108&&t.z+t.r<110);assert.ok(Math.abs(t.x)-t.r>1.1);assert.ok(t.h>=2.6&&t.h<3);assert.ok(t.r>=.75&&t.r<=1);}
 for(let i=0;i<tanks.length;i++)for(let j=i+1;j<tanks.length;j++)assert.ok(Math.hypot(tanks[i].x-tanks[j].x,tanks[i].z-tanks[j].z)>tanks[i].r+tanks[j].r);
});
test('emerald longitudinal density increases eight percent and canopies another six percent',()=>{
 const items=scene().trees(1.5,0,[-3,3]);
 for(const x of [-3,3]){const row=items.filter(t=>t.x===x);assert.ok(row.length>12);
  for(let i=1;i<row.length;i++)assert.ok(Math.abs((row[i].z-row[i-1].z)-2.75/1.08)<1e-9);
 }
 for(const t of items){const previous=1.06+(t.seed%3-1)*.015;assert.ok(Math.abs(t.fullness/previous-1.06)<1e-12);assert.ok(t.z<108.5);}
});
test('tank drawing has finite geometry, black cylindrical surfaces, lids and drain details',()=>{
 const c=scene();for(const camX of [-4.8,0,3.6])for(const t of c.tanks()){
  const colors=[],calls=[],rects=[];let balance=0;const noop=()=>{},gradient={addColorStop:(n,color)=>colors.push(color)};
  const cx=new Proxy({save:()=>balance++,restore:()=>balance--,createLinearGradient:()=>gradient,canvas:{clientWidth:390,width:390}},{get:(o,k)=>o[k]||((...args)=>{assert.ok(args.filter(a=>typeof a==='number').every(Number.isFinite),String(k));calls.push(k);if(k==='fillRect')rects.push(args);}),set:(o,k,v)=>(o[k]=v,true)});
  c.draw(cx,(x,y,z)=>({x:195+(x-camX)*60,y:380+(1.8-y)*60,s:60}),t);
  const peak=380+(1.8-(t.h-.06))*60;assert.ok(rects[0][1]<=peak&&rects[0][1]+rects[0][3]>=peak,'lid neck touches the actual dome peak');
  assert.equal(balance,0);assert.ok(calls.filter(k=>k==='fill').length>=4);assert.ok(colors.some(v=>/^#(1|2|3)/.test(v)),'dark material gradient');
 }
});
