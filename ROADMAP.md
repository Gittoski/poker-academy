# Poker Practice roadmap

Goal: progressively improve real-life six-max Hold’em decisions, especially against recreational players, through a simple simulator-centered learning loop. Preserve the working app and approved black/graphite/navy theme.

This file is the persistent build checklist. [LEARNING_PLAN.md](docs/LEARNING_PLAN.md) explains lesson progression, feature scope and completion criteria. [Foundation history](docs/FOUNDATION_HISTORY.md) retains the completed import/theme work.

## Current test candidate: integrate live play before approval

- [x] Compare uploaded patch (`460fc17` base) with latest app (`dfa701d`); apply on isolated `test/live-play-integration` branch and preserve newer oval switch/lighter navy.
- [x] Make Home and shared Play open `/live`; retain original `/play` exercises/reviews, saved hands and range viewer.
- [x] Scope old Home settings, activity and mistake counts to reference exercises/lessons; keep live settings/history in Practice tools.
- [x] Integrate shuffled-deck legal actions, streets, all-ins, integer chip ledgers, refunds and side pots; keep chosen actions independent from references.
- [x] Retain full source range grids, original frequencies/hashes, ungraded unsupported spots, retries, ownership, recovery/export and offline support.
- [x] Preserve mobile focus with internally scrolling feedback/tools overlays and explicit hand-result acknowledgement; preserve historical tied-action records and exact decimal chip entry.
- [x] Finish integration verification (196 unit tests, production build, 74 browser checks) and record results in [LIVE_INTEGRATION.md](docs/implementation/LIVE_INTEGRATION.md).
- [ ] User tests this separate candidate, including actual iPhone Safari/Home Screen behavior.
- [ ] Only after explicit approval: decide whether to merge and deploy to the main app.

## Current approved step: discoverable simulator mode switch

- [x] Expose the existing Full hands / Preflop modes with a navy iOS-style header switch and short sliding animation.
- [x] Refine the thumb to a centered oval and use a lighter, clearer blue navy track, following user feedback.
- [x] Preserve each mode's live hand/configuration, save before switching, handle manual retries and retain source/ownership checks.
- [x] Include bounded mode bookmarks in backup validation and retention; keep engine, grading and data unchanged.
- [x] Finish automated switch, mobile layout, failure-path and regression checks; see [the implementation audit](docs/implementation/MODE_SWITCH.md).
- [ ] Actual iPhone Safari/Home Screen animation, touch, safe areas and VoiceOver check.

## Current approved step: spade logo

- [x] User approved the raised silver spade on navy; replace existing logos only.
- [x] Use the same artwork in Home/shared navigation, browser/PWA icon and Apple Home Screen icon, with suitable local render sizes.
- [x] Add the header mark to complete offline packs; preserve card suits and all poker/data/progress behavior.
- [x] Verify image endpoints, metadata, small-screen layouts, offline loading and regressions; see [the branding audit](docs/design/branding/README.md).
- [ ] Actual iPhone/Safari icon refresh and installed Home Screen appearance.

## Current approved step: Home and organized navigation

- [x] User approved the three-panel Home design and shared navy/graphite lighting, shadows and materials.
- [x] Implement Home: Play/Resume, daily activity, Next practice; top Ranges/Play/Learn and Settings, without optional dashboard panels.
- [x] Move routine simulator settings to Home and preserve saved-hand configuration, reviews, recovery controls and original range charts.
- [x] Persist bounded, atomic local daily answer totals; migrate only verified retained history and include totals in backups.
- [x] Finish automated Home/offline/regression checks and actual-app screenshot evidence; see [the implementation audit](docs/implementation/HOME.md).
- [ ] Actual iPhone Safari/Home Screen review of Home, Settings, activity taps, safe areas and return to the same hand.

## Current follow-up: material depth and clear showdown outcomes

- [x] Implement deeper rail/seat/felt lighting, raised card edges and button materials in the actual simulator; preserve shared card styling.
- [x] Add a concise completed-showdown winner/hand popup from recorded results, with fixed Next hand, close/reopen and long-details support. Fold-only finishes stay compact.
- [x] Finish calculation/source-safety, outcome, layout and regression checks; see [the audit](docs/implementation/MATERIAL_DEPTH_OUTCOMES.md).
- [ ] Actual iPhone/Home Screen visual and outcome check before the next home-screen goal.

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
- [x] Home design approved; implementation and verification tracked above. Leave Learn layout unchanged for now.

## Current verified foundation

- [x] Replace the retired academy with jensbaagaard/poker-practice; preserve attribution and a Git backup.
- [x] Deliver the navy theme while preserving engine, grading and chart data; document reviewed UI/controller integration.
- [x] Last verified: 157 unit tests, 56 browser journeys, TypeScript, production build and simulator/strategy-calculation integrity checks.
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
