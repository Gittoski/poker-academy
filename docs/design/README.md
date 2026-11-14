# Visual directions — proposals only

Open [the three concepts](visual-directions.png), or open `index.html` directly in a browser. Compare with [the actual imported phone screen](upstream-phone-baseline.png). These are interface proposals, not screenshots of implemented changes. Example cards and chip amounts illustrate layout; they are not a new solved exercise or a strategy recommendation.

| Direction | Style | Best use |
| --- | --- | --- |
| A — Emerald (recommended) | Charcoal, muted green felt, mint accents, ivory playing cards | A calm, familiar poker table with clear decisions |
| B — Midnight | Deep blue, subdued blue felt, periwinkle accents | A contemporary training interface |
| C — Daylight | Warm ivory, forest green, restrained borders | A readable light theme for daylight use |

## What the imported app actually does today

Its `/` page opens the range viewer, with Play as a top navigation link. At 390px, Play places the mode selector and four score counters above the table. Several table annotations are small. Settings are already collapsed, which is useful and should be preserved. Desktop keyboard hints remain visible on a phone-sized screen. Answers reveal a chart and a Continue/Next hand control; choices follow the supplied reference line.

## Small usability changes to make after choosing a direction

1. Open directly into Play. Keep Ranges one tap away.
2. Reduce the scores to one compact optional row; keep game mode and setup accessible without dominating the table.
3. Enlarge position labels, cards and the current-player indication. Keep a consistent six-seat arrangement.
4. Put equally emphasized action controls close to the bottom, with at least 44px touch targets and safe-area spacing. Do not visually reveal the reference action before the user answers.
5. Give answers an unmistakable text/icon and green/red state; keep action colors separate from answer grading. Explanations and the full chart can expand after the answer.
6. Hide keyboard hints on touch layouts and retain desktop shortcuts.
7. Keep navigation and settings predictable; preserve the original scenarios, data, answer grading and scripted continuations during the visual pass.

These proposals do not add unrestricted simulation, retry semantics, new strategy data, native packaging or offline guarantees. Those would be separate changes with their own verification. Real iPhone/Safari testing is still needed.

## Verification and screenshots

`npm run test:browser` runs four Playwright flows against the production build. Set `CHROMIUM_PATH` if using a system Chromium; otherwise run `npx playwright install chromium` once. Browser results are generated in ignored `test-results/`; the tests do not rewrite these committed concept images by default.

To intentionally refresh the preview images after a verified change:

```sh
UPDATE_DESIGN_PREVIEWS=1 npm run test:browser
```

This environment verified chart loading and URL state, preflop feedback/continuation, full-hand postflop feedback and next-hand continuation, and responsive range layouts at 320/390/768/1365px. A 390px Play screenshot was inspected. These are Chromium checks, not native iPhone or Safari results.

## Additional requested brand-inspired study

The user requested directions inspired by Offsuit Games and Blackjack Wiz. See [four new showcase boards](inspired/README.md), covering start, playing a hand, feedback, ranges and setup for each direction. Reference-site access was blocked, so these are clearly labeled interpretations. They have not been applied to the app.

## Corrected direction from the user's actual reference

The user rejected the earlier brand interpretations and provided a concrete screenshot. The current reference is black/graphite with subtle gradients, lime accents, plain white cards and restrained icons. See [the corrected mobile and desktop previews](reference-study/README.md). Earlier styles remain archived as proposals rather than the implementation target.
