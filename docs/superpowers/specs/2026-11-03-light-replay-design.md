# V15.21.2 light passage and replay

The user explicitly opted out of design discussion and requested completion and deployment to the existing Hidden Fig Kingdom site.

1. Last ten seconds of the welcome film: camera approaches the central chapel door, warm glass light expands to an ivory transition, then the actual tower game appears. Honor pause/seek/hidden tab, reduced motion and teardown. Implement a time-driven video wrapper rather than replacing the artwork.
2. Replace the score with an original sacred, hopeful arrangement: warm choir harmonies, soft harp arpeggios, crystal melody, a resolved major cadence and spacious reverb. Retain stone sound and existing audio lifecycle.
3. Add replay from the victory panel and completed tower view. Server creates a different shuffled four-color target order on each completed replay. Preserve fixed left/right sequence, first stair entry, and original member card/prize entitlement. Existing unfinished sessions keep progress and palette. Pass targets through controller, windows, glow and naturally blended banners. Retry/repeat replay cannot allocate another card.

Validation: core permutation/wrong-direction checks, server replay idempotency and single award, controller replay, film timing/lifecycle, original game regressions, real renderer with randomized palette, deployed hashes/version and browser replay. Existing user deployment authorization persists. Rollback starts at acd31435d631e26f80fb2e1076aec378f04f19ad.
