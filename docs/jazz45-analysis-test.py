"""Known-timing signals independently check the emitted straight/swing attacks."""
import importlib.util,unittest
from pathlib import Path
import numpy as np
spec=importlib.util.spec_from_file_location('jazz',Path(__file__).with_name('analyze-jazz45.py'))
jazz=importlib.util.module_from_spec(spec);spec.loader.exec_module(jazz)
class JazzTimingTests(unittest.TestCase):
    def render(self,times,duration):
        sr=jazz.grid.SR;y=np.zeros(round(duration*sr));rng=np.random.default_rng(18)
        for start in times:
            a=round(start*sr);n=min(round(.12*sr),len(y)-a);t=np.arange(n)/sr
            y[a:a+n]+=np.sin(2*np.pi*110*t)*np.exp(-t*35)+rng.normal(size=n)*np.exp(-t*120)*.4
        return y
    def test_straight_and_swing_targets_stay_on_actual_attacks(self):
        for fraction in [.5,2/3]:
            pulses=np.arange(.2,15,.6);expected=np.array(sorted([v for p in pulses for v in [p,p+.6*fraction] if v<15.5]))
            t,b,e=jazz.grid.envelope(self.render(expected,16))
            notes,_=jazz.extract_entries(t,b,e,pulses,100,fraction,16)
            self.assertGreater(len(notes),45)
            for note in notes:self.assertLess(min(abs(expected-note[0])),.02)
            for at in expected[2:-2]:self.assertLess(min(abs(np.array([n[0] for n in notes])-at)),.02)
    def test_silence_never_generates_notes(self):
        t,b,e=jazz.grid.envelope(np.zeros(5*jazz.grid.SR))
        notes,_=jazz.extract_entries(t,b,e,np.arange(.2,5,.5),120,2/3,5)
        self.assertEqual(notes,[])
if __name__=='__main__':unittest.main()
