# Strategy sources and state-dependent charts

Research recorded 2026-11-11 (America/Guatemala). This records source review, not integration or independently validated solver results.

## What "official charts" means

The usual technical term is GTO (game-theory optimal). There is no single governing-body chart for all no-limit Hold’em. A provider's solution applies to its stated game: format, player count, positions, stacks, rake/ante, allowed bet sizes, starting ranges, board and prior actions. A preflop first-in chart cannot grade a later three-bet or postflop decision. Some solutions mix multiple actions; one allowed mixed action is not automatically a mistake because another action is more frequent.

Commercial research candidates include GTO Wizard, PioSOLVER and GTO+. Their current data/export/integration terms have not been verified here. The GTO Wizard homepage returned an environment-proxy HTTP 403; this is an access restriction, not evidence that the provider lacks data. No current market-share/popularity ranking has been established. No commercial strategy library has been downloaded or copied.

## Primary sources actually inspected

### postflop-solver / Desktop Postflop (Wataru Inariba, b-inary)

- Author-maintained engine README: https://github.com/b-inary/postflop-solver/blob/9d1509fe5077d019825f833eed04b16d342dfda1/README.md
- Actual configuration/navigation example: https://github.com/b-inary/postflop-solver/blob/9d1509fe5077d019825f833eed04b16d342dfda1/examples/basic.rs
- Desktop README: https://github.com/b-inary/desktop-postflop/blob/0c15f97f204e5533b09cd83fda5939c110a98e75/README.md
- Engine LICENSE: GNU AGPL v3, inspected from the repository.

Verified from these sources: a Rust postflop engine with OOP/IP ranges, explicit board, pot, effective stack, rake and permitted sizing tree. The example retrieves available actions, per-combination strategy, equity/EV, follows a bet/call branch, deals a river card and returns to the root. It configures iteration and exploitability targets. This directly demonstrates how a chart can change along a hand's action tree. The documentation announces suspension of open-source development since October 2023 and warns of breaking changes without version bumps: pin a commit if evaluating it.

Scope: two active players in the example; the README documents optional bunching from up to four folded players. This is not a ready-made full six-player preflop/postflop strategy library. Its benchmark/performance statements are author claims, not benchmarks run in our environment. The Rust toolchain is not installed here, so the example has not been compiled, solved or independently verified during this review.

### TexasSolver (bupticybee)

- Author-maintained README: https://github.com/bupticybee/TexasSolver/blob/00f4f16d1c11af53d3b32d04f27432616d50cdde/README.md
- Concrete solve/export configuration: https://github.com/bupticybee/TexasSolver/blob/00f4f16d1c11af53d3b32d04f27432616d50cdde/benchmark/benchmark_texassolver.txt
- LICENSE: GNU AGPL v3, inspected from the repository.

Verified from these sources: explicit OOP/IP ranges, pot/effective-stack/board settings, street-specific sizes, iteration/accuracy settings, and `dump_result` JSON export. The README describes Windows/macOS/Linux support and a newer GPU project. Benchmark alignment/speed relative to PioSOLVER is an author claim, not an independent validation by this project.

The README also makes integration/distribution statements alongside the AGPL license. Resolve applicable terms before distributing an integration; this review does not adopt a legal conclusion or change our app's licensing. No third-party solver code/binary has been embedded, and no generated strategy pack is claimed usable yet.

## Practical routes for this app

1. **Provider-backed data**: obtain an export/API agreement or other permission for an established solution library, document exact supported configurations and transform its nodes into our offline format. Public readability or a consumer subscription alone does not establish redistribution/integration rights.
2. **Own precomputed solves**: evaluate an open-source or appropriately licensed solver outside the mobile app, define small explicit scenarios, record ranges/tree/accuracy/runtime, cross-check results, and export compact offline packs. This can remove dependence on finding a free chart collection. It still requires a valid integration/output-rights plan and real solves, not guessed frequencies. Starting ranges are assumptions unless independently sourced/solved.
3. Start with a narrow documented family (e.g. heads-up postflop after a specified six-max preflop sequence). Add facing-raise, three-bet, stack and board families incrementally. Do not claim full six-player equilibrium from a conditional two-player postflop solve.

## How charts change with the hand

A chart is a view of one decision node. The simulator selects it using the matching game configuration, exact board and complete action path. A call, raise, different raise size, or new board card selects a different child node with different conditional ranges and strategy.

Range reach weighting illustrates the update: `newWeight(hand) ∝ oldWeight(hand) × probability(observedAction | hand, node)`, then normalize over legal combinations. Board cards remove blocked combinations. This is an explanation of conditioning, not an algorithm that solves poker; a real solver must handle joint reach/card dependencies and the full configured tree. Observed recreational-player actions also need not follow the reference strategy. Unknown/off-tree action sizes must remain unsupported or be re-solved using a documented method, not silently mapped to a convenient chart.

The player is graded using their exact card combination and the matching node's allowed actions/EVs. For mixed strategies, keep action support, frequency training and material EV loss distinct. One single decision cannot establish whether someone implements a long-run mixing frequency correctly. Exploitative deviations are separate hypotheses about opponents, not automatically errors relative to an equilibrium baseline.

## Offline pack contract before replacing current teaching heuristics

- Provider/solver ID, version/commit, license/permission and source provenance.
- Rules, original/remaining player count, positions, initial/effective stacks, pot and rake/ante conventions.
- Explicit starting ranges and whether they are solved or assumed.
- Board and complete action history; amounts must say raise-to vs increment and chips vs BB.
- Exact card-combination strategies, reachable/unreachable combinations, permitted action sizes, optional comparable-unit action EVs, convergence/exploitability evidence and validation records.
- A transition for each covered action/deal; coverage errors must return ungraded.
- Node-specific 169-class chart aggregation must use appropriate combination/reach weights, respect blockers and retain the hero's exact combination view. A class average must not replace the hero's actual strategy.

The current simulator still uses Academy first-in baseline v1. This research establishes concrete alternatives to asking the user to find charts, but does not turn that teaching baseline into GTO data.
