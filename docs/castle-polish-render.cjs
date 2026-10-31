const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const canvas=require((process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/':'')+'@napi-rs/canvas');
const {makeCastleScene}=require('../castle/touch-scene');
(async()=>{
 const root=path.join(__dirname,'..'),out=path.join(root,'../crystal-polish-qa');fs.mkdirSync(out,{recursive:true});
 const source=await canvas.loadImage(path.join(root,'art/castle/tower-touch-original.jpg')),clean=await canvas.loadImage(path.join(root,'art/castle/tower-touch-clean-patch.webp'));
 const scene=makeCastleScene(source,clean,canvas.createCanvas),c=canvas.createCanvas(1024,1536),ctx=c.getContext('2d'),colors=[1,3,2,4];
 scene.render(ctx,0,colors,{floor:4,lit:[false,false,false,false]});const before=ctx.getImageData(0,0,1024,1536).data;
 scene.render(ctx,0,colors,{floor:4,lit:[true,true,true,true]});const after=ctx.getImageData(0,0,1024,1536).data;
 fs.writeFileSync(path.join(out,'completed.png'),c.toBuffer('image/png'));
 const results=[[603,943,20,63],[499,687,18,67],[600,487,11,57],[486,306,20,69]].map(([x,y,w,h])=>{
  let a=0,b=0,bb=0,n=0;for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++){const k=(j*1024+i)*4;const l=d=>.2126*d[k]+.7152*d[k+1]+.0722*d[k+2];a+=l(before);b+=l(after);bb+=l(after)**2;n++;}
  return {before:a/n,after:b/n,increase:(b-a)/n,detail:Math.sqrt(bb/n-(b/n)**2)};
 });console.log('Completed window luminance:',results);
 for(let i=0;i<4;i++){scene.render(ctx,0,[1,3,2,4],{floor:i,lit:[true,true,true,true].map((_,j)=>j<i),climb:{from:i,to:i+1,p:.47}});fs.writeFileSync(path.join(out,'walk-'+i+'.png'),c.toBuffer('image/png'));}
 assert(results.every(r=>r.increase>45&&r.detail>5),'Completed glass must be conspicuously brighter while retaining detail');
 console.log('Bright glass and visible texture checks passed.');
})().catch(e=>{console.error(e);process.exitCode=1});
