# Poker Academy roadmap

Scope: offline-first, English, mobile-first Expo app for iPhone; 6-max no-limit Hold’em, local-only progress and virtual chips. No solver claims: mathematical results must be tested; strategies must state assumptions and be labeled educational heuristics.

Each milestone: implement, test, fix, run regression checks, update these documents, commit. Use existing checkout. Never claim device verification from a web build.

- [x] M1 Foundation: Expo/TypeScript, dark accessible navigation, local versioned progress, curriculum overview; typecheck, storage tests, web export.
- [x] M2 Mathematics: pot odds, break-even bluff frequency, hand-ranking drills; exact formulas, validation, scoring, XP and weakness tracking; unit and UI smoke tests.
- [x] M3 Poker engine: card/deck validation, best-five-of-seven evaluator, tie breaking; exhaustive five-card frequency verification and seven-card fixtures.
- [x] M4 Curriculum: beginner through advanced lessons, quizzes, prerequisites, locally recorded completion; reviewed sources and explicit assumptions.
- [x] M5 Preflop trainer: explicit stack sizes, positions and action history; simplified heuristic ranges, no unlicensed PTO content or invented equilibrium outputs; dataset consistency tests.
- [x] M6 Postflop trainer: board texture, value, draws and sizing; independently checked math and scoped heuristic feedback; regression scenarios.
- [x] M7 Opponent profiles and exploits: loose, tight, passive, aggressive, calling station; visible assumed tendencies, uncertainty and counter-exploit risks; scenario tests.
- [x] M8 Full virtual-chip simulator: legal six-seat betting, blinds, streets, all-ins, side pots, showdown, chip conservation and deterministic replays; engine/property tests before UI.
- [x] M9 Progression: learning paths, levels, weakness-directed practice, progress export/reset; migration and persistence tests.
- [ ] M10 Release hardening: offline restart, accessibility, responsive layouts, full regression; actual iPhone/Expo Go testing and native release build when device/signing access is available.

## Evidence and limitations

Milestones 1–9 are implemented and verified. M10 local checks passed: 54 unit tests, TypeScript, formatting, web and iOS JavaScript exports, thirteen browser suites, offline reload/persistence, and responsive/accessibility scans. CI is configured but remote results are not claimed.

Remaining external gate: actual iPhone/Expo Go and native release build/signing tests. This Linux host has no Xcode, iOS simulator or connected iPhone. Follow docs/RELEASE.md in a device/macOS environment; do not mark M10 complete from JavaScript exports. No accounts, remote APIs or credentials are needed for training.

## Guided learning and visual refinement

- [x] M11 Guided path: Basics → Deeper strategy → Mastery practice; one lesson at a time with learn/example/check/apply phases, cumulative prerequisites, contextual bridges and a clear next step. Preserve existing progress; mastery is practice, not a claim of expert ability. Verify checkpoints, gating, retry, reload and prior features.
- [x] M12 Visual system: coherent midnight/emerald/ivory theme, persistent navigation, tactile buttons, playing-card graphics, subtle screen/card transitions, completion feedback, and reduced-motion support. Verify layouts, accessibility, browser flows and both JavaScript exports. Native visual/device validation remains in M10.

M11 evidence: 35 unit tests, cumulative-prerequisite fixtures, all six browser suites (including all 12 full guided lessons with retries and cross-stage continuation), TypeScript, web and iOS JavaScript exports passed. Existing v1/v2 learning progress is preserved; lesson completion still earns 20 XP once.

M12 evidence: shared visual theme, persistent navigation, playing-card graphics, 220 ms entrances, spring press feedback and live reduced-motion behavior implemented. Seven browser suites and 36 unit tests pass, including full guided-path completion, offline regressions, worked-example accessibility, card concealment and responsive layouts. Web and iOS JavaScript exports pass. Native graphics, animation performance and iPhone release validation remain unverified under M10.

## First iPhone feedback

The user reports Expo Go opens on their iPhone and the first lesson's read/example/check/retry/apply flow works, with clear text and cards. This is user-reported evidence of that limited flow, not completion of the native release gate. They find the interface overwhelming and want to improve one thing at a time.

- [x] M13 Focused lessons: remove dashboard/navigation clutter during an active lesson, keep one clear forward action and a way back, provide red incorrect / green correct answer feedback with text and icons, and allow time to read final-check feedback before completion. Preserve progress and test the full curriculum and existing features. Simulator redesign is deferred for a separate iteration.

M13 evidence: focused lesson hides dashboard and tab navigation, shows a compact step count and back action, colors selected answers and textual feedback red/green, and pauses at final-answer feedback until Finish lesson. Progress and the simulator are preserved. All 36 unit tests, eight browser suites, TypeScript, formatting, web and iOS JavaScript exports pass. The revised design still needs the user’s next iPhone check.

## Continuous coached simulator, informed by Poker Trainer research

User confirmed https://pokertrainer.se/. Public research is currently blocked by the environment web allowlist; see docs/POKER_TRAINER_RESEARCH.md. Recommendations are distinguished from unverified competitor findings.

- [ ] M14 Competitor research: inspect public Poker Trainer site/listing/screenshots and any public demo, record verified useful interface/learning patterns and original implementation choices. Blocked by research-domain access; no claims of hands-on inspection yet.
- [x] M15 Continuous play: retain the table across tabs and reload, offer one-tap next hands even after busting with explicit virtual refills, optional rules/history, test persistence, replay restoration and chip accounting.
- [x] M16 Scoped simulator coaching: nonblocking match/deviation/ungraded feedback from the existing authored first-in baseline, a clearly labeled 100-BB first-in practice mode for meaningful coverage, no GTO/solver or exploit-optimality claims; test coverage boundaries, hidden-information independence and continuous sessions.
- [ ] M17 Table interface iteration: use verified research plus the user's feedback to improve table layout and action controls, one reviewed feature at a time. Preserve the focused lesson path.
- [ ] M18 Verified strategy data: integrate properly licensed, documented solver/reference data only if available. Until then, never claim arbitrary simulator decisions are graded against GTO/PTO.

M15 evidence: 39 unit tests and nine browser suites pass, including 100 consecutive hands, exact replay restoration, virtual refill accounting, three browser hands and tab/reload persistence. TypeScript, formatting, web and iOS JavaScript exports pass. Table settings/history are optional details. Research remains blocked, not claimed complete.

M16 evidence: 45 unit tests and ten browser suites pass; TypeScript, formatting, web and iOS JavaScript exports pass. Coached mode rotates all five supported first-in positions, uses explicit 100-BB preset setups, and shows match/deviation/ungraded feedback without blocking play. Saved table v1 migrates to v2 and feedback is recomputed. Ranges and sizing are authored conventions, not solver outputs. M14 actual competitor inspection and M18 verified-solver coverage remain blocked by access/data prerequisites.

## Simulator-only focus and deliberate practice

The user now prioritizes the simulator; preserve previous learning features without expanding them.

- [x] M19 Retry and contextual charts: restore the exact pre-decision state without redealing, show the supported position/hand baseline chart and reasoning, distinguish retry attempts, and preserve existing data.
- [x] M20 Saved reviews and troublesome spots: retain bounded local hand/decision history across sessions, replay decisions with the information available then, automatically remember baseline deviations, allow manual marking of ungraded spots, and repeat those exact spots without changing the live table. Keep first tries separate from retries.
- [x] M21 Table-first interface: clear LJ/HJ/CO/BTN/SB/BB labels, readable table/actions, and a direct play → feedback → retry/continue → review loop. Preserve all prior functionality and verify responsive/accessibility behavior.

Verified strategy coverage remains M18's prerequisite for calling arbitrary simulator choices correct or incorrect; do not fabricate solver results to close this goal.

M19 foundation: deterministic decision checkpoints, branch-aware retry metadata, v1/v2→v3 replay migration and bounded local review history are implemented. Pure tests verify exact retries/runouts, immutable live-table restoration, original branch preservation, retention limits and malformed-record rejection. UI verification follows with the contextual-chart and library increments.

M19/M20 UI evidence: 52 unit tests and twelve browser suites pass. Exact retries survive reload, contextual 169-hand charts use the decision snapshot and refuse unsupported spots, original/practice branches remain distinct, saved hands step through public information, and troublesome spots can be repeated without altering the live hand. First-try counts exclude practice; retention is explicitly 30 hands / 200 attempts. TypeScript, formatting and web/iOS JavaScript exports pass; new native-device checks remain pending.

M21 evidence: simulator is now the landing screen, with an original six-seat table surface, rotating LJ/HJ/CO/BTN/SB/BB labels and compact action controls. The first six-max seat is shown as LJ, equivalent to UTG in the existing teaching dataset. Tests verify distinct position mapping for every button, nonoverlapping seats at 320/390/768px, retained lesson access, and all prior flows. 54 unit tests and thirteen browser suites pass, with TypeScript, formatting and web/iOS JavaScript exports. Native device validation is still pending.

Goal boundary: exact retries, hand reviews and retained troublesome-spot practice are implemented. Universal correct/incorrect grading remains blocked by M18: no verified, licensed strategy data has been supplied for facing action, varying stack/rake/size configurations or postflop. These situations remain explicitly ungraded. Competitor web research also remains unverified while web-domain access is blocked.

M18 source research update: reviewed author-maintained TexasSolver and b-inary postflop-solver/Desktop Postflop READMEs, licenses and concrete configuration/action-navigation examples through accessible GitHub sources. See docs/STRATEGY_SOURCES.md for pinned revisions, verified features, limits, and a node-based offline pack contract. Two actionable routes are provider-backed data and generating our own documented narrow solves. No solver has been compiled or integrated, no commercial data terms are verified, and no new GTO strategy data is claimed. GTO Wizard's public site remains proxy-blocked.
