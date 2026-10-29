'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const file=path.join(__dirname,'../castle/touch-core.js');
test('four direction puzzle requires the first staircase before it can progress',()=>{
 assert.ok(fs.existsSync(file),'Touch puzzle core must exist');
 const C=require(file);let s=C.create();
 assert.throws(()=>C.enter(s),/stair/);
 for(let i=0;i<3;i++){s=C.turn(s,1);assert.equal(s.floor,0);assert.notEqual(s.colors[0],1);assert.equal(s.turns,i+1);assert.equal(s.failures,i+1);}
 s=C.turn(s,-1);assert.equal(s.ready,true);assert.equal(s.floor,0);assert.equal(s.colors[0],1);assert.throws(()=>C.turn(s,1),/stair/);
 s=C.enter(s);assert.equal(s.floor,1);assert.deepEqual(s.lit,[true,false,false,false]);
 for(const d of [1,-1,1])s=C.turn(s,d);
 assert.equal(s.complete,true);assert.deepEqual(s.colors,[1,3,2,4]);assert.deepEqual(s.lit,[true,true,true,true]);
 assert.throws(()=>C.turn(s,0),/direction/);
});
test('gesture classification rejects taps, vertical movement and off-wheel drags',()=>{
 assert.ok(fs.existsSync(file),'Touch puzzle core must exist');const C=require(file);
 assert.equal(C.gesture({x:535,y:1140},{x:475,y:1142}),-1);
 assert.equal(C.gesture({x:535,y:1140},{x:595,y:1142}),1);
 assert.equal(C.gesture({x:535,y:1140},{x:538,y:1142}),0);
 assert.equal(C.gesture({x:535,y:1140},{x:540,y:1190}),0);
 assert.equal(C.gesture({x:100,y:500},{x:160,y:500}),0);
});
