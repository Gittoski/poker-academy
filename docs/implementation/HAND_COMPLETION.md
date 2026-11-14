# Explicit hand completion and runout visibility

The reported symptom was a hand ending after a choice, possibly Call, without a clear result. The exact user hand/mode was not available, so the audit does not claim to have reproduced that specific session.

## Confirmed behavior in the old flow

- Preflop mode stops at the end of the preflop round by design. Its old generic “Hand over” label could look like a missing postflop continuation.
- All 780 supplied full-hand scripts have a terminal result. None of their hero nodes lack reference probabilities. Of the showdown scripts, 6 finish betting on the flop and 18 on the turn, after an all-in call; each includes a full five-card runout. No Call-ending script has a Fold result.
- Full hands correct the player's chosen action onto the supplied action. A selected Call can be supported but still continued as the script's more frequent Fold. That ends the recorded line legitimately; it is not a simulation of the alternate calling branch.
- Final-decision feedback immediately offered Next hand, with the result mixed into its explanation. There was no distinct acknowledgement/result state. Feedback could also display the next street's board before the user pressed Continue.

## Change

Full hands now use **answer feedback → View hand result → Hand complete → Next hand** when the last action belongs to the player. A final opponent action opens Hand complete directly. The result remains until the player requests another deal.

The result screen reveals the supplied remaining runout and opponent cards only for a showdown. A fold remains on its actual street. If the selected and scripted actions differ, the result lists both. Preflop-only play explicitly names its limited scope; it does not fabricate postflop cards.

Feedback displays the public board/bets/action captions from its decision street. The engine still advances using the exact original functions; the presentation cursor is never persisted as an engine cursor. A synchronous transition latch, brief disabled Next hand period and ignored repeated keyboard events protect the result transition from accidental extra inputs.

`Cursor.resultShown` is an optional additive boolean in version 1. Existing cursors/backups remain compatible. Viewing the result does not add another decision, alter session counts or consume another review slot. Reload restores the acknowledged result and its original hand.

## Verification

- Six pure completion tests audit all 780 scripts, terminal types, preflop scope, actual fold/walk outcomes, all-in runouts and feedback-street visibility.
- Storage tests check result acknowledgement, duplicate counts and malformed flags.
- Four dedicated browser journeys cover flop and turn all-in calls, full runout/reload, duplicate click/repeated Enter protection, final villain folds and a selected Call continued as scripted Fold.
- Existing browser journeys now explicitly open the result before requesting another hand. Their original gameplay, strategy, review, layout and accessibility assertions remain.
- Reviewed controller guard updates are limited to FullHandTrainer, HandTrainer, VerdictView and useAnswerKeys. The original engine, grading, source-data, chart-calculation and palette hashes are unchanged.

Verification: 127 unit tests, TypeScript, reviewed integrity baselines, production build and 23 browser journeys pass. Actual iPhone/Safari behavior is not claimed from Chromium testing. Phone-only offline use remains the next planned M03 feature, detailed in NEXT_FEATURES.md; this fix does not publish a site or install an offline app.

[Actual result-screen captures](../design/hand-completion/README.md) show the complete stored runouts after reload.
