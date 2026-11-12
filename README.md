# Poker PTO Academy

English, offline-first Expo/React Native training for six-max no-limit Texas Hold’em, focused on exploiting observed mistakes in recreational live games. No accounts, remote APIs or real-money play. Original educational content; no affiliation with PTO or any commercial solver/training product.

Implemented features:

- Guided Basics → Deeper strategy → Mastery practice path. Twelve lessons each use Learn → Example → Check → Apply, with two required checks and cumulative prerequisites. Existing completion is preserved; the course is not a guarantee of expertise.
- Poker math and ranking drills, preflop first-in trainer with 169-hand reference charts, eight postflop scenarios, five opponent profiles and six exploit exercises.
- Playable six-seat virtual-chip table: betting, all-ins, side pots, showdown, rotating blinds, action history and deterministic replay export. Table sessions and learning progress persist across tabs and reload.
- Local XP, levels, accuracy, weakest-topic review, progress backup/restore and confirmed reset. Version-1 progress migrates to version 2.

Ranges and exploit recommendations are **authored heuristics**, not GTO solutions. Every scenario explains the relevant assumptions. Numerical examples distinguish calculated results from hypothetical inputs. Bot policies are toy demonstrations, not calibrated opponents. See [correctness evidence](docs/CORRECTNESS.md) and the persistent [roadmap](ROADMAP.md).

## Develop

Use Node 24 and npm 11. From the existing checkout (no worktree needed):

```sh
npm ci
npm start
```

Open with a compatible Expo Go on an iPhone, or `npm run web` for browser development. In cloud sandboxes, `npm_config_cache=/tmp/npm-cache` avoids writing to a protected home cache. Expo's metadata hosts are blocked in this environment; build scripts use the installed SDK's bundled compatibility metadata with `EXPO_OFFLINE=1`. Package installation still uses the normal authenticated/TLS-verified npm registry.

## Verify

```sh
npm run check
npm run build:web
npm run test:web
npm run build:ios
```

`check` runs strict TypeScript, unit tests and Prettier. Tests include all 2,598,960 five-card combinations, side-pot/short-raise fixtures and 100 seeded conservation/replay games. The ten-suite web runner starts and stops its own isolated Python server, then tests learning, trainers, simulator, backup/reset, offline reload and accessibility at 320/390/768px. Python 3 and Chromium are required: `npx playwright install chromium`, or set `CHROMIUM_PATH` to a system browser. CI configuration runs these same commands; remote CI results have not been verified here.

`build:web` creates a service worker for static hosting over HTTPS. The first visit must be online; subsequent cached reloads and practice work offline. Native bundles include content locally, but native offline cold-start has not been tested. `build:ios` exports JavaScript/Hermes only; **it does not compile or test a native iPhone app**.

## Release status

Milestones 1–9 and guided-learning/visual milestones 11–12 are verified and committed. Available release-hardening checks pass. Milestone 10 remains open for actual iPhone/Expo Go, VoiceOver/Dynamic Type, native offline cold-start, native share sheet, and native release build/signing. This Linux host has no Xcode, iOS simulator or connected iPhone. Follow [the device checklist](docs/RELEASE.md) on an iPhone/macOS environment before claiming iPhone readiness. No app-store deployment or environment publication was performed.

The refined interface uses a midnight/emerald/ivory theme, persistent bottom navigation, accessible playing cards, spring press feedback and subtle transitions that respect reduced motion. See [design and learning flow](docs/DESIGN.md). All 12 lessons are exercised end to end, including both required checks, retries and persisted completion.

First iPhone feedback led to focused lesson screens: dashboard/tab clutter is hidden while studying; incorrect answers are red, correct answers green, with explicit text/icons and a separate final Finish action. The original first-lesson flow has been reported working by the user on iPhone; the revised visuals and native release gate still require device checks.

Continuous free-table practice keeps the current hand, rotates blinds and lets you play after chip loss. Seats at or below the 2-chip big blind are refilled to 200 virtual chips between hands; refill credits are not winnings. Table recovery validates saved metadata by replaying legal actions, rather than trusting stored deck state.

Coached hands starts each hand at 100 BB, rotates UTG/HJ/CO/BTN/SB, and presets earlier folds so the authored first-in baseline applies. It flags action/sizing deviations without interrupting play. Postflop, facing action and unsupported stacks are explicitly ungraded. This is not GTO/PTO solver evaluation. Saved table sessions migrate from v1 to v2; feedback is recomputed from legal actions on restore. Actual Poker Trainer research is pending environment web access; see `docs/POKER_TRAINER_RESEARCH.md`.

The simulator notebook now saves up to 30 completed hand branches and 200 decision attempts. Use **Retry this decision**, **Show decision chart**, or **Saved hands & practice**. Baseline deviations enter troublesome spots automatically; ungraded decisions can be marked manually. Saved-spot practice pauses the live table and restores it on return. Retries are separate from retained first-try results. Current validation: 52 unit tests, twelve browser suites, web and iOS JavaScript exports. Strategy coverage remains the authored first-in baseline; no arbitrary GTO verdict is supplied.

## Simulator-first update

The app now opens at an original six-seat table, with rotating LJ/HJ/CO/BTN/SB/BB positions. LJ corresponds to UTG in the existing six-max teaching data. Main actions stay compact; bet/raise details are expandable. Learning features remain available in navigation. The notebook prioritizes unresolved and repeatedly troublesome baseline deviations; statistics cover retained attempts only. Current validation: **54 unit tests, thirteen browser suites, TypeScript, formatting and both JavaScript exports pass**. New native-device checks remain pending.

See [Windows/Expo Go update steps](docs/WINDOWS_UPDATE.md). Universal strategy grading is still blocked on verified, licensed reference data: the app explicitly leaves uncovered situations ungraded.
