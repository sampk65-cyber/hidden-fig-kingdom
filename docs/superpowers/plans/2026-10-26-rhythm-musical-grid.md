# Rhythm musical-grid repair

User goal: fruit reaches the harvest line on the music beat, with repeatable musical phrasing instead of independently scattered accents. This continues the authorized rhythm work and formal publication workflow.

Scope: analyze all 11 encoded recordings; retain exact audio files, titles and durations and the seven synthesized arrangements. Change only recorded chart metadata/selection, rhythm stage pulses and rhythm player clock. Preserve greenhouse, account data, scores and timing windows.

1. Measure multiband percussion onsets and tempo/phase candidates from encoded PCM. Check stability across the entire excerpt, not only the opening. Use measured beat anchors and nearby actual attacks; allow subdivision notes only where an attack exists. Record reproducible analysis and before/after regularity evidence.
2. Add failing regressions for regular nested difficulty charts, genuine acoustic support, measured pulse animation, and audible-output timing without changing source scheduling. Preserve lane-spacing, fall-in, pause/resume, mute/enable and lifecycle coverage.
3. Generate a fixed beat map for each recording. Easy follows a repeating main-beat pattern; medium adds other main beats; hard adds supported subdivisions. Use the same pulse map for stage flash. Keep synthesizer charts unchanged.
4. Separate source scheduling time from audible-output time. Prefer getOutputTimestamp with a bounded validated fallback and account for the compressor lookahead. Drawing and input judgment share the audible clock. Preserve pause position and cold-muted start.
5. Run all regression files and actual-browser audio/chart/lifecycle checks, inspect the diff for unrelated changes, obtain a read-only review, then publish under the existing authorization and verify the live exact bytes.

Review focus: tempo octave/phase ambiguity; weak musical passages; no fabricated notes in silence; long-track drift; nested chart/lane stability; no missed sources from output compensation; stale/unsupported output timestamps; pause before scheduled start; delayed audio loads and cold-muted start.

This is audio beat analysis, not a claim to transcribe a complete written score. Browser checks cannot prove the latency of an untested physical phone/Bluetooth device.
