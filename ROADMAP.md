# Poker Practice roadmap

Goal: progressively improve real-life six-max Hold’em decisions, especially against recreational players, through a simple simulator-centered learning loop. Preserve the working app and approved black/graphite/navy theme.

This file is the persistent build checklist. [LEARNING_PLAN.md](docs/LEARNING_PLAN.md) explains lesson progression, feature scope and completion criteria. [Foundation history](docs/FOUNDATION_HISTORY.md) retains the completed import/theme work.

## Immediate planned priority: fully graded preflop practice

Complete this scoped release before the longer postflop project. [PREFLOP_GRADING_PLAN.md](docs/PREFLOP_GRADING_PLAN.md) maps the requirements, proposed training constraints, existing gaps and completion checks. [GRADED_PREFLOP.md](docs/goals/GRADED_PREFLOP.md) is the copy-ready implementation goal. The user approved implementation after planning. The scoped candidate is on `test/graded-preflop`; production integration waits for candidate review.

- [x] Inspect why live preflop decisions remain ungraded and confirm metadata matches for all 65 standard six-max reference contexts.
- [x] Draft the covered-training scope, safeguards, acceptance criteria and implementation goal; distinguish guaranteed practice grading from unrestricted live play.
- [x] PF0: User approved covered-practice scope; audit all 65 contexts × 169 classes using genuine shuffled deals and legal setup replay, validate source weights and applicable actions (221 unit tests plus TypeScript/integrity checks). See [implementation record](docs/implementation/GRADED_PREFLOP.md).
- [x] PF1: Add covered context generation/progression, honest boundaries, original-action retries and validated version-four profile saves; pass 226 unit tests, TypeScript/integrity and production build. Browser integration remains below.
- [x] PF2: Grade every accepted learner choice, retaining source charts, explanations, exact retries and automatic stable mistake recording.
- [x] PF3: Preserve mode settings, incompatible older saves, ownership and offline support; identify the supported profile clearly.
- [x] PF4 automated: 10,985 source contexts/classes, 325 seeded rounds with 340 graded decisions and explicit boundary counts, 229 unit tests and 106 browser checks; complete TypeScript/integrity/build and final focused checks on the isolated candidate.
- [ ] Actual iPhone Safari/Home Screen and candidate deployment confirmation; user review before any main-app merge/deployment. See [the implementation record](docs/implementation/GRADED_PREFLOP.md) and [test guide](docs/verification/graded-preflop/TEST_GUIDE.md).

## Deferred until preflop is complete: verified branching postflop grading

The user requested a map of the work before implementation. [POSTFLOP_GRADING_PLAN.md](docs/POSTFLOP_GRADING_PLAN.md) is the detailed checklist and acceptance criteria. Preserve the approved simulator and existing features; do not equate this plan with implemented postflop grading.

- [x] Inspect current assets: 276 imported flop files, 780 archived hand exercises, existing solver scripts and live feedback adapter. Record missing branches, precision and source-validation gaps.
- [x] Map the pilot scope and staged requirements in the repository: BTN versus BB, 100 BB, single-raised pot, an explicitly covered flop and complete declared branches through river.
- [ ] P0: Finish source/permission/numerical/compute feasibility audit and specify the pilot model.
- [ ] P1: Configure a reproducible solver and validate a small numerical reference, retaining inputs/output/logs and convergence evidence.
- [ ] P2: Produce a complete versioned strategy pack with exact combos, full precision, documented assumptions and legal action/chance branches.
- [ ] P3: Integrate exact public-context matching and fair range grading without hidden-card leakage or altering the learner's choices.
- [ ] P4: Connect the existing explanation/chart/retry flow and automatic mistake review, preserving original feedback and bounded local storage.
- [ ] P5: Verify offline size/performance, regressions and actual device behavior; present the isolated pilot for user testing before main-app integration.
- [ ] P6: Expand board/position/pot coverage, then separate exploit models and multiway sources; measure coverage alongside accuracy.

## Current priority: dependable live decision feedback

- [x] Diagnose silent chart-loading failures and the gap between random live situations and the imported preflop reference tree.
- [x] Pause decisions/opponents while charts load; bound stalled requests, expose Retry and require an explicit choice to play without charts after a failure.
- [x] Preserve genuine preflop coverage by using documented raise sizes for heuristic opponents when an exact matching chart exists; retain random deals and actual player choices.
- [x] Show short, specific reasons for ungraded decisions and signal postflop/reference availability before acting; preserve green supported feedback, automatic error explanations and original charts.
- [x] Keep saved feedback immutable when charts recover, including snapshots, retries and earlier ungraded decisions; preserve prior saves, engine rules and approved theme.
- [x] Complete final regressions: 218 unit tests plus TypeScript/integrity checks, optimized build, 99 browser checks and 22 focused checks against the final build; record [feedback recovery verification](docs/implementation/FEEDBACK_RECOVERY.md).
- [ ] Expand live strategy coverage with an identified, applicable postflop reference. Arbitrary boards, caller/limp situations, unsupported sizes/stacks and cold re-raises cannot yet receive honest chart grades. Legal poker and hand outcomes do not resolve this limitation.
- [ ] Confirm the deployed update and actual iPhone Safari/Home Screen loading, touch and offline behavior.

## Current priority: restore the approved learning simulator

- [x] Restore the approved simulator surface/table proportions, three action buttons, compact header and navy materials around the live engine.
- [x] Put custom sizing in its own small panel; validate Apply and preserve the original size when cancelling.
- [x] Supported answers stay compact and green; ungraded answers stay neutral; only reference errors automatically open the explanation.
- [x] Restore Explanation/Chart tabs and fixed Retry/Continue controls outside overlay scrolling; hide inactive panels on every viewport.
- [x] End the learner's hand immediately on Fold in both modes, including old saves and closing-round folds; no later actions, cards or fictitious payouts.
- [x] Retry restores the actual decision and preserves the original error once, without silently choosing a chart action. Keep manual saved-spot practice non-mutating.
- [x] Restore clear calculated showdown results; keep modes, source charts, settings, archive, ownership and offline support.
- [x] Accept v1/v2 saves and write v3 so old cached clients cannot resume folded hands or discard learning checkpoints.
- [x] Finish final regression verification (209 unit tests, production build, 93 browser checks) and prepare the verified correction for the connected `work` branch; see [LEARNING_RESTORATION.md](docs/implementation/LEARNING_RESTORATION.md).
- [ ] Actual iPhone Safari/Home Screen confirmation of the restored layout, touch and safe areas.

## Current approved step: live-engine preflop mode

- [x] Run Preflop and Full hands on the same shuffled-deck/legal-action engine; keep choices independent of chart feedback.
- [x] Restore the approved navy oval switch to the main simulator; expose both modes through live table settings and Home Settings.
- [x] Stop Preflop at the completed betting round, without dealing future cards or inventing a showdown result; preserve real uncontested fold wins.
- [x] Park and restore each mode's exact hand/configuration/feedback, pause on switching/reload, and preserve the previous save on failures.
- [x] Migrate version-one live saves to version two; protect new preflop records from older cached clients, keep bounded history and exports.
- [x] Route normal `/play` links to the live engine, preserve explicit review links and move retained exercises to `/archive/play`; keep offline routes, learning returns and archive regressions working.
- [x] Finish final verification (204 unit tests, production build, 88 browser checks) and integrate the verified update for the connected `work` branch; see [LIVE_PREFLOP.md](docs/implementation/LIVE_PREFLOP.md).
- [ ] Actual iPhone/Home Screen touch, animation, safe-area and VoiceOver checks.

## Current approved release: realistic live play

- [x] User approved the verified live-engine update for the main app before personal device testing.
- [x] Preserve the approved table/card artwork, rich navy theme, palette functions and existing range data.
- [x] Make Home's normal reviews/settings control live play; tuck previous exercise history/settings into an explicit archive and retain code/saves for future lessons.
- [x] Preserve random deals, chosen-action continuation, range-only feedback, retries, offline play and ownership safeguards.
- [x] Fix dead-money tiers: combine equal-eligibility pots before distributing odd chips, while preserving real all-in side pots.
- [x] Include build ID, JavaScript/CSS chunks and chart data in the hosted offline-manifest function trace.
- [x] Finish final release checks (197 unit tests, production build, 79 browser checks) and integrate the approved update for the connected `work` branch; see [LIVE_RELEASE.md](docs/implementation/LIVE_RELEASE.md).
- [ ] Confirm the hosted Vercel deployment and actual iPhone Safari/Home Screen touch, safe-area, offline refresh and VoiceOver behavior.

## Completed integration candidate (before release approval)

- [x] Compare uploaded patch (`460fc17` base) with latest app (`dfa701d`); apply on isolated `test/live-play-integration` branch and preserve newer oval switch/lighter navy.
- [x] Make Home and shared Play open `/live`; retain original `/play` exercises/reviews, saved hands and range viewer.
- [x] Scope old Home settings, activity and mistake counts to reference exercises/lessons; keep live settings/history in Practice tools.
- [x] Integrate shuffled-deck legal actions, streets, all-ins, integer chip ledgers, refunds and side pots; keep chosen actions independent from references.
- [x] Retain full source range grids, original frequencies/hashes, ungraded unsupported spots, retries, ownership, recovery/export and offline support.
- [x] Preserve mobile focus with internally scrolling feedback/tools overlays and explicit hand-result acknowledgement; preserve historical tied-action records and exact decimal chip entry.
- [x] Finish integration verification (196 unit tests, production build, 74 browser checks) and record results in [LIVE_INTEGRATION.md](docs/implementation/LIVE_INTEGRATION.md).
- [x] User approved integration without personally testing the candidate; actual iPhone checks remain outstanding above.
- [x] User explicitly authorized the main-app update after further verification.

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
