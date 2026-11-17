import { fromSearchParams, toSetupSearchParams } from '@/lib/viewerState'
import { DEFAULT_GAME_MODE, isGameMode, type GameMode } from '@/lib/gameModes'
import { isPosition, positionsFor } from '@/lib/positions'
import type { TrainerSetup } from '@/lib/trainer'

export interface PlayPreferences {
  setup: TrainerSetup
  mode: GameMode
}
/** Matches the existing Full hands controller's fixed supported chart setup. */
export function normalizePreferences(p: PlayPreferences): PlayPreferences {
  if (p.mode !== 'full-hands') return p
  return {
    mode: p.mode,
    setup: {
      format: 'cash',
      stack: 100,
      rangeType: 'pto',
      openSize: 2.5,
      players: 6,
      ...(p.setup.seat && positionsFor(6).includes(p.setup.seat)
        ? { seat: p.setup.seat }
        : {}),
    },
  }
}
export function preferencesFrom(params: URLSearchParams): PlayPreferences {
  const { format, stack, rangeType, openSize, players } =
    fromSearchParams(params)
  const seat = params.get('seat')
  const mode = params.get('mode')
  return normalizePreferences({
    mode: isGameMode(mode) ? mode : DEFAULT_GAME_MODE,
    setup: {
      format,
      stack,
      rangeType,
      openSize,
      players,
      ...(isPosition(seat) && positionsFor(players).includes(seat)
        ? { seat }
        : {}),
    },
  })
}
export function playParams(p: PlayPreferences): URLSearchParams {
  const setup = normalizePreferences(p).setup
  const params = toSetupSearchParams(setup)
  params.set('mode', p.mode)
  if (setup.seat) params.set('seat', setup.seat)
  return params
}
export function playHref(p: PlayPreferences, review = false): string {
  const params = playParams(p)
  if (review) params.set('review', '1')
  return `/archive/play?${params}`
}
const KEY = 'poker-home-play-v1'
export const defaultPreferences = () => preferencesFrom(new URLSearchParams())
export function loadPreferences(): PlayPreferences | null {
  const value = localStorage.getItem(KEY)
  return value === null ? null : preferencesFrom(new URLSearchParams(value))
}
export function savePreferences(p: PlayPreferences) {
  localStorage.setItem(KEY, playParams(p).toString())
}
