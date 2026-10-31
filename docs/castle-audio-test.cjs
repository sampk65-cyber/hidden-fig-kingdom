const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const file=path.join(__dirname,'../castle/audio.js');
test('dedicated castle audio module is available',()=>assert(fs.existsSync(file)));
if(fs.existsSync(file)){
const {create}=require(file);
function fixture({pending=false,enabled=true}={}){
 const media=[],nodes=[];let on=enabled,unlock=0,resolve;
 class Audio{constructor(src){this.src=src;this.paused=true;this.currentTime=0;this.duration=1.6;this.plays=0;media.push(this)}play(){this.paused=false;this.plays++;return pending&&media[0]===this?new Promise(r=>resolve=r):Promise.resolve()}pause(){this.paused=true}}
 const ctx={state:'running',currentTime:0,destination:{},createMediaElementSource:()=>node(),createGain:()=>node(),close(){throw Error('shared context must remain open')}};
 function node(){const n={connected:false,disconnected:false,gain:{value:0,setTargetAtTime(){}},connect(){this.connected=true},disconnect(){this.disconnected=true}};nodes.push(n);return n;}
 const audio=create({Audio,enabled:()=>on,context:()=>ctx,unlock:()=>unlock++,watch:false});
 return {audio,media,nodes,set:v=>on=v,resolve:()=>resolve?.(),unlocks:()=>unlock};
}
test('music obeys mute/background state and does not restart while already playing',async()=>{const f=fixture({enabled:false});assert.equal(f.media[0].plays,0);f.set(true);f.audio.sync();f.audio.sync();assert.equal(f.media[0].plays,1);f.set(false);f.audio.sync();assert(f.media.every(m=>m.paused));f.audio.dispose();});
test('stone starts only on a turn and follows the animation duration',async()=>{const f=fixture();assert.equal(f.media[1].plays,0);f.audio.turn(1600);assert.equal(f.media[1].plays,1);assert.equal(f.media[1].playbackRate,1);f.set(false);f.audio.turn(1600);assert.equal(f.media[1].plays,1);f.audio.dispose();});
test('a play promise resolving after mute or exit cannot leave sound playing',async()=>{const f=fixture({pending:true});f.set(false);f.audio.sync();f.resolve();await new Promise(r=>setImmediate(r));assert(f.media[0].paused);f.audio.dispose();assert(f.nodes.every(n=>n.disconnected));});
test('gesture unlock and repeated disposal never close the shared kingdom context',()=>{const f=fixture();f.audio.gesture();assert.equal(f.unlocks(),1);f.audio.dispose();f.audio.dispose();const before=f.media.map(m=>m.plays);f.audio.gesture();f.audio.turn(1600);assert.deepEqual(f.media.map(m=>m.plays),before);});
test('rejected autoplay retries on a gesture without leaking a rejected promise',async()=>{const f=fixture({enabled:false});f.media[0].play=()=>Promise.reject(Error('NotAllowedError'));f.set(true);f.audio.sync();await new Promise(r=>setImmediate(r));f.media[0].play=function(){this.paused=false;return Promise.resolve()};f.audio.gesture();await new Promise(r=>setImmediate(r));assert.equal(f.media[0].paused,false);f.audio.dispose();});
}

test('partial Web Audio setup reconnects retained sources without rebinding media',()=>{
 const media=[],bound=new Set(),sources=[];let gains=0;
 class Audio{constructor(){this.paused=true;media.push(this)}play(){this.paused=false;return Promise.resolve()}pause(){this.paused=true}}
 const ctx={state:'running',destination:{},createMediaElementSource(m){if(bound.has(m))throw Error('already bound');bound.add(m);const n={connected:false,connect(){this.connected=true},disconnect(){this.connected=false}};sources.push(n);return n;},createGain(){if(++gains===2)throw Error('temporary graph failure');return {gain:{value:0},connect(){},disconnect(){}}}};
 const a=require(file).create({Audio,context:()=>ctx,watch:false});a.gesture();a.sync();
 assert.equal(sources.length,2);assert(sources.every(n=>n.connected),'Both bound media sources must reconnect after retry');a.dispose();assert(sources.every(n=>!n.connected));
});
