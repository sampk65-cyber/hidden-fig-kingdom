# Seven 45-second recordings Implementation Plan

> **For agentic workers:** Execute directly in the isolated task branch.

**Goal:** Add all seven uploaded lin_hoyasi recordings to the formal catalog, exactly 45 seconds each.

**Architecture:** Reuse the V15.11 recording player, chart builder and success feedback unchanged. Insert seven catalog objects after the existing four recordings; preserve every old song object and chart.

**Tech Stack:** Existing HTML/Web Audio, FFmpeg/SciPy asset preparation, Node tests and managed-browser checks.

**Spec:** Current user request and previously delegated Chinese naming/excerpt selection.

## Constraints

- Every new excerpt decodes to exactly 45 seconds and has three fixed onset charts.
- 一個人的武林 stays first; all sixteen existing songs and 48 charts remain identical.
- Preserve all playback/scoring code, other games, greenhouse/weather/backend/Firebase and test.html.
- Back up V15.11 before publishing V15.12 and verify exact deployed HTML/audio bytes.

## Task

- [ ] Run failing catalog/audio acceptance tests.
- [ ] Select rhythmic passages, encode at 96 kbps and extract post-encode onsets.
- [ ] Insert seven songs and update catalog-count assertions and help text.
- [ ] Run full regressions, source/chart comparisons and actual-browser playback checks.
- [ ] Review, publish and verify production.

## Approved scope update — 2026-10-26

The user requests deployment and replacement of exactly the five screenshot songs: 絨夜熟果 (velvet), 露珠慢舞 (dew), 浮島搖搖 (island), 暖陽小徑 (sunpath), 月台爵士館 (cafe). Remove those five catalog objects, retain the other eleven existing songs and 33 charts, and add the prepared seven 45-second recordings: 18 total. Keep Wulin first. Update stale test/QA selectors and counts, run regressions and catalog selection checks, then publish to the existing public GitHub/Vercel site. Reuse the completed audio playback verification because all seven assets and their charts stay identical.
