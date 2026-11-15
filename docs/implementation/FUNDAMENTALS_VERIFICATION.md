# Fundamentals: provenance and verification

## Recommendation audit

The protected simulator engines and reference data are unchanged. Preflop answers compare the player's action with supplied chart weights for the selected configuration. Full-hand postflop answers use the supplied recorded node frequencies. The imported source describes TexasSolver generation; this fork has not independently solved or validated optimality of those references. Legacy most-frequent-action scores and the journal's positive-support classification remain separate. Neither is an EV-loss calculation.

Feedback now exposes this basis. The source enum changed from `solver` to `reference` in VerdictView and its FullHandTrainer caller; additional text describes imported provenance. These are the only two protected files changed in this release, and their reviewed hash entries are updated after regression verification. No engine, grade function, chart aggregation/color function, palette, public JSON, source range or hand-script baseline is rebased.

The fundamentals layer reads the player's pre-decision public state to suggest related practice. It does not use actual hidden opponent cards, later board cards, winners or outcomes. Unit tests mutate those hidden/future inputs and require identical links and public call prices. Existing grading functions remain reference-based. No precise EV loss, player model result or population statistic is fabricated.

## Exact arithmetic versus assumptions

- Pot odds: call / (pot after the opponent's bet + call). Terminal call/fold practice specifies no future betting and ignores rake.
- Draws: outs/unseen for one card; 1 − ((unseen−outs)/unseen)((unseen−outs−1)/(unseen−1)) for at least one fixed out in two cards. Completing the event is not automatically winning equity.
- Equity: independent five/seven-card evaluator, ties split equally, exact weighted enumeration for explicitly supplied turn/river hand combinations. Blocked combinations are removed and remaining weights normalized. Examples include a revealed-hand benchmark and hypothetical weighted river ranges; these do not estimate an actual opponent's unknown range.
- Call EV: equity × pot − (1−equity) × call, relative to folding for zero future investment. Supplied equity is an assumption, even when subsequent arithmetic is exact.
- Zero-equity terminal bluff: fold probability × pot − (1−fold probability) × bet; break-even bet/(pot+bet). Assumed fold probabilities are labelled hypothetical. Two observed folds do not establish a precise population or player rate.

The independent evaluator/formulas and ranking examples reuse archived academy revision f172d1f (`src/math.ts`, `src/postflop.ts`, `src/poker.ts`); the retired simulator and heuristic coach were not restored. The evaluator matches standard category totals over all 2,598,960 five-card combinations. Learning gates, suggested progression, fresh-question preference and review spacing are educational heuristics, not solver results.

## Automated scope

Unit checks cover arithmetic and invalid inputs; evaluator categories/kickers/wheels and exhaustive counts; weighted equity/blockers/ties/turn runouts; deterministic versioned questions; semantic identity; first exposure/resume; idempotent local answers; timing gates and late-correct grading; failed-write recovery; validated backups; detail retention; public-information-only links; and offline checksum failure, atomic replacement, health and removal.

Browser checks cover lessons and saved feedback/reload, unfamiliar next questions, optional timed practice, linked mistake practice returning to the paused simulator hand, offline cold starts and offline supplied-hand loading, interrupted offline updates, responsive layouts and automated WCAG checks. Existing chart/trainer/session/review/result journeys are run as regressions.

No iPhone/Safari hardware, App Store build, VoiceOver or hosting deployment has been tested. Headless Chromium at phone sizes and automated accessibility scans do not establish those outcomes. Full-hand play remains a scripted trainer, not unrestricted branching cash poker. Arbitrary flop-range equity, rake/future-betting EV and new exploitative recommendations remain outside this release.

Verification run: 2026-11-15, Node 24 on Linux, Next production build and system Chromium. Commands: `npm run check`, `npm run build`, `npm run test:browser`. Final totals: 147 unit tests across 15 files and 28 browser journeys, including five fundamentals flows. The browser suite also verifies removing a downloaded pack retains learning attempts. See [an actual practice screenshot](../design/fundamentals/README.md). A review-menu overflow discovered by regression testing was fixed by wrapping its navigation and long controls; the narrow-screen check now passes.
