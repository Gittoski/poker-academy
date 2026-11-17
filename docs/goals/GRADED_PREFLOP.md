# Goal: dependable, fully graded preflop practice

Status: implemented candidate with automated verification; actual iPhone and user review remain pending. The user authorized implementation of this covered-practice upgrade on November 17, 2026. Use `test/graded-preflop` for the candidate; preserve `work` for the main app.

Approved follow-up: use the [balanced preflop study mix](../implementation/BALANCED_PREFLOP.md) for new hands: about 60% source-supported continuing hands and 40% fold-only, favoring common situations and reducing recent repetition. This intentionally conditions practice selection; preserve all source grades, saved deals/retries and unrestricted Full hands. Keep the target category hidden before answering and label the mix as educational.

Implement the scoped preflop release described in `docs/PREFLOP_GRADING_PLAN.md`, following PF0 through PF4 and using `ROADMAP.md` as the persistent checklist. Complete preflop before starting the deferred postflop project. First apply any user preference already established about covered versus unrestricted practice; the plan recommends a covered reference-practice profile, not an unsupported promise of universal chart coverage.

Invoking this goal without different instructions adopts that recommended covered-practice scope. Do not ask the user to approve the same scope again.

Make Preflop provide a grade for every learner decision it accepts in a clearly identified six-max, 100 BB cash, no-ante profile using the existing PTO charts and their documented sizes. Audit all 65 declared source contexts and 169 hand classes before claiming complete coverage. Preserve mixed-action support and provenance limits; do not invent strategies, solver accuracy, zero-support certainty beyond source precision or EV losses.

Use fresh shuffled cards and the existing legal-action engine. Generate covered scenarios and define opponent behavior and educational reference boundaries explicitly. Keep actual player choices. If a choice leaves the supported tree, preserve its original grade/action, explain the boundary and offer Retry or Next; do not substitute a correct action, create another ungradable learner prompt or assign a fictitious outcome. A missing reference on an advertised covered branch is a defect to fix. Measure context reach and boundary frequency alongside the graded-decision percentage.

Keep unrestricted Full hands, the approved navy theme/table/cards, original range grid/colors, existing mode switch/navigation, saved hands and automatic mistake review working. Preserve old incompatible configurations and checkpoints through an explicit versioned migration; never silently reset or overwrite them. Every answered decision needs visible feedback, source chart, explanation and the established retry/continuation controls. Folding ends practice immediately; Preflop never deals postflop cards.

Work incrementally on a separate test branch. Run meaningful calculation/source-matching, legal progression, feedback, save/retry, offline and player-flow tests, plus TypeScript, integrity, production build and regression checks. Fix failures, commit verified milestones and update the roadmap. Continue through routine choices without repeated confirmation; stop for a genuine blocker or a material product/source decision. Record actual device verification honestly.

Deliver a working, testable candidate and a concise coverage/limitations report before merging or deploying simulator changes to the main app.
