# Richer materials and explicit showdown outcomes

Implements the user's request to improve the actual graphics, without another concept-preview approval round. This supersedes the earlier request to remove all final-result popups: only a completed showdown now opens a concise outcome popup. Fold-only finishes keep the compact flow.

## Visual changes

The felt has stronger directional navy lighting and a soft SVG inset shadow. The rail uses layered solid forms, highlights, recesses and cast shadows instead of one stroked ellipse. Seat badges have a dark raised base, a stronger front gradient, inset bevel and two shadow layers. Shared card faces use visible paper edges and broader contact shadows. Card rendering viewports include padding for those shadows while retaining the visible card coordinates, which avoids clipping in constrained SVG rendering areas. Both shared faces and simulator faces use this treatment.

Action buttons have a top sheen, stronger gradient, bevel, a solid lower edge and layered shadows. Hover keeps its hit target stationary. Four-action rows use a responsive grid so controls and their shadows remain available on small phones. Colors still identify action type, not correctness. No chart palette or frequency calculation changes.

These are native SVG/CSS lighting/material effects, not a WebGL engine or a claim of tested 3D performance. Artwork is local/offline; no new runtime dependencies or image downloads are required. Motion preferences remain supported.

## Showdown outcome

Only after the actual recorded hand has completed and the result/runout is shown, FullHandTrainer supplies its recorded ScriptResult to the result view. The popup explicitly names You win, Villain wins or Split pot; displays the recorded pot and both supplied hand names; and labels the result as following the supplied hand. It does not infer a winner from a choice, compute profit or EV, or add any future information to decision grading.

Back to table closes the popup without advancing. Show result reopens it. Next hand remains in the fixed footer. Longer original explanations, including selected versus scripted action, are available under Hand details and scroll inside the popup. Focus opens on the dialog with its content scrolled to the winner, rather than jumping to the lower details control. Reload restores the completed hand and outcome. Preflop folds and non-showdown finishes do not manufacture showdown results.

The protected FullHandTrainer changes are a conditional terminal-outcome prop and a short Showdown complete caption replacing the clipped result paragraph in the table header. Engine, grading, scripted actions, result data, saved records and chart functions remain untouched. No imported source data is rewritten. The narrowly reviewed controller hash is updated with this audit; other protected hashes remain unchanged.

## Verification

Production browser tests use existing recorded examples of hero wins, villain wins and a genuine split. They check absence of the outcome during decisions, correct terminal winner/pot/hand labels, readable titles, fixed controls at phone/landscape sizes with long details expanded, close/reopen/reload and accessibility. Existing completion, fold, replay, storage, offline and no-page-scroll regressions remain required.

Actual iPhone/Safari shader-like appearance, SVG filters/foreignObject rendering, VoiceOver and animation smoothness still require device confirmation. No concept image is being presented as implemented or device-tested output.

Final verification, 2026-11-16: `npm run check` passed 147 unit tests, TypeScript and the narrowly reviewed integrity guard. Production build and all 44 browser journeys passed. After shortening the table caption, a fresh check/build and all three genuine-outcome journeys passed again, including expanded details, phone/landscape control bounds, close/reopen/reload and accessibility. [Captured outcome examples](../design/material-depth/README.md) are actual app output. No iPhone/Safari/VoiceOver device verification was claimed.
