# V15.21 第一關與通關 VIP 卡

User explicitly requested implementation after the design discussion. Continue without another approval gate. Base: remote main 7382437f84ce9e83ae4634e8cbf104186e9123c3. Preserve existing membership data, ranking gate, statue, bridge, X door, welcome film and other games.

## Confirmed gameplay

Four floors; one small pennant naturally tied to a column per floor, colors red/blue/green/gold. All windows cycle colors until wheel input freezes them one by one. Only the largest, fully visible window on each floor is a true answer; smaller/partial windows are decoys. Matching the true window with that floor's pennant opens that floor. Open floors persist within the run. Traverse stairs bottom-left to upper-right crystal palace. Existing player's character thumbnail, not a generic fixed hero. Build genuine fixed-view procedural Three.js geometry, lighting, animated mechanical wheel, natural pennants, window lights, character climbing, destination crystal. Dedicated scene module with careful lifecycle cleanup. Local vendored Three.js with license, no new runtime CDN dependency.

Implementation choices delegated by user: three windows per floor; stopping order left decoy, right decoy, largest central true window. Failed true window permits retrying only current floor. Nonflashing ~1.3–1.8s color phases. Wheel drag, buttons, keyboard; reduced-motion alternative uses stable named colors with manual next-color control, still submits server-validated state. Smartphone portrait is primary. Retry/reload/network errors must be recoverable.

## VIP and awards

On completion backend atomically issues one card per member per level, with monotonically allocated limited serial, level thumbnail and whitelisted membership display fields (PID/name/role/points). Do not include membership login secrets or login QR on shareable VIP. Initial edition 100 cards, editable in backend, never below issued count. Duplicate completion/retry cannot duplicate serial or reward. Out-of-stock preserves completion and existing cards; show clear status and permit later claim if capacity raised. Card can be revisited from member page even if no longer ranked top three. Downloadable image includes card data, thumbnail and prize; QR points to authenticated admin lookup, not member recovery.

Admin gains 隱花之巔關卡獎項 section. Backend validates admins/<uid> before admin operations, without needing a member PID. Each completion automatically creates a pending award record; admin page polls while visible and presents pending prize-entry forms. Optional per-level prize template and edition capacity settings. Assigned prize binds to that VIP card, visible on member refresh. Admin can mark a ready prize redeemed exactly once. Ordinary members cannot assign prizes or redeem. Never invent a monetary prize.

## API contract

Keep /api/castle existing operations. Add startLevel, stopWindow, retryFloor, myCards, claimCard; adminOverview, adminSaveLevel, adminAssignPrize, adminRedeem. Member gameplay requests levelId='tower-01'. startLevel returns {session,card?}; stop/retry take {levelId,sid,seq,stopAt?}, return {session,card?,soldOut?}. Session has sid, levelId, seq, floor (0..4), stopped ([null|colorIndex]*3), cycleStartedAt (epoch ms), seed, serverNow, failed, complete. Session floor is count of solved floors. Only server advances/validates stops and completion; never accept client 'passed'. Core colorAt(session,floor,window,epochMs) shared client/server. Standard color target indices [0,1,2,3]. Stop timestamps bounded against server time and session start, monotonically increasing. Duplicate/stale sequence does not freeze an extra window. One final transaction reads before writes and allocates card/counter/session consistently.

myCards returns {cards,levels}; adminOverview returns {cards,levels}. Level fields id,title,thumbnail,limit,issued,prizeName,prizeNote. Card fields id,levelId,levelTitle,thumbnail,serialNumber,serial,editionLimit,memberNo,name,role,points,issuedAt,prize:{name,note,status:'pending'|'ready'|'redeemed',assignedAt?,redeemedAt?}. Use server-only srv storage and existing config/admin rules; no Firestore rule deployment or broadening required. Existing top-three entitlement required to start/play/claim; myCards only requires ownership.

## UI integration

After welcome movie, show 進入第一關, allow movie skip to level after server entry. Castle overlay launches level view with same account/audio/close guards. Member page gets 我的隱花之巔 VIP 卡 shelf; list fetched through API. Admin gets independent panel and card lookup via ?admin&summit=<cardId>. Main module provides authenticated calls separately for member/admin, member snapshot, sound and session identity. Isolated preview uses deterministic fake server and prominent synthetic-data notice; no production data writes during QA.

## Scope boundaries and validation

Only first level playable. Preserve files outside bounded integration. Do not replace legacy test.html with current production. TDD shared rules, server authorization/transactions/idempotency/capacity/prizes, then lifecycle and UI checks. Browser QA through cua_repl only. Test phone-size rendering, full successful path, incorrect target retry, decoy colors, sound/visibility/close, reload card persistence via simulated service, member/admin separation. Do not claim real member or physical-device tests. Backup remote main before publication; expected_sha compare-and-swap; verify Vercel and production assets.

## User correction after actual preview
User rejected simplified procedural 3D as cheap and different from original. Preserve exact original illustration through layered art, independently animated light masks, tiny column pennants, mechanical wheel input and member sprite traversal. No primitive 3D rebuilding and no requirement for WebGL. Backend/VIP/admin unchanged. Reduced motion keeps gentle1500ms color steps, disables motion.
