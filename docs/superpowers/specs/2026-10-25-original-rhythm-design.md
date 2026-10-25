# 王國原創節奏採收

User-approved direction: 12 original instrumental tracks, 3 difficulties each, with R&B, reggae, jazz, rock, funk, electronic and percussion. This follows the offered original Web Audio approach; no commercial songs or external recordings are used.

## Scope and approaches

Extend the existing Web Audio synthesizer locally within rhythm harvest. This gives accurate shared timing, small downloads and independent compositions. Licensed recordings were the alternative offered; the user chose kingdom originals. These are synthesized instrumental arrangements, not recorded bands or vocals.

Only rhythm catalog, arrangement/player, song selector, game presentation and its instructions change. Preserve all other games, shared audio controls, long-press guard, weather, Firebase, rewards, formal difficulty progression and existing practice records. Production remains V15.7 until a separate release instruction.

## Builder choices

- R&B / reggae / jazz / rock / funk: two tracks each. Electronic / percussion: one each. Each has a unique melody, harmony, bass line, drum pattern, tempo and timbre profile.
- Fixed 4/4 tracks with 1 intro bar and 16 playable bars, roughly 30–54 seconds. Jazz swing and R&B shuffle affect both audio and chart timestamps. Distinct A/B phrases and second-half arranging avoid a single short loop.
- Song catalog shows genre, BPM and length; selection persists locally. Eight-second preview, one track at a time. Preview exits cleanly on selection, start, close or background.
- Practice retains the existing difficulty choice; song screen also permits changing it. Formal play displays its existing earned difficulty and does not bypass progression.
- All tracks retain their tempo at all difficulties. Easy emphasizes beat notes; medium adds melody offbeats; hard adds syncopated bass/drum accents. Deterministic charts, three lanes; green fruit remains an explicitly taught obstacle in medium/hard.
- Audio uses one shared clock with falling fruit. Local bass harmonics help small speakers. Rhythm-owned output nodes and scheduled sources are stopped without changing shared audio functions.
- Muting continues the song clock silently. Hidden/suspended games pause with an explicit resume control. Audio-unavailable devices can continue with a visual beat clock.
- Keep existing score-to-reward integration; add accuracy and selected song to result detail. Do not add remote records or new progression systems.

## Acceptance

All 12 tracks selectable and audible; all 36 charts playable and repeatable. Seven recognizably different arrangement profiles. Selection/preview does not finish a task or grant rewards. No duplicate audio, scheduler or callback after exit. Existing 55 regression assertions pass. Test on simulated mobile layout and real Web Audio if browser runtime is available; do not claim physical phone listening or touch testing.
