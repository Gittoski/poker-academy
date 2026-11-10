# Device and release gate

M10 remains incomplete until these checks are executed, failures corrected, and evidence recorded. Linux web/JavaScript exports cannot replace them.

## Available checks completed

- Strict TypeScript, all 36 unit tests and formatting.
- Exhaustive five-card category frequencies and 100 seeded complete-game conservation/replay tests.
- Seven browser suites: curriculum, arithmetic, preflop/postflop/exploits, full table hand, migration/backup/reset, offline/responsive/accessibility checks, and guided visuals with reduced-motion tests.
- Web offline reload with saved XP and additional scoring while offline.
- 320/390/768px layouts without horizontal overflow; automated WCAG A/AA scans have no violations across the four main tabs. This is not a manual accessibility certification.
- iOS JavaScript/Hermes export and installed-SDK dependency compatibility check.

## Required external capability

A real iPhone with compatible Expo Go or a macOS runner with Xcode/iOS simulator is needed. Native distribution additionally needs the user's chosen Apple developer/signing setup. No secret values should be sent in chat. Device testing can begin with Expo Go without distribution credentials.

## Execute on device/macOS

1. Install with `npm ci`, start `npm start`, open on the iPhone. Record iOS, device, Expo Go and SDK versions.
2. Complete a lesson, fail and retry its quiz, verify prerequisites, answer each trainer, check feedback and progress. Restart and verify local completion/XP.
3. Enable airplane mode after the application is installed/bundled. Fully terminate, cold-start, learn and practice, then restart again. Confirm persistence. Expo Go's development server itself may require connectivity; also test an installed release build for true offline cold-start.
4. Play multiple simulator hands including folds, calls, custom raises and all-ins. Confirm action order and results. Confirm the documented table reset on leaving the screen.
5. Test native progress/replay share sheets, restore legacy/current JSON, invalid backups, cancel reset, then confirmed reset. Back up valuable progress first.
6. Enable VoiceOver and large Dynamic Type. Check all controls, range chart descriptions, focus order, feedback announcements, contrast and safe areas; check small and large iPhones.
7. Choose signing identity/bundle identifier in the release environment, build the native target through Xcode or the chosen Expo build workflow, install and repeat smoke/offline tests. Do not claim App Store readiness from a JavaScript export.
8. Record outcomes, fix failures, rerun regressions, then check off M10 and commit.
