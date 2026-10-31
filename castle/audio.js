(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.CastleAudio=api;})(typeof window==='undefined'?globalThis:window,function(root){
 'use strict';
 function create(options={}){
  const Audio=options.Audio||root.Audio;
  if(!Audio)return {gesture(){},sync(){},turn(){},dispose(){}};
  const music=new Audio('audio/castle-crystal.mp3?v=15211'),stone=new Audio('audio/castle-stone.mp3?v=15211');
  music.preload='auto';music.loop=true;music.volume=.32;stone.preload='auto';stone.volume=.58;
  let dead=false,wanted=false,needsGesture=false,pending=null,graph=null,owned=null,watch=0,stopTimer=0,turnId=0;
  const enabled=()=>!dead&&(!options.enabled||options.enabled());
  function connect(gesture=false){
   if(graph?.tracks.every(t=>t.connected))return;
   let ctx=graph?.ctx||options.context?.();
   if(!ctx&&gesture){const Context=options.Context||root.AudioContext||root.webkitAudioContext;if(Context)try{ctx=owned=new Context()}catch(_){}}
   if(!ctx)return;
   if(!graph)graph={ctx,nodes:[],tracks:[{media:music,volume:.32},{media:stone,volume:.58}]};
   // A media element can only be bound once. Retain each source immediately,
   // including partial graphs, and reconnect the same nodes on the next retry.
   for(const track of graph.tracks){if(track.connected)continue;try{
    if(!track.source){track.source=ctx.createMediaElementSource(track.media);graph.nodes.push(track.source);}
    if(!track.gain){track.gain=ctx.createGain();graph.nodes.push(track.gain);}
    track.source.disconnect();track.gain.disconnect();track.gain.gain.value=track.volume;
    track.source.connect(track.gain);track.gain.connect(ctx.destination);track.media.volume=1;track.connected=true;
   }catch(_){}}
  }
  function stopStone(){clearTimeout(stopTimer);stopTimer=0;turnId++;stone.pause();}
  function playMusic(){
   if(!enabled()||needsGesture||pending||!music.paused)return;
   const token={};pending=token;
   try{Promise.resolve(music.play()).then(()=>{if(!enabled()||!wanted)music.pause();},()=>{if(pending===token&&wanted)needsGesture=true;}).finally(()=>{if(pending===token)pending=null;});}
   catch(_){pending=null;needsGesture=true;}
  }
  function sync(){
   if(!enabled()){wanted=false;pending=null;music.pause();stopStone();return;}
   if(!wanted){wanted=true;needsGesture=false;}connect();playMusic();
  }
  function gesture(){
   if(!enabled())return;
   options.unlock?.();connect(true);needsGesture=false;wanted=true;
   const ctx=graph?.ctx;if(ctx&&ctx.state!=='running')try{Promise.resolve(ctx.resume()).catch(()=>{});}catch(_){}
   playMusic();
  }
  function turn(duration=1600){
   if(!enabled())return;
   gesture();stopStone();const id=++turnId;
   try{stone.currentTime=0;stone.playbackRate=Number.isFinite(stone.duration)?Math.max(.5,Math.min(2.5,stone.duration/(duration/1000))):1;Promise.resolve(stone.play()).then(()=>{if(!enabled())stone.pause();},()=>{});}catch(_){}
   stopTimer=setTimeout(()=>{if(id===turnId)stopStone();},duration+40);
  }
  function dispose(){
   if(dead)return;dead=true;wanted=false;pending=null;clearInterval(watch);stopStone();music.pause();
   graph?.nodes.forEach(n=>{try{n.disconnect()}catch(_){}});graph=null;
   if(owned)try{Promise.resolve(owned.close()).catch(()=>{});}catch(_){}
  }
  if(options.watch!==false){watch=setInterval(sync,250);watch.unref?.();}sync();
  return {gesture,sync,turn,dispose};
 }
 return {create};
});
