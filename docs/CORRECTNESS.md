# Correctness contract

No PTO charts or proprietary content are included. PTO-style means the requested future simplified learning experience, not affiliation or a claim of equilibrium accuracy. Current drills contain arithmetic and standard hand-ranking rules only. Exploitative models and recommendations have not been implemented.

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

Frequency agreement tests category classification; it does not prove every kicker ordering. Targeted fixtures supplement it. Betting, shuffling, side pots, and opponent policies still require separate implementations and tests.

## Platform evidence
Web export and a 390×844 Chromium interaction test passed, including local progress after reload. An iOS JavaScript export checks bundling only, not native runtime compatibility. Actual iPhone, offline native cold-start, screen-reader and native release checks remain unverified.

## Curriculum review
Twelve original lessons cover rules through exploit hypothesis review. Hand-ranking statements were cross-checked against PokerKit's `StandardHighHand` examples (https://github.com/uoftcprg/pokerkit/blob/main/pokerkit/hands.py) and the betting examples in its README (https://github.com/uoftcprg/pokerkit). Both were fetched and read during implementation. No source text or proprietary charts are reproduced. Arithmetic examples are independently checked against the tested formulas. Strategy paragraphs are authored educational heuristics; they have not been reviewed by a professional coach or solved for equilibrium. Lesson IDs and prerequisite order are tested; a browser test verifies completion, unlocks and reload persistence.

## Simulator model
Six initial seats, blinds 1/2, no rake, no ante. Integer chips; BB=2. Folded money stays in tiered pots; unmatched excess is refunded; tied odd chips go clockwise after the button. Full raises update the minimum increment; short all-ins only reopen an already-acted player after the cumulative increase reaches a full increment. All-in runouts skip dry-side-pot betting. Blind and button order handles heads-up. Test fixtures cover these cases; 100 seeded hands check conservation, unique cards, termination and exact replay. Toy policies are explicitly authored demonstrations; their behavior and seed-based selection are not opponent-model results. A deterministic LCG shuffle is not intended for gambling security. In-progress table sessions are intentionally ephemeral; only learning progress persists.
