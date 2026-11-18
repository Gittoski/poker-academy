# Random simulator positions

Candidate branch: `test/graded-preflop`. Production integration remains pending user review.

## Behavior

In **Full hands → Practice tools → Live table settings → Your position**, choose **Random each hand**, then **Start with these settings**. Each new deal draws a position independently of the shuffled cards, opponent cards and outcomes. All supported positions are available at six-, eight- and nine-player tables. The previous position is excluded to avoid consecutive repeats; this is a practice mix, not clockwise real-table seat rotation.

Fixed-position practice stays available in the same selector. Existing fixed-position saves keep their setting. The new option also works for retained unrestricted Preflop hands. Covered Preflop retains its existing **Any position** context selection, balanced practice mix and chart-backed grades; it does not use the Full hands sampler.

The actual position is saved separately from the preference for future hands. Reloading, retrying and parking a mode preserve the exact position/cards/actions. Next hand retains the random preference. Changing table size retains random selection, while choosing a named position restores fixed practice. A fresh unsaved Full hands game retains its existing initial position; enable random practice through settings.

## Compatibility and scope

Random-position preferences use live-save version five, including preferences on archived or parked hands. Older versions one through four still load. Malformed flags and incompatible graded/random profiles are rejected. Builds that cannot understand this preference reject the new save instead of silently losing it.

Table position labels and reference lookups continue to use the actual seat index. The engine, opponent logic, range sources, strategy grades, card rendering, table styling and feedback rules are unchanged. This does not add postflop range grading.

## Verification

- Unit checks cover all supported positions, equal selection intervals, exclusion of the previous seat, invalid inputs, independence from card dealing, fixed practice, retry/reload/mode parking and save compatibility.
- Actual browser controls cover enabling random practice, Next hand after a learner fold, reload, switching to covered Preflop and back, six/eight/nine-player settings and returning to fixed practice.
- Passed `npm run check`: protected baseline integrity, TypeScript and 246 unit tests across 30 files. The production build and all 114 browser checks passed. This includes the two new position journeys plus grading, saved review, offline cold starts, mobile layout, table presentation, ownership and hand-completion regressions. A final focused rerun captures the position selector visibly inside the settings overlay.

See the [verification artifacts](../verification/random-positions/).

Actual iPhone Safari/Home Screen and hosted Vercel preview testing remain outstanding. Automated Chromium viewport checks do not verify iPhone hardware.
