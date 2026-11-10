# Poker Trainer research and product direction

## Evidence status

The user confirmed https://pokertrainer.se/ as the product they use (their Google link points there). They report liking its playable-hand simulator and an ace-style logo. Those are user-reported observations, not independently inspected screens.

Current environment access to Google search and pokertrainer.se returns proxy HTTP 403. The app's live interface, feature list, screenshots, onboarding, paid content and strategy coverage have NOT been inspected. Do not present guessed features or interface judgments as research findings. Network domain additions have been saved in the environment draft, not applied or published. Exact interface research remains pending access. No proprietary charts, graphics, source or paid material will be copied.

## Research checklist once access is available

1. Inspect the public site, App Store listing and public screenshots; record source URLs, date, and which claims are promotional rather than observed.
2. Observe the real first-run, practice-selection, action-button, answer-feedback and next-hand flows using accessible public demos. Distinguish public screenshots from hands-on app testing.
3. Assess what reduces friction: number of actions to play a hand, information shown at decision time, amount of text, error feedback, available explanations, and whether play continues after mistakes or chip loss.
4. Document advertised solver/range coverage, stack sizes, formats, assumptions, settings, progression and pricing without assuming our app can reproduce its model.
5. Map verified useful patterns to original implementations and test acceptance criteria, one milestone at a time.

## Requirements we can implement independently

| Need                          | Evidence                                   | Our next step                                                                                       |
| ----------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| Play hands repeatedly         | User's stated goal and reported preference | Persistent session, one-tap next hand, virtual refills after busting                                |
| Low visual overload           | User's iPhone feedback on our app          | Keep core table/hand/actions prominent; put rules and history behind optional details               |
| Feedback on decisions         | User's explicit request                    | Defined baseline, visible coverage and nonblocking feedback; no invented solver verdicts            |
| Step-by-step learning         | User's explicit request                    | Preserve the cumulative lesson path and focused lesson screens                                      |
| Adapt to recreational players | Original product scope                     | Separate opponent-based heuristics from baseline deviations; deviations can be intentional exploits |

These are original product recommendations, not claims about Poker Trainer's actual interface. "PTO" remains the user's shorthand; if it means GTO, a real GTO verdict requires a verified solver dataset with appropriate licensing and matching game/action assumptions. Our current preflop range is an authored teaching baseline, not a GTO solution.

## Simulator feedback contract

- An action can match or differ from a named teaching baseline; neither label proves optimality or error in real play.
- Exact calculations, supplied assumptions and strategic heuristics have distinct labels.
- Uncovered spots are explicitly **not graded**, including unsupported streets, previous raises/limps or stack configurations.
- An exploit can intentionally differ from a baseline; do not penalize it as a solver error without a valid model.
- Feedback must not prevent the next legal action or force a modal dialog after every decision.
- Never reveal opponents' hidden cards or use future deck cards to decide a recommendation.
