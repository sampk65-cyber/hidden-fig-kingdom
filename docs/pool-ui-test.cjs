'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const PoolRules=require('../lib/pool-rules.js');
const input={e:20,d:10,c:2,b:1,a:1,z:1,periods:{c:7,b:3,a:14,z:30},tiers:{}};
function fixture(file='index.html'){
 const html=fs.readFileSync(require('node:path').join(__dirname,'..',file),'utf8'),nodes={},rows=[];let stored={'config/pool':{e:20,d:10,c:5,b:3,a:1,zEvery:3},'pool/2026-11-10':{e:8,d:4,c:0,b:1,a:0,z:0}},time=Date.parse('2026-11-10T04:00:00Z');
 const $=id=>nodes[id]||(nodes[id]={disabled:false,innerHTML:'',textContent:''});
 for(const k of PoolRules.keys){const vals={'.t-q':input[k],'.t-days':input.periods[k],'.t-r':k==='c'?'p10':'p20','.t-n':'名字','.t-note':'備註'};rows.push({dataset:{k},querySelector:s=>({value:String(vals[s]??'')})});}
 const DB={_l:()=>structuredClone(stored),_s:v=>{stored=structuredClone(v)},get:async p=>structuredClone(stored[p]||null),set:async(p,v)=>{stored[p]=structuredClone(v)},batch:async ops=>{for(const o of ops)stored[o.path]=structuredClone(o.data)}};
 class Clock extends Date{constructor(...args){super(...(args.length?args:[time]));}static now(){return time;}}
 const ctx={DB,DEMO:true,Date:Clock,document:{querySelectorAll:()=>rows},$,console:{error(){}},toast:m=>ctx.message=m,seedRand:s=>{let x=7;for(const c of s)x=(x*31+c.charCodeAt(0))>>>0;return()=>{x=(x*1664525+1013904223)>>>0;return x/4294967296}},today:()=>PoolRules.day(time),esc:s=>String(s),chestSvg:k=>k,Admin:{}};
 vm.createContext(ctx);
 vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../lib/pool-rules.js'),'utf8'),ctx);
 const pool=html.slice(html.indexOf('const POOL_DEF ='),html.indexOf('function grantCoupon',html.indexOf('const POOL_DEF =')));
 const handlers=html.slice(html.indexOf('function poolInputs(){'),html.indexOf('\n};',html.indexOf("$('#btnPoolReset').onclick"))+3);
 const admin=html.slice(html.indexOf('  async pool(){')+2,html.indexOf('  async weather(){',html.indexOf('  async pool(){'))).replace(/,\s*$/,'');
 vm.runInContext(pool+'\nObject.assign(Admin,{'+admin+'});\n'+handlers,ctx);
 return {ctx,$,rows,DB,get:()=>stored,at:t=>{time=Date.parse(t)}};
}
for(const page of ['index.html','test.html']){
 test(page+': form submits separate period and quantity with existing reward metadata',()=>{const f=fixture(page),out=f.ctx.poolInputs();assert.equal(out.c,2);assert.equal(out.z,1);assert.equal(out.periods.c,7);assert.equal(out.periods.z,30);assert.equal(out.tiers.c.name,'名字');});
 test(page+': normal save preserves today, reset replenishes, and demo claims carry across days',async()=>{
  const f=fixture(page);await f.$('#btnPool').onclick();assert.equal(f.get()['config/pool'].poolVersion,2);assert.equal(f.get()['pool/cycles'].tiers.c.remaining,0);
  await f.$('#btnPoolReset').onclick();assert.equal(f.get()['pool/cycles'].tiers.c.remaining,2);
  assert.equal(await f.ctx.claimPrize('c'),true);f.at('2026-11-11T04:00:00Z');assert.equal((await f.ctx.poolToday()).c,1);assert.equal(await f.ctx.claimPrize('c'),true);assert.equal(await f.ctx.claimPrize('c'),false);f.at('2026-11-17T04:00:00Z');assert.equal((await f.ctx.poolToday()).c,2);
 });
 test(page+': failed save leaves balances intact and re-enables both controls',async()=>{const f=fixture(page),before=structuredClone(f.get());f.DB._s=()=>{throw new Error('offline')};await f.$('#btnPoolReset').onclick();assert.deepEqual(f.get(),before);assert.match(f.ctx.message,/失敗/);assert.equal(f.$('#btnPool').disabled,false);assert.equal(f.$('#btnPoolReset').disabled,false);});
 test(page+': admin shows four cycle inputs and current refill date',async()=>{const f=fixture(page);await f.$('#btnPoolReset').onclick();await f.ctx.Admin.pool();assert.equal((f.$('#tierRows').innerHTML.match(/t-days/g)||[]).length,4);assert.match(f.$('#poolNow').innerHTML,/2026-11-17/);assert.match(f.$('#poolNow').innerHTML,/每 7 天/);});
}

test('a committed reset followed by refresh failure reports success and asks to refresh, without another reset',async()=>{const f=fixture();f.DB.get=async()=>{throw new Error('read offline')};await f.$('#btnPoolReset').onclick();assert.equal(f.get()['pool/cycles'].tiers.c.remaining,2);assert.match(f.ctx.message,/已儲存/);assert.match(f.ctx.message,/重新整理/);assert.doesNotMatch(f.ctx.message,/儲存.*失敗/);});
