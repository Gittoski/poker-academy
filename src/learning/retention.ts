import type { LearningBackup } from './types'
import { MAX_ATTEMPTS, SOFT_BYTES } from './repository'
const bytes = (v: unknown) => new TextEncoder().encode(JSON.stringify(v)).length
/** Deterministic whole-hand compaction. Counters were aggregated at write time and never recomputed from truncated detail. */
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
  const data = structuredClone(input)
  const protectedHands = new Set<string>()
  for (const cursor of [data.meta.cursor, data.meta.resume])
    if (cursor) protectedHands.add(cursor.handId)
  for (const p of data.problems) {
    const ids = p.pinned ? p.examples : p.examples.slice(-1)
    for (const id of ids) {
      const d = data.decisions.find((d) => d.id === id)
      if (d) protectedHands.add(d.handId)
    }
  }
  for (const d of data.decisions) if (d.pinned) protectedHands.add(d.handId)
  const recent = new Set(
    [...data.sessions]
      .sort((a, b) => b.startedAt - a.startedAt)
      .slice(0, 100)
      .map((s) => s.id),
  )
  const ordered = [...data.hands].sort((a, b) => a.createdAt - b.createdAt)
  let removed = 0
  const gc = () => {
    const kept = new Set(data.decisions.map((d) => d.id))
    for (const p of data.problems)
      p.examples = p.examples.filter((id) => kept.has(id))
    const sources = new Set<string>()
    for (const h of data.hands) {
      sources.add(h.config.rangesId)
      if (h.scriptId) sources.add(h.scriptId)
    }
    for (const d of data.decisions) sources.add(d.config.rangesId)
    data.sources = data.sources.filter((s) => sources.has(s.id))
  }
  gc()
  let size = bytes(data)
  for (const hand of ordered) {
    if (protectedHands.has(hand.id)) continue
    if (
      data.decisions.length <= limit &&
      data.hands.length <= 1000 &&
      size <= budget &&
      recent.has(hand.sessionId)
    )
      continue
    data.hands = data.hands.filter((h) => h.id !== hand.id)
    const count = data.decisions.length
    data.decisions = data.decisions.filter((d) => d.handId !== hand.id)
    removed += count - data.decisions.length
    const session = data.sessions.find((s) => s.id === hand.sessionId)
    if (session) session.compacted = true
    gc()
    size = bytes(data)
  }
  return { data, bytes: size, protectedOverBudget: size > budget, removed }
}
