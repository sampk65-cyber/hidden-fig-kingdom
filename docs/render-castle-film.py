#!/usr/bin/env python3
"""Render the original Hidden Fig Kingdom welcome film.

Requirements: Python 3.10+, numpy, Pillow, ffmpeg (libx264/AAC), ffprobe.
Run from any directory:
  python docs/render-castle-film.py
Optional first import:
  python docs/render-castle-film.py --source /path/to/original-hall.png

The checked-in hall.webp is the source image. All animation and music are
procedural, deterministic (seed 20261027), and generated here. Nothing is fetched.
The source image is compressed, never painted over; light is composited per frame.
"""

from __future__ import annotations

import argparse
import json
import math
import subprocess
import tempfile
import wave
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageOps


W, H, FPS, DURATION = 540, 960, 24, 30
SEED = 20261027
ROOT = Path(__file__).resolve().parents[1]


def smooth(a, b, t):
    v = np.clip((t - a) / (b - a), 0.0, 1.0)
    return v * v * (3.0 - 2.0 * v)


def bezier(points, steps=110):
    p = np.asarray(points, dtype=np.float32)
    t = np.linspace(0, 1, steps, dtype=np.float32)[:, None]
    return (1 - t) ** 3 * p[0] + 3 * (1 - t) ** 2 * t * p[1] + 3 * (1 - t) * t ** 2 * p[2] + t ** 3 * p[3]


def path_mask(paths, width=2, blur=2.0):
    image = Image.new("L", (W, H))
    draw = ImageDraw.Draw(image)
    for path in paths:
        xy = [(float(x * W), float(y * H)) for x, y in path]
        draw.line(xy, fill=255, width=width, joint="curve")
    if blur:
        image = image.filter(ImageFilter.GaussianBlur(blur))
    return np.asarray(image, dtype=np.float32) / 255.0


def arch(apex, left_end, left_controls, foot_y=None):
    half = bezier([apex, *left_controls, left_end])
    if foot_y is not None:
        half = np.vstack((half, [[left_end[0], foot_y]]))
    other = half.copy()
    other[:, 0] = 1 - other[:, 0]
    return [half, other]


class Hall:
    def __init__(self, poster):
        self.base = np.asarray(ImageOps.fit(Image.open(poster).convert("RGB"), (W, H), method=Image.Resampling.LANCZOS), dtype=np.float32) / 255
        self.y, self.x = np.mgrid[0:H, 0:W].astype(np.float32)
        self.x /= W
        self.y /= H
        self.luma = self.base @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
        # Coordinates are registered to the original 940 x 1672 image.
        # Rose centre (0.500, 0.214); throne (0.500, 0.620).
        layouts = [
            arch((.5, .017), (.205, .210), ((.333, .033), (.220, .105)), .668),
            arch((.5, .109), (.291, .252), ((.385, .132), (.303, .181)), .524),
            arch((.5, .291), (.365, .431), ((.435, .325), (.365, .366)), .568),
            arch((.5, .347), (.403, .461), ((.452, .373), (.403, .415)), .604),
            arch((.5, .448), (.444, .513), ((.472, .463), (.444, .492)), .627),
        ]
        self.arches = [(path_mask(p, 2, 1.1), path_mask(p, 9, 9)) for p in layouts]
        self.vault = np.clip(sum(path_mask(p, 25, 10) for p in layouts), 0, 1)
        columns = []
        for x, y0, y1 in [(.071, .394, .73), (.205, .205, .668), (.313, .335, .654), (.374, .502, .640)]:
            columns.extend([[(x, y0), (x, y1)], [(1-x, y0), (1-x, y1)]])
        self.columns = path_mask(columns, 15, 12)
        self.column_edges = path_mask(columns, 2, 2)
        self.stone = np.clip(self.columns + sum(a[1] for a in self.arches) * .9, 0, 1)
        self.arch_space = np.clip(1 - np.abs(self.x-.5)/.5, 0, 1) * (1-smooth(.68, .77, self.y))
        rose_r = np.sqrt(((self.x-.5)/.127)**2+((self.y-.214)/.0714)**2)
        self.rose = np.exp(-rose_r**4 * .9)
        self.rose_ring = np.exp(-((rose_r-1.02)/.045)**2)
        self.rose_glow = np.exp(-rose_r**2 * .42)
        self.rose_angle = np.arctan2((self.y-.214)/.0714, (self.x-.5)/.127)
        self.rose_r = rose_r
        self.throne = np.exp(-(((self.x-.5)/.10)**2+((self.y-.610)/.055)**2)*1.7)
        self.floor = smooth(.677, .740, self.y)
        self.floor_perspective = (self.x-.5) / np.maximum(self.y-.64, .05)
        floor_paths = []
        for x in [.05,.16,.31,.69,.84,.95]:
            floor_paths.append([(.5+(x-.5)*.15, .686), (x, 1.02)])
        self.floor_edges = path_mask(floor_paths, 2, 3) * self.floor
        self.light_texture = .22 + .78 * self.luma
        self.beams = []
        for end_x in [-.15,.14,.31,.69,.86,1.15]:
            line_x = .5 + (end_x-.5) * (.66-self.y)/.66
            width = .008 + (.66-self.y).clip(0,.66)*.045
            self.beams.append(np.exp(-((self.x-line_x)/width)**2) * (1-smooth(.64,.70,self.y)))
        rng = np.random.default_rng(SEED)
        self.particles = [(float(rng.uniform(.08,.92)), float(rng.uniform(.07,.95)), float(rng.uniform(.004,.012)), float(rng.uniform(0,2*math.pi)), float(rng.uniform(5.0,10.0)), float(rng.uniform(.5,1.25))) for _ in range(100)]

    def frame(self, t):
        x, y = self.x, self.y
        warm = float(smooth(12,21,t))
        finale = float(smooth(23,27.5,t))
        arrival = float(smooth(0,3,t))
        blue = np.array([.20,.40,1.0],dtype=np.float32)
        violet = np.array([.62,.21,1.0],dtype=np.float32)
        gold = np.array([1.0,.61,.16],dtype=np.float32)
        ruby = np.array([1.0,.13,.075],dtype=np.float32)
        ivory = np.array([1.0,.91,.64],dtype=np.float32)
        phase = .5 + .5*math.sin(t*.25-.8)
        cool = blue*(1-phase*.54)+violet*(phase*.54)
        hue = cool*(1-warm)+gold*warm
        hue = hue*(1-finale*.52)+ivory*finale*.52

        # Exposure and coloured architectural wash preserve photographic detail.
        exposure = .40 + .16*arrival + .13*warm + .17*finale
        frame = self.base * exposure
        wash = self.arch_space*(.075+.035*arrival)
        frame += self.base * wash[...,None] * hue * 1.2

        # Light travels up columns in broad, slow bands. Surface masks constrain
        # the projection to stone; neighbouring bands cross-fade continuously.
        bands = .5+.5*np.sin(y*28 + np.cos(x*8)*.9 + t*.69)
        bands = bands**3
        moving_colour = cool*(1-warm)+ruby*warm
        column_strength = (.16+.39*arrival)*(.47+.53*bands)
        frame += (self.stone*column_strength*self.light_texture)[...,None] * moving_colour
        frame += (self.column_edges*(.07+.08*finale))[...,None]*hue
        vault_wave = (.5+.5*np.sin(y*31+x*4+t*.52))**2
        vault_hue = violet*(1-warm)+ruby*warm
        vault_hue = vault_hue*(1-finale)+gold*finale
        frame += (self.vault*vault_wave*self.light_texture*arrival*.23)[...,None]*vault_hue

        # Five nested vaults illuminate in sequence, then keep a slow light wave.
        for i,(core,bloom) in enumerate(self.arches):
            on = float(smooth(1.0+i*1.3,4.0+i*1.3,t))
            upward = .70+.30*np.sin(y*9+t*.36+i*.7)
            strength = on*(.38+.27*finale)*upward
            frame += (core*strength*.8 + bloom*strength*1.7)[...,None]*hue

        # Slow radial petals remain aligned with the rose window tracery.
        petal = .66+.34*np.cos(self.rose_angle*8-t*.20+self.rose_r*3.6)
        rose_on = float(smooth(3,9,t))
        frame += (self.rose*petal*rose_on*.23*self.light_texture)[...,None]*hue
        frame += (self.rose_ring*rose_on*(.14+.10*finale))[...,None]*hue
        frame += (self.rose_glow*rose_on*(.025+.055*finale))[...,None]*hue

        # Haze-lit rays and their subdued marble-floor reflections.
        for i,beam in enumerate(self.beams):
            strength = (.014+.018*finale)*arrival*(.72+.28*math.sin(t*.32+i*.9))
            frame += (beam*strength)[...,None]*hue
        reflection = (.5+.5*np.sin(self.floor_perspective*10-t*.37))**8
        reflection *= self.floor*(.055+.07*warm+.04*finale)*(.3+.7*self.luma)
        frame += reflection[...,None]*hue
        frame += (self.floor_edges*(.045+.07*warm+.055*finale))[...,None]*hue
        frame += (self.throne*(.04+.09*warm+.17*finale))[...,None]*ivory

        # Soft, slowly breathing motes; no short flashes or abrupt strobe effects.
        motes = Image.new("RGB", (W,H))
        draw = ImageDraw.Draw(motes)
        particle_colour = blue*(1-warm)+ivory*warm
        for i,(px,py,speed,phase,period,radius) in enumerate(self.particles):
            yy = (py-t*speed)%1.0
            xx = px+.009*math.sin(t*.22+phase)
            edge = float(smooth(.015,.11,yy)*(1-smooth(.89,.99,yy)))
            breathe = (.5+.5*math.sin(t*2*math.pi/period+phase))**2
            alpha = edge*(.18+.82*breathe)*(.45+.28*warm)*arrival
            if alpha < .025:
                continue
            cx,cy=xx*W,yy*H
            rgb=tuple(int(float(c)*alpha*255) for c in particle_colour)
            draw.ellipse((cx-radius,cy-radius,cx+radius,cy+radius),fill=rgb)
            if i%7==0:
                draw.line((cx-2.5,cy,cx+2.5,cy),fill=rgb,width=1)
                draw.line((cx,cy-2.5,cx,cy+2.5),fill=rgb,width=1)
        mote_pixels=np.asarray(motes,dtype=np.float32)/255
        mote_glow=np.asarray(motes.filter(ImageFilter.GaussianBlur(2.6)),dtype=np.float32)/255
        frame += mote_pixels*.53 + mote_glow*1.6

        # Gentle highlight roll-off and a slow 2.6% camera push toward the throne.
        frame = np.where(frame>.88,.88+(1-np.exp(-(frame-.88)/.12))*.12,frame)
        frame = np.uint8(np.clip(frame,0,1)*255+.5)
        result=Image.fromarray(frame)
        zoom=1+.026*float(smooth(0,30,t))
        crop_w,crop_h=W/zoom,H/zoom
        left=(W-crop_w)*.5
        top=(H-crop_h)*.46
        return result.resize((W,H),Image.Resampling.BICUBIC,box=(left,top,left+crop_w,top+crop_h))


def soundtrack(path):
    sr=48000
    n=sr*DURATION
    out=np.zeros((n,2),dtype=np.float64)
    def note_hz(midi):
        return 440*2**((midi-69)/12)
    # Original D-minor procession resolving to a warm D-major coronation.
    chords=[[50,57,62,65],[46,53,62,65],[43,50,55,58],[45,52,57,61],[50,57,62,66],[38,50,57,62,66]]
    for j,chord in enumerate(chords):
        start=max(0,j*5-.55)
        end=min(DURATION,(j+1)*5+1.4)
        a,b=int(start*sr),int(end*sr)
        tt=np.arange(b-a)/sr
        env=smooth(0,1.25,tt)*(1-smooth(end-start-1.7,end-start,tt))
        for k,note in enumerate(chord):
            f=note_hz(note)
            phase=2*np.pi*f*tt+.010*np.sin(2*np.pi*.2*tt+k)
            organ=(np.sin(phase)+.19*np.sin(phase*2)+.07*np.sin(phase*3)+.025*np.sin(phase*4))
            voice=organ*env*.034/(1+k*.12)
            pan=(k/(len(chord)-1)-.5)*.4
            out[a:b,0]+=voice*(1-pan)
            out[a:b,1]+=voice*(1+pan)
    # Sparse, hand-composed bell phrases and a final high D.
    bells=[(1.4,74),(4.1,81),(6.8,77),(9.5,74),(12.2,79),(15.0,81),(17.8,85),(20.7,86),(23.2,81),(25.2,78),(26.7,86)]
    for j,(start,note) in enumerate(bells):
        a=int(start*sr)
        size=min(int(4.5*sr),n-a)
        tt=np.arange(size)/sr
        f=note_hz(note)
        bell=(np.sin(2*np.pi*f*tt)*np.exp(-tt*1.2)+.24*np.sin(2*np.pi*f*2.004*tt)*np.exp(-tt*2.1)+.10*np.sin(2*np.pi*f*2.756*tt)*np.exp(-tt*3))
        bell*=smooth(0,.012,tt)*.032
        pan=.22*math.sin(j*1.7)
        out[a:a+size,0]+=bell*(1-pan)
        out[a:a+size,1]+=bell*(1+pan)
    dry=out.copy()
    for delay,decay in [(.173,.20),(.291,.17),(.433,.12),(.619,.09),(.887,.05)]:
        shift=int(delay*sr)
        out[shift:]+=dry[:-shift,::-1]*decay
    t=np.arange(n)/sr
    out*= (smooth(0,1.4,t)*(1-smooth(27.8,30,t)))[:,None]
    peak=float(np.max(np.abs(out)))
    out*=.50/max(peak,1e-9)
    pcm=np.int16(np.clip(out,-1,1)*32767)
    with wave.open(str(path),"wb") as f:
        f.setnchannels(2)
        f.setsampwidth(2)
        f.setframerate(sr)
        f.writeframes(pcm.tobytes())


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source",type=Path,help="Original image to compress into hall.webp on first import")
    parser.add_argument("--output",type=Path,default=ROOT/"art/castle/welcome-30s.mp4")
    parser.add_argument("--poster",type=Path,default=ROOT/"art/castle/hall.webp")
    parser.add_argument("--qa-dir",type=Path,help="Optional frame samples, audio and ffprobe JSON")
    parser.add_argument("--preview-only",action="store_true",help="Save sample frames without encoding video")
    args=parser.parse_args()
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.poster.parent.mkdir(parents=True,exist_ok=True)
    if args.source:
        Image.open(args.source).convert("RGB").save(args.poster,"WEBP",quality=91,method=6)
    if not args.poster.exists():
        parser.error("hall.webp is missing; use --source to import the original hall image")
    hall=Hall(args.poster)
    sample_times=[0,5,10,15,20,25,29]
    if args.qa_dir:
        args.qa_dir.mkdir(parents=True,exist_ok=True)
        for sec in sample_times:
            hall.frame(sec).save(args.qa_dir/f"frame-{sec:02d}.jpg",quality=94)
    if args.preview_only:
        return
    with tempfile.TemporaryDirectory(prefix="castle-render-") as temporary:
        work=Path(temporary)
        audio_path=(args.qa_dir or work)/"original-score.wav"
        soundtrack(audio_path)
        cmd=["ffmpeg","-hide_banner","-loglevel","warning","-y","-f","rawvideo","-pix_fmt","rgb24","-s",f"{W}x{H}","-r",str(FPS),"-i","pipe:0","-i",str(audio_path),"-map","0:v:0","-map","1:a:0","-c:v","libx264","-preset","medium","-crf","22","-maxrate","1500k","-bufsize","3000k","-pix_fmt","yuv420p","-profile:v","high","-level","3.1","-g","48","-c:a","aac","-b:a","96k","-ar","48000","-ac","2","-t",str(DURATION),"-movflags","+faststart","-metadata","title=Hidden Fig Kingdom — Castle Welcome","-metadata","comment=Original procedural light animation and synthesized score; 30 seconds.",str(args.output)]
        proc=subprocess.Popen(cmd,stdin=subprocess.PIPE)
        try:
            for i in range(FPS*DURATION):
                proc.stdin.write(hall.frame(i/FPS).tobytes())
                if i%(FPS*5)==0:
                    print(f"Rendered {i//FPS:02d}/{DURATION}s",flush=True)
            proc.stdin.close()
            if proc.wait():
                raise RuntimeError("ffmpeg failed")
        except Exception:
            proc.kill()
            proc.wait()
            raise
    probe=subprocess.check_output(["ffprobe","-v","error","-show_format","-show_streams","-of","json",str(args.output)],text=True)
    if args.qa_dir:
        (args.qa_dir/"ffprobe.json").write_text(probe)
    data=json.loads(probe)
    print(json.dumps({"file":str(args.output),"bytes":args.output.stat().st_size,"duration":data["format"]["duration"],"streams":[{"type":s["codec_type"],"codec":s["codec_name"],"duration":s["duration"]} for s in data["streams"]]},indent=2))


if __name__=="__main__":
    main()
