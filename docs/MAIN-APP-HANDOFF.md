# Main app integration handoff

Use the full app ZIP to test this candidate locally. The patch is based on Gittoski/poker-academy commit `460fc170ca3e424bbcf9e11935e41fe064988742`. It contains the earlier engine repairs and the latest live range workflow. Nothing has been pushed to the main GitHub repository or deployed to the main app.

## Paste this prompt into the main app chat

Please integrate the attached tested poker simulator candidate into my latest Poker Academy code on a separate branch/test copy first. Compare against the current code before applying the patch; do not overwrite newer app features or blindly replace the repository. Preserve existing user data, visual theme, table/card artwork, RangeGrid, Legend and classic/cool palette functions.

Make realistic live play the single main simulator entry from Home/Play. The candidate is currently available at `/live`; Home still retains the original main Play routing, so update that routing deliberately during integration. Keep legacy exercise/review URLs and saves compatible without presenting two competing simulators. Existing Home mode/setup options and progress labels refer to legacy training: adapt or clearly scope those controls, do not imply they configure live play or aggregate its practice history. Live table settings and recent practice currently belong to the live simulator.

Use the live engine for shuffled cards, legal player actions, streets, showdown, all-ins, side pots, refunds and integer chip accounting. Preserve versioned replay, one-tab ownership, storage failure handling, export and offline behavior. Opponents must use only their own cards and public information. Do not allow references to alter a player's chosen action or dictate a scripted continuation.

After each supported preflop action, show the familiar full 169-hand range grid with the hero hand highlighted, the chosen action's source frequency and concise In range / Outside range wording. Any positive mixed-action frequency is In range. Keep detailed explanations collapsed. Pause for Continue hand. Show No matching range for unsupported contexts, including arbitrary live postflop, without displaying unrelated charts or inventing EV/GTO judgments. Preserve original source frequencies, source hashes, validated chart snapshots on reload and answer-hidden retries. Keep the source provenance and heuristic opponent limitations honest.

Retain the engine repairs for duplicate cards, missing references, unsupported limps and tied-frequency grading. Review the candidate tests and docs. Run npm ci, npm run check, npm run build and the browser suite, then play complete hands through the actual interface on phone and desktop sizes. Test custom raises, checks/calls/folds, all-ins, reload, review/retry, missing range data, offline operation and two-tab ownership. Verify one clear main simulator entry and settings/progress labels after routing changes. Report any remaining limitations. Do not push, merge or deploy the production app until I approve the tested integration.

## Code map

- `src/simulator/liveEngine.ts`: rules, dealing, payouts and invariants.
- `src/simulator/livePolicy.ts`: disclosed opponent heuristics.
- `src/simulator/liveReference.ts`: exact preflop lookup and chart snapshot/recovery.
- `src/simulator/liveSession.ts`: validated persistence, replay and ownership.
- `src/simulator/LiveTrainer.tsx`, `LiveRangeFeedback.tsx`, `src/app/live/`, `src/app/live.css`: live UI and original range components.
- `src/lib/fullHands.ts`, `handSim.ts`, `trainer.ts` and affected trainer components: legacy correctness repairs.
- Home, layout, offline manifest and worker: route/link and offline support.
- New engine/session/unit and live/missing-reference browser tests: regression coverage.

See `docs/implementation/LIVE_RANGE_WORKFLOW.md` and `LIVE_SIMULATOR_REVIEW.md` for detailed behavior and limitations. The optional chart snapshot field is compatible with old v1 live saves. The live save is separate from legacy training history.

Candidate verification: 193 unit tests, production build and all 70 browser tests passed; a five-hand real-data UI journey completed 23 hero decisions without uncaught errors. This establishes a tested integration candidate, not a bug-free or solver-certified product.
