# Conditional river strategy pack v1

The simulator's **Solved river** mode uses real numerical output generated with [b-inary/postflop-solver](https://github.com/b-inary/postflop-solver/tree/9d1509fe5077d019825f833eed04b16d342dfda1). It is a focused, approximate two-player river solution, not an official PTO chart collection or a solved six-max game. Existing first-in charts remain explicitly authored heuristics.

## Exact inputs and coverage

- Six-seat table context, BTN versus BB after preset LJ/HJ/CO folds, BTN raises to 5 chips, SB folds, BB calls, flop and turn check through. Earlier streets are preset context, not graded or solved preflop strategy.
- Blinds 1/2; 1 BB = 2 chips. River board **Td 7h 2s Qs 9d**, starting pot **11 chips**, remaining effective stack **195 chips**. All original seats start with 200 chips. No ante, rake or folded-player bunching.
- BB supplied range: `22+,A2s+,K5s+,Q8s+,J8s+,T8s+,98s,87s,76s,65s,ATo+,KJo+,QJo`.
- BTN supplied range: `22+,A2s+,K2s+,Q8s+,J8s+,T8s+,97s+,86s+,76s,65s,54s,A5o+,KTo+,QTo+,JTo`.
- Those ranges are original hypothetical inputs. They were not derived from a six-max equilibrium or estimated from live-player data.
- Allowed bets: 50% and 100% pot. Raises: 2.5× previous bet, with the engine's integer-chip rounding and stack caps. Explicit exported raise-to amounts control matching; no arbitrary size interpolation. All-in insertion/forcing and size merging thresholds are zero.
- **22 decision nodes** with exact suit-combination frequencies, reach weights, raw range weights and per-action EVs. Amounts are total chips committed this street. EV differences use the solver's comparable decision-point chip values; folding has EV zero. Each covered river call ends the hand, which permits an independent showdown-equity check.

The first exercise retains the original deterministic Kd2d deal. Later hands vary the dealt range combinations on this same board and rotate BB check / bet 6 / bet 11. This is deliberate practice, not simulation of equilibrium deal frequencies. For a given exercise/retry, policy sampling is deterministic; its public hand-index salt changes across new hands. A 2,000-sample test verifies frequencies within one percentage point for a mixed node. Opponent combinations are chosen from the compatible supplied range with positive reference probability for the preset opening action. The remaining deck is restored by swaps before the preset streets, retaining 52 unique cards and deterministic replay. After the preset, the opponent uses its own combination's reference frequencies on covered nodes. Off-tree situations use the existing toy policy and remain ungraded.

## Accuracy and grading

Engine revision: `9d1509fe5077d019825f833eed04b16d342dfda1`; Discounted CFR; Rust **1.85.1**, release build, uncompressed f32 storage, four Rayon threads. The latest Rust toolchain rejected older upstream raw-pointer syntax; the pinned compatible toolchain builds the unmodified engine.

The shipped run completed **23,100 iterations** at reported exploitability **0.000009760260581970215 chips**, below target **0.00001 chips**. Runs at 1,400 / 3,600 iterations were also inspected. Rare branch conditional EVs moved despite small aggregate exploitability: that metric does not certify every combination, frequency or conditional EV. This has not been cross-solved with a second independent solver. These are approximate model outputs, not exact poker truths.

Grading compares the exact combo's chosen action EV with its best available action EV. Loss at or below **0.02 chips = 0.01 BB** counts as within the configured training tolerance. The tolerance is an educational setting, separate from solver exploitability. Multiple mixed actions can pass; a single decision cannot establish correct long-run frequency use.

If `max(action EV) − sum(policy frequency × action EV)` exceeds that same tolerance for the current combination, the branch is explicitly **ungraded / low confidence**. Combinations with no positive reach, mismatched public states, unavailable nodes, and exact off-tree amounts also stay ungraded. A class chart never substitutes for the actual suit combination. Aggregate class frequencies use combination reach/card-removal weights; empty classes mean no reach, not fold.

Facing a bet, feedback also derives the showdown equity from the exported call EV and explains the independently verified equation `callEV = equity × (pot + call) − call`, alongside the pot-odds threshold. Bet/raise values incorporate modeled responses, not showdown equity alone. Any exploit against a recreational player still needs separate evidence about their tendencies.

## Verification

Automated tests check every node's legal transitions, actor/state mapping, card blocking, chip conservation, normalized probabilities, finite EVs, and full child coverage. Independent TypeScript calculations reconstruct range conditioning and compatible-combination weights, then enumerate showdown outcomes for three combinations at every node and compare call EVs within 0.001 chips. Tests also cover mixed actions, local confidence guards, off-tree rejection, private-information independence, 100 varied unique-deck deals, exact retry/reload, original-branch preservation and review restoration.

The browser suite exercises calculated charts, changed nodes, covered size controls, automatic deviation explanations, retry/reload, unsupported sizes, saved practice/reviews and responsive/accessibility behavior. Native-device behavior is not established by these tests.

Data artifact: `src/data/academy-river-v1.json`; SHA-256 `b6780dffef46de2b5f99f246dc673d20faff0dc61c01608d5d10906f2b78fff6`.

## Reproduce offline (developer tool only)

The Expo app bundles numerical JSON and does not require Rust, a solver account or a network service. The optional standalone generator is separate from the app and is provided under AGPL-3.0-or-later in `scripts/solver`; the engine retains its own AGPL license. No solver implementation or binary is linked into the app. No commercial strategy charts were copied. The app's overall licensing is not changed by this tool.

From the repository root, with Rust 1.85.1 available:

```sh
git clone --no-checkout https://github.com/b-inary/postflop-solver.git scripts/solver/engine
git -C scripts/solver/engine checkout --detach 9d1509fe5077d019825f833eed04b16d342dfda1
RAYON_NUM_THREADS=4 cargo +1.85.1 run --release --locked --manifest-path scripts/solver/Cargo.toml -- /tmp/academy-river-regenerated.json
```

The generator asserts convergence before writing output. Compare numeric results with tolerances rather than assuming cross-platform floating-point byte identity. Engine source and compilation output are ignored by Git and excluded from the Expo application.

## Next strategy work

Add other documented boards and street/stack families, preserve original review provenance as packs evolve, and obtain or generate verified facing-action preflop data. Keep the v1 numerical artifact and deterministic deal enumeration immutable; dispatch future packs by explicit versions. This pack does not close universal strategy coverage. Do not relabel unsupported free-table decisions as correct/incorrect or derive unsolved ranges from this river solution.
