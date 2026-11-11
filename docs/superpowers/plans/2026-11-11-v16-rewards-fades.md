# V16.1 reward audit and music fades

Goal: only points and configured prizes; loop existing crystal audio with 2 s fade-in / 3 s fade-out.
Spec: the user's 2026-11-11 request and attached prize pool screenshot.
Architecture: keep current pool rules, quotas and metadata; remove legacy ordinary-chest random coupons and lucky side-channel. Preserve historical coupons. Change the music gain envelope only.

- [x] Confirm main tree matches V16 checkout; baseline 27 tests pass.
- [ ] Reproduce ordinary chest 85% discount and assert no new retired coupon types.
- [ ] Replace ordinary rewards with existing +6 points fallback; disable server/demo lucky; guard new coupon issuance and gift choices. Preserve configured coffee and all period quotas.
- [ ] Add timeline gain tests; implement per-loop 2 s / 3 s fades in media and Web Audio paths; keep mute/disposal/stone effects.
- [ ] Run focused and castle regression tests, JS parse and diff checks; independent review.
- [ ] Publish V16.1 with V16 rollback branch and verify deployment.

Review focus: old coupon history, disabled/unknown gift types, depleted pool fallback, mobile Web Audio volume, loop wrap and cleanup.
