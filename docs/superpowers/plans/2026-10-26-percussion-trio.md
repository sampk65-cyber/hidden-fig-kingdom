# Percussion Trio Implementation Plan

> **For agentic workers:** Execute directly in the existing isolated task branch.

**Goal:** Add the three supplied recordings after 一個人的武林, each 30–45 seconds, with new Chinese titles and three fixed drum-accent charts.

**Architecture:** Reuse V15.10 recording loading, playback, chart generation and success feedback. Only add catalog/asset data, make the recording duration label reflect metadata, and update catalog counts.

**Tech Stack:** Existing HTML/Web Audio, FFmpeg, SciPy and Node regression tests.

**Spec:** User instruction in this session; naming and excerpt selection delegated to the assistant.

## Global Constraints

- Keep 一個人的武林 first and preserve all thirteen existing songs/charts and the complete playback/scoring engine.
- Use 雲城戰鼓 45 s (source 6–51 s), 追風擊掌 30 s (0–30 s), 雷霆踏步 40 s (36–76 s).
- Preserve all non-rhythm source, test.html, Firebase, backend, weather and greenhouse content.
- Back up V15.10 before publishing V15.11; verify the exact published HTML/audio bytes.

## Task

- [ ] Observe failing catalog and decoded-length acceptance tests.
- [ ] Encode three 96 kbps excerpts, extract onsets from encoded audio and insert the song objects.
- [ ] Update visible recording duration/counts and catalog assertions.
- [ ] Run all regressions, compare old source/song/chart outputs, check real-browser playback for each new track.
- [ ] Review, publish and verify deployment.
