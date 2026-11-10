# Correctness contract

No PTO charts or proprietary content are included. PTO-style means the requested simplified learning experience, not affiliation or a claim of equilibrium accuracy. Drills combine verified arithmetic and hand rules with explicitly conditional, authored strategic heuristics. No live opponent frequencies are inferred.

## Mathematics

Pot odds: if P already includes the opponent bet and C is the call, break-even equity is C/(P+C). This assumes no rake, future bets or equity-realization losses. Pure-bluff break-even fold probability is B/(P+B), from fP − (1−f)B = 0. Neither formula estimates equity or an opponent's folding probability.

## Evaluator

Cards are unique integer IDs 0–51. `five` compares categories then ranks lexicographically; `best` enumerates every five-card subset of 5–7 cards. Ace-low straights score five high. Suits never break ties. Seven-card fixtures cover board-only ties, competing kickers, two triplets, and a straight flush selected from seven.

Exhaustive category counts use standard combinatorics over C(52,5) = 2,598,960 combinations:

- Straight flush: 10 sequences × 4 suits = 40.
- Four of a kind: 13 ranks × 48 kickers = 624.
- Full house: 13 × C(4,3) × 12 × C(4,2) = 3,744.
- Flush excluding straight flush: 4 × C(13,5) − 40 = 5,108.
- Straight excluding straight flush: 10 × 4^5 − 40 = 10,200.
- Trips: 13 × C(4,3) × C(12,2) × 4² = 54,912.
- Two pair: C(13,2) × 6² × 11 × 4 = 123,552.
- One pair: 13 × 6 × C(12,3) × 4³ = 1,098,240.
- High card is the remainder: 1,302,540.

Frequency agreement tests category classification; it does not prove every kicker ordering. Targeted fixtures supplement it. Betting, shuffling, side pots and toy opponent policies have separate fixtures and seeded-game regression tests.

## Platform evidence

Web export and a 390×844 Chromium interaction test passed, including local progress after reload. An iOS JavaScript export checks bundling only, not native runtime compatibility. Actual iPhone, offline native cold-start, screen-reader and native release checks remain unverified.

## Curriculum review

Twelve original lessons cover rules through exploit hypothesis review. Hand-ranking statements were cross-checked against PokerKit's `StandardHighHand` examples (https://github.com/uoftcprg/pokerkit/blob/main/pokerkit/hands.py) and the betting examples in its README (https://github.com/uoftcprg/pokerkit). Both were fetched and read during implementation. No source text or proprietary charts are reproduced. Arithmetic examples are independently checked against the tested formulas. Strategy paragraphs are authored educational heuristics; they have not been reviewed by a professional coach or solved for equilibrium. Lesson IDs and prerequisite order are tested; a browser test verifies completion, unlocks and reload persistence.

## Simulator model

Six initial seats, blinds 1/2, no rake, no ante. Integer chips; BB=2. Folded money stays in tiered pots; unmatched excess is refunded; tied odd chips go clockwise after the button. Full raises update the minimum increment; short all-ins only reopen an already-acted player after the cumulative increase reaches a full increment. All-in runouts skip dry-side-pot betting. Blind and button order handles heads-up. Test fixtures cover these cases; 100 seeded hands check conservation, unique cards, termination and exact replay. Toy policies are explicitly authored demonstrations; their behavior and seed-based selection are not opponent-model results. A deterministic LCG shuffle is not intended for gambling security. In-progress table sessions now persist through validated action replay; learning progress remains separate.

## Release hardening

All seven browser suites pass, including an offline reload and scoring test, and automated WCAG A/AA scans at 320/390/768px. The unnamed XP progress bar found by the scan was fixed and rescanned. The native device gate remains open; see `RELEASE.md`.

## Guided path and presentation

All twelve lessons now include an authored connection, worked example and distinct application check. Check and Apply must both pass to complete a lesson. Existing saved completions remain valid, while new unlocks require every prior prerequisite. Stage labels are Basics, Deeper strategy and Mastery practice; the latter is not a certification of poker mastery. The visual regression verifies motion and its suppression with a live OS reduced-motion preference change, a worked-example accessibility scan, hidden-card labels and persistent navigation. See `DESIGN.md`.

## Continuous sessions

A 100-hand continuous regression checks legal completion and exact replay restoration. Seats at or below the big blind receive an explicit practice refill between hands so blind posting cannot strand a player. Per-hand chip conservation remains mandatory; refill credits are accounted separately from poker awards. The browser verifies hands continue and table state survives both tab changes and reload.

## Scoped simulator coach

Academy first-in baseline v1 is the existing authored preflop range. Grading requires six seats initially at 100 BB, no ante/rake, preflop and only preset/prior folds before the hero decision. The raise reference is 2.5 BB, or 3 BB from SB. Exact action/size agreement is a baseline match, not optimality. Other action/size choices are deviations, not solver errors or EV-loss estimates. Later streets, limps/raises, unsupported stacks, BB walks and non-hero decisions are ungraded. A deliberate exploit can differ from a baseline. No hidden opponent cards or future deck cards enter the checker; invariance tests verify this.

The coached setup presets earlier folds and resets all stacks each hand; it does not estimate live-player behavior or track a cash bankroll. The free table keeps stacks with separately disclosed practice refills. Version-2 table recovery recomputes feedback by replay, migrating prior v1 sessions as free tables. Tests cover all five supported position setups, canonical hands, baseline action/size choices, unsupported coverage, hidden-information independence, migration and 25 repeated coached hands. The browser verifies actual deviation/match feedback, ongoing play, explanations, reload, and next-hand rotation.
