"""Original procedural score/effect. No third-party recordings. numpy + ffmpeg."""
from pathlib import Path
import numpy as np
import subprocess, tempfile, wave

RATE=44100
ROOT=Path(__file__).resolve().parents[1]
def midi(n): return 440*2**((n-69)/12)
def encode(samples,name):
    samples=np.clip(samples,-.95,.95)
    with tempfile.NamedTemporaryFile(suffix='.wav') as f:
        with wave.open(f.name,'wb') as w:
            w.setnchannels(2);w.setsampwidth(2);w.setframerate(RATE)
            w.writeframes((samples*32767).astype('<i2').tobytes())
        subprocess.run(['ffmpeg','-y','-v','error','-i',f.name,'-codec:a','libmp3lame','-b:a','128k',str(ROOT/'audio'/name)],check=True)
    print(name,'seconds',len(samples)/RATE,'peak',round(float(np.max(np.abs(samples))),3),'rms',round(float(np.sqrt(np.mean(samples*samples))),3))

def crystal():
    length=64;out=np.zeros((RATE*length,2),np.float64)
    def add(note,start,duration,volume,pan=0,bell=True):
        t=np.arange(int(RATE*duration))/RATE;f=midi(note)
        if bell:
            y=sum(a*np.sin(2*np.pi*f*k*t)*np.exp(-t/d) for k,a,d in [(1,1,2.7),(2,.32,1.7),(2.756,.13,.7),(4.07,.05,.35)])
            y*=np.minimum(t/.018,1)
        else:
            y=(np.sin(2*np.pi*f*t)+.17*np.sin(2*np.pi*f*2*t))*(np.sin(np.pi*np.minimum(t/duration,1))**2)*.35
        y*=volume*np.minimum((duration-t)/.12,1)
        for delay,amp,flip in [(0,1,1),(.37,.2,-1),(.83,.13,1),(1.47,.07,-1)]:
            ix=(np.arange(len(t))+round((start+delay)*RATE))%len(out)
            for ch,gain in enumerate([np.sqrt((1-pan*flip)/2),np.sqrt((1+pan*flip)/2)]):out[ix,ch]+=y*amp*gain
    # A slow, original eight-bar D-major/add9 crystal melody. Each bar is eight seconds.
    chords=[[50,57,61,64],[47,54,57,62],[43,50,57,59],[45,52,57,61]]
    melody=[[74,78,81,85],[81,78,76,74],[71,74,78,81],[76,73,69,0],[78,81,86,85],[81,78,74,76],[79,78,74,71],[73,76,81,0]]
    for bar in range(8):
        for k,n in enumerate(chords[bar%4]):add(n,bar*8,9,.052,(-1 if k%2 else 1)*.35,False)
        for beat,n in enumerate(melody[bar]):
            if n:add(n,bar*8+beat*2,6,.19,(-.4 if beat%2 else .4))
        for k,n in enumerate(chords[bar%4][1:]):add(n+12,bar*8+1+k*2,4,.055,(k-1)*.5)
    out*=.68/np.max(np.abs(out));encode(out,'castle-crystal.mp3')

def stone():
    rng=np.random.default_rng(15211);t=np.arange(round(RATE*1.6))/RATE
    noise=rng.normal(0,1,len(t));f=np.fft.rfftfreq(len(t),1/RATE)
    spectrum=np.fft.rfft(noise)/(1+(f/370)**2);spectrum*=1-np.exp(-(f/42)**2)
    grit=np.fft.irfft(spectrum,n=len(t));grit/=np.max(np.abs(grit))
    envelope=np.minimum(t/.11,1)*np.minimum((1.6-t)/.24,1)
    friction=grit*(.57+.19*np.sin(2*np.pi*9*t)+.08*np.sin(2*np.pi*23*t))
    rumble=.17*np.sin(2*np.pi*(59*t-5*t*t))+.08*np.sin(2*np.pi*117*t)
    y=(friction+rumble)*envelope
    out=np.column_stack([y,np.roll(y,31)*.97]);out*=.77/np.max(np.abs(out));encode(out,'castle-stone.mp3')

if __name__=='__main__':crystal();stone()
