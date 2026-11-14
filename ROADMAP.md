# Poker Practice roadmap

Goal: progressively improve real-life six-max Hold’em decisions, especially against recreational players, through a simple simulator-centered learning loop. Preserve the working app and approved black/graphite/navy theme.

This file is the persistent build checklist. [LEARNING_PLAN.md](docs/LEARNING_PLAN.md) explains lesson progression, feature scope and completion criteria. [Foundation history](docs/FOUNDATION_HISTORY.md) retains the completed import/theme work.

## Current verified foundation

- [x] Replace the retired academy with jensbaagaard/poker-practice; preserve attribution and a Git backup.
- [x] Deliver the navy theme without changing the engine, grading, training controllers or chart data.
- [x] Last verified: 86 unit tests, nine browser checks, TypeScript, production build and simulator/strategy-calculation integrity checks.
- [x] Retain range viewing, preflop training, scripted full-hand practice and existing custom-range/theme settings.
- [ ] Actual iPhone/Safari, VoiceOver and device animation verification. Chromium phone-sized tests do not close this release gate.

Current limitations: no persistent learning journal or curriculum; full-hand play follows supplied scripts. The grade favors the most frequent reference action and is not an EV-loss score. Existing source/provenance limits remain documented in [UPSTREAM.md](docs/UPSTREAM.md).

## Learning progression

Basics → solid preflop → postflop foundations → range thinking → exploits → advanced challenges → transfer to live hands.

Teach one concept, show an example, practice it, check it independently and revisit it later. Keep free play available; avoid showing all lessons or advanced controls at once. App progress is not a guarantee of expertise or profitability.

## Milestones to build

| Status | ID | Milestone | Main prerequisite | Completion evidence |
| --- | --- | --- | --- | --- |
| [ ] | M01 | Persistent learning journal and honest progress metrics | Current decision/context audit | Save/reload/migration/export tests; no duplicate records; existing play unchanged |
| [ ] | M02 | Saved hand reviews, exact retries and mistake book | M01, versioned source IDs | Same-decision restoration, hidden-information safety, separate first tries/practice, live-session preservation |
| [ ] | M03 | Phone reliability and installed offline practice | M01–M02 | Tested device cold starts, complete pack caching, resume and storage/update recovery |
| [ ] | M04 | Guided Basics path plus math/hand-reading drills | M01; reviewed exact examples | One-concept progression, independent answer fixtures, retained completion and later review |
| [ ] | M05 | Focused preflop and fair mixed-strategy practice | M01–M02; objective/metric versioning | Supported actions distinguished from most-frequent drills; configuration/edge-case regressions |
| [ ] | M06 | Postflop concepts and scoped explanations | M04–M05; covered reference spots | Different-board exercises; arithmetic/source/heuristic distinctions; unsupported spots clearly handled |
| [ ] | M07 | Exploitative recreational-player scenarios | M04–M06 | Explicit tendencies/evidence, uncertainty and counter-risks; no invented model probabilities or EVs |
| [ ] | M08 | Adaptive focus, spaced review and weekly weakness summary | M01–M02; topic tags from M04–M07 | Tested scheduling, bounded queues, sample counts and first-try/retry separation |
| [ ] | M09 | Broader documented reference/solver packs | Exact configurations and usable sources | Provenance, coverage manifests, numerical checks and node matching per new family |
| [ ] | M10 | Broader branching simulator as a separate mode | Rules-complete engine and M09 coverage | Betting/replay/conservation tests; covered grading; honest ungraded sandbox branches |
| [ ] | M11 | Advanced held-out challenges and live-hand notebook | Journal/review, concepts and adequate coverage | No answer leakage; fresh/retained sample reporting; validated incomplete hand reconstruction |

M03 device work and M09 source research can proceed when their prerequisites/capabilities are available; neither should stall unrelated local learning improvements. M10 is intentionally late so current working play does not get replaced by an unverified rewrite.

## Next bounded implementation

**M01: persistent learning journal.** First audit the decision checkpoints in both trainer modes. Define stable source/version IDs and a versioned local record; add a narrow event/storage seam while preserving the existing action/grade path. Then implement save/reload and backup behavior, with duplicate/interrupted-write tests. New progress labels must describe reference matching rather than claim universal poker accuracy.

After M01 is verified, continue to M02. Do not restore the entire retired academy or bundle the whole curriculum into one change.

## Completion discipline

- [ ] For each future milestone: implement the bounded feature, test it, fix failures, run regressions, update this checklist/documentation and commit verified changes.
- [ ] Preserve engine/data/grading integrity; deliberately document and test any feature that genuinely requires a protected-code change before updating its baseline.
- [ ] Keep the navy interface focused and phone-friendly. Existing chart palettes need no redesign for this plan.
- [ ] Keep data/metric versions compatible with saved reviews and progress. No account is required for local learning.

All future milestones above are planned, not implemented. No dates or poker-strength guarantees are assigned without evidence.
