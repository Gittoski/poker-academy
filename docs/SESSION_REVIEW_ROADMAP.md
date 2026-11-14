# Session review feature: focused implementation checklist

Source of truth: [the agreed specification](SESSION_REVIEW_SPEC.md). Preserve the simulator as the main experience. This checklist is planned work, not completed functionality.

## R01 — Contracts, classification and preservation baseline

- [ ] Audit both trainer modes' hand/answer/cursor/selection seams and capture baseline behavior tests.
- [ ] Define versioned session, hand, decision, source, problem and scheduler schemas, stable IDs and original-versus-executed actions.
- [ ] Implement learning classification from available unrounded reference data; test ties, supported alternatives, zero support, tiny frequencies and unavailable data.
- [ ] Define metric names/copy so strict frequency scores and learning mistakes are not confused.
- [ ] Record a reviewed plan for narrow controller integrity-baseline updates; leave engine/data/palette baselines intact.

Done when the record/grade contract and equivalence tests are executable before feature wiring.

## R02 — Bounded local storage, sessions and recovery

- [ ] Implement indexed storage, atomic/idempotent writes, reference normalization, migrations and the bounded pending-write recovery buffer.
- [ ] Add automatic session lifecycle, safe inactivity boundaries, compact live checkpoints and hydration gating.
- [ ] Implement an initial storage budget, deduplication, pruning rules, honest failure state and export/import; protect unresolved representatives/pins.
- [ ] Define multi-tab ownership/fencing and test corrupted/unavailable/quota-limited storage.

Done when a submitted mistake can survive reload without Continue/End session, and the app never falsely claims a failed save succeeded.

## R03 — Automatic capture in normal play

- [ ] Wire both current trainer modes into the learning provider through the audited seams.
- [ ] Record every decision once, automatically queue outside-reference choices and keep supported alternatives separate.
- [ ] Persist active hand/verdict/NPC state without rerolling cards or double-firing actions on resume.
- [ ] Add compact session status and Review entry using the current navy interface; no per-mistake Save button.
- [ ] Test seeded ordinary play, custom ranges, keyboard answers, settings changes and old flows; deliberately update only approved controller guard entries.

Done when normal play behaves as before and new sessions/history are durable without manual saving.

## R04 — Review area and exact manual practice

- [ ] Add session summaries and grouped mistake lists, source/context details and public-information timelines.
- [ ] Show selected action versus scripted continuation, applicable chart and unavailable-source/read-only states.
- [ ] Implement Retry this decision / Play this hand, with original attempts retained and practice separated.
- [ ] Pause/preserve live play and suppress its shortcuts while reviewing; restore focus and live state on return.
- [ ] Add optional notes/pins and verify source-version changes/restore after reload.

Done when exact manual review is reliable in both modes without exposing future cards or altering the paused hand.

## R05 — Adaptive exact reviews and user controls

- [ ] Implement the independent, persistent randomized-slot scheduler, compatible source selection and explicit target tracking.
- [ ] Add Mix in my mistakes and the About 1 in N slider (proposed N 2–20, default 10).
- [ ] Begin adaptive hands at preflop; reveal review status after the target answer and handle unreached targets.
- [ ] Keep the ordinary chooser unchanged when off/ineligible; avoid catch-up bursts and mid-hand setting effects.
- [ ] Verify both modes, current setup/hero filters, empty pools and statistical target share over seeded test runs.

Done when exact errors reappear naturally at the selected approximate rate without altering poker rules or source policy.

## R06 — Related examples, spacing and improvement

- [ ] Build a conservative index of existing covered examples and explicit skill tags; do not invent strategy answers.
- [ ] Use exact-first, then varied covered reviews; distinguish cosmetic suit permutations from new examples.
- [ ] Add due/maintenance/archive states and cross-session success rules, including lower priority after improvement and reactivation on a miss.
- [ ] Test no-example fallback, deduplication, source/config isolation, exposure tracking and no selection by future win/loss.

Done when reviews support transfer beyond memorizing one hand and recorded improvement has honest evidence.

## R07 — Retention, analytics and recovery hardening

- [ ] Tune the proposed storage/count limits using measured real records and source caches.
- [ ] Verify compaction preserves summaries, group counts and representative unresolved/maintenance/pinned hands.
- [ ] Show simple session/weakness views with regular/adaptive/manual and first-exposure distinctions; avoid a new dashboard-heavy flow.
- [ ] Stress-test many sessions/attempts, interrupted exports/imports, source updates, partial writes and multi-tab conflicts.

Done when normal long-term use stays bounded and recovery/storage management is understandable.

## R08 — Complete verification and delivery

- [ ] Run integrity, TypeScript, all unit/regression tests, production build and both-mode browser journeys.
- [ ] Test mobile/desktop layouts, keyboard/focus, reduced motion and automated accessibility.
- [ ] Capture actual-app examples of a saved mistake, review/retry, slider controls and adaptive return.
- [ ] Update README, active roadmap, migration/retention notes and verified limitations; commit and push verified changes to the configured user repository.
- [ ] Run actual iPhone/Safari checks when available; otherwise keep that external release gate explicitly open and identify the missing evidence.

Available automated completion does not imply actual-device validation or proof of strategy optimality.

## Rules for every step

Implement one bounded step, test it, fix failures, regress prior behavior, update evidence and commit before continuing. Do not mark a milestone complete just because its UI exists. Do not switch into unrelated curriculum or simulator-rewrite work. Keep the existing navy theme and chart palettes.
