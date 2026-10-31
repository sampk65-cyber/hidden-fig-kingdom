# Crystal tower polish implementation plan

> **For agentic workers:** Use superpowers:executing-plans for inline implementation and one final independent review.

**Goal:** Crystal soundtrack, synchronized stone sound, natural traveler motion and brighter completed windows.
**Architecture:** Isolated audio lifecycle module, existing scene/controller, unchanged server puzzle/awards.
**Tech Stack:** Vanilla JS, Canvas, HTMLAudio/Web Audio; offline Python synthesis and ffmpeg.
**Spec:** `docs/superpowers/specs/2026-10-30-crystal-polish-design.md`

## Constraints and review focus
- Existing sound preference and hidden tab silence must take effect even during pending play promises.
- Repeated scene entry, errors and identity changes must release sound sources and timers.
- Stone sound follows accepted turns, including wrong directions, but not canceled gestures.
- Completed lighting preserves glass geometry and target colors; incomplete windows do not receive it.
- Keep stair paths continuous, feet grounded, reduced motion supported and rendering bounded.

### Task 1: Audio lifecycle and integration
- [x] Add failing behavioral tests for disabled/hidden music, gesture start, turn sound, rejected play and cleanup.
- [x] Create `castle/audio.js`: `create(options)` returns `gesture()`, `sync()`, `turn(duration)`, `dispose()`; options supply enabled/context/unlock. Generate original music and stone MP3s with a reproducible script.
- [x] Integrate shared sound preference/context in `castle/castle.js` and `index.html`, attach gestures and disposal in `castle/level.js`, enable isolated preview audio.
- [x] Verify lifecycle tests and audio peak/duration/spectral checks, then commit.

### Task 2: Traveler and window rendering
- [x] Add failing motion continuity and gait tests; render before/after brightness measurements using real canvas.
- [x] Update `heroPose`, foot articulation, wheel caching and glass-only bright bloom in `castle/touch-scene.js`; preserve controller/API signatures.
- [x] Verify initial/mid-climb/completed frames and the full suite, then commit.

### Task 3: Release
- [x] Run independent whole-branch review and one fix pass if needed.
- [ ] Set V15.21.1 with cache revision, publish branch/PR, retain rollback base and deploy after checks.
- [ ] Verify deployed assets and backend, use isolated preview for browser audio/visual checks. Record limitations accurately.
