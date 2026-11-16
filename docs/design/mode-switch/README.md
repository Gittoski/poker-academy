# Implemented simulator mode switch

Actual production-app Chromium captures at 390 × 844 CSS pixels, with animation enabled. The existing trainer modes and poker data are reused.

- [Full hands selected](full-hands.png): navy iOS-style switch in the compact simulator header.
- [Preflop selected](preflop.png): vertically centered oval thumb slides right and the lighter blue navy track lights up.

Screenshots show the refined oval-thumb design in its settled positions. Automated checks also cover the thumb transition, reduced motion, keyboard activation, same-hand restoration, reload, manual retries, nine-seat mixed-preflop configuration, failure recovery and offline switching. Actual iPhone animation smoothness and touch feel remain device checks.

See [the implementation audit](../../implementation/MODE_SWITCH.md).
