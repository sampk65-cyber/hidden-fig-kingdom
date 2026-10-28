# Castle Level One and VIP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement task-by-task. Independently bounded backend and scene work may use parallel agents per dispatching-parallel-agents; integration remains owned by root.

**Goal:** Ship the four-floor color-window puzzle, unique membership-linked limited VIP cards, and authenticated admin awards UI as V15.21.

**Architecture:** Dedicated shared rule module, server level service and route operations; a procedural Three.js scene isolated from gameplay UI. Root integrates the overlay, VIP shelf/download and admin panel without restructuring the single HTML app.

**Tech Stack:** Existing plain JavaScript/Firebase Admin/Vercel; locally vendored Three.js; node:test.

**Spec:** docs/superpowers/specs/2026-10-28-castle-level-one-vip-design.md

## Global Constraints

- Preserve base release 7382437 and all old member data and functions.
- Four floors, three windows each, true index 1, stop order [0,2,1], targets [0,1,2,3].
- Initial card limit 100, server atomic issuance, one member/level, no membership login secret on VIP.
- Only admin-authenticated endpoints change rewards or mark redemption.
- Local runtime library, reduced motion and mobile accessible controls, no browser automation outside cua_repl.

## Review Focus

- Stale account or closed overlay during network and climbing: no card/data leaks or resurrected UI.
- Simultaneous final stops, request retries and exhausted editions: no duplicate or missing earned cards.
- Clock offsets and background tabs: current colors and server-validated stopping remain recoverable.
- Admin without member mapping and normal member forging admin op: first works, second denied.
- Cached old modules or WebGL unavailable: original app still works, error offers recoverable return.

### Task 1: Server-authoritative rules, level sessions and VIP ledger

Files: castle/level-core.js, lib/castle-level-service.js, api/castle.js, docs/castle-level-test.cjs, docs/castle-vip-test.cjs, docs/castle-level-route-test.cjs.
Interfaces: API/core exact fields in spec. Root and scene consume public session/card fields.
- [ ] Write failing tests for decoys/true windows, sequential floors, retries, replay and timing.
- [ ] Implement shared pure rules and service, plus server-only card issuance and admin reward methods.
- [ ] Verify transaction concurrency, quota, privilege, repeat claim and redemption tests pass; old castle tests remain green.

### Task 2: Genuine 3D tower scene

Files: castle/tower-scene.js; art/vendor/three.min.js and LICENSE (root downloads vendor); art/castle/tower-01-thumb.webp (root prepares).
Interface: window.CastleTowerScene.create(host,{avatarUrl,onDialStep,onInspect,reducedMotion}) => {update(state),climb(from,to),dispose()}. update state {floor,windows:colorIndex[12],frozen:boolean[12],solved,dial,paused,completed}; global THREE loaded locally. onDialStep(direction) emits one step per drag notch. Main handles all server calls and keyboard/buttons.
- [ ] Build four ivory/bronze floors, main full window plus angled decoys, small column flags, stair route, base dial, crystal exit and user avatar sprite.
- [ ] Add bounded animation, lighting, shadows and light transitions. A single render loop, pause on hidden state, cleanup resources/listeners/observer.
- [ ] Verify syntax and scene contract; root performs browser geometry and visual QA.

### Task 3: Puzzle UI, VIP shelf, admin interface and integration

Files: castle/level.js, castle/level.css, castle/castle.js, index.html, castle-level-preview.html, docs/castle-level-ui-test.cjs.
Consumes Task 1 core/API and Task 2 scene contract.
- [ ] Add tests for guarded loading, member/admin separation, card escaping and lifecycle invariants; observe failure.
- [ ] Implement game launch, clock sync, sequential stopping/retry, character climb and final card display. Integrate movie CTA.
- [ ] Add downloadable VIP and member shelf, admin forms, visible-only refresh, reward binding and redemption/lookup. Whitelist card display and escape untrusted text.
- [ ] Add deterministic standalone preview, correct and wrong stop testing, admin preview and small-screen controls.

### Task 4: Verification, review, release

Files: docs/v15.21-validation.md and version/cache references.
- [ ] Run all meaningful Node regressions, syntax, browser QA and static asset/ZIP integrity checks as applicable.
- [ ] Obtain fresh independent whole-change review; fix material findings with focused tests.
- [ ] Backup main as backup/v15.20-before-level-one-vip-20261028, publish scoped changes with expected SHA; verify deploy and production version/assets.
