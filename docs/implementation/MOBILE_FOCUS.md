# Mobile simulator focus layout

Scope approved in chat: stop scrolling the simulator page; automatically show the complete explanation on reference errors; allow scrolling inside the overlay; keep Retry and Continue reachable. The green-felt table redesign, new home screen and Learn simplification remain separate approval steps.

## Delivered behavior

At widths up to 768 CSS pixels, and short landscape viewports up to 1024 pixels wide, Play uses a safe-area-aware dynamic viewport layout. A compact simulator header replaces the tall navigation stack. Settings & review opens mode/configuration controls, session state, scores, mistake reviews and existing navigation. These are moved using React portals; original controls remain available. Opening settings pauses trainer progression. Seat inspection in preflop opens its existing range view through that panel.

In short landscape windows, table/cards and controls use adjacent columns to retain board readability. The table has a stable allocated region; hero cards and action controls occupy reserved rows. Board dealing changes cards rather than appending page height. Correct/supported feedback stays compact. A zero-support reference choice opens a native modal automatically, including after restoring saved error feedback. Explanation and Chart tabs show existing feedback/source disclosures and the original range/strategy grids. Long content scrolls within the modal. The footer keeps Retry and Continue (or View hand result/Next hand) visible. The final hand-review popup was removed at the user’s request. Mobile finishes at the visible table/runout with Hand complete and Next hand; no additional final-review overlay or Result & showdown action is shown. Escape or Close minimizes feedback without advancing; reopening returns to the same decision. No background action is taken by closing.

Retry uses the existing manual-practice model and source restoration: a fresh manual attempt starts at the recorded pre-decision cursor; the live hand/verdict is preserved as resume state. Repeated retries remain manual practice. Return to live hand restores the paused verdict. Reload during manual practice still resumes the live hand according to the existing recovery contract. Errors during saving/restoration remain visible; no reference is substituted. Background shortcuts ignore modal content and focused controls so Enter does not both activate a modal button and advance the hand.

Desktop keeps the existing expanded training flow. Learn, engine rules, scoring, chart calculations/colors, reference scripts and public/source strategy data are unchanged. Reviewed controller changes are presentation wrappers, mobile preflop seat-inspection navigation and modal keyboard routing. The new journal callback reuses the same manual restoration contract as the existing review flow.

## Verification and limits

Automated mobile checks cover 320×568, 375×667, 390×844, 430×932, 768×1024 and 844×390: controls/hero cards within viewport, document height and page scroll remain fixed. Interaction checks cover automatic error overlay, compact correct feedback, chart access/internal scroll, fixed footer, close without advancement, exact retry/live-hand preservation, reload, preflop mode changes and postflop board restoration. The simulator also retains the complete-hand result acknowledgement checks. Existing inline-control journeys explicitly use desktop sizing; focused mobile journeys verify the replacement flow. Automated WCAG scans supplement these checks.

Real iPhone 13/Safari/Home Screen, browser chrome changes, VoiceOver, large accessibility text and on-device touch/keyboard behavior still need device testing. Extremely short windows and unusually large text may overflow individual content areas; modal content can scroll while its controls remain separate. Headless Chromium viewport checks do not prove universal device fit.

After a successful Vercel deployment, refresh the stable project address. An installed offline pack deliberately keeps its previous build: leave simulator tabs and update it from Learn → Use offline on this device, or remove the pack and reload online. Hosting deployment is automatic only if the connected production branch tracks work; this change does not modify hosting settings or verify the deployment.

Actual production-browser screenshots are available in [the mobile focus gallery](../design/mobile-focus/README.md).

Verification: 2026-11-15, Linux/Node 24, production Next build and headless Chromium. `npm run check` passes 147 unit tests, TypeScript and the reviewed simulator-integrity guard. `npm run test:browser` passes all 39 journeys, including 11 new mobile-focus cases. The final focused rerun also checks that retrying a supported/correct answer creates manual practice without manufacturing a mistake target. No engine/data or chart-function baselines were reset; only the five listed controller/presentation/keyboard entries were deliberately updated after review. The real-device gate remains open.

## Phone acceptance check

1. After the connected Vercel branch finishes deploying, refresh Play. If an offline pack is installed, update/remove it from Learn first; cached builds deliberately do not silently replace themselves.
2. Play several decisions: controls remain reachable and the page does not scroll. A reference error opens the complete explanation automatically; a supported answer stays compact.
3. Open Chart, scroll inside the panel and verify Retry/Continue stay at the bottom. Close the panel and confirm the same table remains.
4. Retry the exact decision, then Return to live hand. Confirm the original hand is still paused at its feedback. Reload an error and check its explanation opens again.
5. Finish a hand: the runout remains at the table with Hand complete and Next hand. Confirm there is no final-review popup, including after reload. Rotate the phone and repeat the control check.

Report any clipping with the phone model, orientation, screenshot and whether the app was opened from Safari or the Home Screen. VoiceOver and accessibility text sizes need their own device checks.

Follow-up: removed only the newly introduced mobile final-review popup and its reopen action. Decision feedback, full stored runouts, explicit Next hand, saved reviews and desktop inline results are preserved.

Interface follow-up: the mobile play surface is edge-to-edge, with no surrounding card border, rounded frame or inset shadow. The header uses a consistent 44px back target, aligned title/save text and a compact Settings control. Global Ranges/Play/Learn navigation is omitted from mobile settings so this panel cannot navigate away from the simulator; desktop navigation is unchanged. Compact feedback reserves fixed rows for its buttons, including short screens.

The settings panel also uses consistent spacing and left-aligned supporting text; the old general page footer is omitted there. Strategy provenance remains available in decision feedback.

Follow-up verification: 147 unit tests, TypeScript, reviewed integrity guard and production build pass; all 39 browser journeys pass, followed by all 11 mobile-focus journeys again after the final settings-spacing adjustment. Checks assert a borderless square-edged play surface, reachable header controls, absence of global navigation in mobile settings, and no final-result modal or reopen action, including after reload. Actual iPhone/Safari follow-up remains outstanding.
