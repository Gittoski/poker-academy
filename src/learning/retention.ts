import type { DecisionRecord, LearningBackup } from './types'
import { MAX_ATTEMPTS, SOFT_BYTES } from './repository'
const bytes = (v: unknown) => new TextEncoder().encode(JSON.stringify(v)).length
/** Whole-hand compaction; historical counters remain independent of retained detail. Linear record sizing avoids repeated multi-megabyte serialization. */
export function compactBackup(
  input: LearningBackup,
  limit = MAX_ATTEMPTS,
  budget = SOFT_BYTES,
): {
  data: LearningBackup
  bytes: number
  protectedOverBudget: boolean
  removed: number
} {
  const data = structuredClone(input),
    protectedHands = new Set<string>(),
    byHand = new Map<string, DecisionRecord[]>()
  const decisionsById = new Map(data.decisions.map((d) => [d.id, d]))
  for (const d of data.decisions) {
    const group = byHand.get(d.handId) ?? []
    group.push(d)
    byHand.set(d.handId, group)
    if (d.pinned) protectedHands.add(d.handId)
  }
  for (const cursor of [data.meta.cursor, data.meta.resume])
    if (cursor) protectedHands.add(cursor.handId)
  for (const p of data.problems)
    for (const id of p.pinned ? p.examples : p.examples.slice(-1)) {
      const d = decisionsById.get(id)
      if (d) protectedHands.add(d.handId)
    }
  const recent = new Set(
    [...data.sessions]
      .sort((a, b) => b.startedAt - a.startedAt)
      .slice(0, 100)
      .map((s) => s.id),
  )
  const sourceRefs = new Map<string, number>(),
    sourceSizes = new Map(data.sources.map((s) => [s.id, bytes(s) + 1]))
  for (const h of data.hands)
    for (const id of [h.config.rangesId, h.scriptId])
      if (id) sourceRefs.set(id, (sourceRefs.get(id) ?? 0) + 1)
  data.sources = data.sources.filter((s) => sourceRefs.has(s.id))
  let size = bytes(data),
    count = data.decisions.length,
    emptyHands = data.hands.filter((h) => !byHand.get(h.id)?.length).length,
    removed = 0
  const deleted = new Set<string>(),
    condensedSessions = new Set<string>()
  for (const hand of [...data.hands].sort(
    (a, b) => a.createdAt - b.createdAt,
  )) {
    if (protectedHands.has(hand.id)) continue
    const attempts = byHand.get(hand.id) ?? []
    if (
      count <= limit &&
      size <= budget &&
      recent.has(hand.sessionId) &&
      !(attempts.length === 0 && emptyHands > 1000)
    )
      continue
    deleted.add(hand.id)
    condensedSessions.add(hand.sessionId)
    if (attempts.length === 0) emptyHands--
    count -= attempts.length
    removed += attempts.length
    size -= bytes(hand) + 1
    for (const a of attempts) size -= bytes(a) + 1
    for (const id of [hand.config.rangesId, hand.scriptId])
      if (id) {
        const n = (sourceRefs.get(id) ?? 1) - 1
        if (n > 0) sourceRefs.set(id, n)
        else {
          sourceRefs.delete(id)
          size -= sourceSizes.get(id) ?? 0
        }
      }
  }
  data.hands = data.hands.filter((h) => !deleted.has(h.id))
  data.decisions = data.decisions.filter((d) => !deleted.has(d.handId))
  data.sources = data.sources.filter((s) => sourceRefs.has(s.id))
  const kept = new Set(data.decisions.map((d) => d.id))
  for (const p of data.problems)
    p.examples = p.examples.filter((id) => kept.has(id))
  for (const s of data.sessions)
    if (condensedSessions.has(s.id)) s.compacted = true
  size = bytes(data)
  return { data, bytes: size, protectedOverBudget: size > budget, removed }
}
