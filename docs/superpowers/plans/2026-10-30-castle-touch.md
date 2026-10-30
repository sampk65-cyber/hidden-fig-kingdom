# V15.21 Castle Touch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Finish the four-floor direct-touch castle and restore limited VIP/admin prizes in a deploy-ready V15.21.

**Architecture:** A shared pure touch state machine drives server-validated turns, first entry, and progressive lights. A canvas scene/controller draws the accepted artwork and handles wheel/stair gestures. Existing transactional cards and admin UI are restored from the prior release.

**Tech Stack:** Vanilla JavaScript, Canvas 2D, Node test runner, existing Firebase Admin/Vercel API.

**Spec:** `docs/superpowers/specs/2026-10-30-castle-touch-design.md`

## Global Constraints
- Directions: left, right, left, right. First entry requires the actual staircase tap.
- No directional buttons or permanent gameplay explanation; hint after three wrong attempts.
- Preserve current search/share work, existing game APIs, Firestore rules, cards, prizes and counters.
- Prepare V15.21; no production publication or real member-data writes.

## Review Focus
- A response lost after a committed turn must synchronize without a duplicated step/card.
- Closing/changing account while loading or moving must not update a stale scene.
- Cancelled/short/vertical gestures and touches outside the wheel must not count.
- Legacy completed and incomplete sessions preserve cards and earned claim rights.
- Concurrent final turns and repeated claims cannot oversubscribe the limited edition.

### Task 1: Authoritative steps and preserved awards
**Files:** `castle/touch-core.js`, `lib/castle-level-service.js`, `api/castle.js`, `docs/castle-touch-test.cjs`, retained VIP tests/helpers.
**Interfaces:** `CastleTouch.create()`, `turn(state, direction)`, `enter(state)` return new state. API `turnDial({sid,seq,direction})` and `enterStairs({sid,seq})`; start returns the authoritative state.
- [x] Write tests for wrong turns, three-error hints, first-entry gate, preserved floors, four-step completion and rejected malformed directions; run and observe failure.
- [x] Restore the prior award service and add versioned touch sessions plus authenticated routes. Preserve the transactional allocation/admin implementation.
- [x] Verify idempotent retries, legacy upgrade/entitlement, unauthorized access, simultaneous final turns, VIP cap and redemption using `node --test docs/castle-*-test.cjs`.
- [x] Commit server/core changes.

### Task 2: Direct scene gestures and character movement
**Files:** `castle/touch-scene.js`, `castle/level.js`, `castle/level.css`, `art/castle/*`, `docs/castle-touch-ui-test.cjs`, `castle-level-preview.html`.
**Interfaces:** `CastleTouchScene.makeCastleScene(source, clean, factory)` exposes `render(ctx, angle, colors, state)`; controller `CastleLevel.mount(host, options)` returns `{dispose}` and consumes the existing auth/identity/call bridge.
- [x] Write gesture/controller tests for wheel-only horizontal swipes, first stair entry, lifecycle cancellation and lost-response resync; run and observe failure.
- [x] Adapt accepted renderer, remove the original fixed character via the clean background patch, animate the original traveler along stairs, and add floor lighting.
- [x] Wire four steps to the authenticated API and existing VIP result UI. Update isolated demo to the same rules.
- [x] Render initial, first-entry and fourth-floor states; execute the real controller against simulated external DOM/network boundaries and run UI tests.
- [x] Commit scene/controller changes.

### Task 3: Integration and release preparation
**Files:** `index.html`, `castle/castle.js`, retained VIP UI/styles, release documentation.
**Interfaces:** existing summit member/API bridge and `CastleVIP` shelf/admin; no new database configuration.
- [x] Apply the former VIP integration hunks while retaining V15.22 SEO/share markup; set app version V15.21 and unique cache revision.
- [x] Run full Node regression suite, syntax checks, asset-reference checks and production-base source comparison.
- [x] Obtain independent whole-branch review, fix important findings, and verify the final suite.
- [x] Commit and prepare runnable preview/release package plus rollback provenance; leave production unchanged.

## Execution record

- Task 1: `a953e73`; server/core regression cases observed failing before implementation, then passing.
- Task 2 / integration: `606c2af`; actual controller tested against simulated DOM/network boundaries and real award service.
- Whole-branch review: independent reviewer examined `dda8021..606c2af`. Accepted recovery-state finding; separately fixed legacy direct-claim serialization and keyboard focus reachability. Both behavioral regressions were reproduced before fixes.
- Final verification: 88 tests passed; changed JS and both HTML script sets parsed; real canvas renderer completed embedded preview actions. Physical-device and live-Firebase checks remain release acceptance work.
- Deliverable: feature branch/draft PR plus isolated `castle-level-preview.html`; production main remains unchanged. See `docs/v15.21-touch-release.md` for provenance and rollback.
