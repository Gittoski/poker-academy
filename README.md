# Poker Practice

A fresh start based on [jensbaagaard/poker-practice](https://github.com/jensbaagaard/poker-practice), pinned to `449993f78d995c77b72d0bcac418a8507dd6f783`. The previous Expo academy and custom simulator have been removed from this branch. Their last version is preserved on `backup/academy-before-poker-practice`.

The imported Next.js app provides a range viewer, preflop training and scripted full-hand training. Its poker engine, grading functions, chart data and supplied hand scripts are unchanged; reviewed controller seams now add local learning history and recovery. The approved black/graphite interface now uses navy accents, plain white cards and subtle CSS motion. Full-hand training follows pre-generated lines and corrects choices along those lines; it is not an unrestricted poker engine.

## Run

With Node.js and npm installed, from the folder containing `package.json`:

```sh
npm ci
npm run dev
```

Open http://localhost:3000. **Ranges** opens the charts; **Play** opens the trainer. This foundation is a web app, so Expo Go is no longer used. Computer browser checks do not establish iPhone/Safari behavior.

## Verify

```sh
npm run check
npm run build
npm run test:browser
```

The test suite has 127 unit tests across eleven files and 23 browser journeys covering original play plus saving, recovery, exact retries, adaptive return, failure handling, responsive layouts, keyboard/focus, accessibility and reduced motion. The browser runner uses a production build on its own port; install Chromium once with `npx playwright install chromium`, or set `CHROMIUM_PATH` to an existing system browser. The production build regenerates the range files from the included source data; it does not need a solver installation. Solver scripts are optional offline development tools, not a requirement for running the supplied app.

## Source and next steps

See [upstream attribution and import scope](docs/UPSTREAM.md), the [original README](docs/UPSTREAM_README.md) and the new [roadmap](ROADMAP.md). The original README's live-site and Vercel deployment statements refer to the upstream author's project, not this fork. No deployment or cloud-environment publication has been performed.

See [three visual directions](docs/design/visual-directions.png) and the [proposed phone usability changes](docs/design/README.md). Earlier visual concepts remain archived as proposals. The current implemented direction follows the user’s supplied reference with navy replacing lime. The navy visual pass is implemented. See [what changed and how the simulator was protected](docs/THEME.md), plus [screenshots and a short real-app recording](docs/design/implemented/README.md). Optional navigation/product changes remain separate from this visual pass.

## Learning roadmap

The next upgrades focus on lasting progress, exact mistake review and a staged Basics → preflop → postflop → exploitative → advanced learning path. See the [active checklist](ROADMAP.md) and [full learning plan](docs/LEARNING_PLAN.md). The current working trainer is preserved. The journal/review loop is implemented; the wider curriculum and offline-installation roadmap remain future work.

The simulator now includes [automatic sessions, mistake reviews and adjustable recurring practice](docs/SESSION_REVIEW_SPEC.md), with a [bounded implementation checklist](docs/SESSION_REVIEW_ROADMAP.md). See the [usage guide](docs/SESSION_REVIEW_GUIDE.md), [verification evidence](docs/implementation/SESSION_REVIEW_VERIFICATION.md) and [actual-app screenshots](docs/design/session-review/README.md).

## Use the session reviewer

Play normally: answers save automatically before Continue. Open **Review mistakes** for session summaries, grouped errors, original references, reflections/pins and **Retry this decision / Play this hand**. Manual practice pauses and preserves your live hand. Under **Practice settings**, toggle **Mix in my mistakes** and choose approximately one review per 2–20 hands. Adaptive returns start from preflop and identify themselves only after the target answer.

Supported mixed alternatives stay separate from zero-support reference errors. History stays in this browser origin (address and port) on this device; use export/import for transfer. Storage failures are shown explicitly. Actual iPhone/Safari verification remains outstanding.

## Hand results and phone-only use

Full hands now finish with a distinct **Hand complete** screen. After your final decision, choose **View hand result**, inspect the stored showdown runout or actual fold outcome, then **Next hand**. Results survive reload. The screen names both your selection and the scripted action when they differ; a supported Call is not the same as playing a new calling branch in this scripted trainer. Preflop mode explicitly stops before postflop. See [the completion audit](docs/implementation/HAND_COMPLETION.md).

The next planned feature is an installable offline PWA, followed by math practice, short capsules and focused sessions. The current project ZIP is not an iPhone app and Expo Go cannot run it. A hosted site would remove the PC requirement; fully offline use additionally needs app/content caching and real-device verification. No hosting or App Store publication has been performed. See [the future feature and distribution plan](docs/NEXT_FEATURES.md).
