# Poker Academy

An offline-first Expo poker learning app. Development proceeds milestone by milestone in [ROADMAP.md](ROADMAP.md). Educational strategy heuristics are not solver outputs. Virtual chips only.

## Development
Node 24 / npm 11. `npm ci`, then `npm start` (Expo Go) or `npm run web`. For sandboxed/cloud commands use `npm_config_cache=/tmp/npm-cache`, `EXPO_NO_TELEMETRY=1` and `EXPO_OFFLINE=1` when Expo metadata endpoints are unavailable. Dependency versions come from the installed SDK's bundled compatibility list.

Checks: `npm run typecheck`, `npm test`, `EXPO_NO_TELEMETRY=1 EXPO_OFFLINE=1 npx expo export --platform web`.

M1: dark responsive shell and local progress schema implemented. Three progress tests and web export passed. iPhone not tested. Lessons/trainers remain explicitly marked as planned.

M2: four repeatable drills with explicit mathematical assumptions; XP and per-topic accuracy persist through AsyncStorage. Failed answers award 2 XP; correct answers award 10 XP. These are practice rewards, not a skill rating. Seven unit tests pass. `node scripts/smoke.cjs` exercises the exported app served with `python3 -m http.server 8765 --directory dist`; set CHROMIUM_PATH when Chromium is elsewhere. Web reload persistence is tested separately from native device storage.

M3: pure five-to-seven-card evaluator with exhaustive five-card category-frequency validation (2,598,960 combinations), invalid-card rejection and tie-break fixtures. All ten unit tests and TypeScript pass. See [correctness contract](docs/CORRECTNESS.md) for formulas, analytical test oracles and validation limits. The simulator, curriculum lessons, decision trainers and opponent models are still pending; the evaluator is an internal foundation.

The iOS JavaScript/Hermes export also passed; this is not device verification. Local Git commits are created per milestone; nothing has been pushed to GitHub.

M4: 12 original beginner/intermediate/advanced lessons, gated quizzes, repeat-safe completion XP and persisted unlocks. Twelve unit tests, TypeScript, web export, curriculum browser test and prior practice smoke test passed. Curriculum sources and review scope are documented in `docs/CORRECTNESS.md`.

M5: first-in preflop training (845 authored position/hand cases), 169-hand reference chart, explicit 100-BB six-max assumptions and no solver claims. Fifteen unit tests, web build, typecheck and all three browser regressions passed. SB uses the documented simplified button range; BB is a walk in this unopened-pot scope.

M6: eight postflop scenarios cover texture, value, draws, sizing, multiway and bluff catching. Supplied-model EV is distinguished from range estimates. Eighteen tests, web build/typecheck and browser regressions passed.

M7: five opponent profiles plus six exploit exercises; assumed observations, conditional adjustment and failure risks are visible. No numerical frequencies are assigned to real players. Twenty unit tests, typecheck, web export and browser regressions passed.
