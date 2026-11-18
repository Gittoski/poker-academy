# Graded preflop candidate

Release status: the user authorized production promotion of tested candidate `351c20e` on November 18, 2026. See [the production release record](PREFLOP_RELEASE.md). Earlier candidate verification is retained below; actual iPhone checks remain outstanding.

Development branch: `test/graded-preflop`. The user authorized the scoped upgrade on November 17, 2026. The user subsequently authorized main-app promotion on November 18, 2026, as recorded above.

Current follow-up: [balanced study selection](BALANCED_PREFLOP.md) replaces the initial uniform sampler for new hands. It intentionally conditions learner cards on reference categories while preserving stored deals, actual grades and Full hands.

## PF0 — Coverage audit

The catalog identifies 65 standard six-max contexts: five opens and 15 position pairings in each response family (vs open/3-bet/4-bet/5-bet). Each prefix is legal replay through the current live engine with reference bet sizes. Earlier setup actions are scenario assumptions, not learner answers or claims that earlier actions are optimal for the newly dealt cards.

An exhaustive test finds genuine shuffled seeds for every hand class in each seat, replays each context and checks all applicable learner actions against the original source. All 10,985 context/class combinations pass. The supplied PTO frequencies in these contexts are binary; this does not validate their equilibrium accuracy. Mixed alternatives remain a requirement for other supplied references and future source versions.

The adapter correctly grades these covered choices. Missing live grades result when play leaves this scope. The next milestone must prevent offering unsupported new learner prompts, preserve actual actions, and distinguish planned educational boundaries from real hand outcomes.

Verification: `npm run check` passed protected-file integrity, TypeScript and 221 unit tests across 26 files. No strategy data, protected source functions, table/card graphics or chart colors were changed. This audit alone does not implement the updated mode or establish independent solver correctness.

## PF1 — Covered progression and saved semantics

The candidate adds a graded preflop profile around the existing live engine. Cards are freshly shuffled independently of context selection. Generated public setup actions reach the declared source situation without pretending those earlier actions were learner answers. Opponents in this profile follow applicable imported chart frequencies; unrestricted Full hands retains its existing heuristic policy.

Actual learner actions are retained. Prior callers and cold-response continuations that lack a reference end practice with an educational boundary, preserving contributions and assigning no fictitious result. Normal folds, round closes and uncontested wins retain their real meanings.

Version-four saves protect the profile/context identity and generated prefix, require saved charts for accepted learner answers, and keep earlier saves compatible. Older clients reject the new version. Full-hands-only saves retain version three. Explicit upgrade moves the old preflop hand into bounded recent history and leaves the other mode's parked hand unchanged. Retries retain original attempts while restoring the exact decision/cards.

Verification: TypeScript, 226 unit tests across 27 files, protected baseline integrity and the production build passed. Deterministic sessions exercise all 65 contexts across five card seeds, check real terminals and reference boundaries, and round-trip through validation. UI/browser and actual-device verification are subsequent steps; this is not a release-completion claim.

## PF2/PF3 — Simulator integration

The existing switch opens the covered profile when it creates a new preflop slot. A stored older preflop hand remains intact and is labelled unrestricted; **Practice tools → Start graded practice** explicitly upgrades it while retaining the old hand in recent history. Mode parking, original graphics/grid/colors, entry points and unrestricted Full hands remain in place.

The preflop action row uses source sizes directly, including immediately after a setup/retry; it does not depend on a delayed editable-size state update. Correct reference actions stay compact, errors open Explanation/Chart automatically, and reference boundaries explain why Retry/Next is offered. Missing/incomplete sources block acceptance and provide recovery. Cached original feedback remains reviewable. Manual saved-decision practice does not inherit unrelated live-boundary explanations or mutate the active hand.

Settings support Any position or a fixed position. Player count, stacks, antes and opponent policy are fixed for the covered profile; unrestricted settings remain in Full hands and compatible legacy hands. The policy description distinguishes reference-following practice opponents from unrestricted heuristic sparring partners. Public setup actions are explicitly identified and never counted as learner answers.

Profile validation protects setup history, feedback, fixed configuration, source snapshots and covered subsequent transitions, and rejects post-fold or post-boundary continuations. Version-four export preserves recovery/ownership behavior. Multiple learner checkpoints and original-attempt snapshots round-trip without duplicating earlier mistakes.

## Verification and remaining checks

The final source audit covers all 10,985 context/hand-class combinations with actual shuffled seeds and applicable learner actions. A deterministic progression sample of 325 rounds produced 340 graded learner decisions, 50 explained reference-boundary endings and 275 real poker terminals. This deliberately covers study situations and action choices; it is not a population-frequency or learning-accuracy benchmark. Every declared setup context is exercised.

229 unit tests, TypeScript and baseline integrity checks pass, including synthetic positive-frequency alternatives/ties, missing data, incompatible saved configurations, exact retries, hidden-information independence and malformed post-boundary histories. The complete 106-check browser regression run passes, including offline cold starts, both modes, reference grids, review, ownership, unrelated lessons/archive behavior and phone-to-desktop layouts. Final production-build/focused confirmation is recorded with the verification artifacts.

See [logs and actual-app captures](../verification/graded-preflop/) and the [candidate test guide](../verification/graded-preflop/TEST_GUIDE.md). Actual iPhone Safari/Home Screen, touch, safe-area and on-device performance confirmation remains outstanding. The Vercel candidate deployment has not been verified. The production `work` branch is not to be merged/deployed as part of this candidate task.

Remaining strategy limits are intentional: only the declared preflop source tree is graded; prior callers/cold responses can end reference practice, while arbitrary stack/ante/size configurations and random postflop situations still need additional reference data. No new solver or precise EV-loss claims were introduced.
