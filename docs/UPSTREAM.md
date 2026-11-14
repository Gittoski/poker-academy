# Imported foundation

- Original project: https://github.com/jensbaagaard/poker-practice
- Imported revision: `449993f78d995c77b72d0bcac418a8507dd6f783` on upstream `main`.
- Import date: 2026-11-13 (America/Guatemala).
- Previous academy commit: `f172d1f`, preserved locally and on GitHub as `backup/academy-before-poker-practice`.
- Replacement: removed the prior Expo application, custom poker engine, curriculum, old generated strategy pack, tests, build scripts, documentation and CI from the active branch. Git history is preserved; this was not a history rewrite.

The initial import keeps upstream `src/`, `data/`, `public/`, range/solver scripts and Next.js configuration unchanged. This fork's README, roadmap, attribution, verification tooling and visual concept documents are additional project material. Original documentation is retained in UPSTREAM_README.md.

## License and provenance

The upstream package and README label the software **MIT**. The supplied revision has no separate LICENSE file; this fork preserves upstream files and statements rather than inventing a copyright notice. This is attribution, not an independent license audit.

The upstream README describes built-in preflop data as free to use. Its data README describes Poker Trainer app chunks and chart/sizing extraction. Those statements are preserved in `data/openSourcePokerData/README.md`; we have not independently established the original data provider's redistribution permissions or solver accuracy. Imported charts are not newly verified equilibrium solutions merely because the app's tests pass.

Upstream describes full-hand data as generated offline using TexasSolver, with that solver run separately rather than linked into the app. The import retains the original scripts and output data. It does not run new solves or assert a broader guarantee about the supplied strategies.

## Verification boundary

Initial clean installation, TypeScript checks, all 86 upstream unit tests and a production Next.js build passed. Additional browser checks cover the imported UI and bundled asset loading, not proof of strategy optimality. Actual iPhone/Safari checks remain pending.
