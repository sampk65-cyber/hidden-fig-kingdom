const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{test}=require('node:test'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function fn(n){const a=html.indexOf('function '+n+'(');assert.ok(a>=0,n+' exists');return html.slice(a,html.indexOf('\n}',a)+2);}
function scene(){const c=vm.createContext({Math,EM_LEN:110});vm.runInContext(fn('ghEmeraldTreeItems')+'\n'+fn('ghEmeraldEndWall')+';this.items=ghEmeraldTreeItems;this.wall=ghEmeraldEndWall;',c);return c;}
test('emerald trees stop before the rear wall at every allowed camera position',()=>{
 const c=scene(),rows=[-17,-13.5,-10,-6.5,-3,3,6.5,10,13.5,17];
 for(const z of [1.5,54.5,89.5,104.5,107.5])for(const x of [-18.6,-4.75,0,8.25,18.6]){
  const items=c.items(z,x,rows);assert.ok(items.every(t=>t.z<108.5&&t.z>=z+1&&Math.abs(t.x-x)<=13));
  assert.deepEqual(items,c.items(z,x,rows));
 }
 assert.equal(c.items(107.5,0,rows).length,0,'turnaround area stays clear at the physical end');
});
test('opposite emerald rows have different stable variations and only a slight canopy increase',()=>{
 const a=scene().items(1.5,0,[-3,3]),left=a.filter(t=>t.x<0),right=a.filter(t=>t.x>0);
 assert.notDeepEqual(left.map(t=>t.seed),right.map(t=>t.seed));
 assert.ok(a.every(t=>t.fullness>=1.045*1.06-1e-8&&t.fullness<=1.075*1.06+1e-8));
 assert.ok(left.some((t,i)=>t.seed%2!==right[i].seed%2),'opposite crowns do not repeat the same flip pattern');
 assert.ok(left.some((t,i)=>t.seed%2===right[i].seed%2),'opposite crowns must not form systematic mirror pairs');
 assert.ok(left.some((t,i)=>t.fullness!==right[i].fullness),'opposite crowns vary in width');
});
test('rear wall renders a closed glazed boundary and door at the fixed physical end',()=>{
 const c=scene();for(const camX of [-18.6,0,18.6]){let fills=0,strokes=0;const coords=[],noop=()=>{};
  const cx=new Proxy({fill:()=>fills++,stroke:()=>strokes++,createLinearGradient:()=>({addColorStop:noop})},{get:(o,k)=>o[k]||noop,set:(o,k,v)=>(o[k]=v,true)});
  c.wall(cx,(x,y,z)=>(coords.push([x,y,z]),{x:195+(x-camX)*100,y:380+(1.8-y)*100,s:100}),110,107.5);
  assert.ok(coords.some(p=>p[2]<110),'short side returns join the rear wall');
  assert.ok(fills>=2&&strokes>=5,'glazing, frame and door visible');assert.ok(coords.length>20);assert.ok(coords.every(p=>p[2]>=108.1&&p[2]<=110&&p.every(Number.isFinite)));
 }
});
