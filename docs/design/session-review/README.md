# Working session-review feature

Actual production-app Chromium captures from the verified browser journeys, using deterministic supplied-hand fixtures. These are not concept mockups or proof of iPhone/Safari testing.

- [Automatically captured reference error](saved-mistake.png)
- [Session review and frequency controls](session-review-phone.png)
- [Original mistake context](mistake-review.png)
- [Postflop review with the original board](postflop-review.png)
- [Exact manual retry](exact-retry.png)
- [Adaptive return, revealed after answering](adaptive-return.png)
- [Measured normalized record sizes](storage-measurements.json)

Use `npm run check`, `npm run build`, then `npm run test:browser` to repeat the automated checks. New captures are written to ignored `test-results/`; refresh these checked-in examples only after verifying that run. The [usage guide](../../SESSION_REVIEW_GUIDE.md) explains the controls, and the [verification report](../../implementation/SESSION_REVIEW_VERIFICATION.md) states evidence and limits.
