# Watch the action before deciding

Candidate branch: `test/graded-preflop`. Keep production integration pending user review.

## Cause and behavior

Covered Preflop practice constructs a valid public action prefix to reach a chart-supported situation. It previously displayed that entire setup immediately, so the earlier folds and raises were already finished when the learner saw the table. Full hands already advanced opponents at 650 ms intervals.

New covered exercises now show posted blinds first, then replay each supplied action at 650 ms intervals. The table uses the existing engine's state at that action index, so folded cards disappear, folded seats dim, stacks/contributions update and the next acting seat is highlighted in the approved navy table. A thinking indicator and a short public caption identify the action. The final action remains visible for a beat before decision buttons appear. With no earlier actions (for example, an unopened LJ decision), only the opening beat is needed; no opponent action is fabricated.

These are supplied setup actions, including any earlier action by the learner's seat in a re-raise scenario. They are labeled as setup and are never counted as answers. The pending learner decision remains the same.

Full hands keeps its original opponent selection/timing and now shows a public action caption while the next player thinks. Captions distinguish a postflop bet from a raise. No new strategy grades or hidden-card analysis are introduced.

## State and interaction

- The setup and shuffled cards are saved once in their existing format. Playback is temporary presentation state; it never appends duplicate actions, changes a reference, resamples cards or increments decision counts. Learner submissions and opponent advancement are blocked while the setup plays.
- Starting a new exercise, opening a newly created Preflop mode slot, or explicitly upgrading older practice triggers playback. Restored hands and exact retries return directly to their saved decision. Reloading during playback restores the same complete supplied setup; it does not repeat setup actions in the log.
- Tools/manual review pause playback. Returning from tools uses the existing Continue control to resume. Switching modes cancels playback and its timer while preserving both exact saved hands. A paused browser clock requires advancing animation frames in automated mode-switch checks.
- Reduced-motion settings disable decorative dot/fade animation while retaining the readable action sequence. The waiting status uses the existing action area and keeps the mobile page within the viewport.

## Verification

Unit checks cover legal intermediate states in all 65 setup contexts, unchanged saved actions, public captions independent of shuffled cards, graded attempts, and accurate bet/raise/call/fold/check labels. Browser journeys cover sequential timing, no premature decision buttons, exactly one graded answer, direct retry, settings pauses, reload, mode switching, responsive layouts, reduced motion and real Full hands opponent progression. Browser training-mix checks advance the setup clock between React renders rather than waiting through 40 hands in real time.

Passed `npm run check`: protected source integrity, TypeScript and 249 unit tests across 31 files. The production build, all four focused playback journeys, and the complete 118-test browser suite passed. Regression coverage includes the 40-hand balanced selection journey, random positions, source grading, immediate fold stops, saved review, ownership, offline cold starts, hand completion, chart palettes and mobile layouts. See the [verification artifacts](../verification/setup-playback/).

Actual iPhone Safari/Home Screen and hosted preview testing remain outstanding. Open the newest candidate preview and start **Next hand** to watch a new setup; the already saved decision is intentionally restored directly.
