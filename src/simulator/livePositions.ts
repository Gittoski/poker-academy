import type { GameMode } from '@/lib/gameModes'
import {
  freshLiveDeal,
  liveSeed,
  type LiveDeal,
  type OpponentStyle,
} from './liveSession'
import type { LiveConfig } from './liveEngine'
import type { Rng } from '@/lib/cards'

/** Choose a fresh training position without inspecting cards or results. */
export function randomLivePosition(
  players: number,
  previous?: number,
  random: Rng = () => liveSeed() / 4294967296,
): number {
  if (![6, 8, 9].includes(players)) throw Error('Unsupported table size')
  const candidates = Array.from({ length: players }, (_, i) => i).filter(
    (i) => i !== previous,
  )
  const roll = random()
  if (!Number.isFinite(roll) || roll < 0 || roll >= 1)
    throw Error('Invalid position random source')
  return candidates[Math.floor(roll * candidates.length)]
}

/** Store the actual seat separately from the preference used for the next deal. */
export function newPositionedDeal(
  config: LiveConfig,
  position: number | 'random',
  style: OpponentStyle,
  mode: GameMode,
  previous?: number,
  seed = liveSeed(),
  random?: Rng,
): LiveDeal {
  const hero =
    position === 'random'
      ? randomLivePosition(config.stacks.length, previous, random)
      : position
  const deal = freshLiveDeal(config, hero, style, seed, mode)
  return position === 'random' ? { ...deal, randomPosition: true } : deal
}

export function positionChoice(deal: LiveDeal): number {
  return deal.graded
    ? (deal.graded.seat ?? -1)
    : deal.randomPosition
      ? -1
      : deal.hero
}
