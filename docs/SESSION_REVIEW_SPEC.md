# Sessions, automatic mistake review and adaptive simulator practice

Status: collaboratively agreed product direction; R01–R08 implemented with all available automated checks passing; actual-device release gate remains open. This refines M01/M02 and the first simulator-focused part of M08 in the broader learning plan. The approved navy theme and current working trainer remain the foundation.

## Confirmed choices

The user chose all of the following during planning:

1. Sessions start automatically; reload resumes play, and an inactivity gap can start a new session.
2. Practice first returns to the original missed spot, then mixes in different existing hands exercising the same skill.
3. Review hands are distributed unpredictably at an average frequency, rather than at a visibly fixed interval.
4. An adaptive review hand starts from preflop, preserving the feeling of normal play. Manual review can jump directly to the missed decision.
5. Adaptive review status is revealed only after the targeted decision has been answered.
6. Only choices outside the supplied reference enter the mistake queue automatically. Supported mixed alternatives are recorded separately.
7. Successful reviews across sessions gradually reduce a problem's priority; its history stays in the archive.
8. Older detailed attempts can be automatically condensed while retaining session summaries, mistake groups, counts and representative hands.

Fixed requirements: saving requires no Save button, marking action, Continue click or end-of-session confirmation. Reviews support the simulator; they do not become a separate compulsory course. Turning adaptive review off must not turn automatic mistake capture off.

## The player experience

### Normal play

Start playing and a session begins automatically. Every submitted decision is recorded once. When a reference error occurs, the app saves it immediately and shows the normal feedback. The player can continue without entering a review screen.

A compact session indicator and Review entry sit near the existing session/score area. Do not add a dashboard or extra steps before dealing. Preserve the current Continue/Next hand controls; those controls are not responsible for saving.

### Review area

Two primary views are enough:

- **Sessions:** recent sessions, hands/decisions, reference errors, supported alternatives and separate regular/adaptive/manual-practice results. Open a session to see its mistakes and the public hand timeline.
- **Mistakes:** grouped recurring problems, representative examples, last-seen state and practice history. Filters can include position, street, scenario, active/maintenance/archive and session. More detailed filters stay optional.

Opening a mistake shows the original cards/position/public history, the player's choice, the supplied reference, its source/version and the appropriate chart when available. Explain which choice the scripted continuation actually used. Provide **Retry this decision**, **Play this hand**, an optional note and optional pin. Saving itself is always automatic.

A review or manual practice excursion preserves and pauses the live hand. Returning restores the same live state. A review overlay must suppress background poker shortcuts/timers and restore focus correctly; a separate route must achieve the equivalent using persisted state.

### Adaptive controls

Use one switch, **Mix in my mistakes**, and an integer slider labeled **About 1 review hand in every N hands**. Proposed initial default: enabled, N = 10; range 2–20. This range/default is an implementation proposal, not a separately confirmed user choice.

| Slider value | Target share of review hands |
| --- | --- |
| 2 | About 50% |
| 10 | About 10% |
| 20 | About 5% |

The denominator includes regular and adaptive training hands, not individual decisions. Count a completed hand only if it presented at least one player decision. Auto-walks/unsupported automatic hands do not inflate the interval. Manual review practice has its own counters.

Apply a changed setting at the next hand boundary. Never redeal, replace the current cards, or change an in-progress decision. With the switch off, use the original normal-hand chooser and keep recording mistakes. With no eligible due problem, simply deal normally; there is no error or forced review.

## Sessions and resuming

Proposed inactivity threshold: 30 minutes, configurable in code and documented rather than exposed as another required control. Activity means player interaction, not passive background NPC timers. Handle clock rollback without inventing negative durations.

Reloading during a hand restores its cards, source, pending choice/verdict and progression. Do not generate a fresh hand or advance bots while recovery is loading. An interrupted hand stays attached to its original session even after a long gap; close that session at the safe hand boundary and start the next one on the next deal. Do not split or lose a hand to satisfy a timer.

A manual Finish session action may be offered but is never required for saving. Empty provisional sessions should not clutter history. Session time must distinguish active play from long idle periods.

## Define a mistake honestly

The current `gradeIndex` rewards the most frequent reference action, marks other positive-frequency choices partial and assigns wrong to zero-frequency choices. Its output is not an EV-loss measurement.

Create a separately versioned learning classification:

- **Most-frequent reference match** — chosen action is a most-frequent supported option, with ties handled explicitly.
- **Supported alternative** — another action with positive support in this reference. It is not automatically a poker error or added to the mistake queue.
- **Outside this reference** — the chosen action has zero support in an applicable reference; this is the automatic mistake-book trigger.
- **Unclassified/ungraded** — unavailable, invalid, obsolete or unmatched source. Do not fabricate a mistake or verdict.

Use original weights/percentages at their available precision, not rounded button text. Preflop currently rounds frequencies before its legacy grade; a tiny positive source frequency must not become an automatic mistake just because its displayed percentage rounds to zero. Respect a source's documented numerical tolerance where applicable; do not invent a universal solver threshold.

Retain the original grade for audit, distinguish the legacy frequency-drill score from learning metrics and align user-facing copy so a supported alternative is not misleadingly presented as an error. Preserve `gradeIndex` as a legacy/reference-frequency function unless a specifically tested change is needed; never silently regrade historical records. No EV loss or universal GTO claim is inferred from frequencies alone.

A supplied reference error is not proof that an exploit against a real opponent is wrong. This feature does not add an opponent model or solve new branches.

## Automatic recording and storage

Use IndexedDB for structured local history and indexes. Keep only the active cursor, current query page and a small pending-write buffer in application memory. Do not load the entire journal into React or serialize it into one growing localStorage value.

Record decisions at answer submission, before their context is changed. Use stable hand/decision/attempt IDs and idempotent transactions so rerenders, double clicks, keyboard repetition, hydration and recovery cannot double count a decision. Store attempt, session summary and problem counters atomically. Capture the cursor as NPC/player transitions occur, overwriting the current cursor rather than recording every animation/tick.

Use a small bounded write-ahead buffer for pending critical records, recover it on startup and clear records only after IndexedDB commits. Do not wait until Continue, page unload or session completion. Exact browser termination cannot be guaranteed against all storage failures: show honest pending/unsaved status and provide an in-memory export/recovery path if saving fails. Normal play should not freeze on a storage error.

### Normalized records

| Record | Purpose |
| --- | --- |
| Source version | Immutable range/script identity and content hash; cache required reference content once, not in every attempt |
| Session | Start/last activity/end, settings/context and aggregate counters |
| Hand attempt | Unique ID, session, source/setup, original deal/suit mapping, completion and origin: regular/adaptive/manual |
| Current cursor | Compact resumable state, decision ordinal, pending verdict/NPC action and deterministic replay information |
| Decision attempt | Exact pre-decision checkpoint reference, action/options, original frequencies, legacy grade, learning classification, timestamps and target/first-exposure flags |
| Problem | Canonical missed context, aggregate errors/reviews, first/last seen, current due/maintenance state and representative examples |
| Skill group | Conservative tags linking genuinely related covered examples; distinct from an exact missed question |
| Preferences/scheduler | Toggle, N, randomization state, review-block progress and anti-duplication metadata |

Strip embedded range entries, duplicate strategy grids and other derivable data from checkpoints. Reattach them from the matching cached source version. Store the small original prompt needed for an honest read-only review if that source later becomes unavailable. Do not silently use a newer chart in an older saved question.

The existing library contains 780 hand scripts; measured source files range from 649 to 10,285 bytes, with a median of 1,844.5 bytes. Examples of existing range packs are roughly 54–133 KB. These are file measurements, not projected browser-record sizes. Caching once per source version and storing references avoids multiplying those files by every attempted decision.

### Keep storage bounded

Proposed initial engineering targets, to validate with real serialized fixtures:

- A soft learning-data budget around 20 MiB, including retained reference copies; this is not a claim about the browser's available quota.
- Keep recent detailed attempts, initially capped at 5,000 and approximately 100 recent sessions of detail; compact older detail when either limit/budget requires it.
- Keep older session summaries and grouped mistake statistics. A repeated miss updates counts and recent examples rather than creating an unlimited collection of identical full snapshots.
- Retain representative checkpoints for unresolved/maintenance problems and pinned hands. Prune eligible old detail and unreferenced source copies first, not the only replayable example of an unresolved problem.
- Show storage usage and a concise explanation of retention. Offer explicit JSON export/import and separate clear-history controls with confirmation.
- If protected data alone exhausts usable storage, preserve it, warn honestly and allow export; do not silently claim that new detailed records were saved or delete unresolved problems.

Actual IndexedDB overhead/quota varies. Estimate usage where supported and test quota denial, interrupted writes, malformed data and eviction. The first implementation must already have bounds and error handling, not postpone them to a later hardening phase.

Data remains local to that browser/device without an account. PC and phone history will not automatically synchronize; export/import is the initial transfer mechanism. Whole-app offline installation remains a separate roadmap item, though reference retention and local recovery must be designed compatibly.

## Replay contract

An exact retry must restore the visible cards/suits, position, public actions, stacks/amounts, original source version, options and target node. Preserve the original full-hand/fold-training deal variant. Resuming and replaying must not reveal a future board or hidden opponent cards at an earlier point.

Keep separate fields for **the player's chosen action** and **the action executed by the trainer**. Full-hand mode currently corrects choices back onto a supplied line; preflop mode follows the player's selected action. A review must not pretend that a corrected scripted bet was the player's original choice.

Manual Retry starts at the saved decision; Play this hand and adaptive insertion begin from preflop. The target is only counted as reviewed if the player actually reaches and answers it. If an earlier branch ends the hand first, leave the problem due. Never invent a continuation or evaluate a missing node.

Use deterministic per-hand decision/replay inputs or persist the pending stochastic action as needed. Do not call the original random-hand factory on rehydration and hope to reproduce the same state. Verify strict-mode mounting and timer recovery carefully.

## Adaptive selection

### Eligibility comes first

Only select an example compatible with the current mode, format, table size, stack, range/sizing profile and any fixed hero-seat filter. Use the right source version and available reference data. Never silently switch the user's game configuration to make a saved problem fit.

Regular-hand selection remains the existing chooser. The review chooser changes which eligible hand is selected, not betting rules, source strategy or opponent policy.

### Randomized, bounded insertion

Recommended implementation: choose one randomized review slot within each block of N eligible training hands. This provides unpredictable placement while matching the requested average better than an unconstrained coin flip. Block boundaries remain invisible. Persist the slot, counter and independent scheduler random state so reload cannot reroll the mix or repeat a slot. The scheduler must not consume the dealer's random stream.

If a review slot has no eligible due problem, use regular play and discard that unused slot. Do not build a backlog that floods the player later. Reset future scheduling cleanly after an on/off or N change, leaving the current hand intact. The actual rate can be lower than the target because eligibility and due problems are limited; explain this in optional details.

A review hand may contain several decisions. Track its intended target and its origin; do not count every earlier/later decision as an independent fresh assessment. Natural repeats in regular play also need exposure tracking: randomly drawn does not necessarily mean unseen.

### Which problem to choose

Favor unresolved, repeatedly missed and overdue problems, with recency/cooldown protection and a cap on repeatedly selecting the same exact example when alternatives exist. Treat this as a learning heuristic, not a poker-strength model. Keep broad skill tags separate from exact-problem IDs; do not merge different reference configurations just because both contain the same hand class.

The first adaptive return uses the original problem. Later reviews prefer different existing, covered examples of the same tagged skill, with occasional exact checks. Suit relabeling of the same script is cosmetic variation, not a genuinely new test. Each alternative uses its own reference; never copy the original answer into a new board/context. If no vetted related example exists, use the exact problem or regular play without claiming a new exercise.

Show no review label or hint before the targeted answer. After it, display a small explanation such as "Review from an earlier session" and update the problem. If the target was not reached, record that fact without awarding success.

### Fade learned problems without deleting history

Suggested starting heuristic: three supported targeted answers over at least two sessions, including a different vetted example when available, moves a problem toward maintenance rather than declaring it mastered. Successful exact recall alone is weaker evidence than transfer to another example. Increase spacing/reduce priority gradually; an outside-reference answer reactivates the problem.

Keep maintenance/archive items accessible in Review, with occasional due checks. If all compatible problems are not due, ordinary play fills the slots. The slider controls the global review share; problem priority controls which due problem receives it. These are separate controls internally, with only the simple switch/slider exposed by default.

## Technical boundaries and tests

Add pure learning modules under a separate namespace such as `src/learning/`: types, classification, codecs, session lifecycle, repository, grouping, selection and scheduling. Add a small provider/adapter shared by the two trainer modes.

Intentional controller seams will be needed: hand start, answer submission, hand completion, cursor updates and next-hand selection. Existing hand/grade computation, range math and scripted progression remain the baseline. Do not store history by adding side effects inside React state updater functions or NPC timers that may execute twice. Keep keyboard behavior, custom ranges, existing formats and the navy presentation working.

The current integrity guard protects whole controller files. Feature wiring must be documented, tested against the old paths, and then the narrow approved baseline changes recorded. Do not disable the guard or broadly rebaseline the engine/data to make tests pass.

Required verification includes:

- Raw-vs-rounded frequencies, ties, supported alternatives, zero support and missing source.
- Save before Continue, reload at prompt/verdict/NPC transitions, no duplicate records and recovery after failed/interrupted writes.
- Automatic sessions, long-idle mid-hand boundaries, clock changes and empty-session cleanup.
- Exact retries, original/corrected action distinction, live-state preservation, hidden-information safety and source-version mismatch.
- Toggle/N changes during a hand, empty/incompatible pools, target not reached, eligibility filters and deterministic schedule recovery.
- Long-run target share and bounded randomized placement with complete pools; no artificial catch-up bursts when pools are empty.
- Group deduplication, representative retention, protected records, retention limits, quota failure, backup/import validation and schema migrations.
- Separate regular/review/manual and first-exposure statistics; no improvement claims from repeated scripts or a profitable outcome.
- Both trainer modes, all supported setup filters, keyboard controls, dialog focus, mobile layouts, reduced motion and existing regressions.
- Multiple-tab handling: elect one active writer or detect/fence conflicting sessions; never merge two live hands by accident.

## Implementation scope

The focused build checklist is [SESSION_REVIEW_ROADMAP.md](SESSION_REVIEW_ROADMAP.md). It should be implemented incrementally before expanding the curriculum. A goal-ready implementation brief is in [SESSION_REVIEW_GOAL.md](SESSION_REVIEW_GOAL.md).

The implementation now follows this specification; see the focused checklist and verification report. Initial default values above remain documented engineering proposals that can be tuned after measurement; the eight confirmed product choices remain the contract.
