# Original rhythm validation — 2026-10-25

Base: main `4be43c6340091018ec8aa14a36761cbf69663488` (V15.7).
Backup: `backup/v15.7-before-original-rhythm`.
Feature branch: `feat/kingdom-original-rhythm`.

## Evidence

- Existing 55 regression assertions pass: weather 16, header 5, challenge 13, touch 21.
- Four new test groups pass: 12 unique playable originals/seven styles, distinct arrangements, 36 deterministic increasingly dense aligned charts with lane spacing, shared swing timing. Catalog/chart tests were observed RED before implementation and GREEN after.
- Real Chromium 138 isolated browser harness passes: 12-song selection; preview switching/cancellation; three practice difficulties and locked formal difficulty; scoped long-press event prevention; gameplay pause/resume/quit; slow audio unlock cancellation; short 320×568 layout; exactly-one completion callback and unchanged score floor.
- Twelve 8-second OfflineAudioContext renders produce nonzero audio. Peaks 0.154–0.193 in the test output path; no clipping. Future-scheduled voices produce zero output after stop.
- Real AudioContext tests verify mute silence with clock continuity, pause freeze/resume, and cleanup.
- Entire inline JavaScript parses with node --check. A source comparison replacing only rhythm CSS, rhythm implementation and its TASKS entry yields byte-identical remaining source.

## Independent review and fixes

Reviewer: read-only `/root/review_original_rhythm`; no critical defects. Two important lifecycle defects reproduced independently, then covered by tests in the branch:

- Cold muted start → enable audio: RED peak 0; GREEN peak 0.097 with preserved timeline. The player now adopts a newly available running AudioContext.
- Double resume while audio unlock is pending: RED three player starts; GREEN one. Resume is single-flight and countdown startup idempotent.

Final: minor (deferred): six dense medium/hard charts have no safe green-fruit placement although general instructions discuss green fruit. Gameplay remains solvable, with increasingly dense ripe-note charts. No forced overlap was added. The music notes disclose that green fruit is conditional on safe spacing.

Declined-to-judge findings: none.

## Limits

This verifies isolated browser execution and synthesis, not physical Android/iPhone touch behavior or subjective speaker/headphone listening quality. The initial music review used the V15.7 baseline. The user subsequently authorized synchronizing music and greenhouse scenes into V15.8; see v15.8-release.md for the combined release.
