(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CastleTouch=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const directions=Object.freeze([-1,1,-1,1]),targets=Object.freeze([1,3,2,4]);
 function create(){return {touchVersion:2,floor:0,turns:0,colors:[0,0,0,0],lit:[false,false,false,false],failures:0,ready:false,complete:false};}
 function turn(state,direction){
  if(direction!==-1&&direction!==1)throw Error('Invalid direction');
  const s={...state,colors:state.colors.slice(),lit:state.lit.slice()};
  if(s.complete)return s;
  if(s.ready)throw Error('Enter the first staircase');
  s.turns+=direction;
  if(direction===directions[s.floor]){
   s.colors[s.floor]=targets[s.floor];s.failures=0;
   if(s.floor===0)s.ready=true;
   else{s.lit[s.floor]=true;s.floor++;s.complete=s.floor===4;}
  }else{
   const choices=[1,2,3,4].filter(c=>c!==targets[s.floor]&&c!==s.colors[s.floor]);
   s.colors[s.floor]=choices[s.failures%choices.length];s.failures++;
  }
  return s;
 }
 function enter(state){
  if(!state.ready||state.floor!==0||state.complete)throw Error('The first staircase is not open');
  return {...state,colors:state.colors.slice(),lit:[true,false,false,false],floor:1,ready:false,failures:0};
 }
 function onWheel(p){const r=((p.x-535)/210)**2+((p.y-1040)/139)**2;return r>=.28&&r<=1.2;}
 function gesture(a,b){const dx=b.x-a.x,dy=b.y-a.y;return onWheel(a)&&Math.abs(dx)>=28&&Math.abs(dx)>Math.abs(dy)*1.25?(dx<0?-1:1):0;}
 function onStairs(p){return p.x>=450&&p.x<=610&&p.y>=930&&p.y<=1110;}
 return {directions,targets,create,turn,enter,onWheel,gesture,onStairs};
});
