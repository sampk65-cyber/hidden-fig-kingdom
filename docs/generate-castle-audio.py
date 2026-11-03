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
    # Original hymn-like 20-bar score, 4/4 at 60 BPM. Bell theme answers a
    # sustained vowel choir; harp figures leave room around the melody.
    length=80;out=np.zeros((RATE*length,2),np.float64)
    def add(note,start,duration,volume,pan=0,kind='bell'):
        t=np.arange(round(RATE*duration))/RATE;f=midi(note)
        if kind=='choir':
            phase=2*np.pi*f*(t+.00055*np.sin(2*np.pi*4.7*t+.4))
            y=np.zeros_like(t)
            for k in range(1,17):
                freq=f*k
                formant=.14+1.1*np.exp(-((freq-760)/290)**2)+.6*np.exp(-((freq-1180)/360)**2)+.14*np.exp(-((freq-2500)/550)**2)
                y+=np.sin(k*phase)/(k**1.1)*formant
            y*=np.minimum(t/1.25,1)*np.minimum((duration-t)/1.8,1)
            y*=.78+.08*np.sin(2*np.pi*.23*t)
        elif kind=='harp':
            y=sum(amp*np.sin(2*np.pi*f*k*t)*np.exp(-t/(1.6/k**.45)) for k,amp in [(1,1),(2,.24),(3,.09),(4,.025)])
            y*=np.minimum(t/.012,1)*np.minimum((duration-t)/.25,1)
        else:
            # Fewer sharp inharmonic partials, softened attack and longer tail.
            y=sum(amp*np.sin(2*np.pi*f*k*t)*np.exp(-t/decay) for k,amp,decay in [(1,1,3.8),(2,.16,2.4),(3.01,.045,1.7),(4.02,.015,.8)])
            y*=np.minimum(t/.035,1)*np.minimum((duration-t)/.5,1)
        y*=volume
        taps=[(0,1,1),(.113,.14,-1),(.29,.12,1),(.53,.11,-1),(.89,.10,1),(1.37,.085,-1),(1.91,.065,1),(2.63,.045,-1),(3.41,.026,1)]
        for delay,amp,flip in taps:
            ix=(np.arange(len(t))+round((start+delay)*RATE))%len(out)
            for ch,gain in enumerate([np.sqrt((1-pan*flip)/2),np.sqrt((1+pan*flip)/2)]):out[ix,ch]+=y*amp*gain
    chords=[[50,57,62,66],[43,55,59,62],[47,54,59,62],[45,57,61,64],
            [54,57,62,66],[43,55,59,62],[40,55,59,64],[45,57,62,64],
            [50,57,62,66],[54,57,61,66],[43,55,59,62],[45,57,61,64],
            [47,54,59,62],[43,55,59,62],[40,55,59,64],[45,57,61,64],
            [50,57,62,67],[50,57,62,66],[43,55,59,62],[50,57,62,66]]
    melody=[[74,78],[79,78],[74,71],[73,76],[78,81],[79,78],[76,74],[73,0],
            [74,78],[81,78],[79,83],[81,76],[78,81],[79,78],[76,79],[81,85],
            [86,81],[78,74],[79,78],[74,0]]
    for bar,chord in enumerate(chords):
        for k,n in enumerate(chord):add(n,bar*4,6.5,.105,(-.45 if k%2 else .45),'choir')
        for beat,n in enumerate(melody[bar]):
            if n:add(n,bar*4+beat*2,7,.14,(-.22 if beat%2 else .22))
        # Gentle rising harp, with an occasional upper response note.
        order=[0,1,2,3,2,1] if bar%2==0 else [0,2,1,3]
        for j,k in enumerate(order):add(chord[k]+12,bar*4+.5+j*.5,3.5,.043,(k-1.5)*.27,'harp')
    out=np.tanh(out*.8);out*=.70/np.max(np.abs(out));encode(out,'castle-crystal.mp3')

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

if __name__=='__main__':crystal()  # Keep the approved stone effect unchanged.
