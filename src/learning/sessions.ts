import { newId } from './identity'
import type { Counts, SessionRecord } from './types'
export const SESSION_GAP_MS = 30 * 60 * 1000
export const emptyCounts = (): Counts => ({
  decisions: 0,
  hands: 0,
  match: 0,
  alternative: 0,
  outside: 0,
  ungraded: 0,
})
export function createSession(now: number): SessionRecord {
  return {
    version: 1,
    id: newId('session'),
    startedAt: now,
    lastActivityAt: now,
    endedAt: null,
    activeMs: 0,
    compacted: false,
    counts: {
      regular: emptyCounts(),
      adaptive: emptyCounts(),
      manual: emptyCounts(),
    },
  }
}
/** Called on player interaction, never on an NPC timer. Idle gaps don't count as active time. */
export function touchSession(
  session: SessionRecord,
  now: number,
): SessionRecord {
  const delta = Math.max(0, now - session.lastActivityAt)
  return {
    ...session,
    lastActivityAt: Math.max(now, session.lastActivityAt),
    activeMs:
      session.activeMs + (delta < SESSION_GAP_MS ? Math.min(delta, 60_000) : 0),
  }
}
export function needsSession(
  session: SessionRecord | null,
  now: number,
): boolean {
  return (
    !session ||
    session.endedAt !== null ||
    now - session.lastActivityAt >= SESSION_GAP_MS
  )
}
