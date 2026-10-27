# Castle Welcome Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline. Steps use checkbox syntax.

**Goal:** Add top-three, one-time-code, five-tap bridge and X-door entry with a 30-second original welcome video.
**Architecture:** Add independent api/castle.js and castle/ frontend modules; integrate three narrow hooks into V15.15. Server-only state in srv collection. No existing API changes.
**Tech Stack:** Existing HTML/JS, Firebase Admin, Node test, SVG/CSS, MP4 H.264/AAC.
**Spec:** docs/superpowers/specs/2026-10-27-castle-welcome-design.md

## Global Constraints
- Preserve existing V15.15 behavior and data; no edits to api/game.js, weather or Firestore rules.
- Back up exact main head before publication; expected-head check prevents overwriting concurrent work.
- Use current points leaderboard; top three only, ties by member ID.
- Fail closed when castle API unavailable; code consumes atomically once, 10-minute expiry, 5 wrong attempts.
- Original 30-second portrait MP4; do not present a still as a video.

## Review Focus
- Concurrent code redemption must yield exactly one success.
- Account/rank changes while UI open must not bypass server check.
- Abandoned async requests/animations must not reopen closed overlays.
- X recognition must handle both directions and reject short/noncrossing scribbles.
- Returning from video must preserve background music preference and remove listeners/animation frames.

### Task 1: Server gate
- [x] Write failing tests in docs/castle-api-test.cjs for ranking, code lifecycle, failures and concurrency with in-memory Firestore boundary double.
- [x] Implement api/castle.js using existing service-account env and Firebase auth; independent route.
- [x] Run node --test docs/castle-api-test.cjs; expect pass.

### Task 2: Bridge and door
- [x] Write failing tests for five taps and X geometric recognition in docs/castle-core-test.cjs.
- [x] Implement castle/core.js, castle/castle.js, castle/castle.css and index integration; add castle-preview.html using isolated demo adapter.
- [x] Run node --test docs/castle-core-test.cjs; expect pass; browser exercise preview via supported browser.

### Task 3: Original film and delivery
- [x] Create imagegen castle hall; render 30-second lighting animation and original music, H.264/AAC with faststart.
- [x] Validate duration, codecs, sampled frames and audio; integrate video.
- [x] Review new module and integration; run relevant existing regressions and no-change comparisons.
- [x] Back up main at backup/v15.15-before-castle-20261027.
- [ ] Publish verified files against exact current parent; independently verify deployment.

### User steering: emerald rear fixtures
- [x] Add three open black water buckets ahead of existing domed tanks, adjacent stainless sink and rear-left doorway.
- [x] Inspect isolated rear drawing at two camera positions; retain original tank coordinates and gameplay.
