# Live feedback recovery

The report of missing grades exposed two different problems: chart downloads failed silently, and random live play regularly leaves the available strategy tree. This correction repairs loading and prevents avoidable preflop sizing mismatches. It does **not** provide a strategy solution for arbitrary live postflop play.

## Behavior

The table waits for its imported Cash 100 BB PTO charts before accepting new actions. A failed, invalid, empty or stalled download shows Retry charts and an explicit Play ungraded option. Recovery keeps the same hand, cards, action history and feedback. The loader uses the original entry validator and the same offline-bundled URL as the range viewer; requests time out after 15 seconds. The shared range viewer and its existing cache remain unchanged.

The heuristic opponents use the documented raise size when their preflop situation has an applicable chart. Previously they always multiplied a previous bet by three, which differs from the supplied out-of-position 3-bet and 4-bet sizes. For example, a small blind facing a button's 2.5 BB open now uses the supplied 12.5 BB 3-bet size rather than 7.5 BB when its heuristic chooses to raise. Whether it raises, calls or folds still comes from the existing heuristic and random roll. It does not sample solver recommendations or force the learner's continuation. Unsupported situations retain the old legal-sizing fallback.

Covered choices show In range or Outside range, with original frequencies, grid and saved source. Supported mixed alternatives retain credit. Errors automatically open the explanation; successful and ungraded choices stay compact. Neutral feedback now says why no grade exists, rather than repeating a generic message. The table subtitle signals available charts or ungraded postflop play before acting. Full explanations remain in the internally scrolling overlay with fixed controls.

Every chosen action still controls the actual hand. Folding still ends practice immediately. Recovery never retroactively regrades a saved ungraded answer. Saved reference snapshots and retries remain usable even if a subsequent chart download fails. Optional reason codes are validated on load; saves without these codes remain compatible.

## What remains unresolved

The charts cover matching 100 BB cash preflop situations without antes, including documented sizes and supported raise sequences. Prior limps/callers, cold re-raises, other stack configurations, different sizing and arbitrary postflop situations remain ungraded. Switching to Preflop stops future streets but does not guarantee coverage for every possible live action sequence.

Imported PTO labels and solver provenance have not been independently verified. The opponents remain heuristic sparring partners, not population models or solver agents. No EV loss is computed. Recommendations never use opponents' hidden cards or future outcomes. Fresh postflop boards need an applicable strategy reference before correct/incorrect grades can be added; archived scripted-board answers cannot legitimately grade unrelated boards.

## Verification

Passed:

- `npm run check`: protected simulator/data integrity, TypeScript and 218 unit tests across 25 files.
- `npm run build`: optimized production build.
- `npm run test:browser`: all 99 browser regression checks, including offline cold starts, both modes, archived exercises, source grids, ownership, fold stopping, retries, showdown results and phone-to-desktop layouts.
- Final production-build confirmation: 22 focused browser checks after the legacy ungraded-retry reason refinement. Previously ungraded saves without a reason code retain a generic explanation rather than receiving an invented reason.

New checks cover actual shipped preflop charts, positional opening coverage, documented re-raise sizes, unchanged non-raise behavior, neutral unsupported spots, saved feedback, empty/failed/stalled requests, recovery before either player acts, explicit ungraded play and small-screen layout. Covered recommendations also stay identical when opponents' private cards and the unrevealed deck change.

See [verification logs and screenshot](../verification/feedback-recovery/). The retained phone/desktop full-hand journeys contain ten completed hands and 47 decisions: ten chart-graded and 37 ungraded. These automated raise/check/call journeys are not a representative play-distribution benchmark, but demonstrate why adding postflop reference coverage remains necessary. Passing UI tests does not supply missing poker strategy answers.

Actual iPhone Safari/Home Screen behavior and the hosted Vercel deployment require separate confirmation; Chromium viewport checks are not hardware verification.
