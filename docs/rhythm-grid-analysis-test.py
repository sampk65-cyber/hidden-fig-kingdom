"""Independent known-timing audio fixtures for the offline beat tracker."""
import importlib.util, unittest
from pathlib import Path
import numpy as np
p=Path(__file__).with_name('analyze-rhythm-grid.py')
spec=importlib.util.spec_from_file_location('grid',p);grid=importlib.util.module_from_spec(spec);spec.loader.exec_module(grid)
class AudioBeatTests(unittest.TestCase):
    def render(self,times,duration):
        y=np.zeros(round(duration*grid.SR));rng=np.random.default_rng(17)
        for i,start in enumerate(times):
            a=round(start*grid.SR);n=min(round(.14*grid.SR),len(y)-a);t=np.arange(n)/grid.SR
            hit=np.sin(2*np.pi*(85*t-60*t*t))*np.exp(-t*28)+rng.normal(size=n)*np.exp(-t*100)*.2
            y[a:a+n]+=hit
        return y
    def test_measured_attacks_recover_known_audio_onsets(self):
        expected=np.arange(.125,18,.5);t,bands,env=grid.envelope(self.render(expected,18.5))
        measured,_=grid.track_pulses(t,env,120)
        kept=measured[(measured>.2)&(measured<17.8)]
        errors=[min(abs(expected-at)) for at in kept]
        self.assertGreater(len(kept),30)
        self.assertLess(max(errors),.020)
    def test_tracker_follows_gradual_tempo_change_without_end_drift(self):
        times=[.125]
        for q in np.linspace(.515,.485,70):times.append(times[-1]+q)
        t,bands,env=grid.envelope(self.render(times,times[-1]+.4));measured,_=grid.track_pulses(t,env,120)
        for at in times[2:-2]:self.assertLess(min(abs(measured-at)),.020)
    def test_silence_has_no_acoustic_attacks(self):
        t,bands,env=grid.envelope(np.zeros(grid.SR*5))
        self.assertEqual(float(np.max(env)),0)
if __name__=='__main__':unittest.main()
