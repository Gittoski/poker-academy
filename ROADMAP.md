# Poker Practice roadmap

Goal: progressively improve real-life six-max Hold’em decisions, especially against recreational players, through a simple simulator-centered learning loop. Preserve the working app and approved black/graphite/navy theme.

This file is the persistent build checklist. [LEARNING_PLAN.md](docs/LEARNING_PLAN.md) explains lesson progression, feature scope and completion criteria. [Foundation history](docs/FOUNDATION_HISTORY.md) retains the completed import/theme work.

## Current approved step: mobile simulator focus

- [x] Implement a viewport-sized simulator with compact navigation and settings/review panel.
- [x] Automatically open full error explanations; scroll only overlay content while keeping Retry/Continue visible. Supported answers retain compact feedback.
- [x] Preserve exact manual retries, live-hand recovery, chart access and complete-hand result acknowledgement; keep Next hand reachable on small screens.
- [x] Finish automated verification and delivery; see [the implementation audit](docs/implementation/MOBILE_FOCUS.md).
- [x] User approved the mobile layout; remove the final hand-review popup while retaining the completed table/runout and Next hand.
- [x] Remove the mobile outer frame; align header/status text and improve the back/settings controls; remove global navigation from simulator settings.
- [ ] Follow-up iPhone/Home Screen test of the simplified finish, seamless layout and rotation.
- [x] Approve option B: midnight navy felt, charcoal rail, seat shadows, classic cards and action colors.
- [x] Implement the simulator treatment and share classic card faces with saved reviews.
- [x] Finish option B verification, screenshot evidence and delivery; see [the audit](docs/implementation/NAVY_TABLE.md).
- [ ] Actual iPhone/Home Screen review of option B, especially board readability, reveal positions and rotation.
- [ ] Next approval: home screen, then extend the shared theme where appropriate. Leave Learn layout unchanged for now.

## Current verified foundation

- [x] Replace the retired academy with jensbaagaard/poker-practice; preserve attribution and a Git backup.
- [x] Deliver the navy theme while preserving engine, grading and chart data; document reviewed UI/controller integration.
- [x] Last verified: 147 unit tests, 41 browser journeys, TypeScript, production build and simulator/strategy-calculation integrity checks.
- [x] Retain range viewing, preflop training, scripted full-hand practice and existing custom-range/theme settings.
- [ ] Actual iPhone/Safari, VoiceOver and device animation verification. Chromium phone-sized tests do not close this release gate.

Current limitations: full-hand play follows supplied scripts; whole-app offline packs have Chromium coverage but actual iPhone installation remains unverified. Guided fundamentals and linked practice are implemented. The grade favors the most frequent reference action and is not an EV-loss score. Existing source/provenance limits remain documented in [UPSTREAM.md](docs/UPSTREAM.md).

## Current release: guided fundamentals and linked practice

Follow [FUNDAMENTALS_ROADMAP.md](docs/FUNDAMENTALS_ROADMAP.md). The current release takes priority over the earlier phone-only milestone: reuse archived drills, teach pot odds → outs/draws → hand/range equity → EV → bluff break-even/fold equity, save learning progress and link supported simulator mistakes to relevant practice. Preserve the six-max cash foundation and existing reviews/charts.

After this release: active preflop drills → range-reading → postflop decisions/bet sizing → opponent-tendency/exploit drills → live/multiway situations → advanced concepts/session habits. Population assumptions stay distinct from observations of a specific player.

## Current follow-up: complete-hand results and independent phone use

- [x] Verify explicit Full-hands result acknowledgement, complete stored all-in runouts, reload recovery and protection against accidental extra inputs. See the [completion audit](docs/implementation/HAND_COMPLETION.md).
- [x] Plan phone-only offline installation, math drills, short capsules and focused simulator sessions in [NEXT_FEATURES.md](docs/NEXT_FEATURES.md).
- [x] Implement explicit complete offline packs and verify Chromium cold starts, supplied hands and interrupted updates.
- [ ] M03 remaining gate: actual iPhone/Safari installation, storage and offline relaunch; hosting/App Store publication remains separately authorized.

## Learning progression

Basics → solid preflop → postflop foundations → range thinking → exploits → advanced challenges → transfer to live hands.

Teach one concept, show an example, practice it, check it independently and revisit it later. Keep free play available; avoid showing all lessons or advanced controls at once. App progress is not a guarantee of expertise or profitability.

## Milestones to build

| Status | ID | Milestone | Main prerequisite | Completion evidence |
| --- | --- | --- | --- | --- |
| [x] | M01 | Persistent learning journal and honest progress metrics | Current decision/context audit | Save/reload/migration/export tests; no duplicate records; existing play unchanged |
| [x] | M02 | Saved hand reviews, exact retries and mistake book | M01, versioned source IDs | Same-decision restoration, hidden-information safety, separate first tries/practice, live-session preservation |
| [ ] | M03 | Phone reliability and installed offline practice | M01–M02 | Tested device cold starts, complete pack caching, resume and storage/update recovery |
| [x] | M04 | Guided Basics path plus math/hand-reading drills | M01; reviewed exact examples | One-concept progression, independent answer fixtures, retained completion and later review |
| [ ] | M05 | Focused preflop and fair mixed-strategy practice | M01–M02; objective/metric versioning | Supported actions distinguished from most-frequent drills; configuration/edge-case regressions |
| [ ] | M06 | Postflop concepts and scoped explanations | M04–M05; covered reference spots | Different-board exercises; arithmetic/source/heuristic distinctions; unsupported spots clearly handled |
| [ ] | M07 | Exploitative recreational-player scenarios | M04–M06 | Explicit tendencies/evidence, uncertainty and counter-risks; no invented model probabilities or EVs |
| [ ] | M08 | Adaptive focus, spaced review and weekly weakness summary | M01–M02; topic tags from M04–M07 | Tested scheduling, bounded queues, sample counts and first-try/retry separation |
| [ ] | M09 | Broader documented reference/solver packs | Exact configurations and usable sources | Provenance, coverage manifests, numerical checks and node matching per new family |
| [ ] | M10 | Broader branching simulator as a separate mode | Rules-complete engine and M09 coverage | Betting/replay/conservation tests; covered grading; honest ungraded sandbox branches |
| [ ] | M11 | Advanced held-out challenges and live-hand notebook | Journal/review, concepts and adequate coverage | No answer leakage; fresh/retained sample reporting; validated incomplete hand reconstruction |

M03 device work and M09 source research can proceed when their prerequisites/capabilities are available; neither should stall unrelated local learning improvements. M10 is intentionally late so current working play does not get replaced by an unverified rewrite.

## Current focused feature: sessions, reviews and adaptive practice

The user has refined M01/M02 and the initial M08 scheduler into a simulator-first feature with eight explicit product choices. See [the agreed specification](docs/SESSION_REVIEW_SPEC.md), [R01–R08 implementation checklist](docs/SESSION_REVIEW_ROADMAP.md) and [goal-ready brief](docs/SESSION_REVIEW_GOAL.md).

- [x] Plan automatic sessions, automatic error capture, exact/related reviews, whole-hand adaptive replay, delayed review labels, mixed-action handling, gradual spacing and compact retention with the user.
- [x] R01: schemas, classification, metric copy and preservation tests.
- [x] R02: bounded storage, session lifecycle and exact recovery.
- [x] R03: automatic capture in both simulator modes.
- [x] R04: review area, exact retries and live-hand preservation.
- [x] R05: adaptive insertion with toggle and approximate frequency slider.
- [x] R06: related covered examples, due states and cross-session improvement.
- [x] R07: measured retention limits, analytics and long-term recovery.
- [x] R08: automated full regression, actual-app evidence and delivery. Actual-device release gate remains open above.

The focused R01–R08 implementation and available automated verification are complete; the actual-device release gate remains open. Follow the detailed feature checklist before expanding the curriculum. Automatic saving, session recovery, exact reviews, manual retries and adaptive returns are connected in both modes; 127 unit tests, 23 browser journeys, TypeScript, integrity and production build pass. The goal-ready brief remains as implementation history. See the usage guide and verification report for the delivered feature.

## Completion discipline

- [ ] For each future milestone: implement the bounded feature, test it, fix failures, run regressions, update this checklist/documentation and commit verified changes.
- [ ] Preserve engine/data/grading integrity; deliberately document and test any feature that genuinely requires a protected-code change before updating its baseline.
- [ ] Keep the navy interface focused and phone-friendly. Existing chart palettes need no redesign for this plan.
- [ ] Keep data/metric versions compatible with saved reviews and progress. No account is required for local learning.

Unchecked milestones above remain planned; the guided M04 foundation is implemented, while broader advanced curriculum and device release gates remain open. No dates or poker-strength guarantees are assigned without evidence.
