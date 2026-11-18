# Main-app preflop and simulator release

The user explicitly authorized integration into the main app on November 18, 2026. This supersedes the earlier candidate-only approval restriction for this release. Production is the connected `work` branch; the reviewed development branch is `test/graded-preflop`.

## Promotion and scope

Previous production: `42a6a1be2977aeb9448eecfffdfe11b4a6ad2c9c`. Tested candidate: `351c20e8c8c4cf3215215e9707059137213df753`. The previous production commit is an ancestor of the candidate. A fast-forward preserves the complete history and replaces no independent newer production edits. The release adds only documentation to that tested runtime tree.

- Covered six-max 100 BB Preflop practice, original range charts/grades, exact retries, explicit reference boundaries and the balanced study selection.
- Random each hand for Full hands, with named fixed positions retained, exact current hands preserved and no consecutive random-position repeats.
- Progressive supplied setup playback, acting-seat highlights, public captions and thinking indicators before new Preflop decisions. Full hands keeps its real opponent timing and adds public captions.
- Automatic continuation after ungraded Full hands choices, without empty feedback acknowledgments. Real grades, immediate fold stops, saved review and actual showdown results are preserved.

The navy table/cards/theme, foundations, range grid, archived exercises and local progress remain intact. Runtime code, range data, public assets, dependencies and browser configuration match the tested candidate. No account, progress migration between origins, postflop solver grades or new strategy recommendations are introduced. The existing implementation records explain educational selection and source-provenance limits.

## Verification and deployment

The candidate passed protected source integrity, TypeScript, 249 unit tests across 31 files, a production build and all 118 browser checks. Promotion checks passed again on `work`: protected integrity/TypeScript, all 249 unit tests, the production build, and 18 release browser journeys covering graded practice, random positions, setup playback and Full hands flow. Runtime tree parity with `351c20e` was checked explicitly; only documentation differs. See [release verification artifacts](../verification/main-preflop-release/).

Pushing `work` lets the connected Vercel integration create its production deployment. A successful Git push does not itself establish that Vercel has completed deployment. The usual production URL updates once that deployment is Ready. Hosted deployment status could not be verified here: GitHub status API access returned Forbidden and no Vercel status connector is available. Preview and production have separate local storage when their origins differ; retained production progress is not replaced by preview progress.

On the updated main app, start **Next hand** to see new supplied setup playback; reloads/retries return directly to their saved decision. Enable random Full hands positions through **Practice tools → Live table settings → Your position → Random each hand → Start with these settings**. Covered Preflop continues to offer **Any position**.

Actual iPhone Safari/Home Screen testing remains outstanding. Automated phone-sized Chromium checks and publishing authorization do not establish physical device verification.
