# Fresh foundation roadmap

The user has replaced the previous academy project with jensbaagaard/poker-practice. Preserve the imported training behavior and make visual/usability changes in small, reviewable steps.

- [x] Back up the old application at `backup/academy-before-poker-practice` on GitHub.
- [x] Replace the active application with upstream revision `449993f78d995c77b72d0bcac418a8507dd6f783`; retain source attribution and original documentation.
- [x] Verify clean installation, TypeScript, all 86 upstream unit tests and production build.
- [x] Inspect the imported range viewer and both training modes at phone and desktop widths; record current limitations.
- [x] Show three clearly labeled visual proposals without changing the app's existing behavior.
- [x] Apply the approved black/graphite theme with navy accents, plain cards, subtle motion and new table/action styling; preserve simulator logic and chart palettes.
- [ ] Optional product/navigation follow-up: play-first entry, settings sheet and optional chart/explanation disclosure. These are not part of the approved presentation-only change.
- [x] Verify the navy theme with 86 unit tests, nine browser checks, automated accessibility scans, responsive geometry, reduced-motion checks and simulator-integrity hashes.
- [ ] Test on an actual iPhone/Safari; consider an installable web app after the core interface is approved.

The fresh foundation is Next.js, not Expo/React Native. Full-hand practice follows supplied scripted lines; unrestricted play and exact retry are possible future product work, not features claimed by this import. The old curriculum/XP system is not part of this new scope.


Initial import verification: all 46 files under `src/`, 296 under `data/` and 797 under `public/` match the pinned upstream revision byte-for-byte. Additional QA uses Playwright; no old simulator code was brought forward. All 86 unit tests, TypeScript, production build and four browser flows pass locally. CI is configured but remote CI results are not claimed.

See [the visual proposals and their scope](docs/design/README.md). The earlier Emerald proposal was superseded by the user’s actual reference. The approved direction is now implemented with navy accents.

- [x] Show four additional original concept boards inspired by the requested Offsuit Games / Blackjack Wiz directions (five example screens per style). These are generated visual studies, with unverified reference fidelity, not app changes. See `docs/design/inspired/README.md`.

Current visual direction (user correction): use the supplied screenshot's black canvas, graphite gradients, lime accents and plain white cards. Discard the prior cartoon and casino-gold assumptions for implementation. Three corrected player-facing previews are in `docs/design/reference-study/`; the approved presentation layer is now applied, with navy replacing lime.


## Navy theme implementation

The user approved the actual black/graphite reference and substituted navy for lime. The presentation pass updates the shell, table drawing, cards, action controls and CSS motion. The engine, grading, training controllers, chart data and supplied hand scripts remain unchanged. Original classic/cool chart palettes are retained. Chart DOM gained accessible rows; exact calculations remain protected.

See [THEME.md](docs/THEME.md) for scope and SHA-256 preservation checks, and [the implemented screenshots/recording](docs/design/implemented/README.md). Existing routes and training behavior are retained. Native iPhone/Safari verification is still pending.

Theme verification: TypeScript, all 86 original unit tests, nine browser checks, the SHA-256 simulator guard and production build pass. The nine flows include a three-street, five-card runout at 320px with no board/seat overlap. Actual browser screenshots and a short H.264 recording are captured from the running app. iPhone/Safari testing remains open.
