# Guided fundamentals

Open **Learn** next to Play and Ranges. The suggested path teaches pot odds, outs/draw probabilities, equity against hands/ranges, expected value, then bluff break-even/fold equity. Each lesson defines its terms, works an example and opens untimed practice. All topics stay accessible; the hand-ranking refresher is optional. Simulator free play remains available.

Answer a question to see its calculation, assumptions and reasoning. Correct answers turn green; incorrect choices turn rose, with the supported answer identified. Next question prefers examples not previously presented. Reload resumes the same question and saved answer. Optional 45-second practice unlocks after acknowledging the lesson and answering three unfamiliar untimed questions correctly across two question families. This is a learning heuristic, not a mastery certificate. Late correct answers remain mathematically correct; time is tracked separately.

## Practice from a simulator mistake

Open **Review mistakes**, then a saved decision. Supported contexts offer **Practice this skill**. A public call price supports pot-odds practice; a visible flush-draw structure supports draw-completion practice; river calls additionally link to range equity and EV. These are related skills, not a diagnosis that a chart deviation proves a mathematical misunderstanding. Preflop opening deviations retain their range-selection label and reference retry until dedicated preflop drills exist.

Practice generates independent examples, rather than revealing the saved hand's opponent cards. **Back to simulator** returns to the same saved live hand and configuration. Both old and new reviews work; new records also save their related skill tags. Learning errors and simulator errors remain separate views with their own accuracy definitions.

## What progress means

Learning progress shows total and first-exposure accuracy, errors by question family, recent incorrect answers with explanations, and untimed/timed results. A shuffled answer order or new random seed alone does not make an example unfamiliar. Presentation is recorded before answering; abandoning a shown question cannot make a later attempt count as fresh. A repeated exact question is labelled accordingly. Some equity benchmarks deliberately repeat; fresh-accuracy denominators exclude repeats. Fresh arithmetic parameters test transfer within the current question families, not comprehensive poker strength.

Learning uses a separate local IndexedDB database, without accounts. It retains 1,000 detailed answers, 20,000 exposure identities and aggregate topic/error counters. Older detail is compacted without resetting totals. Beyond the exposure cap, novelty is unknown and excluded from unfamiliar-question claims. An ancient pending submission older than retained detail is rejected rather than risking counting it twice. Recent errors show up to 20 retained attempts.

Use **Export learning progress** in Learning progress and the existing simulator export separately. Imports validate regenerated questions before replacing learning data. Learning imports do not replace simulator history. Failed writes show an error and preserve a bounded recovery journal when localStorage is available; pending answers can be retried/exported. If persistent storage is unavailable, the UI explicitly identifies temporary practice. Changing website address/port creates a different storage origin; export first. Browser clearing or eviction can remove local data.

## Offline use and phone installation

For an installed pack, run a production build (`npm run build`, then `npm start`) or serve that build over HTTPS. Open Learn → **Use offline on this device** → **Download offline pack**, while connected and with simulator tabs closed. Wait for **Available offline**. The pack contains app pages, compiled assets, lessons, all supplied chart JSON and supplied simulator hands. Generated exercises need no network.

HTTPS or localhost is required. A phone opening a PC's plain HTTP LAN address cannot install this service worker. Development mode is not a downloadable production release. A hosted HTTPS build would remove the PC requirement; no hosting has been published as part of this release. A project ZIP is not an iPhone app; Expo Go cannot run this Next.js app.

In Safari, use Share → Add to Home Screen after opening a hosted HTTPS version. Real iPhone/Safari installation, standalone storage, airplane-mode relaunch and VoiceOver **remain unverified**. Chromium offline tests establish browser behavior only. The pack can be evicted by the browser; keep progress backups.

The installed pack stays coherent and cache-first. To update, leave all simulator tabs, open Learn online and choose **Update offline pack**. Incomplete or checksum-invalid downloads preserve the prior complete pack. **Remove downloaded pack**, followed by **Reload online**, returns to the server build without deleting learning or simulator history. Status checks detect missing or corrupted cached assets. The production manifest reads `.next/static`, `.next/BUILD_ID` and `public`; deployments must include these files. Other hosting packaging has not been verified.
