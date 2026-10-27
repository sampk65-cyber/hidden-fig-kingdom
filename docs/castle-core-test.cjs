const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const file=require('node:path').join(__dirname,'../castle/core.js');
test('castle core is available',()=>assert.ok(fs.existsSync(file),'Castle interaction core has not been implemented'));
if(fs.existsSync(file)){
 const {validX,Gate}=require(file);
 const x=[[[.2,.2],[.4,.4],[.7,.7]],[[.75,.2],[.5,.45],[.2,.75]]];
 test('four stone taps do not cross; fifth tap crosses once',()=>{const g=new Gate();for(let i=0;i<8;i++)assert.equal(g.tap(),false);g.authorize();for(let i=0;i<4;i++)assert.equal(g.tap(),false);assert.equal(g.tap(),true);assert.equal(g.tap(),false);assert.equal(g.stage,'crossing');});
 test('cannot open door before bridge crossing has finished',()=>{const g=new Gate();assert.equal(g.draw(x),false);g.authorize();for(let i=0;i<5;i++)g.tap();assert.equal(g.draw(x),false);g.arrive();assert.equal(g.draw(x),true);assert.equal(g.stage,'opening');});
 test('recognizes two crossing diagonal strokes in either order or direction',()=>{assert.equal(validX(x),true);assert.equal(validX(x.map(s=>[...s].reverse()).reverse()),true);});
 test('rejects tiny marks, parallel lines, plus, noncrossing diagonals and scribbles',()=>{for(const s of [[],[[[.4,.4],[.42,.42]],[[.42,.4],[.4,.42]]],[[[.2,.2],[.7,.7]],[[.3,.2],[.8,.7]]],[[[.5,.1],[.5,.9]],[[.1,.5],[.9,.5]]],[[[.1,.1],[.3,.3]],[[.7,.1],[.5,.3]]],[[[.1,.1],[.9,.1],[.1,.9],[.9,.9]],[[.8,.2],[.2,.8]]]])assert.equal(validX(s),false);});
 test('cancel resets taps and invalidates any previous stage',()=>{const g=new Gate();g.authorize();g.tap();g.cancel();assert.equal(g.stage,'locked');assert.equal(g.count,0);assert.equal(g.tap(),false);});
}
