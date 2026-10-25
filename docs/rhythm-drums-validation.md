# Rhythm figs, feedback and three drums — validation

This document records the isolated rhythm subtask against V15.8 (`00cf8f1`). That subtask changes only rhythm CSS and `RHY_SONGS` through `rhyRun`; global `AUD`/`SND`, other games, weather and backend remain untouched. The integrated V15.9 candidate additionally contains the separately reviewed greenhouse visuals and version labels described in v15.9-release.md.

## Cause and changes

- Round CSS notes with an applied stem looked like passionfruit. Notes now use an original native SVG with a narrow neck, short stem, broad lower fruit, longitudinal ribs and ostiole. Ripe/green colors and the green dashed outline remain distinct.
- Hit feedback used one high-passed noise and only sounded after a valid hit. Each active pad now triggers its own low/mid/high drum immediately, including empty taps, through rhythm-owned voices routed to the real `AUD.sfx` gain (.28). Music retains `AUD.mus` (.11). All owned pad sources, buses and compressors are stopped/disconnected with the player; mute and pause silence tails.
- Added prominent cumulative score, persistent Perfect/Good/NG counts, visible COMBO and large judgment with a short Chinese explanation. Pads say 低音鼓 / 中音鼓 / 高音鼓.
- Kick has a 52 Hz settled fundamental, upper harmonic body and a transient. Mid/high drums settle at 158/316 Hz. All twelve accompaniments retain their style patterns and gain kick/snare body plus sparse high-tom responses. Local compressors preserve headroom.
- NG counts empty taps, tapped green fruit and missed ripe notes. It does not reuse the existing missed-note result counter. Empty taps add no points; green fruit retains the two-point penalty; each missed note is finalized once. Original 90/220 ms windows, per-hit points, combo bonus, score normalization and callback format remain.

## TDD evidence

`rhythm-drums-red.log`: four acceptance tests failed against V15.8 before implementation (missing counts/English judgments, no SVG fig, indistinguishable middle/high voice, silent empty pad).

`rhythm-drums-green.log`: all four pass after implementation. The clock fixture was explicitly paused after investigation showed wall-clock progression between automation calls (5–7 ms) could contaminate near-boundary assertions.

## Commands and results

Set runtime paths as appropriate:

```sh
export PLAYWRIGHT_PATH=/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright
export CHROMIUM_PATH=/workspace/scratch/c231bffc0c42/qa-runtime/chromium
export FONT_CSS_ROOT=/workspace/scratch/c231bffc0c42/qa-runtime/node_modules/@fontsource/noto-sans-tc
node --test docs/rhythm-drums-browser.cjs
node docs/rhythm-browser.cjs
node --test docs/*regression.cjs
```

- New acceptance: **4 passed, 0 failed**. Timing checks at 89/91 ms and 219/221 ms, display counts, green penalty, empty-tap spam, one-time miss accounting, score conversion, cold-muted recovery, sound toggle, pause/quit tails, low/mid/high spectra and rapid simultaneous-pad headroom.
- Existing browser: **PASS**, including all 12 audio renders, preview cancellation, original formal/practice difficulty, native gesture guard, cold-muted music recovery, single-flight countdown resume, and exactly one completion callback. The harness now extracts the real production `AUD` definition instead of omitting `sfx`.
- All existing regressions: **13 top-level passed, 0 failed**, including 55 legacy checks reported inside script suites and 9 direct node tests.
- Full embedded script parses via `vm.Script`.
- Separate executed baseline comparison: all **12 song objects and 36 chart outputs identical** to V15.8. The complete source outside the rhythm CSS and rhythm JavaScript regions is byte-for-byte identical.

## Measured audio

| Voice | Dominant fundamental | Peak (pad routing) | RMS |
| --- | ---: | ---: | ---: |
| Low kick | 52 Hz | 0.232 | 0.0326 |
| Middle drum | 158 Hz | 0.183 | 0.0275 |
| High drum | 316 Hz | 0.209 | 0.0279 |

Kick 95–240 Hz harmonic-band energy is 8.0% of its 36–90 Hz low-band energy. Rapid simultaneous three-pad hits plus music peak at **0.324**. All twelve accompaniment excerpts peak at **0.192–0.273**, below full scale.

## Visual evidence

Inspected actual Chromium screenshots:

- `rhythm-drums-320.png` — 320×568, score, counts, Perfect and all pads within viewport.
- `rhythm-drums-390.png` — 390×844, the same components with a taller field.
- `rhythm-drums-good.png` — Good with accumulated points/count.
- `rhythm-drums-ng.png` — NG and visible ripe/green fig forms.

These use controlled chart fixtures to make judgments reproducible; the original browser harness also runs actual catalog selection and gameplay. No physical Android device or loudspeaker listening assessment is claimed.
