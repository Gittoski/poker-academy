# Local engine correctness pass

Imported candidate notes retained for provenance. Current integrated routing, verification and user-test instructions are in [LIVE_INTEGRATION.md](LIVE_INTEGRATION.md). Test counts below describe the earlier candidate.

Historical first-pass notes. For the completed local live-mode candidate, see `LIVE_SIMULATOR_REVIEW.md`; limitations below about missing live rules apply to the retained legacy exercises.

Base revision: 460fc170ca3e424bbcf9e11935e41fe064988742. These changes are a local candidate, not a deployment or a full simulator conversion.

## Changes

1. The full-hand dealer reserves the suit-mapped stored board before dealing bystanders. This prevents a folded seat holding a future board card. All 780 scripts are checked with three seeded suit/deal variations each.
2. A limped pot no longer becomes a BB walk. With multiple live players and no raise, the BB response is marked unsupported and no winner is assigned. There is no supplied BB-versus-limp reference; stopping avoids inventing strategy. Genuine walks retain their previous behavior.
3. Tied maximum frequencies receive the same drill grade. Preflop prompts preserve source precision so a small positive frequency is not graded as unsupported; rendering formats percentages separately. Score UI says “reference match” because the statistic is not EV loss or execution of a mixed strategy. This does not change stored scripted continuations. Historical saved scores are not recalculated.
4. Unsupported endings round-trip through saved checkpoints. The integrity baseline is updated only for the intentionally changed library files; supplied charts, scripts and other protected paths retain their existing hashes. The integrity command explicitly calls itself a file check. `npm run test:engine` runs actual behavior tests, also included in `npm run check`.

## Limits and next priorities

- Fresh deals receive the card fix. Previously saved native hand states are preserved; start a new hand for a newly dealt state.
- Missing-chart automatic folds have now been replaced with explicit reference-exercise stops. See LIVE_ENGINE_PROGRESS.md for the separate live engine and remaining integration work.
- MTT ante posting remains unimplemented. Decide and document ante convention and stack accounting, then support unequal contributions and side pots and test chip conservation.
- Previously saved verdicts and scores retain their original grading; new answers use source-precise preflop prompts.
- Range labels are inherited claims, not independently verified preflop solver results. Obtain reproducible solver exports with game format, rake/ante, stacks, sizings, ranges and convergence metadata. PTO is a simplification.
- Full hands remain 780 prerecorded lines over 23 spots and six canonical flop boards. Changing suits is not dealing arbitrary boards. Player answers are graded and the recorded continuation is played regardless of the selected answer.
- A true simulator requires one live deck across all streets, legal-action validation, arbitrary action branching, stack/pot settlement and side pots, plus an opponent policy independent of the scoring/reference layer. A legal simulator alone does not establish GTO play.

## Validation

- `npm run check`: 164 tests pass, including regression checks for the reproduced bugs, saved ending recovery, 2,340 scripted deal variations, and stored pot/stack/probability consistency.
- `npm run build`: production build passes.
- Browser smoke checks: all 8 foundation and hand-completion journeys pass after the final scoring changes (viewer, preflop feedback, full-hand continuation, responsive rendering, all-in runouts, saved-result reload, fold completion).

No source ranges or stored full-hand scripts have been regenerated or relabeled as verified GTO.
