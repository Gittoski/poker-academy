# Balanced preflop selection

The user approved this follow-up after finding the first candidate too fold-heavy. Work stays on `test/graded-preflop`; production integration is separate.

## Behavior

The original selector sampled all 65 chart contexts equally and dealt unrestricted random hole cards. Thus 45/65 contexts faced a 3-bet or higher, and most random hands were folds in those narrow references. The new default selects an educational category first: approximately 60% of new exercises have at least one source-supported call/raise, and 40% are fold-only. It then favors common situations: open 40, facing an open 40, facing a 3-bet 12, facing a 4-bet 5, facing a 5-bet 3. These are teaching weights, not population observations or equilibrium frequencies. They renormalize when a fixed position/category excludes a family.

Cards are fresh legal shuffled deals conditioned on the selected learner-hand category. Selection examines only the learner's hand and the applicable unchanged chart, never opponent cards or outcomes. Calls/raises and fold-only status come from actual positive/zero source support, not an invented strength score. Within eligible classes, rejection sampling retains physical-combination weighting. A playable hand can still contain a supported fold in a future mixed-frequency source; the user's actual answer is always graded by the reference.

The category is neither displayed as a pre-answer hint nor added to saved deal metadata. Ordering is randomized; the ratio is a long-run target rather than an exact sequence or guaranteed split in every short session. The target applies to the first offered decision of each new hand; later decisions still follow their actual reference context.

Within the selected family, the previous setup is avoided when alternatives exist. This order preserves common-family weighting for a fixed position with only one opening context: that setup can return with different cards instead of forcing advanced spots between every open. The last six retained original graded hands inform recent-class avoidance; retry snapshots do not count as new exposures. Repeated classes are reduced when the selected range has alternatives, with an honest fallback for a genuinely one-class range. Identical recent seeds are excluded. No fake range expansion is used to manufacture variety.

Sampling is bounded to 4,096 seed attempts and fails explicitly if a required category is unavailable or a fresh match cannot be found. The existing current hand stays kept on failure. No source grade or player action is changed to meet the mix. Explicit seed fixtures retain exact replay semantics; saved hands/retries are never resampled. The existing save format remains compatible because it already records the actual seed and context.

All new-hand entry paths use the selection: fresh preflop links, a newly opened preflop slot, explicit upgrade, Next hand and starting a new fixed-position exercise. Existing parked/restored hands remain unchanged. The study mix is disclosed in Practice tools. Unrestricted Full hands retains its existing dealing/policy.

## Verification

The deterministic 1,200-hand sampler test produced 736 continuing and 464 fold-only starts (61.3% / 38.7%), 977 common and 223 advanced contexts (81.4% / 18.6%), 159 hand classes and 62 sampled contexts. Separate forced-context tests retain all 65 contexts and both categories; a random sample is not required to visit every rare context. Maximum matching draws were 102, with mean 5.70 in this sample. These results describe the test sample, not device performance, real-game frequencies or learning efficacy.

Tests cover original source membership, legal cards, recent-repeat avoidance, unchanged history, category privacy, exact seed/reload semantics, missing category and malformed/bounded random input. Existing exhaustive preflop source/grading tests still apply.

Final verification passed: `npm run check` (TypeScript, protected baseline integrity and 235 unit tests across 28 files), the production build, and all 107 browser checks. The additional app-control journey generated 40 new hands with 23 continuing and 17 fold-only starts, 28 common contexts, 25 distinct setups and 32 hand classes, without page errors or pre-answer category metadata. The starting saved hand stayed unchanged through reload. These smaller-sample proportions can differ from the long-run targets.

See [verification logs and playthrough](../verification/balanced-preflop/). Actual iPhone and hosted preview verification remain outstanding. Production `work` stays unchanged; the verified update is pushed only to the candidate branch.
