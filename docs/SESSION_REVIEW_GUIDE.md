# Sessions, mistakes and recurring practice

Open **Play** and use the navy header switch: off selects Full hands; on selects Preflop. Each mode keeps its saved live hand. A session starts automatically. Submit an answer as usual; saving happens before Continue. A full hand’s last decision now offers View hand result, followed by a persistent Hand complete screen and a separate Next hand action. The simulator header reports **Saving**, **Saved on this device**, or an explicit failure. No Save/End session action is required.

## Review without losing your hand

Return to **Home → All reviews** (or **Next practice → Revisit saved mistakes**). The live hand and its keyboard/timer controls pause.

- **Mistakes** groups choices with zero support in the applicable supplied reference. Open a group to see the original public state, cards, action frequencies, source version, your choice and the trainer's actual continuation. A scripted correction is not presented as the action you chose.
- **Sessions** separates regular, adaptive and manual practice, reference errors and supported alternatives. First recorded exposure and repeat counts are separate; random selection does not establish a never-before-seen problem.
- **Retry this decision** restores the exact saved checkpoint. **Play this hand** starts its original deal from preflop. Both record manual practice separately. **Return to live hand** restores the paused hand. Reload during manual practice returns to live play; submitted practice attempts remain saved.
- Optional reflections and pinned representatives stay with a mistake. A pin protects that actual attempt even after newer misses replace the recent examples.

Only public information available at the original decision is shown. Postflop retries do not reveal later board cards or a hidden opponent hand. If an original reference is unavailable or invalid, the attempt is read-only; newer data does not replace its answer.

## Adjust recurring practice

Open **Home → Settings → Recurring mistakes**. **Mix in my mistakes** controls insertion, not automatic saving. The slider runs from 2 to 20, default 10: approximately one review hand per N eligible completed hands. Changes take effect at the next deal, never by replacing a live hand.

An independent persisted scheduler chooses one unpredictable opportunity per N-hand block. Empty/incompatible/not-due pools use ordinary play; unused opportunities do not accumulate. Hands with no player decision and manual practice are excluded from this hand denominator. A failed-to-reach target earns no successful review.

Adaptive hands start at preflop. The review label appears only after the target answer. First returns use the exact missed situation; later returns can use a different covered example already encountered in play. Each example uses its own reference. Cosmetic suit changes do not count as a different exercise. With no related example, exact practice remains available.

Spacing is a learning heuristic: supported targeted answers gradually lengthen the interval. Three successes over at least two sessions can move a problem to maintenance, with a different covered example required when one is available. Six successes over at least three sessions can archive it with an occasional due check. Another reference error reactivates it. These states are not poker-strength or mastery ratings.

## Interpret feedback

- **Most-frequent reference match:** your action is tied for the largest supported frequency.
- **Supported alternative:** it has positive support, even if the displayed legacy percentage rounded down. It does not enter the mistake queue.
- **Outside this reference:** zero support in an applicable reference; automatically captured as a mistake.
- **Not classified:** unavailable or invalid reference; no invented verdict.

The existing frequency-drill score remains a separate measure of most-frequent-action agreement. It is not EV loss. Full hands still follow supplied scripts; this feature adds no solver branches or opponent model and does not establish universal GTO correctness.

## Sessions and storage

Reload resumes a compatible live hand. After 30 minutes of inactivity, an interrupted hand stays in its original session until its safe boundary, then the next deal starts a new session. NPC timers do not count as player activity. Clock rollback does not create negative active time.

History is local to this browser origin (address and port) on this device. PC and phone do not synchronize automatically. Under **Storage and backups**, export/import a JSON backup to transfer history. Importing a normal backup replaces local learning history only after confirmation and validation. Pending-recovery files merge idempotently instead. Clear-history also requires confirmation.

IndexedDB stores normalized records; immutable reference content is cached once per version. A bounded 512 KiB write-ahead buffer protects pending transitions. A small bounded in-memory recovery buffer supports export if storage fails. The browser can still deny, evict or lose storage; the app must report failures rather than promise a save. If a buffer is exhausted, it says new detail cannot be retained.

The initial soft budget is 20 MiB, up to 5,000 detailed attempts and roughly 100 recent sessions of detail. Unanswered abandoned/automatic hand detail is separately bounded. Older eligible whole-hand details are condensed; session totals, mistake counts, the active cursor and protected representatives remain. Pinned/unresolved data is preserved even if it fills the budget; further writes then need storage attention/export instead of silent deletion. The storage panel measures serialized learning records, not guaranteed browser quota.

Two tabs cannot independently own the same live simulator. Close the other playing tab, then retry loading. On supported secure origins a Web Lock coordinates ownership; a database lease fences every write. LAN HTTP uses BroadcastChannel coordination and the lease.

## Verification limits

Automated Chromium tests cover mobile-sized and desktop layouts, both trainer modes, saving/recovery, manual practice, adaptive return, source precision, retention, failure states, keyboard/focus, accessibility and reduced motion. They are not actual iPhone/Safari, VoiceOver or device-animation verification. Those device checks remain a release gate. Complete offline packs are available under Home Settings or Learn. Actual iPhone installation remains an open M03 device gate.
