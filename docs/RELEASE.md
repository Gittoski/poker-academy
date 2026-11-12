# Device and release gate

M10 remains incomplete until these checks are executed, failures corrected, and evidence recorded. Linux web/JavaScript exports cannot replace them.

## Available checks completed

- Strict TypeScript, all 62 unit tests and formatting.
- Exhaustive five-card category frequencies and 100 seeded complete-game conservation/replay tests.
- Fourteen browser suites: curriculum, arithmetic, preflop/postflop/exploits, full table hand, migration/backup/reset, offline/responsive/accessibility checks, and guided visuals with reduced-motion tests.
- Web offline reload with saved XP and additional scoring while offline.
- 320/390/768px layouts without horizontal overflow; automated WCAG A/AA scans have no violations across the four main tabs. This is not a manual accessibility certification.
- iOS JavaScript/Hermes export and installed-SDK dependency compatibility check.

## Required external capability

A real iPhone with compatible Expo Go or a macOS runner with Xcode/iOS simulator is needed. Native distribution additionally needs the user's chosen Apple developer/signing setup. No secret values should be sent in chat. Device testing can begin with Expo Go without distribution credentials.

## Execute on device/macOS

1. Install with `npm ci`, start `npm start`, open on the iPhone. Record iOS, device, Expo Go and SDK versions.
2. Complete a lesson, fail and retry its quiz, verify prerequisites, answer each trainer, check feedback and progress. Restart and verify local completion/XP.
3. Enable airplane mode after the application is installed/bundled. Fully terminate, cold-start, learn and practice, then restart again. Confirm persistence. Expo Go's development server itself may require connectivity; also test an installed release build for true offline cold-start.
4. Play multiple simulator hands including folds, calls, custom raises and all-ins. Confirm action order and results. Confirm that the table persists across tabs/reload and that explicit reset requires confirmation.
5. Test native progress/replay share sheets, restore legacy/current JSON, invalid backups, cancel reset, then confirmed reset. Back up valuable progress first.
6. Enable VoiceOver and large Dynamic Type. Check all controls, range chart descriptions, focus order, feedback announcements, contrast and safe areas; check small and large iPhones.
7. Choose signing identity/bundle identifier in the release environment, build the native target through Xcode or the chosen Expo build workflow, install and repeat smoke/offline tests. Do not claim App Store readiness from a JavaScript export.
8. Record outcomes, fix failures, rerun regressions, then check off M10 and commit.

## User-reported iPhone session

The user reports that the app opens in Expo Go on their iPhone, the first lesson and worked-example cards are readable, and wrong-answer retry, correct answer and Apply this concept navigation work. They report visual overload. The focused-lesson refinement addresses this feedback and must be checked again on their phone. These observations cover only that flow; remaining offline cold-start, broader native/accessibility/share-sheet and release-build checks stay open.

## Continuous/coached table additions

Browser checks now cover session persistence across tabs/reload, repeated hands and virtual refills, baseline match/deviation feedback, explicit ungraded coverage, restored feedback and position rotation. The user’s earlier iPhone report does not validate these new features; repeat the device checklist after updating the Windows/iPhone project. Public Poker Trainer inspection remains blocked by environment web access, and no arbitrary GTO grading or native performance claim is made.

## Retry/review release gate

Automated tests cover exact checkpoint restoration including future-deck identity, deterministic replay after a retry, bounded v3 history migration, live-table preservation during saved-spot practice, separate first-try/practice statistics, weak-spot prioritization, stepwise reviews without future-card disclosure, contextual chart coverage and simulator-first responsive geometry. The revised native simulator still requires real-device checks; follow WINDOWS_UPDATE.md for updating the local Expo project. No verified all-street GTO/reference dataset has been provided, so uncovered decisions remain ungraded and the full strategy-coverage objective is not complete.

## Calculated river charts

The new Solved river mode has automated coverage for generated node selection, exact-combination frequencies/EVs, mixed actions, local confidence limits, covered size controls, off-tree rejection, varied deterministic deals, reference-policy sampling, retries/persistence and saved reviews. See SOLVED_RIVER.md for the actual solved inputs and numerical checks. The full browser regression suite passes, including chart layouts at 320/390/768px and automated WCAG A/AA checks. iOS JavaScript export passes; these new charts, native touch targets, screen-reader behavior and performance still need device validation under M10. No native-device result is inferred from the browser suites.
