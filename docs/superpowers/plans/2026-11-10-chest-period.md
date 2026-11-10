# Chest Period Quotas Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans for this continuation.

**Goal:** Complete configurable shared multi-day chest quotas and deploy the verified version.

**Architecture:** Shared pure rules in lib/pool-rules.js calculate Taiwan dates, legacy behavior and per-tier periods. Existing api/game.js reads config and state inside reward transactions; front-end admin writes config and state atomically.

**Tech Stack:** Vanilla JavaScript, Node, Firebase/Firestore, Vercel.

**Spec:** docs/superpowers/specs/2026-11-10-chest-period-design.md

## Global Constraints
- c/b/a/z have configurable 1–365 day periods and 0–50 quantity; e/d stay daily.
- Existing config is unchanged until an admin saves; all players share limits.
- Normal save retains current quota; reset starts a new period and replenishes.
- No unrelated gameplay, database, artwork or member changes.

## Review Focus
- Midnight and differing tier boundaries: test Taiwan midnight and independent refill dates.
- Multiple simultaneous claims: test only two successes for a two-box period.
- Saving during a depleted period: test no refill before the existing end date.
- Legacy config and existing day depletion: test both remain respected at migration.
- Failed admin writes/invalid inputs: test state stays unchanged and UI reports failure.

### Task 1: Shared quota behavior and server integration
**Files:** lib/pool-rules.js, api/game.js, docs/pool-period-test.cjs
**Interfaces:** resolve(config,state,legacy,day) returns {counts,state}; prepareSave(config,state,legacy,input,day,reset) returns {config,state}; all functions pure. pool day is YYYY-MM-DD in Taiwan.
- [x] Write behavior tests with literal dates and quotas, run RED.
- [x] Implement pure legacy/period transitions and config validation, then transactional server reads and writes.
- [x] Run node --test docs/pool-period-test.cjs; expect all pass.

### Task 2: Admin and front-end integration
**Files:** index.html, test.html, docs/pool-ui-test.cjs
**Interfaces:** Use Task 1 module for input validation, saves, demo claims and displayed availability.
- [x] Test saved form payload, normal save/reset, failed persistence, UI render and demo cross-day quotas.
- [x] Add day/quantity inputs, atomic save, rule and next-refill labels; update version to V15.23.
- [x] Run node --test docs/*test.cjs; expect no failures; inspect mobile admin UI in browser.

### Task 3: Review and publish
**Files:** docs/v15.23-release.md
- [x] Review complete diff independently and fix important findings with tests.
- [x] Verify syntax, regression suite, and unchanged live baseline before publishing.
- [ ] Preserve backup branch, upload verified files, advance main with expected-SHA protection.
- [ ] Confirm Vercel deployment success and live version/assets. Record rollback and verification evidence.
