# Session review integration audit

R01 establishes the contract before controller integration. `src/learning` is separate from the protected poker library.

## Existing paths

- Preflop deals with `startHand`, samples NPC actions from applicable entries, and executes the player's selected action. Record at `answer` before `act` and before React updates. NPC sampling must occur once outside state updaters. Preserve the resulting distribution and engine inputs.
- Full hands choose an indexed supplied script, map suits, optionally deal a fold-training variant, then follow the script. Record the selected action separately from the expected action actually executed. Never branch a script into an unsupported node.
- Both modes show verdicts before Continue. Recording must occur on submission, independent of Continue. Their initializers must wait for hydration and prefer a compatible persisted checkpoint.
- Full-hand prompt grids come from the script; preflop entries come from the selected range pack. Cache immutable content hashes once. Packed checkpoints contain entry IDs rather than duplicated charts. Missing/mismatched versions fail explicitly.
- Live cursor transitions and pending NPC choices need persistence. Review must pause the live controller and its global keyboard bindings. Restoring a cursor must not call a dealer factory.

## Classification and metrics

Original raw preflop weights determine learning support. A tiny positive action is supported even when the old integer percentage rounds to zero. Equal maximum weights are all most-frequent matches. Positive nonmaximum weights are supported alternatives, not automatic mistakes. Zero support enters the mistake book only with a valid applicable reference. Legacy `gradeIndex` remains recorded separately; it measures frequency-drill agreement, not EV loss.

## Preservation gate

R01 changes no protected controller, engine, data or palette. Its executable tests cover original-versus-executed actions, immutable before-state capture, stable IDs, precision, ties, invalid references, source identities, checkpoint roundtrips and validation of all 780 supplied scripts. Before R03, add browser integration evidence for the narrowly modified controllers. Update only their individual hash entries after reviewing diffs and passing existing regression journeys. Never refresh the whole baseline or change library/data hashes as a shortcut.

## R01 evidence

94 unit tests pass, including eight learning contract tests; integrity and TypeScript checks pass. Production build passes. This is a foundation, not a functional saving/review UI. Actual device validation remains outstanding.

## Reviewed controller integration

The four approved controller/presentation hashes are deliberately updated for the session-review feature. `src/lib`, `src/data`, `data`, `public`, chart aggregation/functions and chart palettes keep their original hashes. The guard remains enabled.

- Both answer handlers now capture a packed before-state and separate selected/executed action before setting the verdict. Existing `act`, `advancePostflop`, prompt creation and legacy scoring functions remain the engine.
- Hydration precedes controller mounting. Reload restores hand IDs, cards, cursor, verdict and per-hand NPC random state. Scripted hand factories run only for new deals. Initial range/script references are included atomically in hand events.
- NPC sampling in preflop is outside React state updaters, with a persisted independent seed. The distribution still uses the existing `sampleAction`; ordinary deal/hand-selection algorithms remain the upstream functions. Scheduler randomization never consumes the dealer stream.
- Review pauses both timers and answer shortcuts. Exact/manual play uses its own journal origin and preserves the live cursor. Returning or reloading during manual practice restores live play.
- Feedback now names raw-reference support, displays original precision and explains the scripted continuation. The old frequency-drill score is retained separately, not relabeled as EV loss.

Evidence at integration commit: 116 unit tests and TypeScript pass; production build passes; seven review-feature browser journeys pass. The nine original browser journeys also passed during integration. Additional final regressions remain R08. Browser journeys cover both modes, prompt/verdict reload, automatic saving before Continue, same-frame duplicate input, review keyboard suppression, exact postflop board/source restoration, manual/live return, slider persistence, adaptive whole-hand replay and delayed labels, 8/9-seat play, storage-denied export, mobile dialog sizing, accessibility and a competing tab.

Final delivery: 120 unit tests, TypeScript, reviewed integrity guard, production build and all 19 browser journeys pass. See SESSION_REVIEW_VERIFICATION.md for source-size measurements, failure/retention evidence and the external iPhone/Safari gate.
