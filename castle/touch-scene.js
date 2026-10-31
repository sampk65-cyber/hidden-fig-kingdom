const CASTLE_PATHS=[
 [[235,1218,1],[273,1181,1],[330,1146,1],[393,1115,1],[450,1084,1],[508,1100,1],[568,1094,1],[590,1081,1],[567,1060,1],[541,1037,1],[515,1012,1],[485,983,1],[486,963,1],[501,945,.6],[504,930,0]],
 [[501,930,0],[464,860,0],[452,838,1],[477,819,1],[503,801,1],[530,783,1],[555,765,1],[581,752,.8],[602,728,0]],
 [[602,728,0],[614,640,0],[603,624,1],[579,610,1],[554,592,1],[530,574,1],[503,554,1],[485,537,1],[494,518,.6],[502,503,0]],
 [[502,503,0],[447,450,0],[457,442,1],[483,425,1],[510,408,1],[536,391,1],[562,375,1],[590,362,.8],[607,342,0],[628,283,0],[664,279,1],[713,270,1],[765,275,1],[815,264,1],[861,255,.5],[881,251,0]]
];
// Round only the small turns on the authored stair route; distance controls the
// stride so feet keep a steady cadence across short and long route segments.
const CASTLE_ROUTES=CASTLE_PATHS.map(points=>{
 const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t),path=[points[0]];
 for(let i=1;i<points.length-1;i++){
  const a=points[i-1],b=points[i],c=points[i+1];
  const incoming=Math.hypot(b[0]-a[0],b[1]-a[1]),outgoing=Math.hypot(c[0]-b[0],c[1]-b[1]);
  const radius=Math.min(9,incoming*.18,outgoing*.18),start=mix(b,a,radius/incoming),end=mix(b,c,radius/outgoing);
  path.push(start);for(let j=1;j<=8;j++){const t=j/8;path.push(mix(mix(start,b,t),mix(b,end,t),t));}
 }
 path.push(points.at(-1));const lengths=[0];
 for(let i=1;i<path.length;i++)lengths.push(lengths.at(-1)+Math.hypot(path[i][0]-path[i-1][0],path[i][1]-path[i-1][1]));
 return {path,lengths};
});
function heroPose(floor,climb){
 if(!climb)return floor===0?{x:235,y:1218,scale:1,alpha:1}:floor===4?{x:881,y:251,scale:.55,alpha:0}:{x:CASTLE_PATHS[floor-1].at(-1)[0],y:CASTLE_PATHS[floor-1].at(-1)[1],scale:.68,alpha:0};
 const {path,lengths}=CASTLE_ROUTES[Math.min(3,Math.max(0,climb.from))],p=Math.max(0,Math.min(1,climb.p));
 const distance=p*p*(3-2*p)*lengths.at(-1);let i=1;while(i<path.length-1&&distance>lengths[i])i++;
 const t=(distance-lengths[i-1])/(lengths[i]-lengths[i-1]),a=path[i-1],b=path[i],y=a[1]+(b[1]-a[1])*t;
 const stride=climb.reduced?0:Math.sin(distance*Math.PI/15.5)*Math.min(1,p*18,(1-p)*18);
 return {x:a[0]+(b[0]-a[0])*t,y,alpha:a[2]+(b[2]-a[2])*t,scale:.55+.45*Math.max(0,Math.min(1,(y-250)/968)),stepL:Math.max(0,stride)*3,stepR:Math.max(0,-stride)*3,bob:Math.abs(stride)*1.2,lean:stride*.012};
}
function makeCastleScene(source, clean, factory) {
  const W=1024,H=1536, TAU=Math.PI*2;
  const base=factory(W,H),bc=base.getContext('2d');bc.drawImage(source,0,0,W,H);
  const original=bc.getImageData(0,0,W,H),data=original.data;
  const layer=factory(W,H),lc=layer.getContext('2d');
  const patch=factory(420,310),pc=patch.getContext('2d');
  const patchImage=pc.createImageData(420,310);
  const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t)};
  const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
  const mod=(a,b)=>(a%b+b)%b;
  function inside(x,y,p){let hit=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j];if(((a[1]>y)!=(b[1]>y))&&(x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]))hit=!hit}return hit}
  function rgbHsl(r,g,b){r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn,l=(mx+mn)/2;let h=0,s=0;if(d){s=l>.5?d/(2-mx-mn):d/(mx+mn);switch(mx){case r:h=(g-b)/d+(g<b?6:0);break;case g:h=(b-r)/d+2;break;default:h=(r-g)/d+4}h/=6}return [h,s,l]}
  function hslRgb(h,s,l){const a=s*Math.min(l,1-l),f=n=>{const k=mod(n+h*12,12);return 255*(l-a*Math.max(-1,Math.min(k-3,9-k,1)))};return [f(0),f(8),f(4)]}
  const glassPolys=[
    [[495,257],[506,269],[517,290],[516,401],[478,420],[478,299],[483,275]],
    [[606,445],[615,458],[615,570],[596,589],[596,478],[600,454]],
    [[507,637],[520,652],[526,674],[524,768],[489,785],[488,674],[495,651]],
    [[638,786],[647,801],[647,846],[623,864],[623,819],[629,799]],
    [[611,894],[625,910],[632,936],[630,1009],[593,1029],[593,938],[601,911]],
    [[551,1203],[563,1218],[572,1243],[572,1345],[529,1349],[529,1242],[536,1219]]
  ];
  const glass=[];
  for(const poly of glassPolys){let minX=Math.floor(Math.min(...poly.map(p=>p[0]))),maxX=Math.ceil(Math.max(...poly.map(p=>p[0]))),minY=Math.floor(Math.min(...poly.map(p=>p[1]))),maxY=Math.ceil(Math.max(...poly.map(p=>p[1])));
    for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){if(!inside(x+.5,y+.5,poly))continue;const i=(y*W+x)*4,r=data[i],g=data[i+1],b=data[i+2],hsl=rgbHsl(r,g,b);
      // Only the green glass chroma changes. Stone, brass tracery, highlights and shadows retain their pixels.
      const strength=smooth(.16,.235,hsl[0])*(1-smooth(.55,.64,hsl[0]))*smooth(.025,.13,hsl[1]);
      if(strength>.005)glass.push({i,h:hsl[0],s:hsl[1],l:hsl[2],a:strength});
    }
  }
  const palettes=[null,.61,.94,.105,.76];
  const glassLayers=palettes.map(hue=>{
    const out=factory(W,H),c=out.getContext('2d'),im=c.createImageData(W,H);
    for(const p of glass){
      const h=hue===null?p.h:mod(hue+(p.h-.40)*.2,1);
      const s=hue===null?p.s:Math.min(.86,p.s*1.13+.07);
      const light=Math.min(.78,p.l*1.28+.018);
      const rgb=hslRgb(h,s,light);
      for(let k=0;k<3;k++)im.data[p.i+k]=rgb[k];
      im.data[p.i+3]=Math.round(p.a*255);
    }
    c.putImageData(im,0,0);return out;
  });
  function interp(points,x){if(x<=points[0][0])return points[0][1];for(let i=1;i<points.length;i++){if(x<=points[i][0]){const a=points[i-1],b=points[i],t=(x-a[0])/(b[0]-a[0]);return a[1]+t*(b[1]-a[1])}}return points.at(-1)[1]}
  const rail=[[418,1101],[440,1112],[470,1120],[500,1126],[530,1128],[560,1127],[590,1121],[620,1112],[650,1098],[675,1080],[697,1058],[713,1035],[720,1015]];
  const lower=[[418,1140],[440,1152],[470,1163],[500,1168],[530,1170],[560,1168],[590,1161],[620,1151],[650,1136],[675,1118],[697,1095],[713,1071],[720,1050]];
  const band=[];
  const arrow=[[660,1141],[670,1131],[681,1137],[704,1116],[701,1110],[733,1101],[733,1132],[724,1127],[710,1145],[692,1157],[676,1167]];
  const beltX0=448,beltX1=639;
  // Sample the existing engraved bronze band in cylindrical coordinates.
  const texW=512,texH=32,tex=new Float32Array(texW*texH*3);
  function sample(x,y,k){x=clamp(x,0,W-2);y=clamp(y,0,H-2);const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,i=(iy*W+ix)*4;return (data[i+k]*(1-fx)+data[i+4+k]*fx)*(1-fy)+(data[i+W*4+k]*(1-fx)+data[i+W*4+4+k]*fx)*fy}
  for(let u=0;u<texW;u++){const x=beltX0+(beltX1-beltX0)*u/(texW-1),a=interp(rail,x)+9,b=interp(lower,x)-8;for(let v=0;v<texH;v++)for(let k=0;k<3;k++)tex[(v*texW+u)*3+k]=sample(x,a+(b-a)*v/(texH-1),k)}
  // A short blended seam repeats the photographed engraving without an obvious jump.
  for(let v=0;v<texH;v++)for(let u=0;u<24;u++){const w=smooth(0,24,u);for(let k=0;k<3;k++){const a=(v*texW+u)*3+k,b=(v*texW+texW-24+u)*3+k;const mean=(tex[a]+tex[b])*.5;tex[a]=mean*(1-w)+tex[a]*w;tex[b]=tex[b]*(1-w)+mean*w}}
  for(let x=418;x<=715;x++){const top=interp(rail,x)+8,bot=interp(lower,x)-7;for(let y=Math.ceil(top);y<=bot;y++){
    if(x<483 && y<1139-(x-418)*.52)continue;
    if(inside(x,y,arrow))continue;
    const edge=Math.min(smooth(top,top+2,y),1-smooth(bot-2,bot,y))*smooth(418,427,x)*(1-smooth(707,716,x));if(edge<.001)continue;
    // Angle-based texture mapping makes the engraving slow at the rim's curved ends.
    const u=(Math.asin(clamp((x-535)/198,-.995,.995))+.2)*texW*(4/TAU);
    const v=clamp((y-top)/(bot-top),0,.999)*(texH-1);
    band.push({i:((y-890)*420+(x-320))*4,src:(y*W+x)*4,u,v,edge,shade:clamp(1-.0008*(x-535),.85,1.1)});
  }}
  const tracks=[
    {p:[[411,931],[392,943],[376,958],[364,974],[356,991],[354,1006],[357,1020]],r:5.8},
    {p:[[684,979],[698,994],[707,1011],[710,1030],[706,1050],[697,1069],[682,1085],[662,1098],[639,1108],[614,1116],[588,1121],[561,1124],[534,1124],[506,1121],[481,1115]],r:5.5}
  ];
  const toothPixels=[];
  for(const track of tracks){const p=track.p;let dist=[0];for(let j=1;j<p.length;j++)dist.push(dist.at(-1)+Math.hypot(p[j][0]-p[j-1][0],p[j][1]-p[j-1][1]));const L=dist.at(-1);
    function at(d){d=mod(d,L);let j=1;while(j<dist.length-1&&d>dist[j])j++;const a=p[j-1],b=p[j],len=dist[j]-dist[j-1],t=(d-dist[j-1])/len;return {x:a[0]+(b[0]-a[0])*t,y:a[1]+(b[1]-a[1])*t,nx:-(b[1]-a[1])/len,ny:(b[0]-a[0])/len}}
    const xs=p.map(q=>q[0]),ys=p.map(q=>q[1]);for(let y=Math.floor(Math.min(...ys)-7);y<=Math.max(...ys)+7;y++)for(let x=Math.floor(Math.min(...xs)-7);x<=Math.max(...xs)+7;x++){
      let best=1e9,along=0,cross=0;
      for(let j=1;j<p.length;j++){const a=p[j-1],b=p[j],dx=b[0]-a[0],dy=b[1]-a[1],l2=dx*dx+dy*dy,t=clamp(((x-a[0])*dx+(y-a[1])*dy)/l2),qx=a[0]+t*dx,qy=a[1]+t*dy,d=Math.hypot(x-qx,y-qy);if(d<best){best=d;along=dist[j-1]+t*Math.sqrt(l2);cross=((x-qx)*-dy+(y-qy)*dx)/Math.sqrt(l2)}}
      if(best>=track.r || x<483&&y>1040&&y<1139-(x-418)*.52)continue;
      toothPixels.push({i:((y-890)*420+(x-320))*4,src:(y*W+x)*4,d:along,cross,a:(1-smooth(track.r-2,track.r,best))*smooth(0,10,along)*(1-smooth(L-10,L,along)),L,at});
    }
  }
  const floorWindows=[
    {x:590,y:890,w:45,h:143},
    {x:485,y:632,w:44,h:160},
    {x:590,y:438,w:30,h:155},
    {x:474,y:250,w:48,h:175}
  ];
  // Build the light from the glass mask itself. The leadwork stays visible and
  // the soft spill follows the window, rather than a rectangular colored panel.
  const windowLights=floorWindows.map((r,f)=>{
    const pad=40,core=factory(r.w,r.h),cc=core.getContext('2d'),im=cc.createImageData(r.w,r.h),hue=palettes[[1,3,2,4][f]];
    for(const p of glass){const y=Math.floor(p.i/4/W),x=p.i/4-y*W;if(x<r.x||x>=r.x+r.w||y<r.y||y>=r.y+r.h)continue;
      const rgb=hslRgb(mod(hue+(p.h-.40)*.2,1),Math.min(.70,p.s*.75+.15),Math.min(.95,.65+p.l*.50)),j=((y-r.y)*r.w+x-r.x)*4;
      for(let k=0;k<3;k++)im.data[j+k]=rgb[k];im.data[j+3]=p.a*255;
    }
    cc.putImageData(im,0,0);
    const bloom=factory(r.w+pad*2,r.h+pad*2),c=bloom.getContext('2d');
    c.shadowColor=['#73a4f0','#e0bc65','#e199bd','#bf9ad9'][f];c.shadowBlur=27;c.globalAlpha=.72;c.drawImage(core,pad,pad);
    return {core,bloom,pad};
  });
  const banners=[
    {x:644,y:931,w:21,h:89,skew:-7,hue:.61,light:.43},
    {x:457,y:652,w:22,h:91,skew:7,hue:.105,light:.49},
    {x:623,y:461,w:22,h:91,skew:-7,hue:.94,light:.43},
    {x:531,y:278,w:23,h:94,skew:7,hue:.76,light:.47}
  ];
  // Reuse the scene's own woven fabric, edging and embroidered leaf.
  // The small cloth pieces follow the pillar planes and receive their local light.
  const bannerLayer=factory(W,H),blc=bannerLayer.getContext('2d');
  for(const b of banners){
    const cloth=factory(64,256),cc=cloth.getContext('2d'),im=cc.createImageData(64,256);
    for(let y=0;y<256;y++)for(let x=0;x<64;x++){
      const u=x/63,v=y/255;
      if(v>.82 && Math.abs(u-.47)>(1-v)/.18*.52)continue;
      const sx=955+51*u-5*v,sy=521-12*u+257*v;
      const rgb=[sample(sx,sy,0),sample(sx,sy,1),sample(sx,sy,2)];
      const hsl=rgbHsl(...rgb),fabric=smooth(.17,.27,hsl[0]);
      const hue=.105*(1-fabric)+b.hue*fabric;
      const sat=.13*(1-fabric)+(.10+hsl[1]*.19)*fabric;
      const fold=(-.035*Math.cos(u*Math.PI*4+.3)-.018*Math.cos(u*Math.PI*9+v*2))*fabric;
      const light=clamp(b.light+(hsl[2]-.29)*.88+fold,.24,.68);
      const dyed=hslRgb(hue,sat,light),i=(y*64+x)*4;
      for(let k=0;k<3;k++)im.data[i+k]=clamp((dyed[k]-127.5)*1.10+127.5,0,255);
      im.data[i+3]=Math.round(255*Math.min(smooth(0,1.5,x),smooth(0,1.5,63-x)));
    }
    cc.putImageData(im,0,0);
    blc.save();blc.translate(b.x,b.y);blc.transform(1,b.skew/b.w,-.012,1,0,0);
    blc.shadowColor='rgba(53,42,35,.24)';blc.shadowBlur=2;blc.shadowOffsetX=1;blc.shadowOffsetY=1.5;
    blc.drawImage(cloth,0,0,b.w,b.h);blc.shadowColor='transparent';
    blc.strokeStyle='rgba(105,90,64,.58)';blc.lineWidth=1.5;
    blc.beginPath();blc.moveTo(-1,.4);blc.lineTo(b.w+1,.4);blc.stroke();blc.restore();
  }
  const hero=factory(64,115),hc=hero.getContext('2d');
  const silhouette=[[234,1117],[243,1119],[249,1126],[252,1138],[251,1150],[248,1155],[254,1159],[253,1165],[254,1179],[258,1194],[255,1201],[248,1205],[248,1216],[245,1220],[236,1221],[231,1216],[230,1207],[223,1209],[219,1215],[212,1214],[210,1211],[212,1201],[213,1196],[208,1190],[210,1178],[208,1172],[210,1158],[215,1152],[220,1151],[223,1147],[220,1143],[222,1131],[228,1122]];
  hc.save();hc.beginPath();silhouette.forEach((p,i)=>i?hc.lineTo(p[0]-202,p[1]-1110):hc.moveTo(p[0]-202,p[1]-1110));hc.closePath();hc.clip();hc.drawImage(source,-202,-1110,W,H);hc.restore();
  if(clean){
    const replacement=factory(86,145),rc=replacement.getContext('2d');if(clean.width===86&&clean.height===145)rc.drawImage(clean,0,0);else rc.drawImage(clean,195,1100,86,145,0,0,86,145);
    const im=rc.getImageData(0,0,86,145);for(let y=0;y<145;y++)for(let x=0;x<86;x++)im.data[(y*86+x)*4+3]=255*smooth(0,13,Math.min(x,85-x,y,144-y));
    rc.putImageData(im,0,0);bc.drawImage(replacement,195,1100);
  }
  let wheelAngle=NaN;
  function render(ctx,angle,glassState=[0,0,0,0],state={}){
    angle=mod(angle,TAU);
    ctx.clearRect(0,0,W,H);ctx.drawImage(base,0,0);
    if(angle!==wheelAngle){
    const pd=patchImage.data;pd.fill(0);
    for(const p of band){const uu=mod(p.u-angle*texW*(4/TAU),texW),ui=Math.floor(uu),u2=(ui+1)%texW,uf=uu-ui,vi=Math.floor(p.v),vi2=Math.min(vi+1,texH-1),vf=p.v-vi;for(let k=0;k<3;k++){const a=tex[(vi*texW+ui)*3+k]*(1-uf)+tex[(vi*texW+u2)*3+k]*uf,b=tex[(vi2*texW+ui)*3+k]*(1-uf)+tex[(vi2*texW+u2)*3+k]*uf;pd[p.i+k]=(a*(1-vf)+b*vf)*p.shade;}pd[p.i+3]=p.edge*255;}
    for(const p of toothPixels){const q=p.at(p.d+angle*p.L*2/TAU),fade=p.a;for(let k=0;k<3;k++)pd[p.i+k]=sample(q.x+q.nx*p.cross,q.y+q.ny*p.cross,k);pd[p.i+3]=fade*255;}
    pc.putImageData(patchImage,0,0);wheelAngle=angle;
    }
    ctx.drawImage(patch,320,890);
    lc.clearRect(0,0,W,H);
    for(let i=0;i<4;i++){
      const state=glassState[i],s=typeof state==='number'?{from:state,to:state,t:0}:state;
      const r=floorWindows[i];
      lc.globalCompositeOperation='source-over';
      lc.globalAlpha=1-s.t;lc.drawImage(glassLayers[s.from],r.x,r.y,r.w,r.h,r.x,r.y,r.w,r.h);
      lc.globalCompositeOperation='lighter';
      lc.globalAlpha=s.t;lc.drawImage(glassLayers[s.to],r.x,r.y,r.w,r.h,r.x,r.y,r.w,r.h);
    }
    lc.globalAlpha=1;lc.globalCompositeOperation='source-over';
    ctx.drawImage(layer,0,0);
    const lit=state.lit||[false,false,false,false];
    for(let f=0;f<4;f++){
      let glow=lit[f]?1:0;
      if(state.climb&&state.climb.to===f+1)glow=Math.max(glow,smooth(.65,.95,state.climb.p));
      if(!glow)continue;
      const r=floorWindows[f],light=windowLights[f];
      ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=glow;
      ctx.drawImage(light.bloom,r.x-light.pad,r.y-light.pad);
      ctx.globalCompositeOperation='source-over';ctx.globalAlpha=.82*glow;
      ctx.drawImage(light.core,r.x,r.y);ctx.restore();
    }
    ctx.drawImage(bannerLayer,0,0);
    const pose=heroPose(state.floor||0,state.climb);
    if(pose.alpha>0){
      ctx.save();ctx.globalAlpha=pose.alpha*.18;ctx.fillStyle='#241d16';ctx.beginPath();ctx.ellipse(pose.x,pose.y,15*pose.scale,4*pose.scale,0,0,TAU);ctx.fill();ctx.restore();
      ctx.save();ctx.globalAlpha=pose.alpha;ctx.translate(pose.x,pose.y);ctx.scale(pose.scale,pose.scale);
      if(state.climb&&!state.climb.reduced){
        // Articulate the original boots, then overlap the coat to hide seams.
        for(const [x,w,lift,sign]of [[7,25,pose.stepL,-1],[32,27,pose.stepR,1]]){
          ctx.save();ctx.translate(x+w/2-33,-22);ctx.rotate(sign*lift*.027);
          ctx.drawImage(hero,x,86,w,29,-w/2,-lift,w,29);ctx.restore();
        }
        ctx.translate(0,-pose.bob);ctx.rotate(pose.lean);ctx.drawImage(hero,0,0,64,94,-33,-108,64,94);
      }else ctx.drawImage(hero,-33,-108);
      ctx.restore();
    }
  }
  return {render,stats:{glassPixels:glass.length,bandPixels:band.length,toothPixels:toothPixels.length},size:[W,H]};
}
if(typeof module==='object'&&module.exports)module.exports={makeCastleScene,heroPose};
else globalThis.CastleTouchScene={makeCastleScene,heroPose};
