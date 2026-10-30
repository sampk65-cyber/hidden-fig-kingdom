'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {fixture,member,input,complete}=require('./castle-level-test-helpers.cjs');
test('wrong direction never lights a floor, and first correct direction waits for entry',async()=>{
 const f=fixture(),me=member();let r=await f.svc.startLevel(me,{levelId:'tower-01'});
 for(let i=0;i<3;i++){r=await f.svc.turnDial(me,input(r.session,{direction:1}));assert.equal(r.session.floor,0);assert.notEqual(r.session.colors[0],1);assert.equal(r.session.failures,i+1);assert.equal(r.card,undefined);}
 r=await f.svc.turnDial(me,input(r.session,{direction:-1}));assert.equal(r.session.ready,true);assert.equal(r.session.lit[0],false);
 await assert.rejects(f.svc.turnDial(me,input(r.session,{direction:1})),e=>e.code==='bad');
 const request=input(r.session),entry=await f.svc.enterStairs(me,request),duplicate=await f.svc.enterStairs(me,request);
 assert.equal(entry.session.floor,1);assert.deepEqual(duplicate,entry);assert.equal(entry.session.lit[0],true);
 const bad=await f.svc.turnDial(me,input(entry.session,{direction:-1}));assert.deepEqual(bad.session.lit,[true,false,false,false]);assert.equal(bad.session.colors[0],1);
});
test('invalid direction, skipped sequence and injected progress cannot advance a session',async()=>{
 const f=fixture(),me=member(),r=await f.svc.startLevel(me,{levelId:'tower-01'});
 for(const direction of [0,2,'-1',null])await assert.rejects(f.svc.turnDial(me,input(r.session,{direction})),e=>e.code==='bad');
 await assert.rejects(f.svc.turnDial(me,input(r.session,{direction:-1,seq:3})),e=>e.code==='sequence');
 await assert.rejects(f.svc.turnDial(me,input(r.session,{direction:-1,floor:4})),e=>e.code==='bad');
 await assert.rejects(f.svc.enterStairs(me,input(r.session)),e=>e.code==='bad');
 assert.equal((await f.svc.startLevel(me,{levelId:'tower-01'})).session.seq,0);
});
test('old completed sessions preserve their entitlement and card on touch migration',async()=>{
 const f=fixture(),first=await complete(f);await f.svc.adminAssignPrize({uid:'root'},{cardId:first.card.id,name:'已綁定獎項'});
 for(const [key,s]of f.db.data)if(s.kind==='castle-level-session'){delete s.touchVersion;delete s.colors;delete s.lit;s.stopped=[null,null,null];f.db.data.set(key,s);}
 const r=await f.svc.startLevel(member(),{levelId:'tower-01'});assert.equal(r.session.complete,true);assert.equal(r.card.id,first.card.id);assert.equal(r.card.prize.name,'已綁定獎項');assert.equal((await f.svc.adminOverview({uid:'root'})).levels[0].issued,1);
});
test('upgrading an unfinished legacy replay preserves a sold-out earned claim',async()=>{
 const f=fixture();await f.svc.adminSaveLevel({uid:'root'},{levelId:'tower-01',limit:0});await complete(f);await f.svc.startLevel(member(),{levelId:'tower-01',restart:true});
 for(const [key,s]of f.db.data)if(s.kind==='castle-level-session'){delete s.touchVersion;f.db.data.set(key,s);}
 const r=await f.svc.startLevel(member(),{levelId:'tower-01'});assert.equal(r.session.floor,0);
 await f.svc.adminSaveLevel({uid:'root'},{levelId:'tower-01',limit:1});assert.equal((await f.svc.claimCard(member(),{levelId:'tower-01'})).card.serialNumber,1);
});
test('upgrading an unfinished older session preserves its completed floors',async()=>{
 const f=fixture();await f.svc.startLevel(member(),{levelId:'tower-01'});
 for(const [key,s]of f.db.data)if(s.kind==='castle-level-session'){delete s.touchVersion;s.floor=2;s.complete=false;f.db.data.set(key,s);}
 const r=await f.svc.startLevel(member(),{levelId:'tower-01'});assert.equal(r.session.floor,2);assert.deepEqual(r.session.lit,[true,true,false,false]);assert.deepEqual(r.session.colors,[1,3,0,0]);
});
test('an earned legacy card can be claimed before reopening the updated scene',async()=>{
 const f=fixture();await f.svc.adminSaveLevel({uid:'root'},{levelId:'tower-01',limit:0});await complete(f);
 for(const [key,s]of f.db.data)if(s.kind==='castle-level-session'){delete s.touchVersion;delete s.colors;delete s.lit;delete s.turns;f.db.data.set(key,s);}
 await f.svc.adminSaveLevel({uid:'root'},{levelId:'tower-01',limit:1});
 const r=await f.svc.claimCard(member(),{levelId:'tower-01'}),again=await f.svc.claimCard(member(),{levelId:'tower-01'});
 assert.equal(r.card.serialNumber,1);assert.equal(again.card.id,r.card.id);assert.deepEqual(r.session.lit,[true,true,true,true]);assert.deepEqual(r.session.colors,[1,3,2,4]);assert.equal((await f.svc.adminOverview({uid:'root'})).levels[0].issued,1);
});
