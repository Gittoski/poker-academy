# Option B: midnight navy simulator

Implements the user's approved navy concept with an SVG felt/rail treatment, subtle woven texture, seat gradients and shadows, patterned card backs, dealer button, chip markers and classic white faces. Shared CSS tokens live in `src/app/navy-table.css`; the same CardFace component now gives saved reviews the classic face treatment. Existing app chrome already uses graphite/navy. The simulator receives the full treatment first; the separately approved home-screen step and broader navigation/curriculum redesign remain future work. Range chart palettes/calculations are unchanged.

## Presentation and public state

`SimulatorTable` receives public seat state, hero cards, public board and the existing guarded showdown node. It does not load opponent cards, grade actions, select scenarios, consume randomness or change saved records. The six/eight/nine-seat order and hero rotation come from existing positions. Neutral backs contain no hidden-card data. The opponent reveal keeps the prior `resultShown && handOver && !foldedPreflop && showdown` condition, appears beside that opponent's seat and replaces its decorative backs.

Public pot labels now sum preflop contributions, or starting-street pot plus both current-street bets. The old postflop label omitted current bets. Final result pot remains the supplied recorded pot. Preflop stack labels subtract public committed chips from the configured starting stack; folded seats show Folded. Postflop captions show observed actions instead of inventing an unsupported full bankroll ledger. This is display arithmetic; bet execution, grading, source frequencies and EV claims are unchanged.

Blue identifies Fold/Check, green Call, coral Bet/Raise/All-in. These colors never read answer frequencies and do not recommend an action. Tests deliberately choose the green Call in a reference where it has no support. Frequencies/feedback remain separate. Chips show the actual contribution amount; decorative chip artwork does not assert a denomination/count model.

## Layout and motion

The existing no-page-scroll simulator frame is preserved. Portrait uses a taller table with the hero cards attached to the hero seat; short phones use a compact viewBox. Landscape/desktop uses a wider table. Board/hand coordinates remain stable through dealing; overlays retain fixed action footers and scroll internally. Final hand-review popups remain removed. The original table in the range viewer is preserved.

SVG gradients/patterns and CSS produce the artwork locally, without external images, fonts, libraries or network services. Existing reduced-motion preferences are respected. Hover uses brightness rather than moving hit targets: the first implementation exposed a two-pixel hover oscillation after retries, which was fixed and regression-tested through the normal click flow.

## Verification and preservation

The existing production-browser suite passes alongside added public-pot/stack/color and complete-board portrait checks. Coverage includes six phone/tablet/landscape viewports, dealing, full five-card runouts, folds, result acknowledgement, exact retries, saved progress, reference/source safety, offline packs, accessibility scans, keyboard handling and existing 6/8/9-seat modes. Unit arithmetic/rules/storage tests and TypeScript/build checks remain required.

Only the FullHandTrainer/HandTrainer protected hash entries are deliberately updated: their rendering now supplies the new table component with the existing visible cards, contributions and guarded reveal. No engine/data/range-grid/palette baselines are reset. See the recorded commands/counts below after final verification.

Actual iPhone/Safari rendering, SVG foreignObject behavior, VoiceOver, animation smoothness and Home Screen rotation still require device testing. Chromium screenshots are implementation evidence, not device certification. Refresh the connected Vercel site after its deployment; installed offline packs need an explicit update to receive new assets.

Final verification, 2026-11-16: `npm run check` passed 147 unit tests, TypeScript and the reviewed integrity guard; `npm run build` passed. All 41 production-browser journeys passed. After the last reveal-layering adjustment, a fresh production build and both focused source/visual checks passed again. The final artwork is captured in [the actual-app gallery](../design/navy-table/README.md). No physical iPhone/Safari or VoiceOver verification was performed.
