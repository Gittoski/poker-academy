# Graded preflop candidate

Development branch: `test/graded-preflop`. The user authorized the scoped upgrade on November 17, 2026. Main-app integration/deployment is reserved for the reviewed candidate.

## PF0 — Coverage audit

The catalog identifies 65 standard six-max contexts: five opens and 15 position pairings in each response family (vs open/3-bet/4-bet/5-bet). Each prefix is legal replay through the current live engine with reference bet sizes. Earlier setup actions are scenario assumptions, not learner answers or claims that earlier actions are optimal for the newly dealt cards.

An exhaustive test finds genuine shuffled seeds for every hand class in each seat, replays each context and checks all applicable learner actions against the original source. All 10,985 context/class combinations pass. The supplied PTO frequencies in these contexts are binary; this does not validate their equilibrium accuracy. Mixed alternatives remain a requirement for other supplied references and future source versions.

The adapter correctly grades these covered choices. Missing live grades result when play leaves this scope. The next milestone must prevent offering unsupported new learner prompts, preserve actual actions, and distinguish planned educational boundaries from real hand outcomes.

Verification: `npm run check` passed protected-file integrity, TypeScript and 221 unit tests across 26 files. No strategy data, protected source functions, table/card graphics or chart colors were changed. This audit alone does not implement the updated mode or establish independent solver correctness.
