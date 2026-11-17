# Preflop on the live engine

The later [learning-interface restoration](LEARNING_RESTORATION.md) supersedes the feedback, result presentation and fold-continuation behavior described below.

The user authorized converting the separate Preflop mode to the same random-deal/live-action engine, preserving the theme, functions and ways to reach both modes. Baseline: published `455240d` on `work`.

## Behavior and entry points

- The approved GameModeSwitch and its unchanged navy oval-thumb CSS now appear in the live simulator header. Off is Full hands; on is Preflop. The header uses a second row on narrow phones so text/actions remain readable.
- Home Settings links to each live mode. Practice tools → Live table settings also selects the mode through the existing segmented-control component. `/live?mode=preflop` and `/live?mode=full-hands` are explicit mode links; plain `/live` resumes the last selected one.
- `/play` now redirects to the live simulator, keeping query parameters. Old preflop setup links initialize supported player count, seat and stack values only when that mode has no saved hand. Existing saved hands keep their original setup.
- Explicit old review/archive links redirect to `/archive/play`. Original exercise controllers and their datasets, history, backups, separate mode switch and learning returns stay there; the archived reference drills remain available deliberately, not as the normal Preflop mode.
- Both live modes use the identical shuffle, rules, chosen-action transitions, opponent policy and reference adapter. A wrong/outside-range decision still determines play. Cards are randomized; opponent actions are the existing disclosed heuristics, not uniformly random choices or verified equilibrium opponents.

## Preflop boundary

At the point the engine would move to the flop/run out preflop all-ins, Preflop mode instead marks a training boundary. It retains contributions, uncalled refunds and the unresolved pot, sets no acting player, and deals no board or burns. It assigns no showdown winners, side pots, payouts or speculative net result. Next hand stays explicit, following feedback acknowledgement.

If everyone but one player folds preflop, the winner is already known and the existing uncontested settlement remains valid. Full hands keeps its normal flop/turn/river, all-in runout, showdown and chip accounting. The existing side-pot and odd-chip repairs are unchanged.

## Saves, switching and reviews

The current hand and the other mode's single parked hand are bounded separately from the 20-hand archive. Switching parks rather than archives/regrades an interrupted hand, restores the target mode's setup, exits a manual retry, and pauses opponents. A synchronous save precedes committing the switch in the UI. On write/size failure, the old mode and stored save remain intact with an explicit unsaved warning. Unsaved practice remains possible; export covers both modes.

The payload is now version 2 under the existing storage key. Version-one saves are read without changing their original actions, seed or feedback; missing mode means Full hands. New exports/writes use version 2 so older builds reject the new payload rather than silently extending a preflop-only hand postflop. Invalid saves remain untouched and exportable. One Web Lock owns both mode slots.

Recent live reviews and Home's recent-decision count include current, parked and archived hands. Original source grids, source hashes and frequency precision stay attached to each decision. Exact retries remain answer-hidden and do not advance either saved hand. The daily activity calendar still explicitly covers earlier exercises/lessons, not a newly invented all-mode total.

## References and offline support

Source coverage is unchanged: supported exact 100bb cash preflop contexts receive imported-chart In range/Outside range feedback. Unsupported histories, sizes, stacks, antes and live postflop remain ungraded. Neither hidden cards nor future outcomes determine recommendations. No solver certification or precise EV-loss claim is added.

The complete offline pack includes `/live`, the compatibility `/play` entry and `/archive/play`; the worker handles old-link redirects locally and prevents pack updates while either simulator is open. Update an installed offline pack from Home Settings while online to receive this release. Existing learning and live progress is retained.

## Verification

Final verification passed:

- `npm run check`: file integrity, TypeScript and **204 unit tests / 22 files**, including shared engine behavior, no-flop/no-payout boundaries, all-in/fold endings, parked save/reload, v1-to-v2 migration and corrupt-mode rejection.
- `npm run test:engine`: **76 tests / 9 files**, a focused subset including the new live-mode checks.
- `npm run build`: optimized production build with the live and archive routes and traced offline assets.
- `npm run test:browser`: **88 checks**, including normal/old entry links, both mode controls, mode/retry/save failure paths, ownership, offline cold starts, mobile layout/accessibility, sources/palettes and all retained controller/learning regressions.
- Actual shipped-data journeys: preflop desktop: 5 completed / 7 decisions / 0 uncaught errors; preflop phone: 5 completed / 6 decisions / 0 uncaught errors; full phone: 5 completed / 23 decisions / 0 uncaught errors; full desktop: 5 completed / 23 decisions / 0 uncaught errors. Total: 20 completed hands/rounds and 59 hero decisions, without uncaught errors.
- The unchanged simulator/data integrity baseline passes; direct Git comparison also confirms no edits to the table/card components, navy material/interface/switch CSS, oval-switch component, RangeGrid/Legend, supplied data or public assets.
- `git diff --check` passed.

[Logs, screenshots and journey records](../verification/live-preflop/README.md) document the run. The archived-controller browser tests intentionally use `/archive/play`; separate compatibility tests verify `/play` routes to the new engine and explicit review URLs still reach saved history.

Table/card components, navy material CSS, the approved oval-switch component/CSS, RangeGrid/Legend, chart palette calculations and all supplied data/public assets are intentionally unchanged. Actual iPhone Safari/Home Screen rendering, VoiceOver and hosted Vercel deployment remain separate verification tasks.
