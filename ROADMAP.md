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

Milestones 1–9 are implemented and verified. M10 local checks passed: 45 unit tests, TypeScript, formatting, web and iOS JavaScript exports, ten browser suites, offline reload/persistence, and responsive/accessibility scans. CI is configured but remote results are not claimed.

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
