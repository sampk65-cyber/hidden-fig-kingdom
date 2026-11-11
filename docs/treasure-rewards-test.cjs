'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function block(s,start,end){return s.slice(s.indexOf(start),s.indexOf(end,s.indexOf(start)));}
function client(page){
 const html=fs.readFileSync(path.join(__dirname,'..',page),'utf8'),writes=[];
 const ctx={P:{points:2000,tools:{shears:0},daily:{},name:'Tester'},PID:'A',MY_COUPONS:[],Math:Object.create(Math),DB:{set:(...a)=>{writes.push(a);return Promise.resolve()}},rid:()=> 'ABCD',lvIndex:()=>2,Date,setTimeout:()=>{},luckyCheck(){},toast(){},addPts(n){ctx.P.points+=n;return n;}};
 ctx.Math.random=()=>.5;vm.createContext(ctx);
 vm.runInContext(block(html,'const COUPON_T =','// 知識卡')+block(html,'function makeCouponRaw(){','// V6.7：')+block(html,'const WEEK_CAP =','/* ---------- 探索圖鑑')+block(html,'function grantCoupon(type','/* ---------- 摘果挑戰賽'),ctx);
 return {ctx,writes};
}
for(const page of ['index.html','test.html']){
 test(page+': all ordinary chest callers receive points without generating any coupon',()=>{const {ctx,writes}=client(page);for(const points of [0,500,1500,6000])for(const random of [0,.1,.5,.99]){ctx.P.points=points;ctx.Math.random=()=>random;const r=ctx.makeCoupon();assert.equal(r.t,'pts');assert.equal(r.pts,6);assert.equal(ctx.P.points,points+6);}assert.equal(writes.length,0);assert.equal(ctx.MY_COUPONS.length,0);assert.equal(ctx.P.weekCp,undefined);});
 test(page+': raw legacy entry also grants points and point labels reflect actual credited amount',()=>{const {ctx,writes}=client(page);assert.equal(ctx.makeCouponRaw().t,'pts');assert.equal(writes.length,0);assert.equal(ctx.cpT({t:'pts',pts:0}).big,'+0');assert.equal(ctx.cpT({t:'pts',pts:10}).big,'+10');});
 test(page+': legacy and unknown coupon types cannot be newly issued',()=>{const {ctx,writes}=client(page);for(const type of ['n9','n85','n8','unknown'])assert.throws(()=>ctx.grantCoupon(type));assert.equal(writes.length,0);for(const type of ['ship','c200','half','free','sp'])assert.equal(ctx.grantCoupon(type).t,type);assert.equal(writes.length,5);});
}
function server(){const ctx={module:{exports:{}},require:n=>n==='crypto'?{randomInt:()=>0,randomBytes:n=>Buffer.alloc(n)}:n==='firebase-admin'?{}:n.startsWith('../')?require(path.join(__dirname,'../api',n)):require(n),Date,console,process:{env:{}}};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'../api/game.js'),'utf8'),ctx);return ctx;}
test('old clients cannot bypass the configured pool through the lucky endpoint',async()=>{const ctx=server();let writes=0;const batch={set(){writes++;return this},async commit(){}};const db={doc:path=>({path}),batch:()=>batch,runTransaction:fn=>fn({get:async()=>({exists:false}),set(){writes++}})};const r=await ctx.opLucky(db, {pid:'A',player:{points:6000}});assert.equal(r.win,false);assert.equal(writes,0);});
test('server coupon creation rejects retired and unknown types while preserving preset metadata',()=>{const ctx=server();for(const type of ['n9','n85','n8','unknown'])assert.throws(()=>ctx.couponDoc(type,'Tester'));const c=ctx.couponDoc('sp','Tester',{spN:'請您喝咖啡',spD:'咖啡兌換券',src:'chase'});assert.equal(c.spN,'請您喝咖啡');assert.equal(c.spD,'咖啡兌換券');for(const type of ['ship','c200','half','free'])assert.equal(ctx.couponDoc(type,'Tester').t,type);});
for(const page of ['index.html','test.html']){
 test(page+': inactive shears cannot spend leaves while other tools stay available',()=>{
  const html=fs.readFileSync(path.join(__dirname,'..',page),'utf8'),button={dataset:{t:'shears'}},node={innerHTML:'',querySelectorAll:()=>[button]},ctx={P:{points:10000,tools:{shears:0,lens:0,basket:0,shoes:0},leaves:300},$:()=>node,lvIndex:()=>3,toast(){},Auth:{save(){}},renderAll(){}};vm.createContext(ctx);
  vm.runInContext(block(html,'const TIER_N =','// 券種顯示').split('// 優惠券：')[0]+block(html,'function renderTools(){','/* ---------- 優惠券與分享券'),ctx);ctx.renderTools();assert.doesNotMatch(node.innerHTML,/data-t="shears"/);assert.match(node.innerHTML,/data-t="lens"/);button.onclick();assert.equal(ctx.P.leaves,300);assert.equal(ctx.P.tools.shears,0);
 });
 test(page+': retired gift shows terminal server explanation without recording a claimed prize',async()=>{
  const html=fs.readFileSync(path.join(__dirname,'..',page),'utf8'),button={dataset:{gift:'0'},disabled:false},box={innerHTML:''},ctx={DEMO:false,P:{name:'Tester',giftGot:[]},PID:'A',Date,console:{error(){}},$:id=>id==='#sheet'?{classList:{contains:()=>true}}:box,topOverlay:()=>false,DB:{get:async()=>({id:'old',text:'Gift',created:0,gift:{k:'cp',t:'n85'}}),list:async()=>[]},cardRemind(){},openSheet(){},chestSvg:()=>'',esc:s=>s,document:{querySelectorAll:()=>[button]},Auth:{save(){}},toast:m=>ctx.message=m,API:{call:async()=>{throw Object.assign(Error('這個獎項已停用，請聯絡農場'),{code:'prize'})}}};vm.createContext(ctx);vm.runInContext(block(html,'async function checkMessages(','function newPhotoToast'),ctx);await ctx.checkMessages();await button.onclick();assert.equal(button.disabled,true);assert.match(box.innerHTML,/獎項已停用/);assert.equal(ctx.P.giftGot.length,0);
 });
}
test('retired gifts are rejected before consuming notice and inbox claims',async()=>{
 const ctx=server();for(const kind of ['n','m']){let writes=0;const gift={k:'cp',t:'n85'},snap={exists:true,data:()=>({id:'old',gift})},db={doc:path=>({path,get:async()=>snap}),runTransaction:fn=>fn({get:async()=>snap,set(){writes++},update(){writes++}})};await assert.rejects(ctx.opGift(db,{pid:'A',player:{name:'Tester'}},{kind,id:'old'}),e=>e.code==='prize');assert.equal(writes,0);}
});
