// Render the actual pickGame function with a real Canvas backend; no accounts or network.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{test}=require('node:test');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'index.html'),'utf8');
const fn=(s,n)=>{const a=s.indexOf('function '+n+'(');assert.ok(a>=0,n);return s.slice(a,s.indexOf('\n}',a)+2);};
function harness(s,{width=390,height=844,imageReady=true,asset=null}={}){
  let time=0,frame=null,result=null;const draws=[],events=[],nodes={};
  const noop=()=>{}, gradient={addColorStop:noop};
  let canvas;
  const makeCanvas=()=>{
    if(asset){const c=asset.createCanvas(width*2,height*2),ctx=c.getContext('2d'),draw=ctx.drawImage.bind(ctx);
      ctx.drawImage=(im,...args)=>{if(im.file){draws.push({file:im.file,args});im=asset.images[im.file];}draw(im,...args);};
      c.getBoundingClientRect=()=>({left:0,top:0});return c;
    }
    const c={width:0,height:0,getBoundingClientRect:()=>({left:0,top:0})};
    const ctx=new Proxy({drawImage:(im,...args)=>draws.push({file:im.file,args}),createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get:(o,k)=>o[k]||noop,set:(o,k,v)=>(o[k]=v,true)});c.getContext=()=>ctx;return c;
  };
  const document={createElement:tag=>tag==='canvas'?makeCanvas():{clientWidth:width,clientHeight:height,remove:()=>events.push('removed')},body:{appendChild:()=>{canvas=makeCanvas();nodes['#pkCv']=canvas;for(const id of ['#pkS','#pkC','#pkT','#pkX'])nodes[id]={textContent:''};}}};
  const context=vm.createContext({document,window:{devicePixelRatio:2},Image:class{constructor(){this.complete=imageReady;this.naturalWidth=imageReady?512:0;this.naturalHeight=imageReady?512:0;}set src(v){this.file=v;if(asset){this.naturalWidth=asset.images[v].width;this.naturalHeight=asset.images[v].height;}}},
    performance:{now:()=>time*1000},requestAnimationFrame:cb=>frame=cb,Math:Object.assign(Object.create(Math),{random:()=>.5}),$:sel=>nodes[sel],diffOf:()=>1,P:{role:'test'},roleBase:x=>x,navigator:{},MUSIC:{start:noop,stop:noop},SND:{good:n=>events.push('good'),bad:()=>events.push('bad'),win:()=>events.push('win')}});
  const helpers=s.includes('function pickDrawLeaf(')?fn(s,'pickDrawLeaf')+fn(s,'pickFruitSprite')+fn(s,'pickDrawPlant'):'';
  vm.runInContext(fn(s,'lerpC')+fn(s,'palm')+helpers+fn(s,'pickGame')+';this.start=pickGame;',context);
  context.start(r=>result=r);
  return {context,draws,events,nodes,get canvas(){return canvas;},get result(){return result;},step:t=>{time=t;frame();},tap:(x,y)=>canvas.onpointerdown({clientX:x,clientY:y})};
}
test('leaf texture keeps its native aspect at every node and phone height',()=>{
  for(const [width,height] of [[320,568],[390,715],[390,844],[430,932],[844,390]]){
    const h=harness(source,{width,height});h.step(0);
    const leaves=h.draws.filter(d=>d.file?.includes('pick-fig-leaf'));
    assert.ok(leaves.length>80);
    for(const {args} of leaves)assert.equal(args[2]/args[3],1,'leaf proportions cannot follow viewport height');
    const count=leaves.length;h.step(.1);
    assert.equal(h.draws.filter(d=>d.file?.includes('pick-fig-leaf')).length,count,'static foliage is cached');
  }
});
test('leaf loading fallback still draws and fruit remains playable',()=>{
  const h=harness(source,{imageReady:false});h.step(3.6);h.tap(.12*390-18,844*(.5+.42)-844*.7*.16);
  assert.ok(h.events.includes('good'));assert.equal(h.nodes['#pkS'].textContent,3);
});
test('every ripe target retains its original hit center and score at all depths',()=>{
  const slots=[{x:.12,dp:1},{x:.88,dp:1},{x:.29,dp:.78},{x:.71,dp:.78},{x:.43,dp:.6},{x:.57,dp:.6}];
  for(const [width,height] of [[320,568],[390,715],[390,844],[430,932]])for(const s of slots){
    const h=harness(source,{width,height});h.step(3.6);const sc=Math.min(width/390,1.4)*s.dp;
    h.tap(s.x*width-18*sc,height*(.5+.42*s.dp)-height*.7*s.dp*.16);
    assert.ok(h.events.includes('good'));assert.equal(h.nodes['#pkS'].textContent,s.dp<.7?4:3);
  }
});
test('green penalties, ripe hits, overripe penalties and 45-second completion remain functional',()=>{
  const x=.12*390-18,y=844*(.5+.42)-844*.7*.16;
  const h=harness(source);h.step(0);h.tap(x,y);assert.equal(h.nodes['#pkS'].textContent,-2);
  h.step(3.6);h.tap(x,y);assert.equal(h.nodes['#pkS'].textContent,1);h.step(45);assert.ok(h.result);assert.ok(h.events.includes('win'));
  const over=harness(source);over.step(6);over.tap(x,y);assert.equal(over.nodes['#pkS'].textContent,-2);
});
if(process.env.PICK_RENDER){
  (async()=>{
    const {createCanvas,loadImage}=require('@napi-rs/canvas'),images={};
    for(const f of ['art/gh/pick-fig-leaf-v16.6.webp','art/gh/pick-fig-fruit-v16.6.webp','art/gh/fig-ripe-airy-v2.webp'])images[f]=await loadImage(path.join(root,f));
    const out=process.env.PICK_RENDER;fs.mkdirSync(out,{recursive:true});
    for(const [width,height] of [[390,715],[390,844],[320,568],[844,390]]){
      const h=harness(source,{width,height,asset:{createCanvas,images}});h.step(5);
      fs.writeFileSync(path.join(out,`pick-${width}x${height}.png`),h.canvas.toBuffer('image/png'));
    }
    if(process.env.PICK_BASELINE){const old=fs.readFileSync(process.env.PICK_BASELINE,'utf8'),h=harness(old,{width:390,height:715,asset:{createCanvas,images}});h.step(5);fs.writeFileSync(path.join(out,'pick-before.png'),h.canvas.toBuffer('image/png'));}
  })().catch(e=>{console.error(e);process.exitCode=1;});
}
