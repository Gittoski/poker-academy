# Poker Practice

A fresh start based on [jensbaagaard/poker-practice](https://github.com/jensbaagaard/poker-practice), pinned to `449993f78d995c77b72d0bcac418a8507dd6f783`. The previous Expo academy and custom simulator have been removed from this branch. Their last version is preserved on `backup/academy-before-poker-practice`.

The imported Next.js app provides a range viewer, preflop training and scripted full-hand training. Its poker logic, charts and supplied hand scripts are unchanged. Full-hand training follows pre-generated lines and corrects choices along those lines; it is not an unrestricted poker engine.

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

The upstream test suite has 86 tests across eight files. Four additional browser checks cover chart loading, both trainer modes, continuation and responsive layouts. The browser runner uses a production build on its own port; install Chromium once with `npx playwright install chromium`, or set `CHROMIUM_PATH` to an existing system browser. The production build regenerates the range files from the included source data; it does not need a solver installation. Solver scripts are optional offline development tools, not a requirement for running the supplied app.

## Source and next steps

See [upstream attribution and import scope](docs/UPSTREAM.md), the [original README](docs/UPSTREAM_README.md) and the new [roadmap](ROADMAP.md). The original README's live-site and Vercel deployment statements refer to the upstream author's project, not this fork. No deployment or cloud-environment publication has been performed.

See [three visual directions](docs/design/visual-directions.png) and the [proposed phone usability changes](docs/design/README.md). Visual concepts are proposals separate from the running app. The next step is a modest phone-oriented visual and navigation pass while preserving the imported training behavior.
