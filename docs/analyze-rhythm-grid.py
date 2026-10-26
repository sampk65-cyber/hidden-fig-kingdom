"""Analyze the committed MP3 PCM; regenerate fixed musical charts without editing audio.
Python 3 + NumPy + SciPy + FFmpeg. Run from any directory. --write updates only
recorded song timing fields in index.html and writes the reproducible report.
Onsets are not a complete score transcription; beat/meter octave is reviewed below.
"""
from pathlib import Path
import argparse, hashlib, json, re, subprocess
import numpy as np
from scipy import signal, ndimage
ROOT=Path(__file__).resolve().parents[1]
SR,HOP=22050,128
# Whole-excerpt quarter/eighth phase coherence, with percussion cadence reviewed.
# Thunder's 145/72.5 octave ambiguity uses 145 for a playable quarter-note pulse.
TEMPOS={'wulin':130,'cloud-drums':94,'wind-claps':100,'thunder-stomp':145,
        'moon-alone':82,'neon-faultline':103,'your-journey':95.75,
        'shining-you':128,'unspoken-echoes':96,'lucky-walk':88,'hear-me':132}
def envelope(y):
    f,t,z=signal.stft(y,SR,nperseg=1024,noverlap=1024-HOP,boundary='zeros')
    mag=np.abs(z);bands=[]
    for lo,hi in [(35,220),(220,2200),(2200,10000)]:
        a=np.log1p(mag[(f>=lo)&(f<hi)]*100)
        v=np.maximum(0,np.diff(a,axis=1,prepend=a[:,:1])).mean(axis=0)
        v=np.maximum(0,v-ndimage.median_filter(v,size=31)*.6)
        bands.append(v/max(np.quantile(v,.95),1e-8))
    bands=np.array(bands);env=.5*bands[0]+.35*bands[1]+.15*bands[2]
    return t,bands,env

def tempo_candidates(t,env,duration):
    """Quarter/eighth coherence scan; useful when reviewing tempo octave ambiguity."""
    smooth=ndimage.gaussian_filter1d(env,1);results=[]
    for bpm in np.arange(70,161,.1):
        q=60/bpm;phases=np.arange(0,q,HOP/SR);n=np.arange(0,int(duration/q)-1)
        grid=phases[:,None]+n*q;main=np.interp(grid,t,smooth);half=np.interp(grid+q/2,t,smooth)
        score=(np.mean(np.minimum(main,2),axis=1)+.5*np.mean(np.minimum(half,2),axis=1))*(.6+.4*np.mean(main>.3,axis=1))
        i=int(np.argmax(score));results.append((float(score[i]),round(float(bpm),1),round(float(phases[i]),4)))
    picked=[]
    for item in sorted(results,reverse=True):
        if not any(abs(item[1]-v[1])<3 for v in picked):picked.append(item)
        if len(picked)==5:break
    return picked

def track_pulses(t,env,bpm):
    # Dynamic-programming beat tracker: reward attacks and penalize abrupt
    # period changes; unlike a fixed BPM grid, each beat follows actual timing.
    period=60/bpm/(HOP/SR)
    smooth=ndimage.gaussian_filter1d(env,1)
    reward=np.minimum(smooth,2.5)/max(np.std(smooth),.1)
    delays=np.arange(int(.8*period),int(1.2*period)+1)
    penalty=-180*np.log(delays/period)**2
    scores=np.zeros(len(t));back=np.full(len(t),-1,dtype=int)
    for i in range(len(t)):
        prev=i-delays;valid=prev>=0
        if np.any(valid):
            choices=scores[prev[valid]]+penalty[valid]
            k=int(np.argmax(choices));best=choices[k]
            if best>0: scores[i]=best;back[i]=prev[valid][k]
        scores[i]+=reward[i]
    tail=np.arange(max(0,len(t)-int(1.1*period)),len(t))
    at=int(tail[np.argmax(scores[tail])]);frames=[]
    while at>=0:frames.append(at);at=back[at]
    frames=np.array(frames[::-1]);return t[frames],frames

def analyze(song):
    source=ROOT/song['audio'];raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(source),'-ac','1','-ar',str(SR),'-f','f32le','pipe:1'])
    y=np.frombuffer(raw,dtype='<f4');t,bands,env=envelope(y);bpm=TEMPOS[song['id']]
    pulses,frames=track_pulses(t,env,bpm)
    # Start the two-beat easy motif on the stronger recurring percussion phase.
    parity=[np.mean(env[frames[k::2]]) for k in [0,1]]
    if parity[1]>parity[0]*1.03:pulses=pulses[1:];frames=frames[1:]
    peaks,_=signal.find_peaks(env,distance=int(.09*SR/HOP),prominence=.07)
    # Retain only actual spectral attacks near a beat or half beat. No silent
    # metronome notes, no global loudness ranking. Local noise gate adapts to mix.
    entries=[];used=set();offsets=[]
    for i,pulse in enumerate(pulses):
        q=pulses[i+1]-pulse if i+1<len(pulses) else 60/bpm
        for half in [0,1]:
            target=pulse+q*half/2
            if target>song['duration']-.12:continue
            nearby=peaks[np.abs(t[peaks]-target)<=min(.055,q*.11)]
            if not len(nearby):continue
            local=env[max(0,int((target-2)*SR/HOP)):int((target+2)*SR/HOP)]
            threshold=max(.12,float(np.quantile(local,.65))*.65)
            nearby=nearby[env[nearby]>=threshold]
            if not len(nearby):continue
            rank=env[nearby]*np.exp(-.5*((t[nearby]-target)/.025)**2)
            peak=int(nearby[np.argmax(rank)])
            if peak in used:continue
            used.add(peak)
            # Centre-window spectral attack reaches its maximum just after
            # onset. Half a hop removes that analysis bias (2.9 ms at 22.05 kHz).
            onset=max(0,float(t[peak]-HOP/SR/2))
            if onset>=song['duration']-.12:continue
            lane=int(np.argmax(bands[:,peak]))
            entries.append([round(onset,4),lane,round(float(env[peak]),4),i*2+half])
            offsets.append(abs(onset-target))
    # Main-pulse flash uses the exact same measured attack as fruit on that beat.
    by_step={e[3]:e[0] for e in entries}
    pulses=[round(by_step.get(i*2,max(0,float(v)-HOP/SR/2)),4) for i,v in enumerate(pulses) if v<song['duration']]
    counts=[sum(e[0]>=2.6 and e[0]<=song['duration']-.5 and e[3]%n==0 for e in entries) for n in [4,2,1]]
    intervals=np.diff(pulses)
    # Old greedy chart, measured against this pulse train, for comparison only.
    old=[]
    for e in sorted(song['beats'],key=lambda e:-e[2]):
        if 2.6<=e[0]<=song['duration']-.5 and all(abs(n-e[0])>=.76 for n in old):old.append(e[0])
    old_errors=[min(abs(np.array(pulses)-v)) for v in old]
    report={'id':song['id'],'audio_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'tempo_prior':bpm,
       'median_bpm':round(float(60/np.median(intervals)),2),'pulse_count':len(pulses),'counts':counts,
       'max_grid_offset_ms':round(max(offsets)*1000,2),'old_easy_within_45ms_of_measured_pulse_pct':round(100*np.mean(np.array(old_errors)<.045),1),
       'new_easy_within_45ms_of_measured_pulse_pct':round(100*np.mean([min(abs(np.array(pulses)-e[0]))<.045 for e in entries if 2.6<=e[0]<=song['duration']-.5 and e[3]%4==0]),1),'pulse_interval_p10_p90':np.round(np.quantile(intervals,[.1,.9]),4).tolist()}
    return {'bpm':bpm,'beats':entries,'pulses':pulses},report

def catalog(html):
    a=html.index('const RHY_SONGS =');b=html.index('// Sixteenth-note grid.',a)
    script=html[a:b]+';console.log(JSON.stringify(RHY_SONGS.filter(s=>s.audio)))'
    return json.loads(subprocess.check_output(['node','-e',script]))

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--write',action='store_true');parser.add_argument('--scan-tempo',action='store_true');args=parser.parse_args()
    html=(ROOT/'index.html').read_text();songs=catalog(html);reports=[]
    baseline={s['id']:s for s in catalog(subprocess.check_output(['git','show','a753cd8ced8432930e29332fcc4d388741d74119:index.html'],cwd=ROOT).decode())}
    for song in songs:
        if args.scan_tempo:
            raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(ROOT/song['audio']),'-ac','1','-ar',str(SR),'-f','f32le','pipe:1'])
            t,_,env=envelope(np.frombuffer(raw,dtype='<f4'))
            print(song['id'],tempo_candidates(t,env,song['duration']),flush=True)
        data,report=analyze(baseline[song['id']]);reports.append(report)
        print(json.dumps(report,ensure_ascii=False),flush=True)
        if args.write:
            updated={**song,**data}
            lines=html.splitlines(keepends=True)
            matches=[i for i,line in enumerate(lines) if line.lstrip().startswith(("{id:'"+song['id']+"'",'{"id":"'+song['id']+'"'))]
            if len(matches)!=1:raise ValueError('recorded song replacement is ambiguous')
            lines[matches[0]]='  '+json.dumps(updated,ensure_ascii=False,separators=(',',':'))+',\n'
            html=''.join(lines)
    if args.write:
        (ROOT/'index.html').write_text(html)
        (ROOT/'docs/rhythm-grid-analysis.json').write_text(json.dumps(reports,indent=2,ensure_ascii=False)+'\n')
if __name__=='__main__':main()
