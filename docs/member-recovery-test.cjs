const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
function section(start, end) {
  const a = html.indexOf(start), b = html.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a, start);
  return html.slice(a, b);
}
const pid = 'TESTABCD', key = 'ABCDEFGH23456789', family = 'FAMILYAB';
function game({ mapped=false, saved=false, full=false, admin=false }={}) {
  const records = new Map(Object.entries({
    ['players/'+pid]: {rtok:key, uids:mapped ? ['previous','current'] : ['previous'], role:'test', name:'原會員', points:53, boxes:1, famId:family},
    ['fams/'+family]: {owner:family, members:full ? [family,pid,'MEMBER03'] : [family,pid], names:{}},
    'codes/FRUIT': {type:'box', used:false, pts:80}, 'codes/GIFT': {type:'share', used:false},
    'codes/USED': {type:'box', used:true, usedPid:pid},
    'codes/USEDGIFT': {type:'share', used:true, usedPid:pid}
  }));
  if(mapped) records.set('users/current', {pid});
  if(admin) records.set('admins/current', {email:'admin@example.invalid'});
  const storage = new Map(saved ? [['hfk_card',pid+'.'+key]] : []);
  const nodes = new Map(); const messages = [];
  const $ = id=>{
    if(!nodes.has(id)) nodes.set(id, {focus(){},value:'',disabled:false,textContent:''});
    return nodes.get(id);
  };
  let counter=0;
  const ctx=vm.createContext({
    $, records, storage, messages, structuredClone, URLSearchParams, URL, Date,
    async loadCoupons(){}, openCreate:()=>messages.push('create'), startHome:()=>messages.push('home'),
    history:{replaceState(){}}, location:{pathname:'/'}, show(){}, closeSheet(){}, esc:String,
    openSheet:markup=>messages.push(markup), toast:msg=>messages.push(msg),
    info:(icon,title)=>messages.push(title), boxStory:(_,isNew)=>messages.push(isNew?'new':'redeemed'),
    localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},
    rid:n=>(++counter+'').padStart(n,'A'), COLORS:[], ROLE_MIGRATE:{},
    Login:{uid:'current',async anon(){return this.uid;}}, Auth:{async flush(){}}, DEMO:false,
    famSync(){},lvIndex:()=>0, renderFamily(){}, famLoad:async()=>{}, console,
    DB:{
      async get(k){
        const value=records.get(k);
        if(k.startsWith('players/') && !admin && !value?.uids.includes('current'))
          throw Object.assign(new Error('denied'),{code:'permission-denied'});
        return value ? structuredClone(value) : null;
      },
      async membersForUid(uid){return [...records.entries()].filter(([k,v])=>k.startsWith('players/')&&v.uids.includes(uid)).map(([k])=>k.slice(8));},
      async set(k,v){return this.batch([{op:'set',path:k,data:v}]);},
      async update(k,v){return this.batch([{op:'update',path:k,data:v}]);},
      async batch(ops,guard){
        if(guard && records.get('users/'+guard)?.pid) throw Error('already registered');
        const next=structuredClone(records);
        for(const {op,path:k,data} of ops){
          if(op==='set'){next.set(k,structuredClone(data));continue;}
          const v=next.get(k);
          if(!v) throw Error('missing document');
          if(data.claim && data.claim!==v.rtok) throw Error('bad card');
          for(const [field,n] of Object.entries(data)) v[field]=n?.$union ? [...new Set([...(v[field]||[]),...n.$union])] : n;
        }
        records.clear(); next.forEach((v,k)=>records.set(k,v));
      }
    }
  });
  vm.runInContext("let P=null,PID=null,MY_COUPONS=[],LOADED=null,FRESH_LOGIN=false,KICKED=false; const FAM_MAX=3;",ctx);
  for(const [a,b] of [['function newPlayer(', 'async function loadCoupons('], ['function shareOps(', 'function info('], ['async function redeem(', 'function boxStory('], ['async function bindMemberCard(', "$('#btnCode').onclick"], ['async function openFamilyInvite(', 'function famSetup(']]) vm.runInContext(section(a,b),ctx);
  vm.runInContext('const Admin={'+section('  async memberCard(pid){','  async player(pid){')+'};',ctx);
  const run=(code)=>vm.runInContext(code,ctx);
  return {run,records,storage,nodes,messages,click:(id)=>$(id).onclick({currentTarget:$(id)})};
}
for(const [label,action] of [
  ['家庭 QR，包括已滿的家庭', "openFamilyInvite('FAMILYAB')"],
  ['分享券', "redeem('GIFT')"], ['已用分享券', "redeem('USEDGIFT')"], ['已用果盒', "redeem('USED')"],
  ['新果盒', "redeem('FRUIT')"]
]) test('登入 ID 刷新後靠原卡恢復 '+label,async()=>{
  const s=game({saved:true,full:true});
  await s.run(action);
  assert.equal(s.records.get('users/current').pid,pid);
  assert.equal([...s.records.keys()].filter(k=>k.startsWith('players/')).length,1);
  const fruit=action.includes('FRUIT');
  assert.equal(s.records.get('players/'+pid).points,fruit?133:53);
  if(fruit) {await s.run(action);assert.equal(s.records.get('players/'+pid).points,133);}
  assert.equal(s.records.get('codes/GIFT').used,false);
});
test('已登入手機可直接回到既有會員',async()=>{
  const s=game({mapped:true});await s.run("openFamilyInvite('FAMILYAB')");
  assert.ok(s.messages.includes('home'));assert.equal(s.storage.get('hfk_card'),pid+'.'+key);
});
test('全新手機掃碼不建檔，舊會員輸入原卡可續玩',async()=>{
  for(const action of ["openFamilyInvite('FAMILYAB')","redeem('FRUIT')","redeem('GIFT')"]){
    const s=game();await s.run(action);
    assert.equal(s.records.has('users/current'),false);await s.click('#qrReturning');
    await s.run("recover('"+pid+'.'+key+"')");
    assert.equal(s.run('PID'),pid);
    assert.equal([...s.records.keys()].filter(k=>k.startsWith('players/')).length,1);
  }
});
test('已有另一帳號時，果盒提示原編號，掃碼不切換',async()=>{
  const s=game({mapped:true});s.records.get('codes/USED').usedPid='MEMBER02';
  await s.run("redeem('USED')");assert.equal(s.records.get('users/current').pid,pid);
  await s.click('#qrBoxMember');assert.equal(s.nodes.get('#pwId').value,'MEMBER02');
});
test('家庭已滿名額仍可找回，已用的券和果盒不能建立新會員',async()=>{
  for(const route of ["openFamilyInvite('FAMILYAB')","redeem('USED')","redeem('USEDGIFT')"]){
    const s=game({full:true});await s.run(route);
    assert.ok(s.nodes.has('#qrReturning'));assert.ok(!s.nodes.has('#qrFirstTime'));assert.equal(s.records.has('users/current'),false);
  }
});
test('首次加入必須明確選擇，成功後立即保存新卡',async()=>{
  for(const route of ["openFamilyInvite('FAMILYAB')","redeem('FRUIT')","redeem('GIFT')"]){
    const s=game();await s.run(route);await s.click('#qrFirstTime');
    const created=s.records.get('users/current').pid;
    assert.notEqual(created,pid);assert.equal(s.storage.get('hfk_card'),created+'.'+s.records.get('players/'+created).rtok);
    await s.run(route);
    assert.equal([...s.records.keys()].filter(k=>k.startsWith('players/')).length,2);
  }
});
test('回復中斷或輸錯密碼均保留原卡，不建立會員',async()=>{
  const s=game({saved:true});await s.run("recover('TESTABCD.XXXXYYYYZZZZ1234')");
  assert.equal(s.storage.get('hfk_card'),pid+'.'+key);assert.ok(!s.records.has('users/current'));
  s.run("DB.get=async()=>{throw new Error('offline')}");
  await assert.rejects(s.run("openFamilyInvite('FAMILYAB')"),/offline/);
  assert.equal(s.storage.get('hfk_card'),pid+'.'+key);
});
test('同時掃家庭碼，同一登入身分只建立一位會員',async()=>{
  const s=game();await Promise.allSettled([s.run("openFamilyInvite('FAMILYAB', true)"),s.run("openFamilyInvite('FAMILYAB', true)")]);
  assert.equal([...s.records.keys()].filter(k=>k.startsWith('players/')).length,2);
  assert.match(section('  async batch(ops, newMemberUid)', '  async del(path)'),/runTransaction[\s\S]*tx\.get[\s\S]*current\.data\(\)\.pid[\s\S]*write\(tx\)/);
});
test('管理員憑登入開原卡，普通會員不能開；讀卡不會更改會員',async()=>{
  for(const admin of [false,true]){
    const s=game({admin});const before=structuredClone(s.records);
    await s.run("Admin.memberCard('TESTABCD')");
    assert.equal(s.nodes.has('#admShowMemberKey'),admin);
    if(admin){assert.ok(!s.messages.join('').includes(key));await s.click('#admShowMemberKey');assert.equal(s.nodes.get('#admMemberKey').textContent,key);}
    assert.deepEqual(s.records,before);
  }
});
test('正式頁啟動及會員卡下載腳本可解析',()=>{
  for(const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)){
    if(match[1].trim() && !match[0].includes('application/ld+json')) new vm.Script(match[1]);
  }
  assert.match(section('async function downloadMemberCard(', 'function downloadBackup('),/cardLink\(pid, player\.rtok\)/);
});

test('原裝置有已驗證的身分但本機卡和對照紀錄遺失，重新連回同一會員',async()=>{
  const s=game({mapped:true});s.records.delete('users/current');
  await s.run("openFamilyInvite('FAMILYAB')");assert.equal(s.records.get('users/current').pid,pid);
  assert.ok(s.messages.includes('home'));assert.ok(!s.nodes.has('#qrFirstTime'));
});
test('同一身分曾屬於多個會員時，不依暱稱或家庭成員猜測',async()=>{
  const s=game({mapped:true});s.records.delete('users/current');
  s.records.set('players/MEMBER02',{uids:['current']});
  await assert.rejects(s.run("openFamilyInvite('FAMILYAB')"),/多個會員/);
  assert.ok(!s.records.has('users/current'));
});
