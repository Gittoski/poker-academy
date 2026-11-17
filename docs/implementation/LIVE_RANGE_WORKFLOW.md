# Live play with range checks

Imported candidate notes retained for provenance. Current integrated routing, verification and user-test instructions are in [LIVE_INTEGRATION.md](LIVE_INTEGRATION.md). Test counts below describe the earlier candidate.

The local test simulator is `/live`. It keeps the original table, card artwork, classic/cool palette and range grid, with legal choices driving the hand instead of a recorded line.

After a supported preflop decision the original 169-hand grid appears with the player's hand outlined. “In range” means the chosen action has positive frequency in the imported reference, including mixed alternatives; it does not mean highest frequency or verified optimal play. “Outside range” means zero frequency. Continue hand resumes the table. Source explanations are collapsed under Range details. The reference never changes a chosen action or the resulting hand.

Only exact supported imported Cash 100bb preflop contexts are compared. Different sizing, stacks, antes, unsupported prior action and all arbitrary live postflop decisions show “No matching range” without substituting a chart. Opponents are disclosed heuristics, not a solver. Source provenance is not independently verified; this update does not authenticate GTO data.

The optional `LiveReference.chart` v1 field snapshots the parsed source entry, hand, action and display title. `liveSession` verifies source hash, original frequencies, replayed acting player and action before accepting it. Reload and retry preserve the original snapshot even if the current dataset changes. Old v1 saves remain valid; chart recovery requires the identical original entry hash and frequencies. Review hides the answer until a retry is submitted and never modifies the current live hand.

The reference raise size is used as an initial convenience when available and legal. Late-loading data cannot overwrite a size already edited by the user. Feedback scrolls into view on phones, respecting reduced motion.

## Validation of this candidate

- `npm run check`: 193 tests across 20 files, including exhaustive five-card evaluator counts, 1,000 randomized legal hands and 120 policy-played hands.
- `npm run build`: production build succeeds.
- `npm run test:browser`: all 70 tests pass. Coverage includes saves/reload, ownership, unsupported references, offline flows, original features and source snapshots.
- Five complete real-data hands played through browser controls: 23 hero decisions, no uncaught page errors. Additional targeted journeys exercise folding, retries and supported alternatives.
- Range cells and original classic/cool palettes checked at 320, 390, 430, 768 and 1365 pixels. Phone and desktop renderings inspected. The sampled phone page has no axe WCAG 2 A/AA violations; this is not a full accessibility certification.

No finite test run proves absence of bugs. Realistic rules and honest reference coverage are separate from solver-grade strategy. Recent live practice remains separate from the legacy adaptive mistake/calendar database. Each new hand resets configured stacks; there is no rake, ICM, tournament progression or persistent bankroll.
