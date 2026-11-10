/* Shared chest quota rules. Dates are calendar days in Asia/Taipei. */
(function(root,factory){
  if(typeof module==='object'&&module.exports) module.exports=factory();
  else root.PoolRules=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const keys=['e','d','c','b','a','z'], periodic=['c','b','a','z'];
  const defaults={e:20,d:10,c:5,b:3,a:1,zEvery:3};
  const day=t=>new Date((t===undefined?Date.now():t)+8*3600e3).toISOString().slice(0,10);
  const dayNumber=d=>Math.floor(Date.parse(d+'T00:00:00Z')/864e5);
  const addDays=(d,n)=>new Date((dayNumber(d)+n)*864e5).toISOString().slice(0,10);
  function number(v,fallback,max){const n=Number(v);return v!==''&&Number.isFinite(n)?Math.max(0,Math.min(max,Math.floor(n))):fallback;}
  function active(c){return c&&c.poolVersion===2;}
  function rule(c,k){
    c={...defaults,...c};
    const days=periodic.includes(k)?Math.max(1,number(c.periods&&c.periods[k],k==='z'?number(c.zEvery,3,365):1,365)):1;
    return {days,quantity:number(c[k],k==='z'?1:defaults[k],50)};
  }
  function random(s){let x=7;for(const c of s)x=(x*31+c.charCodeAt(0))>>>0;x=(x*1664525+1013904223)>>>0;return x/4294967296;}
  function legacyInit(config,date){const c={...defaults,...config},out={};for(const k of keys)out[k]=k==='z'?(random('free'+date)<1/Math.max(1,+c.zEvery||3)?1:0):number(c[k],defaults[k],50);return out;}
  function seed(config,date,counts){const tiers={};for(const k of keys){const r=rule(config,k);tiers[k]={...r,start:date,remaining:counts?Math.min(r.quantity,number(counts[k],0,50)):r.quantity};}return {version:2,tiers};}
  function resolve(config,state,legacy,date){
    if(!active(config))return {counts:{...(legacy||legacyInit(config,date))},state:null};
    const next=seed(config,date,legacy),counts={};
    for(const k of keys){
      const old=state&&state.tiers&&state.tiers[k];
      if(old&&Number.isFinite(dayNumber(old.start))&&old.days>=1){
        const end=addDays(old.start,old.days);
        if(date<end)next.tiers[k]={start:old.start,days:old.days,quantity:number(old.quantity,0,50),remaining:number(old.remaining,0,50)};
        else {const r=rule(config,k),elapsed=dayNumber(date)-dayNumber(end);next.tiers[k]={...r,start:addDays(end,Math.floor(elapsed/r.days)*r.days),remaining:r.quantity};}
      }
      counts[k]=next.tiers[k].remaining;
    }
    return {counts,state:next};
  }
  function validate(input){
    const out={tiers:input.tiers||{},periods:{}};
    for(const k of keys){
      const q=input[k],n=Number(q);if(q===''||!Number.isInteger(n)||n<0||n>50)throw new Error('寶箱數量請填 0～50 的整數');out[k]=n;
      if(periodic.includes(k)){const v=input.periods&&input.periods[k],days=Number(v);if(v===''||!Number.isInteger(days)||days<1||days>365)throw new Error('週期天數請填 1～365 的整數');out.periods[k]=days;}
    }
    return out;
  }
  function prepareSave(config,state,legacy,input,date,reset){
    const valid=validate(input),nextConfig={...defaults,...config,...valid,poolVersion:2,zEvery:valid.periods.z};
    if(reset)return {config:nextConfig,state:seed(nextConfig,date)};
    const current=resolve(config,state,legacy,date);
    if(current.state)return {config:nextConfig,state:current.state};
    // Keep today's legacy balance until midnight. The new periods then start.
    const daily=legacyInit(config,date),tiers={};
    for(const k of keys)tiers[k]={start:date,days:1,quantity:daily[k],remaining:number(current.counts[k],0,50)};
    return {config:nextConfig,state:{version:2,tiers}};
  }
  return {keys,periodic,defaults,day,addDays,active,rule,legacyInit,resolve,prepareSave,validate};
});
