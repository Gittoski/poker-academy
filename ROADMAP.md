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

Milestones 1–9 are implemented and verified. M10 local checks passed: 36 unit tests, TypeScript, formatting, web and iOS JavaScript exports, seven browser suites, offline reload/persistence, and responsive/accessibility scans. CI is configured but remote results are not claimed.

Remaining external gate: actual iPhone/Expo Go and native release build/signing tests. This Linux host has no Xcode, iOS simulator or connected iPhone. Follow docs/RELEASE.md in a device/macOS environment; do not mark M10 complete from JavaScript exports. No accounts, remote APIs or credentials are needed for training.

## Guided learning and visual refinement

- [x] M11 Guided path: Basics → Deeper strategy → Mastery practice; one lesson at a time with learn/example/check/apply phases, cumulative prerequisites, contextual bridges and a clear next step. Preserve existing progress; mastery is practice, not a claim of expert ability. Verify checkpoints, gating, retry, reload and prior features.
- [x] M12 Visual system: coherent midnight/emerald/ivory theme, persistent navigation, tactile buttons, playing-card graphics, subtle screen/card transitions, completion feedback, and reduced-motion support. Verify layouts, accessibility, browser flows and both JavaScript exports. Native visual/device validation remains in M10.

M11 evidence: 35 unit tests, cumulative-prerequisite fixtures, all six browser suites (including all 12 full guided lessons with retries and cross-stage continuation), TypeScript, web and iOS JavaScript exports passed. Existing v1/v2 learning progress is preserved; lesson completion still earns 20 XP once.

M12 evidence: shared visual theme, persistent navigation, playing-card graphics, 220 ms entrances, spring press feedback and live reduced-motion behavior implemented. Seven browser suites and 36 unit tests pass, including full guided-path completion, offline regressions, worked-example accessibility, card concealment and responsive layouts. Web and iOS JavaScript exports pass. Native graphics, animation performance and iPhone release validation remain unverified under M10.
