# Test the graded preflop candidate

Candidate branch: `test/graded-preflop`. Production branch: `work`. This candidate is for review before main-app integration.

Use the Vercel **Preview** deployment for the candidate branch if the connected project creates branch previews. Open that preview URL on your phone/computer. Preview and production normally have different origins and separate local progress. A preview deployment URL/status has not been verified by the development environment.

For a local checkout of the candidate branch, run `npm ci`, `npm run build`, then `npm run start`. Open the URL shown by Next.js. The usual development option is `npm run dev`; keep the computer running while testing locally.

## Player checks

1. Open the simulator and turn on the existing Preflop switch. A new preflop slot starts covered practice. If an earlier preflop hand is restored, open **Practice tools → Start graded practice**. The original hand moves to recent history; the other mode stays parked unchanged.
2. Confirm the approved navy table, cards and switch are familiar. The subtitle identifies a **Supplied setup**: previous actions set up the training situation; they were not decisions you already answered. Cards are freshly shuffled. This practice samples reference situations rather than normal live-game frequencies.

   Playback update: New exercises now show posted blinds and the earlier supplied actions one at a time, with the next acting seat highlighted and thinking dots. Read the fold/raise caption while the table changes. Decision buttons appear after the setup reaches you. Restored hands and exact retries return directly to their saved decision. Full hands retains its normal opponent pacing and adds public action captions. No earlier setup action should be saved twice or counted as your answer.

   Selection update: Practice tools now describes a balanced study mix of roughly 60% new hands supporting a call/raise and 40% fold-only, favoring openings and facing one raise. Existing saved hands and retries keep their exact cards; use Next hand to try the new mix. Short sessions can differ from the targets. The selected category is not revealed before your answer.
3. Answer a decision. It should show In range or Outside range, with an explanation and the original range chart highlighting your hand. Standard raise sizes come from the reference; custom sizes belong to Full hands.
4. On an error, inspect the automatic explanation, switch to Chart, then Retry. Cards and the decision should return unchanged. Your first answer remains saved once. A supported answer normally stays compact; a reference-boundary explanation can also open when the charted continuation ends.
5. Continue/Next through several hands. Every accepted covered answer should receive a reference grade. A call or cold response can end at an explicitly explained **Reference boundary**; it must not produce another ungraded prompt, substitute a different action, or assign a fictional winner.
6. Fold: no opponents should continue acting afterward. An all-in call in Preflop ends at the betting boundary with no board runout or invented showdown.
7. Open Practice tools and review a saved decision. A manual retry must leave the current live hand untouched. In Live table settings, **Any position** varies the context; selecting a position focuses applicable situations. Six players, 100 BB, no antes and reference-opponent policy are fixed in covered practice.
8. Toggle Full hands and back. Both exact hands should be preserved. Full hands still supports unrestricted legal play and its existing settings; its unsupported strategy situations remain ungraded.

   Flow update: Full hands automatically continues after ungraded choices without an empty feedback panel. Real grades still pause for their explanation. Reload/settings/manual review can still require a normal resume, and results/Next hand controls remain. Ungraded decisions stay saved and can be inspected deliberately through Recent practice. Preflop feedback remains unchanged.

   Position update: In **Full hands → Practice tools → Live table settings → Your position**, choose **Random each hand**, then **Start with these settings**. Next hand should change your position without repeating the previous one. Reload and retry must keep the current position/cards; switching modes and back must restore that exact hand. Fixed positions remain available. Existing fixed saves are preserved, so enable this setting explicitly. Covered Preflop continues to use **Any position** as before.
9. Reload during an answer/feedback/retry and confirm the same state returns. The retained-history counts are bounded and are not a lifetime mastery score. Reference-boundary counts and visited setup contexts are separate from grades.
10. For offline use on the preview origin, install the complete pack through **Home → Settings → Use offline on this device**. Once it reports available, test a cold reload without internet. Missing/corrupt charts must pause covered answers with recovery controls, never silently accept an ungraded decision.

On an actual iPhone 13, check portrait/landscape, Home Screen mode, safe areas, touch targets, readability, chart interaction, internally scrolling explanations and reachable controls without page scrolling. Browser viewport tests do not verify Safari or iPhone hardware. Report the situation, action, visible message and whether it followed a reload/mode change if anything fails.

## Scope

This release grades choices against imported six-max 100 BB PTO charts. It does not independently validate their solver provenance, calculate EV loss, solve arbitrary preflop/multiway situations, or add random-postflop strategy grades. Older ungraded answers remain ungraded. Keep production integration pending until the candidate has been reviewed.
