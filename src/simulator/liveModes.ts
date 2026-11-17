import type { GameMode } from '@/lib/gameModes'
import { freshLiveDeal, type LiveDeal, type LiveSession } from './liveSession'

export const modeOf = (deal: LiveDeal): GameMode => deal.mode ?? 'full-hands'
export const allLiveDeals = (s: LiveSession): LiveDeal[] => [
  ...s.archive,
  ...Object.values(s.parked ?? {}),
  s.current,
]
/** Park, don't archive or regrade an interrupted hand. One bounded slot per mode. */
export function switchLiveMode(
  session: LiveSession,
  next: GameMode,
): LiveSession {
  const previous = modeOf(session.current)
  if (previous === next) return session
  const parked = { ...session.parked }
  const target =
    parked[next] ??
    freshLiveDeal(
      session.current.config,
      session.current.hero,
      session.current.style,
      undefined,
      next,
    )
  delete parked[next]
  parked[previous] = session.current
  return { ...session, current: target, parked }
}
