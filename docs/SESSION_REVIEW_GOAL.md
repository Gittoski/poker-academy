# Goal-ready implementation brief

The user can supply the following instruction to the `/goal` workflow. This document does not activate a goal or implement the feature.

```text
Implement the session-based automatic mistake reviewer and adaptive simulator practice in docs/SESSION_REVIEW_SPEC.md. Use docs/SESSION_REVIEW_ROADMAP.md (R01–R08) as the persistent implementation checklist, in that order.

Sessions begin automatically, mistakes save at answer submission without a Save/Continue/End dependency, and review restores exact past decisions. Keep supported mixed alternatives separate from reference errors. Adaptive review begins from preflop, first revisits the original problem and later uses covered related examples, and reveals its review status only after the targeted answer. Provide an on/off control and an approximate one-in-N slider. Reduce priority after improvement across sessions and automatically condense old detailed history while protecting summaries, group counts and representative unresolved/pinned hands.

Preserve the approved navy interface, existing formats, keyboard controls, chart palettes and working simulator. Add narrowly scoped recording/recovery/selection integrations. Do not rewrite the engine, fabricate solver branches/EVs, disable the integrity guard, or blindly rebaseline protected code. Version sources, records and metric meanings. Save locally without accounts; handle quotas, recovery, imports and multi-tab conflicts honestly.

For each bounded milestone: implement, run relevant tests, investigate/fix failures, run regressions, update the checklist and documentation, commit verified changes, and continue without ordinary confirmation requests. Push verified commits to the configured user repository when authorized and available. Do not publish the cloud environment or deploy the app.

Continue through the checklist until complete or a genuine blocker requires intervention. Native-device checks need actual device evidence; leave that gate open if unavailable instead of claiming it passed. Report implementation evidence, remaining limits and any blocker precisely. Do not expand into unrelated features while this loop is unfinished.
```
