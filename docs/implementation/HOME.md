# Approved Home screen

Implements the approved three-panel design: Play/Resume, daily activity and Next practice. No extra goals, streaks, XP panels, weekly summaries or duplicate shortcut tiles were added. The header says Poker Trainer / by Greg, with Settings and Ranges / Play / Learn shortcuts.

## Navigation and preservation

Home is `/`. The unchanged range viewer now lives at `/ranges`. Plain links remain intentional for complete offline HTML caching. Ranges and Learn have a Home brand link. The installed-app manifest starts at Home. Existing simulator URLs continue working.

Home reads the preserved live cursor (`resume` when manual practice is in progress), loads its original hand configuration and constructs the same Play URL. Choosing Resume keeps the hand, verdict, source and game setup. It does not start a different session or grade a decision. Completed hands use Continue training. No saved cards or opponent information are displayed on Home.

All reviews and Next practice open the existing review area through an initial-review flag, captured before the simulator normalizes the URL. A review-only entry inspects saved source availability before caching the current pack; closing review can then cache that exact current source. A missing archived reference remains read-only during inspection. The simulator is paused while reviews are open; exact retries, hand practice, notes, export/import and live-hand restoration remain the existing implementations. The count is saved mistake groups with retained examples that are due, not a diagnosis of the learner's weakest skill. Empty states use real zero counts, never example dashboard numbers.

Settings on Home contain game mode/setup, recurring-mistake toggle/rate, existing chart palettes, custom-range access and offline-pack installation. Training preferences save locally. Resume deliberately keeps its saved setup; Play with these settings is the explicit action for the newly selected setup. Scheduler changes use the existing tab lock and fenced database lease and apply to the next hand. The simulator keeps its exit and save status. Save failures expose recovery controls so moving settings cannot hide Retry saving or Export pending work.

The protected controller changes are limited to the initial-review prop/navigation in PlayPage and one UI callback in HandTrainer so opponent-range inspection opens its existing sheet on desktop as well as mobile. The engine, calculations, grading, chart functions/palettes and supplied data retain their original integrity hashes.

## Activity contract

The heatmap shows twelve Monday-first columns and seven weekday rows, using device-local calendar days. Current-week future dates are disabled. Tap/focus a date to read its answer count; fixed levels are 0, 1–4, 5–14, 15–29, 30+. More activity has a richer/brighter blue. Activity measures volume, including retries, not accuracy, solver quality, EV or mastery.

Each successful decision transaction increments a small daily aggregate in journal metadata. Fundamentals increments its aggregate in the same transaction as the saved answer. Duplicate submission/recovery returns before incrementing; an aborted transaction rolls back both the answer and the counter. Each store retains at most 400 active-day totals independently of detail compaction. Home adds the two disjoint categories together. Accuracy/first-exposure metrics remain unchanged.

Initial migration only counts retained timestamped decisions/attempts. Condensed session counters cannot reliably be assigned to dates, so no history is invented. The UI discloses that older history may be incomplete. Daily activity survives new backups/restores; old backups are accepted and backfilled only from their retained detail. The journal database stays version 4. The fundamentals database upgrades from version 1 to 2 to add a metadata store without resetting existing stores. Both handle version changes by closing connections.

Storage failures show unavailable activity and preserve navigation; they do not display fabricated zero-history success. Activity refreshes after visibility/pageshow events and each minute, including after midnight. Browser-origin/device storage rules still apply; there is no account or cross-device sync.

## Graphics and accessibility

Local CSS materials use the simulator's navy/graphite direction: directional lighting, panel edge highlights, inset bevels, raised buttons and layered cast shadows. There are no external textures, runtime image downloads or added dependencies. These are CSS lighting effects, not a claim of a WebGL shader engine. Motion respects reduced-motion preferences. Settings use a native dialog, an internally scrolling body, fixed Done/close controls and restored trigger focus. Background scrolling is locked while Settings is open. Range palettes and calculation rendering are preserved.

## Verification

Final verification, 2026-11-16: `npm run check` passed 154 unit tests across sixteen files, TypeScript and the reviewed integrity guard. The production build passed. The full browser suite passed all 50 journeys. After the final links were made to carry setup/return parameters, a fresh release build and all six Home journeys passed again, including leaving Learn and resuming the same preflop hand. [Actual-app captures](../design/home/README.md) accompany this change. Coverage includes calculation/source integrity, database migration, atomic daily counts, duplicate recovery, backup/compaction, Home settings, exact live-hand resume, fresh fundamentals answers, offline cold navigation to Home/Ranges/Play, no simulator page scrolling, accessibility and previous simulator/showdown/review journeys.

Actual iPhone Safari/Home Screen rendering, VoiceOver, safe-area behavior and animation smoothness still require a device check. Desktop Chromium phone-sized tests do not close that gate. Users with an already downloaded offline pack need to update/remove that pack to see a new hosted build; the worker intentionally serves an installed complete pack consistently. No hosting or cloud-environment publication is performed by this change.
