# Session review delivery evidence

The focused implementation is described in [the usage guide](../SESSION_REVIEW_GUIDE.md) and [integration audit](SESSION_REVIEW_INTEGRATION.md). The original poker engine, grading functions, supplied charts/scripts and chart palettes retain their protected hashes. Only the four documented controller/feedback entries have reviewed integration baselines.

## Automated checks

- `npm run check`: integrity guard, TypeScript and 120 unit tests across ten files.
- `npm run build`: production Next.js build, including range generation from the unchanged included source data.
- `npm run test:browser`: 19 production Chromium journeys (nine original regressions plus ten review-feature journeys).

`src/learning/contracts.test.ts` tests raw vs rounded frequencies, ties, tiny support, invalid/unavailable references, content hashes, compact checkpoint restoration, selected vs executed actions, stable IDs and all 780 supplied hand scripts.

`src/learning/storage.test.ts` tests transaction idempotence, reordered writes, reload/write-ahead recovery, denied/unavailable/quota-limited storage, atomic rollback, idle hand boundaries, settings boundaries, slot reservation, empty/incompatible selection, 30,000 simulated hands across slider values 2/10/20, exact-first and own-reference related examples, cosmetic suit identity, cross-session maintenance/reactivation, first/repeat capture, 5,100-attempt compaction, pin survival, additive database upgrades, pending-file recovery, retained references for resumed-hand recovery exports and interrupted replacement import. A later cursor cannot hide an earlier failed answer.

`e2e/session-review.browser.cjs` tests automatic capture before Continue, verdict and unanswered-prompt reload, both trainers, manual/live restoration, postflop board/reference safety, paused shortcuts/NPC progression, slider persistence, delayed adaptive labels, 8/9-seat play, duplicate clicks, storage-denied export, missing-reference read-only state, competing tabs, LAN BroadcastChannel fallback, phone/tablet/desktop dialog sizing, native dialog focus/Escape and WCAG A/AA scanning. The original browser files continue checking chart palettes, ranges, complete runout, reduced motion, keyboard use and existing play.

## Measured data and bounds

A real browser fixture records an LJ opening decision, not a synthetic chart projection. Its captured serialized UTF-8 sizes are approximately:

| Record | Bytes |
| --- | ---: |
| One decision, including packed pre-decision checkpoint | 2,360–2,362 |
| Its hand record | 1,437 |
| Cached range source, once per content version | 53,298 |
| Cached script source, once per content version | 1,748 |

Minor differences in timestamps/RNG values change record lengths. The generated `storage-measurements.json` artifact contains the exact run. Other streets/scripts/notes vary; these are not promises about IndexedDB overhead or browser quota. The supplied raw script files range from 649 to 10,285 bytes (median 1,844.5), so normalization materially avoids chart duplication.

The initial soft budget remains 20 MiB, 5,000 detailed attempts and approximately 100 recent sessions of detail, with a separate cap on unused/unanswered hand detail. Compaction sizes records once, removes eligible whole-hand detail and orphan sources, and preserves aggregate counts, active cursors, representative mistakes and pinned attempts. Index/cursor queries bound review pages and candidate sets; the entire journal is not placed in React state. Protected data filling the budget results in an explicit failure/export path instead of silent deletion. The write-ahead text is bounded at 512 KiB; pending in-memory events and retained recovery-source copies are also bounded.

## Recorded implementation fixes

Verification caught and fixed a same-tab ownership issue during navigation, a first-hand source-cache cleanup race, async checkbox feedback, a pin that could otherwise fall out of recent examples, and a recovery ordering case where a later cursor could conceal an earlier failed answer. Regression tests cover these paths.

## Evidence images

See [actual-app captures](../design/session-review/README.md). These are browser captures of working flows, not design mockups.

## External release gate

Actual iPhone/Safari, VoiceOver and physical-device animations have not been tested here. Phone-sized Chromium and automated accessibility do not establish that evidence. Keep this gate open. Whole-app offline installation is M03, outside this focused feature; learning history/recovery are local, and saved reference versions support exact review. PC and phone histories do not automatically sync.

No solver branches, EV-loss measurements, opponent model or new strategy answers were generated. Related families and spacing are explicit learning heuristics, and the variation pool grows from covered decisions encountered in play.
