# Next improvements: simulator first, phone independence, then short lessons

This is a future plan. It does not publish the app, create an App Store build or claim offline support already exists. Existing session reviews and the navy theme remain the foundation.

## 1. Finish and clearly show every supplied hand

Immediate fix: separate final-decision feedback from a persistent **Hand complete** result screen. Full hands must show their supplied showdown runout or real fold outcome before another deal. Keep feedback on its decision street until Continue; preserve the result screen on reload. Prevent duplicate/held inputs from skipping it. Preflop-only practice must say that its scope ends before postflop.

All 780 supplied scripts were audited. Of the showdown lines, 6 stop betting on the flop and 18 on the turn after an all-in call; all 24 include a five-card runout and a stored showdown result. Fold lines legitimately end before the river. Do not manufacture further streets after a fold, or reuse a different hand's scripted result for replacement fold-training cards.

## 2. Run independently on an iPhone (M03, next feature)

Recommended first release: an installable offline web app (PWA). Open a stable HTTPS address once in Safari, download a training pack, then choose Share → Add to Home Screen. After the offline checks pass, it should cold-start, play downloaded hands, save sessions and review mistakes in airplane mode with the computer turned off.

Implementation checklist:

- [ ] Produce a standalone hosted build with working direct navigation to Play and Ranges; verify whether static export meets every current route requirement.
- [ ] Add an app manifest, original icons, launch appearance and safe-area/text-size checks. A Home Screen icon alone does not establish offline support.
- [ ] Add a versioned service worker for the app shell and explicit training-pack downloads. Include the index, every script in the selected pack, chart data and required JS/CSS/fonts/icons.
- [ ] Check pack completeness and show **Available offline** only after all required content is stored. Failed/interrupted downloads remain resumable or safely discardable.
- [ ] Preserve old reference versions needed by saved hands. Stage app/pack updates for a safe hand boundary; do not replace a live hand or silently regrade old attempts.
- [ ] Keep local progress and JSON backup/restore. An installed web app is still local browser storage, not an account or automatic phone/PC sync.
- [ ] Verify true offline cold starts, several new hands, all-in completion, reviews, retry, app relaunch and interrupted downloads in automated tests and on an actual iPhone/Safari.
- [ ] Choose hosting and publish only when separately authorized; a development computer is not the permanent server.

The first download/update needs internet. Once a complete pack is available offline, normal practice with that pack should not require either internet or a computer. Uncached packs must be clearly unavailable rather than failing halfway through a hand.

## 3. Poker-math practice (M04, first learning module)

A separate optional **Math practice** mode, keeping normal Play one tap away. Start untimed, with one question on screen and a short worked calculation after answering. Add optional timed rounds only after accuracy is established.

Order:

1. Count the pot and distinguish chips, BB and percentages.
2. Pot odds and break-even calling thresholds.
3. Clean outs and next-card draw-completion probabilities.
4. Two-card completion probabilities under explicit fixed-out assumptions.
5. Break-even fold frequency for a specified zero-equity bluff.
6. Later: equity against explicitly supplied ranges, using a validated evaluator/enumerator and named assumptions.

Example: pot 100 before an opponent bets 50; calling costs 50. Final pot after calling is 200, so the break-even threshold is 50/200 = 25%, assuming no rake or further betting. For a zero-equity bluff risking 50 to win a current pot of 100, the break-even fold frequency is 50/(100+50), about 33.3%. These are calculations for the stated model, not universal strategic recommendations.

Draw completion is not the same as showdown equity. Distinguish clean/dirty outs, one-card versus two-card questions and possible future bets. Never grade an assumed opponent range or clean-out model as an observed fact.

Done when independent numerical fixtures, edge cases, accessible phone controls, local progress, delayed recall and mistake retries work offline in the selected pack. Version math-attempt metrics separately; do not turn a math question into a fake chart/GTO decision.

## 4. Short capsules connected to actual practice

Two-to-four-minute optional lessons: **one concept → worked example → a few focused questions → later recall**. Offer one recommended next capsule, not a dashboard full of courses.

Start with hand reading, position/action order, pot odds and draws. Then value versus bluff, board texture, range thinking and clearly assumed recreational-player exploits. Each capsule names its prerequisites and links to a covered exercise. Put suggestions after a completed hand or in Learn; do not reveal a testing answer before a normal simulator decision.

Keep completion, first tries, retries and delayed success separate. A completed capsule is learning progress, not a claim of poker mastery.

## 5. Focused simulator sessions

Use existing covered material first: a position/scenario filter, a short focus set and a return to mixed play. Examples include BTN opens, BB facing an open and a covered postflop betting family. Show the applicable configuration and coverage; the filter must not imply that unsupported boards/actions are solved.

Reuse automatic session saving and spaced review. Keep controls optional and the simulator central. Each new focus needs fresh covered examples rather than suit-only repetitions.

## Later: App Store and a broader table simulator

| Distribution | Computer needed while playing? | Internet needed while playing? | Additional work |
| --- | --- | --- | --- |
| Current local development server | Yes | The phone needs a connection to that server | Existing setup |
| Hosted web app | No | Yes, unless offline support is implemented | Hosting and authorization to publish |
| Installed offline PWA | No | No for completely downloaded packs | M03 caching, installation and actual-device verification |
| Native App Store app | No | No for bundled/downloaded offline content | iOS packaging, signing, Apple Developer membership, device testing and App Review |

Expo Go does not run the current Next.js project. Downloading its ZIP to the phone does not install it as an app. A native wrapper such as Capacitor could reuse the web interface after offline behavior is reliable; it still needs a real signed iOS build and App Review. Store approval is not automatic. A Mac or suitable cloud build service is needed for the iOS build/signing workflow.

Watching the remaining table after folding and following arbitrary player branches are separate simulator upgrades (M10). They need legal complete continuations, correct pots/all-ins and appropriate coverage or explicit ungraded sandbox play. Do not pretend an existing two-player script covers every new action or folded-card variant.
