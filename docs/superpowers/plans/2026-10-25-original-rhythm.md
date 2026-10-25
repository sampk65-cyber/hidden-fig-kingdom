# Original Rhythm Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 12 distinct original selectable songs with three fixed charts each.
**Architecture:** Keep the existing single-file app. Replace only rhythm song data/player/game block and scoped rhythm CSS; edit rhythm instructions. Preserve callbacks to taskFinish/practiceEnd.
**Tech Stack:** JavaScript, CSS, Web Audio, node:test, optional Playwright Chromium.
**Spec:** docs/superpowers/specs/2026-10-25-original-rhythm-design.md

## Global Constraints

Preserve other games, shared audio controls, long-press guard, weather, Firebase, rewards, formal difficulty progression and existing practice records. Production remains V15.7 until a separate release instruction.

## Review Focus

- Silent or suspended AudioContext must not freeze the chart or lose notes while hidden.
- Preview switching/start/exit must stop scheduled sources and timers.
- All 36 charts need spaced reachable notes with the same audio timestamps, including swing.
- Practice choices must not override formal progression or award rewards during selection.
- Small/short phone viewports need usable controls and scrollable song selection without native long-press actions.

### Task 1: Original arrangements and charts

Files: index.html; docs/rhythm-regression.cjs.
Interfaces: RHY_SONGS catalog; rhyArrangement(song) -> timed events; rhyChart(song,d) -> {notes,length,fall,ripe}; rhyTime(song,step) shared swing timing.
- [x] Write failing tests for 12 playable arrangements, seven styles, deterministic increasingly dense charts, event alignment, no same-lane conflicts.
- [x] Run RED; implement 12 compositions and seven timbre/groove profiles; run GREEN.

### Task 2: Audio lifecycle and chooser integration

Files: index.html, docs/rhythm-regression.cjs, docs/rhythm-browser.cjs.
Interfaces: rhyPlayer(song) exposes start/now/stop/pause/resume/suspended; rhythmGame(done) selects and launches rhyRun(done,song,d).
- [x] Write failing lifecycle tests for stop, mute, preview replacement, formal/practice difficulty and callback boundaries.
- [x] Implement scoped instrument synthesis, eight-second preview, accessible song cards and three practice difficulties, gameplay pause/resume and cleanup.
- [x] Verify actual browser Web Audio and layouts when available; run all regression suites.
- [x] Review complete diff independently; fix important issues with regression coverage; commit branch and open reviewable PR without production merge.
