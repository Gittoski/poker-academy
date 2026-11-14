# Approved navy interface

The user approved the black/graphite reference and requested **navy blue instead of lime**, with the simulator's existing behavior preserved.

## Presentation changes

- Near-black canvas, graphite surfaces, subtle directional gradients, inset highlights and contact shadows.
- Navy selected controls and primary buttons, white labels and lighter blue focus rings for contrast. No lime brand accent.
- Plain white cards, normal black/red suits, brief staggered entrances and a subtle active-seat pulse. Press feedback and answer-panel transitions use CSS only.
- Rectangular table position markers; the board sits inside the table through CSS layout, with responsive spacing for all five community cards.
- Neutral, equally emphasized choices before answering. Existing correct/partial/wrong messages and calculations are retained, with clearer status surfaces.
- Compact score display, larger touch targets, mobile keyboard-hint hiding, desktop chart/sidebar layout and preserved setup/navigation controls.
- Accessible chart row markup; the same 169 cells remain in the same order. Original classic/cool chart palette values and color/frequency calculations are preserved.

Presentation is isolated in `src/app/interface.css` and UI components. `globals.css` and its chart palette definitions remain unchanged. The page's metadata title and browser theme color are cosmetic updates.

## Simulator preservation

`npm run test:integrity` verifies SHA-256 baselines from pre-theme revision `c4732f2` for the entire engine/math library, type contracts, built-in data, public hand scripts/ranges, training controllers, settings/state handling and original palette stylesheet. Those protected files are byte-for-byte unchanged.

The two chart renderers gained only accessibility row wrappers. Their exact color functions and range-aggregation code are separately protected by the same baseline check. No frequencies, answer grading, betting rules, random sampling, timers, scripted lines, keyboard handlers or training state transitions were changed. Decorative action icons do not choose or grade actions.

The integrity guard is part of `npm run check`; a future intentional simulator change should update its baseline deliberately rather than disabling the check. Source text uses LF line endings across checkouts for consistent hashes.

## Verification

- Strict TypeScript and all 86 original unit tests.
- Existing four browser flows plus five theme checks: classic/cool palette preservation, saved chart theme, neutral action styling, 44px-or-larger action targets, phone/tablet/desktop layouts, keyboard continuation, CSS reduced-motion behavior, 6/8/9-position rendering, postflop board placement and a real five-card runout on a 320px viewport.
- Automated WCAG A/AA scans of the range viewer, play screen and postflop review. This is not a manual accessibility certification.
- Production Next.js build and simulator integrity check.
- Actual rendered screenshots and a recorded H.264 browser clip in [the implemented preview](design/implemented/README.md).

These are Chromium checks. Actual iPhone/Safari, VoiceOver and native animation performance remain unverified. Existing controller scroll behavior was not rewritten. No claim of new strategy correctness or unrestricted simulation is introduced by the theme.
