# Scene and Rhythm Drum Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or superpowers:dispatching-parallel-agents for isolated domains. Steps use checkboxes.

**Goal:** Redesign mature greenhouse space to reference image 3 and provide fig-shaped rhythm notes, clear judgement/score and three audible drum pads.
**Architecture:** Isolated copies of verified V15.8. Scene and rhythm edits use disjoint regions of index.html; combine only after each domain passes. Canvas + a new generated tree sprite; rhythm-local SVG and Web Audio.
**Tech Stack:** Existing JavaScript/Canvas/SVG/Web Audio and Node/Chromium test harness.
**Spec:** ../specs/2026-10-25-scene-drums-design.md

## Global Constraints
- No backend/Firebase, reward rules, stage rotation, physical positions or other games changes.
- Preserve all 12 songs and three difficulties, audio lifecycle and long-press guards.
- Keep production branch intact during implementation; back up 00cf8f1.

## Review Focus
- Camera moving through trees must retain open passage and avoid gigantic near-plane foliage.
- Rotating non-emerald into harvest must use the same redesigned mature tree.
- Cold muted starts / sound toggling must restore music and pads; pause/quit must stop all pad audio.
- Empty taps, green taps and late notes must not double-count judgement or award points.
- 320×568 viewport must retain score, judgement and three reachable drum pads.

## Task 1: Greenhouse visuals
- [x] Make new portrait transparent mature tree asset from reference, inspect it and retain original assets.
- [x] Add failing regression for separate mature height/width, narrow crown, asset fallback and unchanged stage metadata.
- [x] Implement mature drawing and shared bright greenhouse environment; do not move gameplay coordinates.
- [x] Run actual-scene browser tests at entrance, forward and lateral positions and inspect screenshots.

## Task 2: Rhythm feedback and percussion (isolated directory)
- [x] Add failing browser tests for Perfect / Good / NG, counts/score and three distinct drum pads.
- [x] Implement fig SVG, persistent scoreboard, clear feedback; preserve points-to-reward conversion.
- [x] Implement low/mid/high pad sounds within rhythm-owned audio resources; strengthen accompaniment percussion.
- [x] Verify drum spectral separation and low-frequency energy, no clipping, lifecycle and short viewport.

## Task 3: Integration and review
- [x] Integrate disjoint changes; run all relevant regressions, browser harnesses and script syntax checks.
- [x] Compare all excluded source regions and backend file hashes to production baseline.
- [x] Fresh independent review; resolve important findings and record evidence.
- [ ] Create reviewable PR with preview/screenshots, scope and test results. Production release only with authorization applicable to this release.
