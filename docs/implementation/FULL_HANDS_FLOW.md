# Full hands: continue without empty feedback

Release status: the user authorized production promotion of tested candidate `351c20e` on November 18, 2026. See [the production release record](PREFLOP_RELEASE.md). Earlier candidate verification is retained below; actual iPhone checks remain outstanding.

The user requested removal of repeated Continue clicks for decisions with no applicable strategy reference. This follow-up changes Full hands interaction only; it does not add strategy answers or change poker rules.

## Behavior

- A new ungraded Full hands action is applied, saved with its original ungraded status/source/reason and acknowledged automatically. Opponents continue normally without a Decision feedback panel or empty review dialog.
- Actual reference grades (match, supported alternative or outside-reference action) retain the existing compact/automatic-error feedback and explicit continuation.
- A learner fold still stops immediately. Hand-end Next controls and actual showdown results remain; skipping unknown strategy feedback never skips the result or automatically deals a new hand.
- Older saved Full hands checkpoints marked ungraded no longer reopen empty live feedback. Loading or returning from settings/review still pauses normal opponent progression until explicitly resumed, preserving user control.
- Deliberately opening an ungraded decision through Recent practice still explains the unavailable reference and allows non-mutating manual review. An unknown answer is never relabelled correct or incorrect.
- Covered Preflop and older preflop practice keep their existing feedback behavior. The balanced preflop selector, range charts, theme, cards, legal actions, opponent models and chip calculations are unchanged.

The existing `acknowledgedAction` save field is sufficient; no new save format or history deletion is required. Mode-less old saves retain the established Full hands default. Duplicate/stale append requests preserve the existing checkpoint guard.

## Verification

Unit checks cover saved/acknowledged unknown actions, old checkpoints, real grades, mode-specific behavior, stale submissions, replay/reload and immediate fold-stop behavior. New browser journeys cover automatic postflop progression, explicit manual review, old saved checkpoints, ungraded folds, graded errors and actual all-in showdown results. Related regression tests now expect ungraded live play to continue rather than opening an empty feedback panel.

Final checks passed: `npm run check` (TypeScript, protected baseline integrity and 239 unit tests across 29 files), the production build, and all 112 browser checks. The browser suite includes the five dedicated Full hands flow journeys plus balanced/graded preflop, both chart palettes, saved review, offline cold starts, ownership, bankroll accounting and player journeys on phone/desktop viewports.

See [verification artifacts](../verification/full-hands-flow/). Actual iPhone Safari/Home Screen and hosted preview verification remain separate. Development used the existing candidate branch; subsequent production promotion is authorized above.
