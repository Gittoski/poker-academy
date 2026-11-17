# Poker Trainer by Greg

A fresh start based on [jensbaagaard/poker-practice](https://github.com/jensbaagaard/poker-practice), pinned to `449993f78d995c77b72d0bcac418a8507dd6f783`. The previous Expo academy and custom simulator have been removed from this branch. Their last version is preserved on `backup/academy-before-poker-practice`.

Live poker uses shuffled hands: shuffled hands and legal player choices determine the continuation, streets and chip payouts. Home and shared **Play** navigation open `/live`. The familiar range grid and navy/graphite table, card artwork and oval preflop switch are preserved. Earlier preflop/scripted exercises and their saves remain in **Earlier exercise history** for future learning work; routine Play uses live poker.

The user approved publishing the verified live integration to the connected `work` branch. See [the release audit](docs/implementation/LIVE_RELEASE.md) for current behavior, checks, preserved visuals and deployment/device limits. [The earlier integration audit](docs/implementation/LIVE_INTEGRATION.md) records the separate test candidate. Earlier sections below describe archived reference exercises unless explicitly marked live.

## Run

With Node.js and npm installed, from the folder containing `package.json`:

```sh
npm ci
npm run dev
```

Open http://localhost:3000 for **Home**. **Ranges** opens the charts at `/ranges`; **Play** opens the trainer; **Learn** opens the guided fundamentals. This foundation is a web app, so Expo Go is no longer used. Computer browser checks do not establish iPhone/Safari behavior.

## Verify

```sh
npm run check
npm run build
npm run test:browser
```

The test suite has 157 unit tests across sixteen files and 56 browser journeys covering original play plus saving, recovery, exact retries, adaptive return, failure handling, responsive layouts, keyboard/focus, accessibility and reduced motion. The browser runner uses a production build on its own port; install Chromium once with `npx playwright install chromium`, or set `CHROMIUM_PATH` to an existing system browser. The production build regenerates the range files from the included source data; it does not need a solver installation. Solver scripts are optional offline development tools, not a requirement for running the supplied app.

## Source and next steps

See [upstream attribution and import scope](docs/UPSTREAM.md), the [original README](docs/UPSTREAM_README.md) and the new [roadmap](ROADMAP.md). The original README's live-site and Vercel deployment statements refer to the upstream author's project, not this fork. No deployment or cloud-environment publication has been performed.

See [three visual directions](docs/design/visual-directions.png) and the [proposed phone usability changes](docs/design/README.md). Earlier visual concepts remain archived as proposals. The current implemented direction follows the user’s supplied reference with navy replacing lime. The navy visual pass is implemented. See [what changed and how the simulator was protected](docs/THEME.md), plus [screenshots and a short real-app recording](docs/design/implemented/README.md). Optional navigation/product changes remain separate from this visual pass.

## Learning roadmap

The next upgrades focus on lasting progress, exact mistake review and a staged Basics → preflop → postflop → exploitative → advanced learning path. See the [active checklist](ROADMAP.md) and [full learning plan](docs/LEARNING_PLAN.md). The current working trainer is preserved. The journal/review loop is implemented; the five-topic fundamentals release and explicit offline-pack installation are implemented. Actual-device offline verification and the wider curriculum remain on the roadmap.

The simulator now includes [automatic sessions, mistake reviews and adjustable recurring practice](docs/SESSION_REVIEW_SPEC.md), with a [bounded implementation checklist](docs/SESSION_REVIEW_ROADMAP.md). See the [usage guide](docs/SESSION_REVIEW_GUIDE.md), [verification evidence](docs/implementation/SESSION_REVIEW_VERIFICATION.md) and [actual-app screenshots](docs/design/session-review/README.md).

## Use the session reviewer

Play normally: answers save automatically before Continue. From **Home → All reviews**, open session summaries, grouped errors, original references, reflections/pins and **Retry this decision / Play this hand**. Manual practice pauses and preserves your live hand. Under **Home → Settings → Recurring mistakes**, toggle **Mix in my mistakes** and choose approximately one review per 2–20 hands. Adaptive returns start from preflop and identify themselves only after the target answer.

Supported mixed alternatives stay separate from zero-support reference errors. History stays in this browser origin (address and port) on this device; use export/import for transfer. Storage failures are shown explicitly. Actual iPhone/Safari verification remains outstanding.

## Reference exercise results and phone-only use

Full hands now finish with a distinct **Hand complete** screen. After your final decision, choose **View hand result**, inspect the stored showdown runout or actual fold outcome, then **Next hand**. Results survive reload. The screen names both your selection and the scripted action when they differ; a supported Call is not the same as playing a new calling branch in this scripted trainer. Preflop mode explicitly stops before postflop. See [the completion audit](docs/implementation/HAND_COMPLETION.md).

The app now offers an explicit complete offline download from Home Settings or Learn in a production build over HTTPS or localhost. Cached app pages, charts and supplied hands work in Chromium offline cold-start tests. A hosted HTTPS build would remove the PC requirement; no hosting or App Store publication has been performed. Actual iPhone/Safari installation remains unverified. The project ZIP is not an iPhone app and Expo Go cannot run it. See the [fundamentals and offline guide](docs/FUNDAMENTALS_GUIDE.md).

## Guided fundamentals and linked practice

Learn teaches pot odds → outs and draw probabilities → hand/range equity → expected value → bluff break-even and fold equity, with short lessons, worked examples, untimed practice and optional timing. The hand-ranking refresher reuses the archived evaluator. Local progress separates unfamiliar questions from repeats, keeps calculation explanations and supports validated backups.

Supported simulator mistakes now offer **Practice this skill**, with fresh examples and return to the same saved hand. Related links do not diagnose every chart deviation as a math error. Feedback identifies exact calculations, supplied strategy references and opponent assumptions; it does not invent solver EV losses. See the [usage guide](docs/FUNDAMENTALS_GUIDE.md), [provenance and verification audit](docs/implementation/FUNDAMENTALS_VERIFICATION.md) and [remaining fundamentals roadmap](docs/FUNDAMENTALS_ROADMAP.md).

## Reference exercise mobile focus

On phones, Play now dedicates the screen to the simulator. **Settings & review** opens the existing setup, session and review controls. Errors automatically open the explanation overlay; its Chart tab contains the existing range/strategy grids. Scroll within the overlay while Retry and Continue remain at the bottom. Correct/supported answers keep compact feedback. Closing feedback does not advance the hand. Exact retries preserve your live hand as separate manual practice. The hand-result panel also keeps Next hand reachable.

See [scope, verification and phone testing limits](docs/implementation/MOBILE_FOCUS.md). This step leaves the table styling, home screen and Learn design for later approval. Installed offline packs need updating to load a new app build after deployment.

Mobile polish follow-up: the play surface is seamless, header controls/text are aligned, and simulator settings no longer include global page navigation. Fold-only finishes stay compact; completed showdowns now use a concise winner popup, with the completed table/runout and Next hand still available.

## Midnight navy table — option B

The approved table style is implemented in the simulator: textured navy felt, charcoal rail, shaded seat badges, card backs, dealer button, contribution markers and classic white faces. The same card faces are shared with saved reviews. Blue Fold/Check, green Call and coral Bet/Raise buttons identify action categories, not correctness. No-page-scroll play, automatic error explanations, retries, offline support and the simplified hand finish remain intact.

See [the implementation and source-state audit](docs/implementation/NAVY_TABLE.md) and [actual production screenshots](docs/design/navy-table/README.md). Public pot labels include current bets; postflop bankroll amounts are not invented. Shared visual tokens support the next home-screen/theme step without recoloring strategy charts. Actual iPhone/Safari confirmation remains outstanding.

## Material depth and clear showdown outcomes

The actual simulator now uses layered rail/felt lighting, raised seat badges, paper-edge card shadows and stronger button gradients/bevels. Shared card faces carry the depth treatment into saved reviews. Completed showdowns show **You win**, **Villain wins** or **Split pot**, the recorded pot and both hand names. Back to table and Next hand stay available; optional details scroll inside the popup. The table header now says Showdown complete instead of clipping the outcome paragraph.

See [the implementation and source-safety audit](docs/implementation/MATERIAL_DEPTH_OUTCOMES.md). This is implemented SVG/CSS artwork, not another concept-preview round. Engine/grading/reference data are unchanged; actual iPhone/Safari appearance and performance still need device confirmation.

## Home and organized navigation

The approved Home screen has only Play/Resume, a twelve-week daily activity grid and Next practice. Ranges / Play / Learn are at the top; Settings holds training setup, recurring practice and offline installation. Home uses the simulator’s navy gradients, layered shadows and raised controls. Returning to the simulator preserves the original live-hand setup and verdict. All reviews retains mistake/session history, exact retries, notes and backups.

Activity counts saved decisions and fundamentals answers, including retries; it is not an accuracy or mastery score. Daily aggregates remain after older detailed attempts are condensed. Older activity is reconstructed only from retained timestamped answers and may be incomplete. Progress stays on this browser origin/device. See [the Home implementation and verification audit](docs/implementation/HOME.md).

## App logo

The approved silver spade on midnight navy replaces the old text marks and letter-A icons. Home, shared navigation, browser/PWA metadata and the Apple Home Screen icon use the same local artwork. [Branding details and actual-app captures](docs/design/branding/README.md) describe the rendered sizes and offline behavior. Already downloaded packs require an update in Settings to use the new build; an existing iPhone icon can also remain cached by iOS.

## Switch simulator modes

Use the navy switch in the simulator header: **off = Full hands**, **on = Preflop**. Both modes already existed; switching is now directly accessible. Each keeps its saved live hand, and returning restores its original supported setup. Saves finish before switching; unavailable packs or storage/ownership failures keep the current hand. The switch supports keyboard input and reduced motion. [Implementation and verification](docs/implementation/MODE_SWITCH.md).
