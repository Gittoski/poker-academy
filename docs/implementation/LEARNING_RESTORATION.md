# Restore the approved learning simulator

The user reported overlapping mobile controls, an unfamiliar table/layout, changed feedback presentation, and opponents continuing after their fold. They explicitly requested correcting these regressions while keeping the realistic engine. Baseline: published `3024cb2`; the approved pre-engine presentation is retained in the archived controller and `docs/design/navy-table` / `docs/design/material-depth` screenshots.

## Presentation

The live controller now uses the approved `play-page` / `trainer-table` grid, header, three category-colored action buttons, compact feedback, table proportions and existing materials. SimulatorTable, card faces, navy material/interface styles, mode switch, RangeGrid/Legend, source calculations and supplied data are unchanged. The conflicting standalone live-page layout was removed. Narrow and landscape layouts use the same existing simulator grid rules, with small scoped live adjustments.

The normal screen has Raise/Bet, Call/Check and Fold in the original action row. Bet sizing is a separate panel with custom sizing and All-in preserved. Apply validates exact chip amounts and legal bounds; Cancel does not commit a draft. Settings/review and the navy oval mode switch remain accessible. No new learning modules or visual redesign are added.

## Feedback and retries

- Positive chart support: compact green In range feedback, with optional Explanation & chart. No automatic large popup.
- No applicable reference: neutral compact ungraded feedback. No invented correct/incorrect result or automatic large popup.
- Zero chart support: automatically open the full explanation, with the original reference's supported actions/frequencies, source and caveats. Explanation/Chart tabs and fixed Retry/Continue actions match the earlier learning interaction; long content scrolls inside the overlay.
- Hidden panels are explicitly hidden at all widths, including desktop. Opening/closing settings does not re-open a dismissed error dialog.
- Continue retains the learner's chosen action. No script or hidden reference action takes over play. Pending non-fold decisions show their pre-action state until acknowledged, so all-in runouts cannot leak through a grading explanation.
- Retry restores the last live checkpoint and its same cards/setup before the answered action. The original attempt, source snapshot and mistake remain once in bounded history. The learner's new choice controls the subsequent line. Prior feedback is not duplicated in the archived attempt.
- Manual practice opened from Recent decisions remains separate and does not alter the current hand; returning to live play preserves its checkpoint.

The grading adapter and original ranges were not changed. Unsupported live postflop, sizes/stacks/antes and uncovered histories remain ungraded. Opponents remain disclosed heuristics. No solver certification, precise EV loss or result-based grading is introduced.

## Fold and result boundaries

A focused replay gives the engine an explicit training hero. That hero's Fold stops immediately, before advancing any opponent, drawing another card, refunding/awarding pots on other players' behalf or producing an imagined showdown. Both modes show a clear end and Next hand. If the fold was outside the reference, its explanation/retry remains available, but no further poker actions run. Retrying deliberately reopens that decision; otherwise Next hand starts a new deal.

For old saves that already contain actions after the learner folded, raw validation retains the complete original log while presentation truncates at the first learner fold. New actions cannot append beyond that boundary. The ordinary unfocused rules engine remains usable for validating historical logs and does not turn folds into fictitious game winners.

Preflop still stops after its betting round. Full hands still reach genuine showdown if the learner stays in. Completed showdown results use the existing result materials with calculated winners, hand categories, pot details, net chip result and fixed Back/Next controls. Mixed side-pot results are described without claiming the hero won every pot. Closing a result does not start a new hand.

## Storage and preserved features

The payload is version 3 under the existing key; v1/v2 are read without erasing or rewriting their action/reference history. Older cached clients reject v3 rather than continuing folded hands or discarding attempt/acknowledgement metadata. Current/parked mode hands and the 20-item archive remain bounded. An attempt marker keeps retried error snapshots out of completed-hand counts. Original IndexedDB exercise/lesson stores remain untouched.

Both live modes, source snapshots, exact manual practice, mode bookmarks, custom sizes, ownership, export, storage failure warnings, Home/settings navigation, old entry redirects, archived exercises, learning returns and complete offline packs remain available. Update an installed offline pack while online to receive this interface. A refresh alone can keep an older installed pack.

## Verification

Final verification passed:

- `npm run check`: protected file integrity, TypeScript and **209 unit tests / 23 files**. New cases cover immediate/closing-round/postflop folds, old-log truncation, rejecting later actions, genuine retry/error retention and unchanged unfocused rules.
- `npm run test:engine`: **81 tests / 10 files**, a focused subset including the learning-flow checks.
- `npm run build`: optimized production build with the existing offline function/asset tracing.
- `npm run test:browser`: **93 passing checks** in one final production run. Includes compact/automatic feedback, fixed overlay actions, no popup replay after settings, both fold modes through reload and 20 seconds of clock advancement, sizing validation/cancel, v3 backup download, table/action separation and clipping checks across small phone/landscape viewports, both modes/settings, source snapshots/palettes, saved practice, ownership, failed storage, offline and retained exercises/lessons.
- Shipped-data journeys: preflop desktop: 5 practice hands/rounds, 6 decisions, 0 uncaught errors; preflop phone: 5 practice hands/rounds, 7 decisions, 0 uncaught errors; full phone: 5 practice hands/rounds, 26 decisions, 0 uncaught errors; full desktop: 5 practice hands/rounds, 22 decisions, 0 uncaught errors. Folded learner hands count as completed practice, not a played-out opponent showdown.
- Inspected rendered phone/table/error/chart/showdown screens against the retained approved reference screenshots.
- `git diff --check` passed; direct baseline comparison confirms no changes to SimulatorTable, card faces, navy material/interface CSS, oval-switch component/CSS, RangeGrid/Legend, live reference adapter, opponent policy or supplied data/public assets.

[Logs, actual render captures and journey records](../verification/learning-restoration/README.md) are retained. Archived regression tests continue testing the archived controllers; live tests explicitly open the Chart tab rather than expecting the removed automatic every-answer chart popup. Only documentation/artifacts were changed after final verification.

Phone-sized Chromium checks are not actual iPhone/Safari certification. WebKit is not installed here. Hosted Vercel status and the restored interface on the user's device remain unverified independently of the Git push.
