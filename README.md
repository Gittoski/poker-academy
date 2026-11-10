# Poker Academy

An offline-first Expo poker learning app. Development proceeds milestone by milestone in [ROADMAP.md](ROADMAP.md). Educational strategy heuristics are not solver outputs. Virtual chips only.

## Development
Node 24 / npm 11. `npm ci`, then `npm start` (Expo Go) or `npm run web`. For sandboxed/cloud commands use `npm_config_cache=/tmp/npm-cache`, `EXPO_NO_TELEMETRY=1` and `EXPO_OFFLINE=1` when Expo metadata endpoints are unavailable. Dependency versions come from the installed SDK's bundled compatibility list.

Checks: `npm run typecheck`, `npm test`, `EXPO_NO_TELEMETRY=1 EXPO_OFFLINE=1 npx expo export --platform web`.

M1: dark responsive shell and local progress schema implemented. Three progress tests and web export passed. iPhone not tested. Lessons/trainers remain explicitly marked as planned.
