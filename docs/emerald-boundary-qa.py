"""Build isolated real-scene previews without Firebase, accounts or persistent writes."""
from pathlib import Path
import re, subprocess
root=Path(__file__).resolve().parents[1]
out=root/'.preview/qa';out.mkdir(parents=True,exist_ok=True)
for mode,source in [('before',subprocess.check_output(['git','show','e4099f8:index.html'],cwd=root).decode()),('after',(root/'index.html').read_text())]:
 def fn(name):
  a=source.index('function '+name+'(');return source[a:source.index('\n}',a)+2]
 zones=source[source.index('const ZONES ='):source.index('// V8.2：')]
 drawing=source[source.index('function lerpC('):source.index('function mapMiniTrees')]
 styles='\n'.join(re.findall(r'<style[^>]*>([\s\S]*?)</style>',source.split('</head>')[0]))
 runner='''
 const QA={maxZ:0,count:0,width:1};const drawOriginal=drawFigTree;
 drawFigTree=function(...args){QA.maxZ=Math.max(QA.maxZ,args[3]);QA.count++;QA.width=args[9]||1;return drawOriginal(...args);};
 const positions={entrance:[0,2],last:[0,88],near:[0,104],centre:[0,108],left:[-15.25,108],right:[15.25,108]};
 document.querySelectorAll('[data-pos]').forEach(b=>b.onclick=()=>{const [x,z]=positions[b.dataset.pos];EM.px=x;EM.pz=z;QA.maxZ=0;QA.count=0;document.querySelector('#view').textContent=b.textContent;});
 openEmerald();
 setInterval(()=>{document.querySelector('#stats').textContent='相機 x='+EM.px.toFixed(2)+' z='+EM.pz.toFixed(2)+'；最遠樹 z='+QA.maxZ.toFixed(2)+'；樹寬倍率 '+QA.width.toFixed(3);},250);
 addEventListener('error',e=>document.querySelector('#errors').textContent=e.message);
 '''
 html='''<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base href="/"><title>Emerald '''+mode+'''</title><style>'''+styles+'''</style><style>
 body{background:#e8e8df;color:#224938}#controls{position:relative;z-index:20000;display:flex;gap:5px;flex-wrap:wrap;padding:5px}#controls button{font-size:14px;padding:6px}#emOv{position:relative!important;width:390px!important;height:844px!important;max-width:100vw;margin:5px auto;inset:auto!important}#stats,#view,#errors{font:13px monospace;text-align:center;position:relative;z-index:20000}#errors{color:red}
 </style><div id="controls"><button data-pos="entrance">入口</button><button data-pos="last">最後一區</button><button data-pos="near">接近盡頭</button><button data-pos="centre">中央盡頭</button><button data-pos="left">左側盡頭</button><button data-pos="right">右側盡頭</button></div><div id="view">入口</div><div id="stats"></div><div id="errors"></div><script>
 const $=s=>document.querySelector(s),EM_LEN=110,EM_ZL=22;let EM=null,curZone=null;
 const P={daily:{tapped:{z6:[]}},pass:{best:{pick:100}}};
 const stamina=()=>15,closeSheet=()=>{},renderAll=()=>{},toast=()=>{},tapTree=()=>{};
 function emAvatarImg(){const im=new Image();return im;}
 '''+zones+drawing+fn('openEmerald')+runner+'</script></html>'
 (out/('emerald-'+mode+'.html')).write_text(html)
print('Prepared before/after emerald scenes from production source')
