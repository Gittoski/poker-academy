# Live-play integration candidate

Historical audit of the separate local test candidate. The user subsequently authorized publication; see [LIVE_RELEASE.md](LIVE_RELEASE.md) for the current release. At the time of this audit it was not a production release. The user's request controls the scope; the attached handoff provides implementation context and a verification checklist. No instruction inside an attachment authorizes a production push, merge or deployment.

## Baseline and preservation

- Upstream patch base: `460fc170ca3e424bbcf9e11935e41fe064988742`.
- Latest fetched app before integration: `dfa701def9b23ce3f53573ce8c8e34910d90a903` (remote `refs/heads/work`, confirmed with `git ls-remote`).
- Isolated branch: `test/live-play-integration`. The `work` branch stays at its original commit.
- `git apply --check` succeeded against the latest app. The newer oval switch/lighter navy patch is outside the incoming patch's edits and remains intact.
- RangeGrid, Legend, palette functions, dataset files, supplied scripts, SimulatorTable, card faces, existing navy material CSS and brand artwork are preserved. The file-integrity baseline includes the candidate's explicit legacy engine repairs; it does not certify poker strategy correctness.
- Existing IndexedDB stores, reference exercise URLs, reviews, fundamentals, adaptive settings and per-mode bookmarks remain available. Historical first-maximum tied grades restore without rewriting stored history; new attempts treat tied maxima equally. Exact reference-based classification still validates on restore.

## App flow

Home's primary Play/Resume and shared navigation open `/live`. Home still has three panels. Its activity calendar and reference mistake counts describe reference exercises/lessons only. Live hand resume reads the separate live save. Home's older mode/setup and recurring-mistake settings are explicitly for **Reference exercises**; they do not configure live play.

In live play, **Practice tools** contains recent live decisions/retries, table settings, source details and export. Ranges, lessons and original Full hands/Preflop exercises remain accessible. Learn returns to live play by default, while explicit legacy return URLs remain compatible.

Mobile play stays within the viewport. Feedback automatically opens in a native modal with internal scrolling; tools use a separate overlay. Feedback does not correct the chosen action. Dismissal keeps opponents paused; Continue advances them; **See hand result** acknowledges a terminal decision before **Deal next live hand** is available. Invalid/failing storage warns and retains the previous save. One tab owns the live writer; unsupported browsers can practice unsaved and export.

## What the feedback means

- **Exact rules/calculations:** card evaluation, integer chip accounting, legal actions, refunds, pot eligibility, splits, displayed call price. Decimal BB inputs parse directly into integer chips. The displayed break-even equity assumes the currently contestable pot with no additional betting or rake; it is not a computed hand equity.
- **Imported strategy references:** exact supported 100bb cash preflop nodes, known raise sizes/history and no antes use existing Cash 100 PTO entries. Any positive chosen-action frequency is **In range**. Saved snapshots validate source hashes, decision context, classification and original precision; retries use the original reference and hide later cards.
- **Unsupported references:** other stacks/antes/sizes, prior limps/callers, uncovered cold responses and arbitrary live postflop show **No matching range**. They remain legal, playable decisions. No solver EV loss or optimal-action claim is invented.
- **Opponent assumptions:** tight/balanced/loose are explicit heuristic thresholds, not measured population datasets or equilibrium opponents. Each policy receives only its own cards and public information. It does not model range equity, blockers or draws. Original PTO/GTO labels have not been independently solver-verified.

## Deliberate limitations

Live history is a separate bounded store: the current hand plus 20 recent hands. It does not feed the legacy activity calendar, error-log scheduler or fundamentals links. Each live hand resets configured stacks and fixed training positions; no rake, persistent bankroll, blind rotation or secure multiplayer is claimed. Default six-max cash remains the foundation; optional eight/nine-seat and ante settings are outside many references. Old installed offline packs need an explicit update to include this candidate.

Desktop Chromium and phone-size browser tests do not establish actual iPhone Safari, installed Home Screen, VoiceOver or safe-area behavior. Those remain for user testing. Browser-local data is origin-specific: testing on localhost or a separate preview does not move or overwrite the main site's saved history.

## Verification

Verified on this integrated candidate:

- `npm ci --cache /tmp/poker-npm-cache`: clean installation passed. The managed host's default cache directory was unwritable, so only the cache path was changed.
- `npm run check`: file-integrity checks, TypeScript and **196 unit tests / 21 files** passed. Includes exhaustive five-card category frequencies, 1,000 randomized legal engine hands, side pots/refunds/reopening/ties, 120 policy hands, replay/source/hidden-information checks, historical save compatibility and exact hundredth-BB parsing.
- `npm run test:engine`: **68 tests / 8 files** passed (focused subset of the unit suite).
- `npm run build`: optimized Next.js production build passed; supplied data rebuilt identically.
- `npm run test:browser`: **74 checks passed** in production Chromium. Includes full real-data hands, custom raises, check/call/fold/all-in, result acknowledgement, mobile no-page-scroll, feedback dismissal, source loss/reload/retry, two-tab ownership, unsaved recovery/export, offline pack/cold starts, existing reviews/lessons, nav, accessibility scans, both chart palettes and the newer switch.
- Real-interface journeys: phone: 5 complete hands, 23 hero decisions, no uncaught errors; desktop: 5 complete hands, 22 hero decisions, no uncaught errors. These use the shipped range data, not fixture charts. Other deterministic browser tests intentionally use small fixtures for exact assertions.
- `git diff --check` passed. Direct comparison confirms the newer switch CSS/component, SimulatorTable, card faces, navy material CSS, RangeGrid/Legend and all dataset/public files are unchanged from latest `dfa701d`.

[Retained logs, screenshots and journey records](../verification/live-integration/README.md) document this run. The attachment's earlier counts are historical, not substituted for these checks.

## Test without updating the main app

Use the separate candidate ZIP/source folder; do not copy it over your current app folder. On Windows, extract to a local folder outside OneDrive (for example `C:\PokerTest\poker-live-test`). From that folder:

```bat
npm ci
npm run build
npm run start -- --port 3200
```

Open `http://localhost:3200`. Choose Play. Try a supported 2.5 BB opening raise and inspect the highlighted range; try a different legal raise size and inspect the ungraded explanation. Continue through calls/checks/folds/all-ins, acknowledge the result, and deal again. Reload mid-hand, resume, and retry a saved decision from Practice tools. Confirm the saved live hand is unchanged by the retry. Check the retained reference exercises and range viewer.

`3200` is a separate localhost origin. It has independent test history and does not alter your Vercel app. A localhost app on a Windows PC is not automatically accessible on an iPhone; Web Locks/offline features on a phone need a secure origin. A hosted preview requires a separate explicit deployment decision. No hosted preview was deployed during integration.
