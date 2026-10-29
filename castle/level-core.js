(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CastleLevelCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const COLORS=Object.freeze([{key:'red',name:'紅色',hex:'#e65c67'},{key:'blue',name:'藍色',hex:'#4f9fdd'},{key:'green',name:'綠色',hex:'#50b898'},{key:'gold',name:'金色',hex:'#d6ae46'}].map(Object.freeze));
 const LEVEL=Object.freeze({id:'tower-01',title:'流光晶塔',thumbnail:'art/castle/tower-01-thumb.webp',floors:4,windowsPerFloor:3,targetWindow:1,order:Object.freeze([0,2,1]),defaultLimit:100});
 const PHASE_MS=4000,offsets=Object.freeze([1,0,2]),targets=Object.freeze([0,1,2,3]);
 function colorAt(session,floor,window,epochMs){
  if(!session||!Number.isInteger(floor)||floor<0||floor>=LEVEL.floors||!Number.isInteger(window)||window<0||window>=LEVEL.windowsPerFloor||!Number.isFinite(epochMs)||!Number.isFinite(session.cycleStartedAt)||!Number.isInteger(session.seed))throw new TypeError('Invalid tower color state');
  if(floor===session.floor&&Array.isArray(session.stopped)&&Number.isInteger(session.stopped[window])&&session.stopped[window]>=0&&session.stopped[window]<COLORS.length)return session.stopped[window];
  const phase=Math.floor(Math.max(0,epochMs-session.cycleStartedAt)/PHASE_MS);
  return ((session.seed+floor*3+offsets[window]+phase)%COLORS.length+COLORS.length)%COLORS.length;
 }
 return {COLORS,LEVEL,PHASE_MS,offsets,targets,colorAt};
});
