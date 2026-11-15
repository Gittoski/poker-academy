# Fundamentals release

Current objective: preserve the six-max cash simulator, error log and charts; teach five topics in order and connect supported mistakes to fresh practice.

- [x] F01: audit active/archived drills and feedback provenance; reuse validated arithmetic, draw probabilities and ranking evaluator, with independent tests.
- [x] F02: pot odds → outs/draw probability → equity against hands/ranges → expected value → bluff break-even/fold equity. Each needs a plain-English lesson, worked example, untimed questions and calculation-based explanations. Reuse the hand-ranking refresher.
- [x] F03: local durable practice progress, accuracy/error review, unfamiliar-question tracking and optional timing after untimed competence. Keep timing outcomes separate from mathematical accuracy.
- [ ] F04: public-information-only skill tags and relevant Practice this skill links from the error log. Never infer a math error solely from a chart deviation. Show recommendation basis and assumptions.
- [ ] F05: mobile/offline fundamentals flow, regression tests, backup/recovery, documentation and delivery. Actual iPhone/Safari remains an external device gate.

The repository currently has local saved reviews but no installed offline app. Whole-app offline capability must be verified rather than assumed. No deployment or App Store publication is authorized by this checklist.

## Audit and reuse

The current branch contains no active math or hand-ranking drill UI. The archived academy at f172d1f contains src/math.ts (pot odds, bluff threshold, four drills), src/postflop.ts (one/two-card draw calculations), src/poker.ts (five/seven-card ranking), and curriculum/journey examples. Port only those independent pieces; do not restore its simulator, heuristic coach or old generated strategy packs.

Simulator classification currently uses supplied raw preflop weights or recorded postflop frequencies. It does not calculate action EV loss. TexasSolver-related labels describe imported provenance, not independent solver validation. Legacy most-frequent scoring stays separate from supported-action learning classification. Spacing and related-family selection are learning heuristics.

## Remaining roadmap after this release (in order)

1. Active preflop drills.
2. Range-reading practice.
3. Postflop decisions and bet sizing.
4. Opponent-tendency recognition and exploit drills.
5. Live-game and multiway situations.
6. Advanced concepts and session habits.

Population tendencies require an identified dataset or an explicit assumption label. Group tendencies never establish observations about a specific player. Future betting/rake/range uncertainty must stay visible; do not turn draw completion into range equity or model-dependent EV into solver output.

F01 evidence: integrity/TypeScript and 132 unit tests pass. The reused evaluator also matches standard counts across all 2,598,960 five-card combinations. The five/seven-card evaluator remains separate from the protected simulator engine.

F02/F03 evidence: 144 unit tests and TypeScript pass. Questions are versioned and deterministic, freshness uses first recorded presentation rather than shuffle/seed alone, and local writes/recovery/imports are tested. Initial browser journeys pass lesson/save/reload, timed gating, linked practice/live-hand return and offline cold start. Final integration/regression checks remain F04/F05.
