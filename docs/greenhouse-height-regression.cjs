const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{test}=require('node:test'),path=require('node:path');
const html=fs.readFileSync(process.env.GH_INDEX||path.join(__dirname,'../index.html'),'utf8');
function fn(n){const a=html.indexOf('function '+n+'(');assert.ok(a>=0,n);return html.slice(a,html.indexOf('\n}',a)+2);}
const stubs={console,Math,Image:class{constructor(){this.complete=true;this.naturalWidth=1024;this.naturalHeight=1536;}}};
const ctx=vm.createContext(stubs);
vm.runInContext(fn('stageTree')+'\n'+html.slice(html.indexOf('const GH_ART ='),html.indexOf('function mapMiniTrees'))+'\nthis.draw=drawFigTree;this.stage=stageTree;this.scene=typeof ghSceneStage===\'function\'?ghSceneStage:(z=>z.stage);',ctx);
function draw(stage,scale=1,loaded=true){
 vm.runInContext(`Object.values(GH_ART).flat().forEach(im=>{im.complete=${loaded};im.naturalWidth=${loaded?1024:0};})`,ctx);
 const ys=[],images=[],noop=()=>{},c=new Proxy({drawImage:(...a)=>images.push(a),createLinearGradient:()=>({addColorStop:noop})},{get:(o,k)=>o[k]||noop,set:(o,k,v)=>(o[k]=v,true)});
 ctx.palm=()=>{};ctx.draw(c,(x,y,z)=>(ys.push(y),{x:x*100,y:500-y*100,s:100}),1,10,100,stage,0,0,scale);return {ys,images};
}
test('emerald interior stays mature while stored rotation stages remain unchanged',()=>{
 for(const stage of ['剪枝','座果','採收','度冬']){const z={id:'z6',emerald:true,stage};assert.equal(ctx.scene(z),'採收');assert.equal(z.stage,stage);}
});
test('all other greenhouse interiors follow their actual stage including rotation into harvest',()=>{
 for(const id of ['z1','z2','z3','z4','z5'])for(const stage of ['剪枝','座果','採收','度冬'])assert.equal(ctx.scene({id,stage}),stage);
});
test('harvest sprite has the same mature height in both interiors',()=>{
 const ordinary=draw('採收'),emerald=draw('採收',1.15);
 assert.ok(ordinary.images[0][4]>=280&&ordinary.images[0][4]<=330,'mature canopy remains tall but below roof');
 assert.equal(ordinary.images[0][4],emerald.images[0][4]);
 assert.ok(ordinary.images[0][3]<220,'crown width must leave air between 3.2-unit rows');
 assert.equal(ordinary.images[0][3]/ordinary.images[0][4],1024/1536,'new sprite keeps natural aspect ratio');
});
test('mature fallback drawing keeps the same height before tree assets arrive',()=>{
 const r=draw('採收',1,false);assert.ok(Math.max(...r.ys)>=2.8&&Math.max(...r.ys)<=3.3,'fallback shares airy mature canopy height');assert.equal(r.images.length,0);
});
test('pruning, fruit-set and winter visuals plus gameplay stage metadata stay unchanged',()=>{
 assert.equal(draw('剪枝').images[0][4],130);assert.equal(draw('座果').images[0][4],160);assert.equal(draw('度冬').images[0][4],130);
 assert.equal(ctx.stage('採收').h,2.6);assert.equal(ctx.stage('剪枝').h,.5);assert.equal(ctx.stage('座果').h,1.5);
});
