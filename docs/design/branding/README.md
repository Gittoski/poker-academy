# Approved spade branding

The user approved the raised silver/white spade on midnight navy and requested replacement of existing logos only. The approved original is [stored in the repository](../../../src/branding/spade.png). No focused-preflop or other next-feature work is included.

The same artwork now replaces the text spade in Home and shared Ranges/Learn navigation. A shared decorative image reserves its layout space and keeps adjacent app-name text accessible. The in-app mark is rendered at 144 × 144 pixels for up to 48 CSS pixels at 3× density. Its small-screen variants retain the same aspect ratio and artwork.

Explicit output-file tracing includes the source PNG in each icon function for Vercel deployment, in addition to its build-time rendering.

The former letter-A browser/PWA icon and Apple icon use this artwork at 512 × 512 and 180 × 180 pixels. The original full-resolution file stays server-side; Next renders local PNG endpoints during the production build. There is no external image host, font-dependent redraw or runtime graphics dependency. The OS handles installed-icon masking; UI marks use the approved navy tile with gently rounded corners.

The complete offline manifest includes `/brand-mark`, `/icon` and `/apple-icon`. Existing downloaded packs intentionally keep their old build until updated through Settings. Existing iPhone Home Screen icons may also retain OS-cached artwork; serving a new Apple icon is not proof that an installed icon has refreshed on an actual device.

Card suits remain ordinary poker notation. Simulator behavior, strategies, calculations, chart palettes, journal and learning progress are untouched; no protected integrity baseline was changed.

## Captures

- [Home header in the production app](home-logo.png), Chromium at 390 × 844 CSS pixels.
- [Rendered 180-pixel Apple icon](apple-icon.png), the PNG served by the app, not a device-installation screenshot.

Verification, 2026-11-16: 154 unit tests, TypeScript, production build and unchanged simulator/data integrity checks passed. All 51 production browser journeys passed. After the explicit deployment tracing was added, a fresh production build plus the branding/metadata/tracing and cold-offline-logo journeys passed again. The branding journey checks PNG formats and exact output dimensions, existing header slots on Home/Ranges/Learn, layout at 320/390/1365 pixels, platform metadata and offline-manifest inclusion. The original approved PNG and the repository master have identical SHA-256 hashes. Actual iPhone icon refresh and Safari appearance remain device checks.
