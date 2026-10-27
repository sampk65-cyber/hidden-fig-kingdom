(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CastleCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function validX(strokes){
  if(!Array.isArray(strokes)||strokes.length!==2)return false;
  const seg=[];for(const p of strokes){if(!Array.isArray(p)||p.length<2||p.some(q=>!Array.isArray(q)||q.length!==2||q.some(v=>!Number.isFinite(v)||v<0||v>1)))return false;
   const a=p[0],b=p[p.length-1],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);if(len<.28||Math.abs(dx)<.16||Math.abs(dy)<.16||Math.abs(dx/dy)<.35||Math.abs(dx/dy)>2.85)return false;
   let travel=0;for(let i=1;i<p.length;i++){travel+=Math.hypot(p[i][0]-p[i-1][0],p[i][1]-p[i-1][1]);const distance=Math.abs(dx*(a[1]-p[i][1])-(a[0]-p[i][0])*dy)/len;if(distance>.09)return false;}
   if(travel>len*1.5)return false;seg.push({a,b,dx,dy});
  }
  const [a,b]=seg;if(a.dx*a.dy*b.dx*b.dy>=0)return false;const cross=(x,y,u,v)=>x*v-y*u,den=cross(a.dx,a.dy,b.dx,b.dy);if(Math.abs(den)<.01)return false;
  const cx=b.a[0]-a.a[0],cy=b.a[1]-a.a[1],t=cross(cx,cy,b.dx,b.dy)/den,u=cross(cx,cy,a.dx,a.dy)/den;return t>.15&&t<.85&&u>.15&&u<.85;
 }
 class Gate{constructor(){this.cancel()}cancel(){this.stage='locked';this.count=0}authorize(){this.stage='stone';this.count=0}tap(){if(this.stage!=='stone')return false;if(++this.count===5){this.stage='crossing';return true}return false}arrive(){if(this.stage==='crossing')this.stage='door'}draw(s){if(this.stage!=='door'||!validX(s))return false;this.stage='opening';return true}}
 return {validX,Gate};
});
