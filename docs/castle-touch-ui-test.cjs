'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
test('production scene exposes initial, entry and four-floor character paths',()=>{
 const file=path.join(__dirname,'../castle/touch-scene.js');assert.ok(fs.existsSync(file),'Direct-touch scene is required');
 const C=require(file);assert.equal(typeof C.makeCastleScene,'function');
 const initial=C.heroPose(0);assert.equal(initial.x,235);assert.equal(initial.y,1218);assert.equal(initial.alpha,1);
 const walk=C.heroPose(0,{from:0,to:1,p:.5});assert(walk.x>initial.x);assert(walk.y<initial.y);
 const entered=C.heroPose(1);assert.equal(entered.alpha,0);
 const final=C.heroPose(4);assert(final.x>800);assert(final.y<300);
});
test('walking eases at endpoints with bounded continuous steps and articulated feet',()=>{
 const {heroPose}=require('../castle/touch-scene');
 for(let floor=0;floor<4;floor++){
  const at=p=>heroPose(floor,{from:floor,to:floor+1,p});
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  assert(distance(at(0),at(.001))<distance(at(.5),at(.501))*.02);
  let previous=at(0),movingFeet=false;
  for(let i=1;i<=1000;i++){const pose=at(i/1000);assert(distance(previous,pose)<4);assert(Number.isFinite(pose.stepL)&&Number.isFinite(pose.stepR));if(Math.abs(pose.stepL-pose.stepR)>.5)movingFeet=true;previous=pose;}
  assert(movingFeet);assert.equal(at(1).alpha,0);
  const calm=heroPose(floor,{from:floor,to:floor+1,p:.43,reduced:true});assert.equal(calm.bob,0);assert.equal(calm.stepL,0);assert.equal(calm.stepR,0);
 }
});
