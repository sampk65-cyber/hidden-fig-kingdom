(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.CastleFilm=api;})(typeof window==='undefined'?globalThis:window,function(root){
 'use strict';
 const clamp=x=>Math.max(0,Math.min(1,x)),smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t)};
 function frame(time,duration=30,reduced=false){
  const end=Number.isFinite(duration)&&duration>0?duration:30,p=clamp((time-Math.max(0,end-10))/Math.min(10,end));
  return {scale:reduced?1:1+5.8*p*p,glow:smooth(.3,.88,p),wash:smooth(.78,1,p),head:1-smooth(0,.5,p),brightness:1+.25*p};
 }
 function mount(video,screen,options={}){
  const request=options.requestFrame||root.requestAnimationFrame.bind(root),cancel=options.cancelFrame||root.cancelAnimationFrame.bind(root),doc=options.document||root.document;
  const reduced=options.reduced??root.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false;
  let controls=null,pause=null,seek=null;
  if(doc?.createElement&&screen.appendChild){controls=doc.createElement('div');controls.className='castle-film-controls';controls.innerHTML='<button type="button" aria-label="暫停迎賓秀">暫停</button><input type="range" min="0" max="30" step=".1" aria-label="迎賓秀播放進度">';screen.appendChild(controls);pause=controls.querySelector('button');seek=controls.querySelector('input');pause.onclick=()=>{if(video.paused)Promise.resolve(video.play()).catch(()=>{});else video.pause();};seek.oninput=()=>{video.currentTime=Number(seek.value);paint();};}
  let dead=false,raf=0;const valid=()=>!dead&&video.isConnected&&screen.isConnected&&(!options.alive||options.alive());
  function paint(){if(!valid())return;const f=frame(video.currentTime,video.duration,reduced);for(const[k,v]of Object.entries(f))screen.style.setProperty('--film-'+k,String(v));screen.parentElement?.style.setProperty('--film-head',String(f.head));if(controls){const end=Number.isFinite(video.duration)?video.duration:30;controls.hidden=video.currentTime<end-10;pause.textContent=video.paused?'繼續':'暫停';pause.setAttribute('aria-label',video.paused?'繼續迎賓秀':'暫停迎賓秀');seek.max=String(end);if(!seek.matches(':active'))seek.value=String(video.currentTime);}}
  function stop(){cancel(raf);raf=0;paint();}
  function tick(){raf=0;if(!valid()||video.paused||video.ended)return;paint();raf=request(tick);}
  function play(){paint();if(!raf&&!video.paused&&!video.ended)raf=request(tick);}
  function hidden(){if(doc.hidden){video.pause();stop();}}
  const events=[['playing',play],['timeupdate',paint],['seeked',paint],['pause',stop],['ended',stop]];
  for(const[type,fn]of events)video.addEventListener(type,fn);doc?.addEventListener('visibilitychange',hidden);paint();
  return {dispose(){if(dead)return;dead=true;cancel(raf);raf=0;controls?.remove();for(const[type,fn]of events)video.removeEventListener(type,fn);doc?.removeEventListener('visibilitychange',hidden);}};
 }
 return {frame,mount};
});
