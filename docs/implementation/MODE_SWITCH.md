# Discoverable Full hands / Preflop switch

The user clarified that the imported simulator already has Preflop practice. This change exposes that existing mode directly in the simulator header; it does not build a duplicate drill or change poker behavior.

## Interface

The compact header has a navy iOS-style switch with Full hands on the left and Preflop on the right. Off means Full hands; on means Preflop. The pearl thumb slides with a short eased transition over an inset navy track. It uses a 44-pixel-high hit target, keyboard activation, switch semantics and a description of both states. Reduced-motion preferences remove transitions. The existing viewport-sized simulator layout and action controls remain in place. Routine settings remain on Home; the old duplicate mode selector inside recovery details is removed.

## Saving and switching

A change pauses answer/NPC input before flushing saved work. Unsaved or unavailable history keeps the switch disabled; a final runtime check also refuses to leave pending writes. The destination chart pack and full-hand index are loaded before changing the mode. Failed downloads, unavailable coverage, changed reference identity or ownership failures keep the original mode and checkpoint, with an explicit explanation.

The learning metadata has an optional modeCursors map with at most two entries, holding each mode's latest live checkpoint. It updates atomically with normal saved transitions; manual retries cannot overwrite a live bookmark. Switching from manual practice saves its attempts and parks the preserved live hand, matching the existing reload/return-to-live policy. The mode transaction parks the outgoing cursor, restores the destination cursor when present and returns that hand's original configuration. A mode with no saved hand starts through its existing controller.

The page updates its existing mode/setup state, URL and local preference. Full hands still uses its existing six-max cash/100 BB/PTO configuration. Returning to Preflop restores its original supported seat/chart/table-size/open-size setup. Mode changes do not count as answered questions or completed hands. Original decision classifications, session counters and daily activity are preserved.

Bookmarks are included in journal backups and protected during whole-hand compaction along with the active/manual-resume cursors. Import validation checks their mode, source and hand relationships. Older backups without bookmarks remain compatible; no database version upgrade is required. Local browser-origin storage still applies. Existing source-compatibility rules remain in force; the switch does not manufacture a replacement reference for a saved hand.

## Protection and verification

The protected PlayPage seam is limited to replacing the hidden selector with header props, resetting an initial review request when changing mode and applying/persisting an existing normalized setup. The narrowly reviewed controller hash is recorded in the integrity baseline. The engine, both trainer controllers, grading functions, chart functions/palettes and supplied files keep their previous hashes.

Unit checks cover queued-save ordering, checkpoint/config restoration, retained counts, backup validation, compaction protection, invalid transitions and switching from manual practice. Production browser checks cover the sliding switch, keyboard/double-input safety, reload, manual retry/live restoration, unavailable packs, ownership failure, supported preflop configurations and reduced motion. Existing mobile-layout journeys also check switch bounds alongside cards and action buttons.

Final verification, 2026-11-16: `npm run check` passed 157 unit tests across sixteen files, TypeScript and the reviewed integrity guard. The production build and all 56 production browser journeys passed. The extended cold-offline journey passed again with switches to Preflop and back while disconnected. The animation/reload/keyboard journey was repeated to capture the final actual-app screenshots. See [the implemented switch](../design/mode-switch/README.md). Actual iPhone/Safari animation smoothness, touch feel, safe-area behavior and VoiceOver remain device checks. This is a CSS/HTML switch in the existing web app, not an assertion of native UIKit verification. No next-feature drill work is included.
