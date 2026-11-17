# Realistic live simulator release

The later [live preflop release](LIVE_PREFLOP.md) updates mode controls, save format and archive routes described here.

The user explicitly approved updating the main app after further tests. This approval supersedes the earlier requirement to hold the integration candidate unmerged and undeployed. Actual iPhone testing has not been performed or asserted.

## Scope

The release includes the tested `03d9314` live integration plus final navigation, settlement and deployment-packaging checks. The connected repository's default branch is `work`, initially `dfa701d`. Its existing Vercel integration controls which branch is deployed. Publishing uses a normal fast-forward Git update, with no forced overwrite. Previous commits and archived exercise files remain available.

- Live poker deals a shuffled deck and continues from the player's actual legal choices. It supports streets, fold/check/call/custom raise/all-in, completion, runout, showdown, chip refunds and real side pots. No script chooses the continuation. Random dealing can naturally produce the same hole cards again; no claim of unique hands forever is made.
- Hero cards, table, seats, rail/felt lighting, card faces, navy materials, RangeGrid/Legend, palette functions, branding and supplied strategy data are preserved. The original oval switch remains in the archived exercise code. No chart recoloring or new visual redesign is part of this release.
- Home still has its three panels and Ranges/Play/Learn navigation. Next practice and All reviews now open live decision history; main Settings opens live table settings. Deep links pause opponents, select the relevant tool section and use one overlay.
- The earlier scripted/preflop exercise controller, settings, saved hands, mistakes and backups remain under Earlier exercise history. Their explicit `/play` URLs still restore prior work. Routine simulator navigation no longer advertises the scripted trainer.
- Existing Learn content remains. The activity calendar still explicitly counts earlier exercises/lessons, not live play. Recent live decisions and retries are a separate bounded store (current hand plus 20 recent hands).

## Settlement repair found during player-style verification

Folded players' contributions had been divided into separate contribution layers even when the same players were eligible for every layer. That created artificial side-pot labels. It could also award odd chips repeatedly to the same tied winner.

The engine now combines adjacent layers with identical eligibility **before** splitting the money. A regression with a 98-chip tied pot returns 49 chips to each winner. Real unequal-all-in pots, with different eligible players, remain separate and keep their own odd-chip allocation. A browser regression verifies a normal completed pot includes folded chips without displaying invented side pots. Existing seed/action saves replay legally with corrected settlement; actions and strategy feedback are preserved.

## Honest decision feedback

Exact matching imported 100bb cash preflop charts supply the full range grid and chosen action frequency. Positive support means In range; zero support means Outside range. The reference never substitutes a different action into live play. Saved snapshots validate context, source hash and original frequencies, and retries do not consume the live hand or reveal later cards.

Other sizes, antes, limped/multiway/uncovered histories and arbitrary live postflop remain ungraded. Opponents use disclosed heuristics and only their own cards/public information. They are not verified GTO agents or population models. No precise EV-loss claims, fabricated solver solutions or outcome-based grading were added.

Each practice hand resets configured stacks and fixed training positions; this is not a persistent bankroll table with rotating blinds. There is no rake or secure multiplayer.

## Offline and deployment packaging

The offline-manifest function reads the build ID, compiled chunks and public JSON at runtime. Its Next.js output-file trace now explicitly includes all three, alongside the existing logo function tracing. A production browser check verifies that every manifest chunk and the relevant chart are in the function trace.

An installed complete offline pack deliberately keeps its old build until updated. Leave simulator tabs, open Home Settings → Use offline on this device, and update the pack while online. History is not deleted by a pack update. Interrupted updates preserve the previous complete pack.

## Verification

Final local verification passed:

- `npm run check`: integrity baseline, TypeScript and **197 unit tests across 21 files**.
- `npm run test:engine`: **69 checks across 8 files**, a focused subset covering chip/deck invariants, 1,000 randomized legal hands, policy hands, source feedback and persistence.
- `npm run build`: optimized production build, with all offline-manifest assets and build ID traced.
- `npm run test:browser`: **79 checks**, including full-hand UI journeys, call/check/fold/custom raises/all-ins, source/reference safety, saved history/retries, two-tab ownership, storage failures, offline cold starts, archive compatibility, settings/review deep links and unclipped mobile controls.
- Actual shipped-data journeys: phone: 5 completed hands / 23 hero decisions / 0 uncaught errors; desktop: 5 completed hands / 24 hero decisions / 0 uncaught errors. Exact fixtures are limited to deterministic rule/source assertions.
- The new dead-money regression was observed failing before repair and passing afterward. Genuine side-pot, refund and odd-chip regressions remain passing.
- `git diff --check` passed. A direct baseline comparison confirms SimulatorTable, card faces, navy material/interface/switch CSS, RangeGrid/Legend and all supplied data/public files are unchanged from `dfa701d`.

[Verification logs, screenshots and journeys](../verification/live-release/README.md) are retained. Only documentation/artifacts were updated after this run.

Hosted Vercel runtime status is separate from local verification. The repository links to https://poker-academy-pearl.vercel.app. This environment could read the repository and validate Git push access, but direct requests to the hosted app failed; GitHub CLI authentication was also unavailable. A Git push alone must not be described as a verified successful Vercel deployment. No Vercel settings or credentials were changed.
