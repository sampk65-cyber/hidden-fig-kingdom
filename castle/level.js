(function(){'use strict';
 let assetsPromise=null;
 function image(src){return new Promise((resolve,reject)=>{const im=new Image();const timer=setTimeout(()=>reject(Error('場景載入逾時')),20000);im.onload=()=>{clearTimeout(timer);resolve(im)};im.onerror=()=>{clearTimeout(timer);reject(Error('場景圖片未能載入'))};im.src=src;});}
 function loadScene(){if(!assetsPromise)assetsPromise=Promise.all([image('art/castle/tower-touch-original.jpg?v=1521t3'),image('art/castle/tower-touch-clean-patch.webp?v=1521t3')]).catch(e=>{assetsPromise=null;throw e});return assetsPromise;}
 function mount(host,options){
  const Touch=window.CastleTouch,abort=new AbortController(),identity=options.identity?.();
  let dead=false,busy=true,recovery=false,scene=null,session=null,card=null,raf=0,hintTimer=0,drag=null,animationDone=null;
  host.classList.add('summit-level');host.innerHTML='<div class="touch-stage"><canvas width="1024" height="1536" tabindex="0" role="application" aria-label="流光晶塔。左右滑動底部輪盤，第一層配色完成後點選樓梯。亦可使用左右方向鍵與 Enter。"></canvas><p class="touch-hint" role="status" aria-live="polite"></p><button type="button" class="touch-recover" hidden>重新連線</button></div>';
  const canvas=host.querySelector('canvas'),hint=host.querySelector('.touch-hint'),recover=host.querySelector('.touch-recover'),ctx=canvas.getContext('2d');
  const alive=()=>!dead&&host.isConnected&&(!options.isAlive||options.isAlive())&&(!options.identity||identity===options.identity());
  const on=(el,type,fn)=>el.addEventListener(type,fn,{signal:abort.signal});
  function note(text,duration=3600){clearTimeout(hintTimer);hint.textContent=text;hint.classList.toggle('shown',!!text);if(text&&duration)hintTimer=setTimeout(()=>{if(alive())hint.classList.remove('shown')},duration);}
  function paint(s=session,extra={}){if(alive()&&scene&&s)scene.render(ctx,s.turns*Math.PI/2,s.colors,{floor:s.floor,lit:s.lit,ready:s.ready,...extra});}
  function adopt(response){if(!response?.session||response.session.touchVersion!==2)throw Error('關卡已更新，請重新載入');session=response.session;if(response.card)card=response.card;}
  function animate(duration,draw){return new Promise(resolve=>{const start=performance.now();animationDone=resolve;function frame(now){if(!alive()){animationDone=null;resolve(false);return}const p=Math.min(1,Math.max(0,(now-start)/duration));draw(p);if(p<1)raf=requestAnimationFrame(frame);else{raf=0;animationDone=null;resolve(true);}}raf=requestAnimationFrame(frame);});}
  function error(e){if(!alive())return;recovery=true;recover.hidden=false;note(e.message||'連線中斷，請重新連線',0);}
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  async function climb(old,next){
   if(next.floor<=old.floor)return true;
   const duration=reduced?220:(old.floor===0?4700:old.floor===3?5000:3100);
   return animate(duration,p=>paint({...next,floor:old.floor,lit:old.lit},{climb:{from:old.floor,to:next.floor,p}}));
  }
  function finish(){
   if(!alive()||!session.complete)return;
   options.onCardsChanged?.();host.querySelector('.tower-victory')?.remove();
   const panel=document.createElement('section');panel.className='tower-victory';
   panel.innerHTML='<div class="tower-victory-scroll"><h2>四層之光已亮起</h2>'+(card&&window.CastleVIP?CastleVIP.cardHTML(card):'<p>已保留通關紀錄，目前限量卡已發完。</p>')+'<div class="tower-victory-buttons"><button type="button" class="tower-primary" data-card-action>'+(card?'保存 VIP 卡':'再次確認領卡')+'</button><button type="button" class="tower-secondary" data-return>返回晶塔</button></div><p role="status" data-result></p></div>';
   host.appendChild(panel);
   panel.querySelector('[data-return]').onclick=()=>{panel.remove();canvas.focus();};
   panel.querySelector('[data-card-action]').onclick=async e=>{const b=e.currentTarget;b.disabled=true;try{if(card)await CastleVIP.download(card);else{const r=await options.call('claimCard',{levelId:'tower-01'});if(!alive())return;adopt(r);if(card)finish();else panel.querySelector('[data-result]').textContent='目前尚無可發行名額。';}}catch(err){if(alive())panel.querySelector('[data-result]').textContent=err.message;}finally{if(b.isConnected)b.disabled=false;}};
   panel.querySelector('button')?.focus();
  }
  async function turn(direction){
   if(!alive()||busy||recovery||!session||session.complete||session.ready||document.hidden)return;
   busy=true;note('');const old=structuredClone(session);
   const job=Touch.turn(old,direction);options.tick?.();
   const request=options.call('turnDial',{levelId:'tower-01',sid:old.sid,seq:old.seq+1,direction}).then(value=>({value}),error=>({error}));
   const moved=await animate(reduced?220:1450,p=>{const t=p*p*(3-2*p),colors=old.colors.slice();colors[old.floor]={from:old.colors[old.floor],to:job.colors[old.floor],t};paint({...old,turns:old.turns+direction*t,colors});});
   if(!moved)return;
   const result=await request;if(!alive())return;
   try{if(result.error)throw result.error;adopt(result.value);if(!await climb(old,session))return;paint();if(session.floor>old.floor)options.win?.();if(session.complete)finish();else if(session.failures>=3)note('轉動輪盤，換個方向');}
   catch(e){paint(old);error(e);}finally{if(alive())busy=false;}
  }
  async function enter(){
   if(!alive()||busy||recovery||!session?.ready||document.hidden)return;
   busy=true;note('');const old=structuredClone(session);
   try{const r=await options.call('enterStairs',{levelId:'tower-01',sid:old.sid,seq:old.seq+1});if(!alive())return;adopt(r);if(!await climb(old,session))return;paint();options.win?.();}
   catch(e){error(e);}finally{if(alive())busy=false;}
  }
  async function sync(){
   if(!alive()||busy)return;busy=true;
   try{const r=await options.call('startLevel',{levelId:'tower-01'});if(!alive())return;adopt(r);recovery=false;recover.hidden=true;note('');paint();if(session.complete)finish();}
   catch(e){error(e);}finally{if(alive())busy=false;}
  }
  const point=e=>{const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)*1024/r.width,y:(e.clientY-r.top)*1536/r.height};};
  on(canvas,'pointerdown',e=>{if(busy||recovery||!session||session.complete||e.isPrimary===false||e.button>0)return;const p=point(e);if(!Touch.onWheel(p)&&!(session.ready&&Touch.onStairs(p)))return;e.preventDefault();drag={id:e.pointerId,start:p};canvas.setPointerCapture(e.pointerId);});
  on(canvas,'pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;const start=drag.start,end=point(e);drag=null;if(session.ready&&Touch.onStairs(start)&&Touch.onStairs(end)&&Math.hypot(end.x-start.x,end.y-start.y)<22)enter();else{const direction=Touch.gesture(start,end);if(direction)turn(direction);}});
  on(canvas,'pointercancel',()=>{drag=null;});on(canvas,'lostpointercapture',()=>{drag=null;});on(canvas,'contextmenu',e=>e.preventDefault());
  on(canvas,'keydown',e=>{if(e.repeat)return;if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();turn(e.key==='ArrowLeft'?-1:1);}else if(e.key==='Enter'&&session?.ready){e.preventDefault();enter();}else if(e.key==='Enter'&&session?.complete){e.preventDefault();finish();}});
  on(recover,'click',()=>{if(!scene&&!busy){recover.hidden=true;busy=true;start();}else sync();});on(document,'visibilitychange',()=>{drag=null;if(!document.hidden&&!busy&&session)sync();});
  async function start(){
   try{const [sources,response]=await Promise.all([loadScene(),options.call('startLevel',{levelId:'tower-01'})]);if(!alive())return;scene=window.CastleTouchScene.makeCastleScene(...sources,(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;});adopt(response);recovery=false;recover.hidden=true;note('');paint();if(session.complete)finish();}
   catch(e){error(e);}finally{if(alive())busy=false;}
  }
  function dispose(){if(dead)return;dead=true;abort.abort();cancelAnimationFrame(raf);clearTimeout(hintTimer);animationDone?.(false);animationDone=null;drag=null;scene=null;}
  start();return {dispose};
 }
 window.CastleLevel={mount,loadScene};
})();
