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
