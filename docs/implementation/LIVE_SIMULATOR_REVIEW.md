# Local live simulator candidate

Imported candidate notes retained for provenance. Current integrated routing, verification and user-test instructions are in [LIVE_INTEGRATION.md](LIVE_INTEGRATION.md). Test counts below describe the earlier candidate.

Base repository: Gittoski/poker-academy, revision 460fc170ca3e424bbcf9e11935e41fe064988742. Local changes only; no push, deployment, or new solver solves.

## Trying it

Run `npm run build` and `npm run start -- --hostname 0.0.0.0 --port 3100` in this checkout, then open `/live`. Home links to live practice inside its existing training panel. `/play` retains saved scripted and preflop reference exercises; `/ranges` and `/learn` retain their existing roles. Live and reference modes use separate saves.

## Acceptance review

| Area | Result |
| --- | --- |
| Cards | One seeded shuffled 52-card deck, round-robin hole cards, burns and board from that deck, runtime uniqueness checks. Seed supports reproducible recovery, not secure multiplayer. |
| Choices | Legal actions are applied verbatim. A reference never corrects the live continuation. Hero folds do not stop remaining players finishing the hand. |
| Betting | Minimum/full/short raises, cumulative reopening, prior checks facing a short opening bet, heads-up ordering, BB option and all-in restrictions. |
| Accounting | Integer chips; each-player and blind-first BBA conventions; unequal stacks, side pots, uncalled refunds, tied payouts and clockwise odd chips. Chip conservation checked on every transition. |
| UI scope | Six-, eight- and nine-seat practice. Blinds 0.5/1 BB, zero rake; configurable positive stacks and antes. Fixed training positions and reset starting stacks on each new hand. This is not a tournament progression or ICM trainer. Headless engine also supports two through nine seats. |
| Opponents | Three disclosed heuristic styles. Policy input includes only own cards and visible public state, not other hole cards, burns or future board cards. No solver/equity-model claim. |
| Feedback | Exact supported imported Cash 100bb PTO preflop chart matching, source-entry hash and original frequencies saved with feedback. Wrong sizes, ante/stack differences, prior callers/limps, cold re-raises, absent data and live postflop spots are ungraded. No EV-loss claims. |
| Teaching | Position, current made hand, calling price and break-even terminal equity against the presently contestable pot. These facts are distinct from an equity estimate or a solver recommendation. |
| Review | Current plus 20 recent hands; decision statuses and outcomes kept separate; original-reference retry pauses the live hand and hides later board/opponent cards. This local recent-history tracker is separate from the legacy adaptive review/calendar system. |
| Recovery | Version 1 seed/config/action log, reconstructed with legal transitions; malformed/incompatible saves rejected without overwriting the original. Unsaved practice and export remain available when storage fails. Original feedback is retained. |
| Concurrency | A browser Web Lock grants one live writer. Other tabs are read-only until ownership is retried. Without Web Locks, practice is explicitly unsaved. Expected history length and deal seed reject duplicate/stale UI transitions. |
| Offline | Live route is included in the offline pack. Pack updates are prevented while either simulator route is open. Missing reference data does not prevent legal live play. |
| Legacy fixes | Script board cards reserved during bystander dealing; limps/missing references stop without invented wins/folds; tied maxima and source precision fixed; saved legacy scores retained rather than silently recalculated. |

## Strategy limitations

The inherited preflop ranges are documented as extracted app data, not independently reproducible solver exports. The stored postflop exercises reference offline TexasSolver output on a restricted betting tree. No data was fabricated, regenerated or relabeled as verified GTO. Improving reference accuracy requires authentic solver exports with rake/ante, sizings, stacks, ranges and convergence metadata. Live play deliberately remains ungraded where that evidence is absent.

The heuristic opponents support rules and decision practice. They do not establish equilibrium play, model draws/blockers/equity, or certify improvement in real-money results. Use the existing lessons and reference exercises alongside live practice.

## Validation

Current candidate: `npm run check` passes 193 tests across 20 files; production build succeeds; all 70 browser tests pass. This includes exhaustive evaluator counts, randomized engine play, real-data UI playthroughs, original-feature regressions and range feedback on phone/desktop. See `LIVE_RANGE_WORKFLOW.md` for current UI details and `../MAIN-APP-HANDOFF.md` for integration routing work.

## Intentional limits

No real-money backend, secure multiplayer, ICM, rake, tournament blind progression, persistent bankroll, independently verified live postflop GTO or EV-loss grading. Native saved states are never imported into the new engine. The v1 seeded-deal algorithm and rules must be versioned if future changes would alter replay behavior. Oversized histories fail safely into explicitly unsaved practice rather than writing an unreadable save. Save files are limited to 2 MB and 20 archived hands, with a maximum 20,000 actions per deal for defensive decoding. Existing scripted/preflop saves are preserved separately.

Final manual review: a rendered 390px-wide live page was inspected after the passing browser checks; table, hero cards, legal controls and settings fit without horizontal overflow. Review server started locally on port 3100. No remote changes or deployment.
