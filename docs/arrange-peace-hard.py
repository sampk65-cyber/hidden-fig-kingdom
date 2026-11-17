"""Rebuild only Moment of Peace's advanced chart from its committed 45-second MP3.
The original easy/medium data is preserved. No randomness or audio edits.
"""
from pathlib import Path
import hashlib, importlib.util, json, subprocess
import numpy as np
from scipy import signal

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('rhythm_grid',ROOT/'docs/analyze-rhythm-grid.py')
grid=importlib.util.module_from_spec(spec);spec.loader.exec_module(grid)
FILE='mickeyscat-moment-of-peace-mickeyscat-554494-45.mp3'

def arrange(data,audio):
    raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(audio),'-ac','1','-ar',str(grid.SR),'-f','f32le','pipe:1'])
    y=np.frombuffer(raw,dtype='<f4');assert len(y)==45*grid.SR
    t,bands,env=grid.envelope(y)
    peaks,_=signal.find_peaks(env,distance=round(.09*grid.SR/grid.HOP),prominence=.07)
    attacks=t-grid.HOP/grid.SR/2
    def near(target,window):
        p=peaks[np.abs(attacks[peaks]-target)<=window]
        if not len(p):return None
        return int(p[np.argmax(env[p]*np.exp(-.5*((attacks[p]-target)/.04)**2))])
    def entry(p,step,kind,lane=None):
        return {'t':round(float(attacks[p]),4),'step':step,'kind':kind,'lane':lane,
                'strength':round(float(env[p]),4),'bands':np.round(bands[:,p],4).tolist(),'frame':p}
    old=data['beats'];main=[];candidates=[]
    for at,lane,weight,step in old:
        p=near(at,.085)
        if p is None:continue
        e=entry(p,step,'anchor' if step%2==0 else 'beat',lane if step%2==0 else None)
        main.append(e)
        if e['kind']=='beat':candidates.append(e)
    anchors=[e for e in main if e['kind']=='anchor' and 2.6<=e['t']<=44.5]
    for a,b in zip(main,main[1:]):
        p=near((a['t']+b['t'])/2,.05)
        if p is not None:
            local=env[(t>=a['t']-2)&(t<=a['t']+2)]
            if env[p]>=max(.30,float(np.quantile(local,.70))):
                candidates.append(entry(p,a['step']+.5,'subdivision'))
    candidates=[e for e in candidates if 2.6<=e['t']<=44.5]
    # Sixteen pulse phrases (~6 seconds) follow the recording's dynamic build.
    phrases=sorted(set(e['step']//16 for e in main));energy={}
    for phrase in phrases:
        ts=[e['t'] for e in main if e['step']//16==phrase]
        clip=y[int(min(ts)*grid.SR):int(min(45,max(ts)+.37)*grid.SR)]
        energy[phrase]=float(np.sqrt(np.mean(clip*clip)))
    low,high=min(energy.values()),max(energy.values());chosen=list(anchors);sections=[]
    for phrase in phrases:
        pool=[e for e in candidates if e['step']//16==phrase]
        coverage=sum(e['step']//16==phrase for e in main)/16
        budget=max(2,round((6+4*(energy[phrase]-low)/max(high-low,1e-8))*coverage))
        # Strong attacks earn extra notes; weaker spaces remain rests. Slight
        # subdivision preference exposes audible syncopation instead of a metronome.
        for e in sorted(pool,key=lambda e:e['strength']*(1.12 if e['kind']=='subdivision' else 1),reverse=True):
            if budget==0:break
            if all(abs(e['t']-x['t'])>=.145 for x in chosen):chosen.append(e);budget-=1
        sections.append({'phrase':int(phrase),'rms':round(energy[phrase],5)})
    chosen.sort(key=lambda e:e['t']);counts=[0,0,0];lanes=[]
    for i,e in enumerate(chosen):
        if e['lane'] is None:
            valid=[l for l in range(3) if all(x['lane']!=l or abs(e['t']-x['t'])>=.24 for x in chosen if x['lane'] is not None)]
            assert valid
            spectral=np.array(e['bands']);spectral/=max(float(spectral.max()),1e-8)
            def score(l):
                repeat=.9 if lanes and l==lanes[-1] else 0
                cycle=1.1 if len(lanes)>=3 and l==lanes[-3] else 0
                sequence=lanes+[l]
                # Avoid replacing the old 3-lane loop with a different short loop.
                for period in range(2,9):
                    run=0
                    for j in range(len(sequence)-1,period-1,-1):
                        if sequence[j]!=sequence[j-period]:break
                        run+=1
                    cycle+=max(0,run-2)*.75
                if len(sequence)>=8 and any(sequence[-4:]==sequence[j:j+4] for j in range(max(0,len(sequence)-18),len(sequence)-4)):
                    cycle+=1.2
                balance=.06*counts[l]
                return float(spectral[l])-repeat-cycle-balance
            e['lane']=max(valid,key=score)
        lanes.append(e['lane']);counts[e['lane']]+=1
    beats=[[e['t'],e['lane'],e['strength'],i] for i,e in enumerate(chosen)]
    pulses=[e['t'] for e in main]
    for section in sections:
        notes=[e for e in chosen if e['step']//16==section['phrase']]
        section.update(start=round(min(e['t'] for e in main if e['step']//16==section['phrase']),4),notes=len(notes),lanes=''.join(str(e['lane']) for e in notes))
    report={'audio_sha256':hashlib.sha256(audio.read_bytes()).hexdigest(),'seconds':45,
            'original_hard_notes':sum(2.6<=b[0]<=44.5 for b in old),'new_hard_notes':len(beats),
            'anchor_notes':len(anchors),'subdivision_notes':sum(e['kind']=='subdivision' for e in chosen),
            'lane_counts':counts,'period_three_match':round(float(np.mean(np.array(lanes[3:])==lanes[:-3])),4),
            'min_interval':round(float(min(np.diff([b[0] for b in beats]))),4),'sections':sections,
            'notes':[{k:v for k,v in e.items() if k!='frame'} for e in chosen]}
    return beats,pulses,report

if __name__=='__main__':
    path=ROOT/'rhythm45/beatmaps.json';maps=json.loads(path.read_text())
    beats,pulses,report=arrange(maps[FILE],ROOT/'rhythm45/audio'/FILE)
    maps[FILE]['hardBeats']=beats;maps[FILE]['hardPulses']=pulses
    path.write_text(json.dumps(maps,separators=(',',':'))+'\n')
    (ROOT/'docs/peace-hard-analysis.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({k:v for k,v in report.items() if k!='notes'},indent=2))
