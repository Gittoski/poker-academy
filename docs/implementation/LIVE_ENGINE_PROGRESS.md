# Live simulator implementation status

Imported candidate notes retained for provenance. Current integrated routing, verification and user-test instructions are in [LIVE_INTEGRATION.md](LIVE_INTEGRATION.md). Test counts below describe the earlier candidate.

Local candidate implemented. No push or deployment. See `LIVE_SIMULATOR_REVIEW.md` for acceptance criteria, limitations and review instructions.

- `/live` now connects the live rules engine to a separate trainer, linked from Home. Legal choices determine the continuation and uncovered decisions remain ungraded.
- Existing `/play` scripted/preflop study, reviews, lessons and their separate saves remain available. Missing charts stop reference exercises explicitly; no inferred fold or winner.
- Three documented heuristic opponents use an observation containing only own cards and visible public state. No GTO claim, opponent-card access or future-board access.
- Live setup supports 6/8/9 seats, unequal positive stacks, explicit antes, fixed 0.5/1 BB blinds and no rake. Engine covers 2–9 seats, legal raises/reopening, all-ins, side pots, refunds, ties and settlement.
- Imported 100bb cash PTO feedback requires matching known sizing/history/setup. Source entry hash and precise original frequencies are saved. Other sizes, setups, cold/multiway responses and postflop play are explicitly ungraded.
- Versioned seed/action-log saves replay legal transitions. One tab owns the save via Web Locks; no-lock/storage-failure practice is explicitly unsaved. Reload pauses opponents, and invalid saves remain untouched with export available.
- Recent history covers the current hand plus up to 20 archived hands. Saved-decision retries do not advance live state or expose later cards. This is separate from the legacy adaptive calendar/review system.
- Unit suite: 189 tests pass, including exhaustive five-card category frequencies, 1,000 randomized legal live hands, 120 heuristic-policy hands, rule edge cases, source matching, replay, saved feedback and size-limit checks. Production build passes.
- Broad browser suite passed 62 of 63 cases initially. The Home section-count regression was corrected by putting the live link inside the existing panel. Final Home/live rerun: all 13 cases pass, including the previously failing Home case and two added recovery/mode-separation checks.

Independent solver verification still needs authentic exports and metadata. No ranges were fabricated, regenerated, or relabeled as verified GTO. Those external data limitations are disclosed in the UI and review notes; legal live simulation does not depend on charts.
