"""Reproduce fixed charts from the final encoded 45-second jazz excerpts.
Uses the existing tested spectral-flux envelope and adaptive beat tracker.
Every target is a detected acoustic attack; swing offbeats use the measured
long-short subdivision instead of forcing all recordings to straight eighths.
"""
from pathlib import Path
import hashlib, importlib.util, json, subprocess
import numpy as np
from scipy import signal

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('rhythm_grid',ROOT/'docs/analyze-rhythm-grid.py')
grid=importlib.util.module_from_spec(spec);spec.loader.exec_module(grid)
# Priors selected by whole-excerpt tempo/phase/subdivision coherence scans.
TRACKS=[
 ('usefulpix-round-midnight-in-nyc-139545',90,.5),
 ('sergequadrado-cinematic-jazz-16587',85.1,.5),
 ('geoffharvey-sunny-morning-jazz-178472',80,.5),
 ('sergequadrado-mystical-thing-21569',120,.5),
 ('paoloargento-the-best-jazz-club-in-new-orleans-164472',133.9,2/3),
 ('monument_music-soothing-moments-178951',120,.5),
 ('music_for_videos-a-jazz-piano-110481',72.5,.5),
 ('music_for_videos-jazz-trio-165265',70,.5),
]

def extract_entries(t,bands,env,pulses,bpm,swing,duration):
    peaks,_=signal.find_peaks(env,distance=round(.09*grid.SR/grid.HOP),prominence=.07)
    entries=[];used=set();offsets=[]
    for i,pulse in enumerate(pulses):
        q=pulses[i+1]-pulse if i+1<len(pulses) else 60/bpm
        for half,fraction in [(0,0),(1,swing)]:
            target=pulse+q*fraction
            if target>duration-.12:continue
            near=peaks[np.abs(t[peaks]-target)<=min(.055,q*.13)]
            local=env[max(0,int((target-2)*grid.SR/grid.HOP)):min(len(env),int((target+2)*grid.SR/grid.HOP))]
            threshold=max(.12,float(np.quantile(local,.65))*.65) if len(local) else .12
            near=near[env[near]>=threshold]
            if not len(near):continue
            peak=int(near[np.argmax(env[near]*np.exp(-.5*((t[near]-target)/.025)**2))])
            if peak in used:continue
            used.add(peak)
            onset=max(0,float(t[peak]-grid.HOP/grid.SR/2))
            if onset>=duration-.12:continue
            entries.append([round(onset,4),int(np.argmax(bands[:,peak])),round(float(env[peak]),4),i*2+half])
            offsets.append(abs(onset-target))
    entries.sort(key=lambda e:e[0])
    return entries,offsets

def analyze(file,bpm,swing):
    raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(file),'-ac','1','-ar',str(grid.SR),'-f','f32le','pipe:1'])
    y=np.frombuffer(raw,dtype='<f4');assert len(y)==45*grid.SR
    t,bands,env=grid.envelope(y);pulses,frames=grid.track_pulses(t,env,bpm)
    # Put the easy alternating motif on the stronger recurring beat phase.
    if np.mean(env[frames[1::2]])>np.mean(env[frames[::2]])*1.03:pulses=pulses[1:]
    entries,offsets=extract_entries(t,bands,env,pulses,bpm,swing,45)
    on_main={e[3]//2:e[0] for e in entries if e[3]%2==0}
    visual=[round(on_main.get(i,max(0,float(v)-grid.HOP/grid.SR/2)),4) for i,v in enumerate(pulses) if v<45]
    counts=[sum(2.6<=e[0]<=44.5 and e[3]%n==0 for e in entries) for n in [4,2,1]]
    assert counts[0]>=10 and counts[0]<counts[1]<counts[2],(file.name,counts)
    report={'file':file.name,'audio_sha256':hashlib.sha256(file.read_bytes()).hexdigest(),
      'source_start_seconds':0,'decoded_seconds':len(y)/grid.SR,'bpm_prior':bpm,'offbeat_fraction':round(swing,4),
      'median_bpm':round(float(60/np.median(np.diff(visual))),2),'note_counts':counts,
      'max_attack_to_tracked_grid_ms':round(max(offsets)*1000,2),'rms':round(float(np.sqrt(np.mean(y*y))),4)}
    return {'duration':45,'bpm_estimate':bpm,'beats':entries,'pulses':visual},report

if __name__=='__main__':
    maps={};reports=[]
    for stem,bpm,swing in TRACKS:
        file=ROOT/'rhythm-jazz45/audio'/(stem+'-45.mp3')
        data,report=analyze(file,bpm,swing);maps[file.name]=data;reports.append(report)
        print(json.dumps(report),flush=True)
    (ROOT/'rhythm-jazz45/beatmaps.json').write_text(json.dumps(maps,separators=(',',':'))+'\n')
    (ROOT/'docs/jazz45-analysis.json').write_text(json.dumps(reports,indent=2)+'\n')
