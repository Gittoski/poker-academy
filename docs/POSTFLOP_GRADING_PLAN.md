# Postflop grading implementation plan

Planning baseline: `42a6a1b`, inspected November 17, 2026. This is a development checklist, not a claim that postflop grading is implemented or validated.

## Goal and boundaries

Build a simulator in which every decision **inside a declared training configuration** receives applicable reference feedback, an inspectable strategy chart, explanation, retry and automatic mistake recording. Preserve the approved navy table, cards, navigation, Full hands/Preflop switch, existing range viewer and fold-stop behavior.

The broader goal remains grading normal live play across many situations. A first covered configuration does not cover unrestricted random boards, arbitrary bets, every stack depth or multiway pots. Show that boundary clearly. Never convert a missing answer into a correct/incorrect grade, substitute the nearest board or size, silently alter the player's choice or change the cards to make a chart match.

Strategy grades compare actions with a specified model. An equilibrium reference assumes starting ranges and rules; it is not a universal answer against every recreational player. Exploit recommendations require a separately named opponent model.

## What we already have

| Asset | Inspected state | Reuse / gap |
| --- | --- | --- |
| Live engine and approved UI | Shuffled deck, legal actions, integer chip ledger, streets, all-ins, replay, retry, compact/overlay feedback | Preserve these; add a separate strategy adapter |
| Imported preflop charts | Current exact-context preflop grading and original grids | Reuse applicable ranges; their solver provenance is not independently verified |
| Imported flop references | 276 files indexed across 23 position/pot families | Candidate source material; audit context, numerical quality, precision and permissions |
| Archived hand exercises | 780 exercise records | Selected paths with feedback, not complete branching strategies |
| Solver scripts | TexasSolver invocation, spot generation, compact exports and hand generation | Reuse concepts and input definitions after audit; no configured solver binary was found |
| Save/review/offline infrastructure | Existing live checkpoints, bounded history, offline asset pack | Extend with versioned reference identities and bounded storage |

Relevant code: [solver runner](../scripts/lib/solver.mjs), [spot definitions](../scripts/postflop-spots.mjs), [flop exporter](../scripts/solve-postflop.mjs), [hand generator](../scripts/generate-hands.mjs), [live reference adapter](../src/simulator/liveReference.ts). See [source provenance limits](UPSTREAM.md) and [current feedback coverage](implementation/FEEDBACK_RECOVERY.md).

Important findings: the flop exporter retains only flop action nodes; the hand generator stores selected continuations and re-solves later streets on those paths. The strategy compactor rounds probabilities to whole percentages. The current runner deletes temporary inputs/output, does not retain a full solve audit, and needs stronger checks for missing/non-finite convergence evidence. These outputs cannot simply be plugged into arbitrary live postflop decisions.

## First complete training configuration

| Item | Proposed initial scope |
| --- | --- |
| Game | Six-max no-limit cash table, heads-up postflop |
| Positions | Button opens, big blind calls; all other players fold |
| Starting stacks | 100 BB each, no antes |
| Preflop size | Button raises to 2.5 BB; big blind calls |
| Flop accounting | Pot 5.5 BB, including folded small blind's 0.5 BB; both active players have 97.5 BB behind, before rake |
| Learner | Either button or big blind |
| Starting ranges | Explicit weighted ranges stored with the reference, conditioned on the declared preflop sequence; assumptions rather than knowledge of the opponent's actual cards |
| Rake | Explicit zero-rake engineering pilot; raked live-game references are a separate expansion |
| Boards | One explicitly identified flop first; expand after the complete tree passes validation |
| Actions | Check/call/fold, all-in where legal, and a documented finite selection of bets/raises derived from the solve |
| Continuations | All declared action branches and legal turn/river outcomes required by the pack, through fold or showdown |

The existing small betting tree is a starting candidate, not an approved solve specification. Confirm the solver's bet/raise units, effective-stack semantics, rounding and all-in rules before adopting it. Displayed BB amounts must map exactly to legal integer-chip actions in the live engine.

The first implementation is an isolated technical pilot. Decide its normal simulator entry point after the complete path is proven. Any focused training that samples covered cards or limits bet sizes must identify those constraints; normal unrestricted live play keeps its original dealing and legal actions. A genuinely unrestricted session only receives this reference when its full context matches.

## Milestones and completion checks

### P0 — Source and feasibility audit

- [x] Inventory the current references, exercises, solver scripts and live integration points.
- [x] Record the missing full branches, probability precision, solver setup and source-validation requirements.
- [ ] Identify a usable solver revision and confirm its license, build requirements and how generated output can be distributed. Audit the input ranges separately from solver code.
- [ ] Determine the environment's actual RAM, compute and disk budget; establish a bounded pilot run and cancellation/timeout behavior.
- [ ] Define all rules, ranges, rake, units, bet sizes, probability precision and numerical acceptance criteria for the pilot.
- [ ] Confirm reported convergence/exploitability units and interpretation. Do not treat an iteration count, requested accuracy or a stored number as proof of sufficient accuracy.

Done when there is a reproducible, technically and legally usable source path and a documented pilot specification. Imported data remains candidate material until this audit passes.

### P1 — Reproducible solver proof

- [ ] Build/configure the selected solver without changing the running app.
- [ ] Run a small terminal/river verification case before a full flop solve; compare suitable results with independent exact payoff calculations and known invariants.
- [ ] Preserve solver revision/build identity, exact inputs, ranges, original output precision, logs, completion status, convergence evidence and content hashes.
- [ ] Fail cleanly on timeout, malformed output, missing/non-finite evidence or unmet acceptance criteria. Never publish a partial solve as a finished reference.
- [ ] Compare repeated/increased-budget solves for numerical stability using documented tolerances; preserve the limitations of the chosen game abstraction.

Done when a small reproducible reference passes numerical checks. Matching logs from the same tool alone are not independent validation.

### P2 — One complete branching strategy pack

- [ ] Generate a full flop-to-river tree for the initial flop and configuration, including every declared action and chance continuation.
- [ ] Preserve exact two-card-combination strategies and sufficient probability precision; retain source precision limits.
- [ ] Include weighted starting ranges, conditional range updates, board blockers and zero-reach behavior. A combo excluded by the assumed range is not automatically a strategy error at a later node.
- [ ] Define pack metadata: version/hash, source, rules, rake, positions, ranges, board coverage, tree, chip units and numerical evidence.
- [ ] Measure output size and working memory before committing to a mobile format. Compress/shard/index by state as needed; never discard branches while claiming complete coverage.
- [ ] Validate every pack edge against legal live-engine actions, acting player, board, contributions, pot, stacks, refunds and terminal results.
- [ ] Preserve suit mappings consistently across the board, both ranges and the learner's exact cards. Do not match a merely similar board texture.

Done when every advertised decision node is reachable and has valid applicable data, or is explicitly terminal. Unexpected holes invalidate the pack's complete-coverage claim.

### P3 — Simulator matching and fair grading

- [ ] Add the new adapter separately from poker rules and the existing preflop source. Reuse engine replay and approved table components.
- [ ] Specify covered-training card sampling, action menu and opponent policy. Opponents' sizes must also stay within the declared tree in covered practice; an observed opponent action outside it ends reference coverage in unrestricted play. Disclose constraints and keep reference assumptions distinct from the bot's actual heuristic tendencies.
- [ ] Match the entire public configuration and action path, with an exact learner combo and applicable range assumptions. Do not use hidden opponent cards, the remaining deck or later outcomes to choose a recommendation.
- [ ] Distinguish supported actions, choices outside the selected reference, numerical uncertainty, and genuinely uncovered situations.
- [ ] Define handling of tiny probabilities, rounded values, zero reach and solver error before calling a choice unsupported. A low frequency is not an EV-loss estimate or a measure of how bad a decision was.
- [ ] Give positive-frequency mixed alternatives credit. Never require the most frequent action unless the exercise is explicitly a frequency drill.
- [ ] Treat unsupported custom sizing as outside coverage, rather than grading it using a nearby size. Legal unrestricted play can continue ungraded.
- [ ] Test incompatible preflop histories, excluded learner combos and off-tree opponent actions explicitly; never reuse an otherwise similar node for these cases.
- [ ] Keep the learner's chosen continuation, retry the exact decision, stop immediately on learner fold and show actual calculated showdown outcomes.

Done when all eligible pilot decisions receive reference feedback and all deliberate out-of-scope cases are identified honestly. A zero-frequency reference choice is labelled outside that reference, not proof of a universal poker error. BB/EV-loss claims require actual comparable action values and numerical validation.

### P4 — Explanation, chart and mistake-review loop

- [ ] Reuse compact positive feedback, automatic error explanation, original chart styling and fixed Retry/Continue controls; scroll only inside overlays on phones.
- [ ] Display the decision-time situation, actual action, supported options/frequencies, source/model and limitations.
- [ ] Grade the exact combo. The 169-cell chart is a summary; explain suit/blocker differences when a hand class contains combinations with different strategies.
- [ ] Use reviewed educational explanations. Identify assumptions or heuristics; frequencies alone do not prove why a solver favors an action.
- [ ] Save mistakes automatically with pack version/hash, node/path, actual combo, original frequencies, original classification and sufficient context for stable review.
- [ ] Keep retries and hinted answers separate from fresh attempts. Exclude ungraded/uncertain decisions from the correctness denominator and weakness claims.
- [ ] Avoid copying an entire tree into each saved attempt. Preserve compact original feedback; define reference-pack pinning, retention, deletion and unavailable-pack recovery behavior.

Done when answer → explanation/chart → retry/continue → saved review works across reloads and updates, without regrading history or revealing future information.

### P5 — Offline/mobile verification and pilot release

- [ ] Package a versioned, resumable offline reference download with size shown before downloading, checksums, atomic activation and rollback on failure.
- [ ] Handle storage quota/eviction and unavailable packs honestly; retain the previous save and functioning reference until replacement is complete.
- [ ] Measure download size, startup, lookup latency, memory and storage using the actual pack. Set budgets from measured results, not invented performance promises.
- [ ] Run TypeScript, integrity checks, relevant unit tests, production build and complete browser regressions.
- [ ] Test all pilot branches programmatically plus player journeys covering calls, folds, raises, mixed actions, all-ins, retries, reloads, offline cold starts, ownership and missing/corrupt data.
- [ ] Confirm no hidden-card/outcome leakage and no duplicate mistake recording. Test no-scroll layouts, long explanations, chart focus and reduced motion.
- [ ] Test on an actual iPhone 13 in Safari and Home Screen mode, plus a computer. Viewport emulation does not satisfy this device check.
- [ ] Present the working pilot for user testing before merging/deploying simulator changes to the main app.

Done when the pilot has complete declared coverage, correct feedback, stable saves, measured acceptable offline behavior and recorded device verification. Keep unresolved hardware checks explicitly open.

### P6 — Broader coverage and exploitative training

- [ ] Expand verified board families, then positions, three-bet pots, stacks, rake and bet sizes, one pack family at a time. Each expansion repeats matching, precision, storage and regression checks.
- [ ] Track coverage: total eligible decisions, reference-graded decisions, uncertainty and reasons for uncovered decisions. Coverage is separate from learner accuracy.
- [ ] Add assessments using unfamiliar boards/configurations; suit permutations and immediate retries are not independent evidence of improvement.
- [ ] Add opponent-specific exploit models with declared deviations and separately validated outputs. Keep baseline reference grades and exploit recommendations distinct.
- [ ] Treat population tendencies as assumptions unless supported by an identified dataset; distinguish population claims from observations about a particular player.
- [ ] Investigate multiway sources separately; do not reuse heads-up strategies as multiway answers.
- [ ] Consider optional online solving only after measuring offline coverage gaps and obtaining a separate hosting/cost decision. Vercel serving the app is not an assumed long-running solver service.

## Work order and practical decisions

Start with **P0, then P1**. Do not build a broad grading UI before establishing a reproducible source. The pilot should preserve the current app and use an isolated implementation branch; existing preflop grading, charts and saved history remain regression requirements.

Routine technical choices can be made independently. A paid data source, redistribution restriction, materially different gameplay constraints, a remote solver service or a major compute/storage requirement needs a concrete comparison and a user decision. No paid service or new backend account is assumed in this plan.

The first deliverable is a source/feasibility report and a reproducible small solve, followed by one complete branching postflop pack. The offline scope, storage footprint and broader coverage schedule remain unmeasured until that proof succeeds. No full-coverage or delivery-date claim is made by this plan.
