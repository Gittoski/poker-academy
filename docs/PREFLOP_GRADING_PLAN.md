# Fully graded preflop practice

Planning baseline: `79c0993`, inspected November 17, 2026. The user approved implementation after planning. The candidate is on `test/graded-preflop`; see the implementation record for verification and remaining device/review checks.

## Priority and intended experience

Complete dependable preflop learning before implementing the [postflop grading plan](POSTFLOP_GRADING_PLAN.md). Preserve the approved navy simulator, current table/cards, original range-grid colors, mode switch, navigation and existing saves.

Recommended scope: make **Preflop** a clearly identified, fully graded reference-practice profile. Keep **Full hands** as unrestricted live simulation. Every new learner decision offered by the covered profile must have an applicable source and must receive feedback. This does not claim that existing charts can grade every legal preflop situation in unrestricted poker.

Use fresh shuffled cards and the live legal-action engine. A covered training situation can use a generated legal action prefix; disclose that this selects a reference situation rather than representing an unbiased distribution of live games. Do not restore the old selected-hand scripts, force a correct continuation or silently modify a player's choice.

## Current audit

The imported `Cash_100_PTO` set contains 207 entries across its supported table sizes. Metadata matching identifies a chart for every standard six-max context below:

| Context | Six-max position pairings |
| --- | ---: |
| Raise first in | 5 |
| Facing an open | 15 |
| Facing a 3-bet | 15 |
| Facing a 4-bet | 15 |
| Facing a 5-bet | 15 |
| Total | 65 |

This is a metadata inventory, not independent validation of strategy correctness or complete live-history coverage. An exhaustive 169-hand-class audit of these 65 contexts would cover 10,985 context/hand-class combinations, with all applicable learner action choices tested separately.

The current [live adapter](../src/simulator/liveReference.ts) deliberately refuses to score prior limps/callers, cold re-raise responses, unsupported sizes/stacks/antes and checks. The heuristic [opponent policy](../src/simulator/livePolicy.ts) can create these histories. Its documented reference sizing improves coverage but does not constrain all action branches. Chart metadata being present is therefore insufficient to guarantee that a live decision can be graded.

The earlier [reference hand controller](../src/lib/handSim.ts) contains useful context/prompt concepts, but it too has unsupported boundaries. Reuse tested reference logic where suitable while retaining live-engine legality and the newer saved-feedback/mode behavior. Do not replace the current engine with the old controller.

## Proposed first-release contract

| Item | Covered Preflop profile |
| --- | --- |
| Game | Six-max, 100 BB starting stacks, cash, no antes |
| Positions | LJ, HJ, CO, BTN, SB, BB in applicable contexts |
| Source | Existing imported Cash 100 BB PTO charts, retaining their documented provenance limits |
| Situations | The 65 standard contexts, after complete source and legal-history checks |
| Sizing | The existing reference sizing rules, including the SB open and positional re-raise sizes; no invented sizes |
| Learner options | Applicable legal actions at the covered node, including incorrect choices; raise options use the reference size |
| Grades | In range for supported actions; outside this reference for zero-support choices when source precision permits that classification |
| Details | Original chart, exact chosen hand, position/action context, action frequencies, source and reviewed explanation |
| Learning flow | Compact positive feedback; automatic error explanation; exact Retry and Next/Continue controls |
| History | Automatic original-answer recording, separate retries, stable references after reload/source updates |
| Round end | Preflop round complete, learner fold, real uncontested result, or an explicitly explained reference boundary; no postflop runout |

Coverage constraints must be visible before practice. Keep arbitrary stack sizes, antes and custom bet sizing available in unrestricted Full hands. Do not silently carry an incompatible configuration into a profile advertised as fully graded.

## Keeping the grading guarantee honest

1. Validate a source-backed decision before enabling the learner's buttons. Missing or corrupt data pauses practice with Retry/recovery instead of accepting an ungradable answer. Explicit ungraded practice belongs outside this guaranteed profile.
2. Generate and replay legal, covered prefixes. Opponents act using their own cards and public history; neither their sizing nor their action selection may unexpectedly create an unsupported learner prompt. Document training constraints and any conditional sampling; do not present constrained opponents as a calibrated recreational-player population.
3. Grade the actual learner action before applying it, using only decision-time information. Permit a wrong action to receive a wrong-reference grade; never remove all wrong options merely to produce a perfect score.
4. Continue the actual action branch when the required references exist. If a learner's limp/call or another action takes the sequence outside the source tree, keep that action and its grade, explain the boundary and offer Retry or Next practice hand. Do not invent an opponent response, quietly correct the action, assign a fictitious winner or introduce another ungradable prompt.
5. A BB walk has no learner decision to grade. A normal round close is terminal, not a missing-answer problem. A limp/check decision requires its own reference and is not included by pretending it is an ordinary open-response chart.
6. Measure both graded-decision coverage and practice reach: decisions offered/answered, covered branches, boundary endings by cause and exercised contexts. Frequent boundary endings or missing scenario families must not be hidden behind a 100% grading percentage.

An unexpected missing reference in a declared covered branch is a release-blocking defect, not a normal training boundary. Planned boundary endings must be explicitly enumerated and tested. If uninterrupted whole-hand continuation after any arbitrary legal action is required, new reference families are a prerequisite; this scoped guarantee does not meet that broader requirement.

## Milestones

### PF0 — Audit and freeze the coverage contract

- [x] Inspect the live adapter, opponent behavior, existing reference trainer, mode storage and imported chart metadata.
- [x] Count the 65 standard six-max metadata contexts and record current unsupported cases.
- [x] User approved implementing this covered-practice upgrade while retaining the existing simulator interface and Full hands mode.
- [x] Audit all 65 contexts and 169 classes with genuine shuffled/replayed deals, legal learner options and source frequencies. The current imported PTO set resolves to binary weights for these contexts; positive-frequency alternatives remain supported by the adapter.
- [x] Record reference sizes/configuration and planned caller/cold-response boundaries. Zero support describes the selected imported reference, not an independently verified GTO error.

Done when every declared context and all possible learner actions at that context have an explicit grade and transition rule. Existing imported labels must not become new claims of independently verified GTO accuracy.

### PF1 — Covered preflop generation and progression

- [x] Implement separately scoped covered-practice generation around the existing live rules/replay engine.
- [x] Randomize cards and vary applicable positions/contexts. Keep the full declared scenario catalog reachable, with optional focus using the same sources.
- [x] Define covered opponent actions, sizing, calls, raises and terminal boundaries; avoid unsupported learner prompts without silently folding players or replacing their actions.
- [x] Retain every actual learner choice and explicitly distinguish real poker terminals from educational reference boundaries.
- [x] Prove legality, deck uniqueness, contributions/stacks, correct acting order, blind-vs-blind sizing and all-in call/fold boundaries.
- [x] Keep unrestricted Full hands logic and dealing behavior unchanged by the preflop-only profile.

Done when deterministic tests exercise every declared family and randomized journeys produce no unexplained missing references or action substitutions. No flop cards are dealt by Preflop practice.

### PF2 — Feedback, charts and review

- [x] Show a reference grade after every accepted learner decision, including wrong calls/folds and reference-sized raises.
- [x] Preserve positive-frequency alternatives and ties as supported. A single click is not evidence of correct long-run mixing.
- [x] Use the original range grid and frequencies. Show the precise source context and action taken before revealing recommended actions.
- [x] Explain the supplied recommendation using reviewed educational reasoning; identify assumptions, retain provenance limits and make no invented EV-loss claims.
- [x] Preserve automatic error explanation, compact supported feedback, fixed controls, exact retry and immediate fold-stop behavior.
- [x] Record original errors automatically; prevent duplicate records from rapid taps, reloads, retries or mode changes. Original grades stay stable when charts change.
- [x] Keep ungraded legacy answers, hinted retries and fresh attempts separate in progress. Do not classify an old uncovered choice as a learner mistake.

Done when all declared prompt/action combinations receive appropriate reference feedback and the full answer → explanation/chart → retry/continue → review flow survives reloads.

### PF3 — Mode settings, existing saves and offline behavior

- [x] Keep the same Preflop switch, approved navy materials and simulator navigation. Clearly name the covered setup without adding a complex configuration dashboard.
- [x] Scope configuration and state by profile/mode. Entering six-max practice must not overwrite a parked 8/9-seat or custom-stack Full hands game.
- [x] Preserve incompatible older preflop hands and feedback. Provide an explicit migration/start-new-practice path; never silently redraw cards, discard actions or call legacy unrestricted practice fully graded.
- [x] Version any changed saved semantics so stale clients cannot corrupt new checkpoints. Keep export, ownership, storage-failure recovery and bounded retention.
- [x] Reuse the bundled chart URL/offline assets; confirm cold-start practice, invalid data, chart retries and missing-source behavior without accepting ungraded answers into the covered profile.
- [x] Correct misleading live-mode descriptions where they still imply solver-controlled opponents or automatic action substitution, while retaining appropriate archive wording.

Done when both modes preserve their own exact state, prior data remains recoverable, and covered practice can run offline after a complete pack is installed.

### PF4 — Exhaustive verification and user-testable candidate

- [x] Test all 65 declared contexts × 169 hand classes against the imported source, including all applicable actions and standard sizes; verify known source examples independently of the adapter under test.
- [x] Test real combo-to-class mapping, positional source selection, mixed strategies, ties, all-ins, source precision, invalid data and intentionally unsupported histories.
- [x] Verify hidden opponent cards, unseen deck order and later outcomes cannot change a decision's recommendation. Replays must restore the exact original spot.
- [x] Run randomized sessions with fixed reproducible seeds across positions and scenario families; report grade coverage, boundary endings and reach rather than only accuracy.
- [x] Test actual player journeys on phone/desktop viewports: correct/wrong choices, automatic overlays, chart inspection, Retry, Next, modes, saves, reload, offline and multiple tabs.
- [x] Run relevant unit tests, TypeScript/integrity checks, production build and regression browser checks for existing Full hands, ranges, review, learning and navigation.
- [x] Check no page scrolling, overlapping controls or clipped feedback. Record actual iPhone Safari/Home Screen verification separately from browser emulation.
- [x] Commit verified work on an isolated test branch, update this checklist/ROADMAP and provide a testable candidate for review before main-app merge or deployment.

- [ ] Actual iPhone Safari/Home Screen touch, safe-area and on-device performance confirmation, followed by user review of the test candidate.

Done when every accepted decision in the new covered profile is graded, no ordinary generated path lacks a source, all enumerated boundaries are explained and tested, the source catalog is reachable, and existing app features pass regression checks. Missing device access remains an explicit verification limit.

## Next goal

The copy-ready development instruction is [GRADED_PREFLOP.md](goals/GRADED_PREFLOP.md). Its recommended scope assumes covered training with standard sizes. The user's answer about unrestricted versus covered practice takes precedence; revise the goal if that preference differs. Implementation was authorized after planning. Production merge/deployment remains outside the candidate task; actual device review is still required.
