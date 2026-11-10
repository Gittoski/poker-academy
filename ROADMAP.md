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

Milestones 1–9 are implemented and verified. M10 local checks passed: 32 unit tests, TypeScript, formatting, web and iOS JavaScript exports, six browser suites, offline reload/persistence, and responsive/accessibility scans. CI is configured but remote results are not claimed.

Remaining external gate: actual iPhone/Expo Go and native release build/signing tests. This Linux host has no Xcode, iOS simulator or connected iPhone. Follow docs/RELEASE.md in a device/macOS environment; do not mark M10 complete from JavaScript exports. No accounts, remote APIs or credentials are needed for training.
