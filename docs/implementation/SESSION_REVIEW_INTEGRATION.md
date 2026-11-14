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
