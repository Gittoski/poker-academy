# Fresh foundation roadmap

The user has replaced the previous academy project with jensbaagaard/poker-practice. Preserve the imported training behavior and make visual/usability changes in small, reviewable steps.

- [x] Back up the old application at `backup/academy-before-poker-practice` on GitHub.
- [x] Replace the active application with upstream revision `449993f78d995c77b72d0bcac418a8507dd6f783`; retain source attribution and original documentation.
- [x] Verify clean installation, TypeScript, all 86 upstream unit tests and production build.
- [ ] Inspect the imported range viewer and both training modes at phone and desktop widths; record current limitations.
- [ ] Show three clearly labeled visual proposals without changing the app's existing behavior.
- [ ] Choose a visual direction, then apply its typography, colors, table/cards and action styling.
- [ ] Simplify phone navigation: play first, secondary settings in a sheet, large reachable actions and optional chart/explanation details.
- [ ] Verify the revised flows, accessibility, responsive geometry and regression tests.
- [ ] Test on an actual iPhone/Safari; consider an installable web app after the core interface is approved.

The fresh foundation is Next.js, not Expo/React Native. Full-hand practice follows supplied scripted lines; unrestricted play and exact retry are possible future product work, not features claimed by this import. The old curriculum/XP system is not part of this new scope.
