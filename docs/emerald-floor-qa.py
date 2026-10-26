"""Real production-scene stale-frame recovery checks; no accounts or Firebase."""
from pathlib import Path
import re,subprocess
root=Path(__file__).resolve().parents[1];out=root/'.preview/qa';out.mkdir(parents=True,exist_ok=True)
runner='''
openEmerald();EM.pz=4.2;
document.querySelectorAll('[data-pose]').forEach(b=>b.onclick=()=>{[EM.px,EM.pz]=JSON.parse(b.dataset.pose);});
const waitFrame=()=>new Promise(requestAnimationFrame);
document.querySelector('#stress').onclick=async()=>{
 const log=document.querySelector('#log'),cv=document.querySelector('#emCv'),g=cv.getContext('2d');log.textContent='RUNNING';
 try{const poses=[[0,2],[-4.75,8.8],[18.6,22],[-18.6,55],[0,88],[0,102],[-3.2,108],[0,2]];
 for(let i=0;i<poses.length;i++){
  [EM.px,EM.pz]=poses[i];await waitFrame();await waitFrame();
  const hh=Math.floor(cv.height*.36),reference=g.getImageData(0,0,cv.width,hh).data.slice();
  g.setTransform(1,0,0,1,0,0);g.globalAlpha=1;g.globalCompositeOperation='source-over';g.fillStyle='#FF00FF';g.fillRect(0,0,cv.width,hh);
  g.beginPath();g.rect(0,0,12,12);g.clip();g.setTransform(1,0,0,1,23,17);g.globalAlpha=.15;g.globalCompositeOperation='xor';g.filter='blur(7px)';
  await waitFrame();await waitFrame();const actual=g.getImageData(0,0,cv.width,hh).data;let different=0;
  for(let j=0;j<actual.length;j++)if(actual[j]!==reference[j])different++;
  if(different)throw Error('pose '+(i+1)+' stale pixel channels: '+different);
  log.textContent+='\\nPASS pose '+(i+1)+' fresh sky/canopy pixels after stale clip, transform, alpha and pixels';
 }log.textContent+='\\nCOMPLETE 8/8';[EM.px,EM.pz]=[0,4.2];
 }catch(e){log.textContent+='\\nFAILED '+e.message;}
};
addEventListener('error',e=>document.querySelector('#errors').textContent=e.message);
'''
for mode,source in [('before',subprocess.check_output(['git','show','a753cd8:index.html'],cwd=root).decode()),('after',(root/'index.html').read_text())]:
 def fn(name):
  a=source.index('function '+name+'(');return source[a:source.index('\n}',a)+2]
 zones=source[source.index('const ZONES ='):source.index('// V8.2：')]
 drawing=source[source.index('function lerpC('):source.index('function mapMiniTrees')]
 styles='\n'.join(re.findall(r'<style[^>]*>([\s\S]*?)</style>',source.split('</head>')[0]))
 html='''<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base href="/"><title>Emerald floor '''+mode+'''</title><style>'''+styles+'''</style><style>
 body{margin:0;background:#e6e9dd}#controls{display:flex;gap:6px;padding:8px;flex-wrap:wrap}#controls button{font-size:13px;padding:6px}#emOv{position:relative!important;width:390px!important;height:844px!important;max-width:100vw;margin:4px auto;inset:auto!important}#log{white-space:pre-wrap;font:12px monospace;margin:4px}#errors{color:red}.em-tip{display:none!important}
 </style><div id="controls"><button data-pose="[0,4.2]">走道與搬運車</button><button data-pose="[-4.75,8.8]">排間抑草席與連續土帶</button><button data-pose="[0,108]">中央盡頭</button><button id="stress">殘影壓力檢查</button></div><div id="errors"></div><pre id="log">Ready</pre><script>
 const $=s=>document.querySelector(s),EM_LEN=110,EM_ZL=22;let EM=null,curZone=null;
 const P={daily:{tapped:{z6:[0,1,2,3,4,5,6,7,8,9]}},pass:{best:{pick:100}}};
 const stamina=()=>15,closeSheet=()=>{},renderAll=()=>{},toast=()=>{},tapTree=()=>{};
 function emAvatarImg(){return new Image();}
 '''+zones+drawing+fn('openEmerald')+runner+'</script></html>'
 (out/('emerald-floor-'+mode+'.html')).write_text(html)
print('Prepared baseline/candidate real-scene stale-state recovery checks')
