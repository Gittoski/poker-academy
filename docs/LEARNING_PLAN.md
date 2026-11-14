# Poker learning and development plan

Goal: help the user make increasingly strong, explainable decisions in live six-max no-limit Hold’em, especially against recreational players. Keep the simulator central, the approved navy interface simple, and learning incremental. The app can support high-level practice; it cannot promise poker mastery or profitability.

This is a plan, not a list of features already implemented. The active build checklist is [ROADMAP.md](../ROADMAP.md); completed foundation work is in [the delivery history](FOUNDATION_HISTORY.md).

## What exists today

- Next.js web app with range viewing, preflop play and scripted full-hand practice.
- Six-, eight- and nine-position preflop/range configurations; full-hand scripts are currently cash, 100 BB, six-max PTO.
- Local chart-theme/custom-range preferences. Decision scores and streaks live in component state; there is no persistent learning journal, saved retry queue or curriculum.
- `gradeIndex` marks the most frequent reference action correct, another positive-frequency action partial and zero-frequency actions wrong. This is a reference-frequency exercise, not a calculated EV-loss score. A valid mixed action is not inherently a poker mistake.
- Full-hand play follows supplied lines, including correction after a wrong choice. It does not solve arbitrary alternative actions or provide unrestricted branching play.
- The navy interface has a verified baseline of 86 unit tests, nine browser checks, a production build and simulator-integrity checks. Actual iPhone/Safari validation remains open.

## The learner's path

Development order and lesson order are different: build the memory/review infrastructure first, while learners begin with fundamentals. Free play remains available at every stage.

| Stage | Learn in small steps | Apply it in the simulator | Evidence to collect |
| --- | --- | --- | --- |
| 1. Basics | Hand rankings, position/action order, blinds, chips vs BB, pot odds | Read a hand and identify the decision before choosing | Fresh hand-reading/math checks and delayed recall |
| 2. Solid preflop | First-in ranges, facing opens, three-bets, position and sizing | Focus on one supported position/scenario at a time | Reference matches, supported alternatives and first-try counts by scenario |
| 3. Postflop foundations | Relative hand strength, value vs bluff, board texture, draws and clean-out assumptions | Explain the objective before checking, betting or calling in covered spots | Concept checks plus decisions on different boards |
| 4. Range thinking | Conditional ranges, blockers, turn/river changes, mixing and sizing tradeoffs | Compare the actual node's reference and assumptions after answering | Supported actions, reasoning checks and coverage-aware reviews |
| 5. Exploitative play | Observe tendencies, adjust value/bluffs, recognize uncertainty | Explicit calling-station, passive, loose, tight and aggressive scenarios | Decisions justified by stated evidence/assumptions rather than an opponent label alone |
| 6. Advanced practice | Stack/rake sensitivity, tough runouts, bluff-catchers, thin value, variance and discipline | Mixed sessions and held-out challenge sets | Retention, coverage and fresh-set performance with feedback delayed |
| 7. Transfer to live games | Reconstruct hands, distinguish a bad result from a bad decision, plan one adjustment | Save and review real hands after a session | Better reasoning and review habits; session winnings alone are not a skill score |

Each lesson uses **one concept → worked example → guided decisions → independent check → later review**. New concepts refer back to earlier ones. Keep lessons short, show one recommended next step and avoid presenting the entire curriculum while someone is playing. Optional checkpoints guide progression without locking the user out of the simulator.

## Development milestones

### M01 — Persistent learning journal (next)

Record real decisions from both current trainer modes without changing how their actions are resolved. Save format, positions, effective stack/context where available, range/script ID and version, current street/node, suit mapping, visible cards, available actions, original frequencies, chosen action, supplied grade and whether it was a first try or practice. Preserve unknown source fields as unknown.

Use a versioned local store, bounded history, migration support, explicit export/import and confirmed reset. Keep the current source grade rather than inventing EV loss. New analytics must name what they measure, such as reference-match rate, and display sample counts. Capture decisions once; component rerenders, strict-mode effects and reloads must not duplicate results.

Done when results survive navigation/reload, restore from a valid backup and tolerate malformed/unavailable storage. Duplicate submissions and interrupted saves have regression tests. Existing seeded trainer behavior remains the same.

### M02 — Saved reviews, exact retries and a mistake book

Open a completed hand and move through the information available at each decision. Automatically collect unsupported choices and user-marked questions; retain supported mixed alternatives separately. Keep a dedicated Replay/Practice action, restore the exact question and let the user return to their paused live session.

A retry must restore the same cards, suit mapping, position, public action history and source node, not generate a new hand. Repeating a mistake does not erase its first try or improve first-try statistics. A script revision mismatch must preserve the old review/read-only context rather than silently regrade it with a different source. Future opponent cards and runout must remain hidden at earlier review points.

Done when retry/review/reload are deterministic, original branches remain available and live play is preserved. Label scripted continuation clearly; retrying a decision does not create a newly solved branch.

### M03 — Phone reliability and offline practice

Validate the core loop on real iPhone/Safari and Windows browsers. Add an installable web-app option and explicit offline content packs after journal/resume behavior is reliable. Cache only documented packs, show download/completeness state and retain the versions needed for saved hands. Handle interrupted downloads, app updates, storage limits and missing content honestly.

Done when an installed pack supports cold start, play, review and restart without connectivity on tested devices. Uncached content must show a clear unavailable state. Test text scaling, screen-reader navigation, safe areas, touch controls and reduced motion. Do not infer device results from Chromium emulation.

### M04 — Guided basics and poker-math drills

Add the first optional learning path alongside Play: hand reading, positions/action order, units, pot odds, break-even bluff frequency and basic value/bluff objectives. Add short minigames for ranking hands, reading boards and estimating then calculating thresholds.

Numerical answers use exact formulas and explicit inputs. Draw questions distinguish clean outs, one-card/two-card approximations and full range equity. If a new hand evaluator is needed, implement it as a separate tested module with independent ranking/tie fixtures; do not revive the retired app wholesale.

Done when prerequisite links, worked examples, independent checks and local completion work end to end. Quiz completion signifies course progress, not a claim of poker mastery.

### M05 — Focused preflop practice and fair mixed-strategy feedback

Let the user choose a small existing focus, such as BTN opens or BB facing BTN, and gradually mix in previously learned scenarios. Keep configuration and reference context visible. Add brief reviewed explanations and optional no-chart recall rounds.

Separate two objectives: **choose a supported action** and **practice a reference frequency**. Preserve the original most-frequent-action drill as an explicitly named objective. Never describe every lower-frequency supported action as a strategic error, or infer long-run mixing from one click. Where EVs are absent, do not show BB loss or claim equal EV from frequency alone.

Done when mixed actions, ties, rounded/tiny frequencies, unsupported states and different configurations have defined behavior and tests. Keep old/new metric meanings versioned instead of silently changing prior scores.

### M06 — Postflop learning and useful explanations

Add structured focus on value betting, draws, board texture, in/out-of-position play, turn/river decisions, bluff catching and bet-size tradeoffs. Teach relative strength against a range, not just the absolute hand category. Use the current supported scripts first.

Feedback should answer: what was the public situation, what reference applies, what objective is being trained, what is known and what remains an assumption? Distinguish verified arithmetic, source strategy data and educational heuristics. Reviewed annotations can explain concepts; they must not fabricate a solver's causal explanation. Reveal answers/charts after the decision in testing mode.

Done when each lesson maps to a covered exercise and unsupported boards/actions remain explicitly outside coverage. Concepts must transfer to different boards, not only familiar scripts.

### M07 — Exploitative training against recreational players

Start with explicit scenarios about overcalling, underbluffing, excessive folding and overaggression. Treat loose/tight, passive/aggressive and willingness to call as overlapping tendencies. Show observations, sample size and uncertainty; a player can be loose and passive simultaneously.

Teach possible adjustments such as value betting more often against overcallers, reducing bluffs against players who rarely fold and responding cautiously to underbluffed lines. These are conditional educational heuristics unless a fully specified model supports a numerical answer. Evaluate mathematical exercises only from their stated probabilities/payoffs. Keep exploit practice separate from equilibrium-reference scoring.

Done when every recommendation names its assumptions, what evidence would change it and the counter-risk. Never invent a recreational player's frequencies or use hidden cards to make an opponent appear intelligent.

### M08 — Adaptive practice and spaced review

Use the journal to suggest one next topic and a small due-review queue. Prioritize repeated unsupported choices, missed concepts, low coverage and overdue recall. Distinguish insufficient practice from demonstrated weakness. Separate first tries, retries, hints, supported alternatives and different source versions.

Add a weekly view that names a few weaknesses and recommends specific drills. Proposed review intervals and progression thresholds are learning heuristics to tune, not scientifically validated poker ratings. Avoid an XP-heavy dashboard; any levels represent completed learning steps, not expert status.

Done when scheduling is deterministic/testable, review load is bounded and users can override a recommendation. A successful retry must not count as independent proof that a weakness is resolved.

### M09 — Broader, documented strategy coverage

Expand boards, stack depths, sizing families and facing-action configurations one family at a time. Audit source provenance and applicable permissions; existing imported source claims are documented in UPSTREAM.md and have not become independent solver validation. Add pack manifests with exact rules, positions, ranges, rake/ante assumptions, action tree, source revision and any convergence/EV evidence.

Keep a coverage map so unavailable data never looks like a player's error. New frequencies must come from actual documented output or an authorized source. If a required solution/permission is unavailable, continue using covered exercises and other learning features rather than guessing or blocking all development.

Done per family when node matching, mixed actions, blockers, amounts/units and malformed packs are validated. Any EV claim requires actual comparable action EVs and appropriate numerical checks.

### M10 — Broader branching simulator (later, separate mode)

A broader game should eventually allow the chosen action to lead to its own continuation instead of always correcting back to a supplied line. This needs both a rules-complete betting engine and adequate strategy coverage; it is not a visual change.

Keep the current working trainer available. Prototype the new mode separately, test betting legality, all-ins, side pots, conservation, replay and hidden-information independence, then integrate covered reference nodes. Legal actions outside the solved tree can continue as explicitly ungraded sandbox play. Do not extrapolate a missing branch by reusing the nearest reference node.

Done only for the configurations actually implemented and verified. Full six-max equilibrium, calibrated recreational opponents and arbitrary real-time solving are separate capabilities, not assumptions.

### M11 — Advanced challenges and live-hand notebook

Add optional assessments with answers hidden until the end, configuration-aware mixed sessions and cases requiring a short reason before choosing. Hold out script IDs and board families where possible; suit permutations of the same hand are not independent unseen tests. Show fresh sample size, delayed retention and coverage alongside results. Add optional timing only after untimed accuracy is established.

Provide structured entry of live hands after a session, with unknown cards/ranges marked unknown. Support reasoning notes, tags and a next-session focus. A real hand with missing information or no matching reference receives a structured review, not a fabricated GTO verdict. Variance, bankroll risk, game selection and decision discipline can be taught without scoring skill from short-term profit.

Done when assessments do not leak answers or mix retries into first-try results, and hand reconstruction validates cards, positions and amounts. No leaderboard or label should claim professional ability from app scores alone.

## Sensible first release

Deliver **M01 + M02** before adding many more modules. That creates the useful loop the current app lacks:

**Play → understand feedback → save the decision → retry it → review it later.**

Then make that loop dependable on the user's phone, introduce Basics and focused drills, and build exploit practice on top of the fundamentals. M09 research can run alongside other work when a new exercise needs data; M10 must wait for its rules/data prerequisites. The order is a product plan, not a promise of dates or unlimited scope in one session.

## Daily learning experience

Offer one suggested topic and a compact session: revisit a few due decisions, play a focused set, study one relevant concept, then finish with fresh independent questions. Let the user keep playing continuously. Put detailed charts, settings and statistics behind optional views; preserve the approved navy theme.

Report improvement using coverage, first-try supported/reference choices, mathematical accuracy, retention and performance on fresh scenarios. Track changes within the same configuration. Repeated scripts, supported mixed alternatives, lucky outcomes and tiny samples must not become misleading mastery scores.

## Development safeguards

- Implement one milestone or bounded subtask, run relevant tests, fix failures, run regressions, document evidence and commit verified changes. Plan completion is not feature completion.
- Add storage, learning metadata and optional UI through small adapters. Core engine/math/grading changes require a concrete feature reason, preserved old behavior where appropriate, explicit tests and a reviewed baseline update. Never disable the integrity guard just to get a feature through.
- Preserve existing formats, chart palettes, keyboard controls, theme preferences and custom ranges. Keep local progress without accounts and provide backup/migration paths before schema changes.
- Use automated unit, browser and accessibility checks plus actual device checks for device claims. Tests establish implementation behavior; they do not prove a dataset's poker optimality.
- Keep strategy provenance, permissions and uncertain inputs visible in the relevant development work. Separate educational heuristics from calculations and supplied reference strategies.
