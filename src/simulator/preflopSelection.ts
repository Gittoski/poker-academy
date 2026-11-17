import type { RangeEntry } from '@/data/types'
import { handOf, type Rng } from '@/lib/cards'
import { resolveActions } from '@/lib/range'
import type { Scenario } from '@/lib/scenarios'
import { newLiveHand } from './liveEngine'
import { liveSeed, seededLiveRandom, type LiveDeal } from './liveSession'
import {
  entryForPreflop,
  PREFLOP_CONTEXTS,
  preflopConfig,
  type PreflopContext,
} from './preflopCatalog'

/** Educational sampling targets, not poker frequencies or strategy recommendations. */
export const PLAYABLE_SHARE = 0.6
export const PREFLOP_FAMILY_WEIGHTS: Record<Scenario, number> = {
  open: 40,
  'vs-raise': 40,
  'vs-3bet': 12,
  'vs-4bet': 5,
  'vs-5bet': 3,
}
export const MAX_PRACTICE_DRAWS = 4096
const HISTORY_WINDOW = 6
type Pool = {
  context: PreflopContext
  playable: Set<string>
  folds: Set<string>
}
export interface PreflopSelectionOptions {
  seat?: number
  context?: string
  recent?: readonly LiveDeal[]
  random?: Rng
  seedSource?: () => number
}

function ownHand(deal: Pick<LiveDeal, 'seed' | 'hero' | 'config'>): string {
  // Selection reads the learner's cards only, never opponent cards or later results.
  const state = newLiveHand(deal.config, seededLiveRandom(deal.seed), true)
  return handOf(state.seats[deal.hero].cards).label
}
function roll(rng: Rng): number {
  const value = rng()
  if (!Number.isFinite(value) || value < 0 || value >= 1)
    throw Error('Invalid practice random source')
  return value
}

/** A fresh legal shuffled deal, conditioned on an educational reference category.
 * No deck overrides, outcomes, opponent cards or strategy frequencies are changed.
 * Returned data deliberately omits the requested category so it cannot become a hint. */
export function selectPreflopPractice(
  entries: RangeEntry[],
  options: PreflopSelectionOptions = {},
) {
  const random = options.random ?? (() => liveSeed() / 4294967296)
  const seedSource = options.seedSource ?? liveSeed
  const continuing = roll(random) < PLAYABLE_SHARE
  const pools: Pool[] = PREFLOP_CONTEXTS.filter(
    (c) =>
      (options.seat === undefined || c.hero === options.seat) &&
      (!options.context || c.id === options.context),
  )
    .map((context) => {
      const weights = resolveActions(entryForPreflop(context, entries).range)
      const playable = new Set<string>(),
        folds = new Set<string>()
      for (const [label, actions] of weights) {
        if (actions.raise > 0 || actions.call > 0) playable.add(label)
        else if (actions.fold > 0) folds.add(label)
      }
      return { context, playable, folds }
    })
    .filter((p) => (continuing ? p.playable : p.folds).size > 0)
  if (!pools.length)
    throw Error(
      'No reference supports the requested practice category. Your current hand is kept.',
    )

  const history = (options.recent ?? [])
    .filter((d) => d.graded && !d.attempt)
    .slice(-HISTORY_WINDOW)
    .map((d) => ({
      context: d.graded!.context,
      hand: ownHand(d),
      seed: d.seed,
    }))
  const last = history.at(-1)
  // Choose the study family first. Removing a sole opening context before this
  // draw would over-weight advanced spots for fixed-position practice.
  const families = [...new Set(pools.map((p) => p.context.scenario))]
  const total = families.reduce(
    (sum, family) => sum + PREFLOP_FAMILY_WEIGHTS[family],
    0,
  )
  let familyRoll = roll(random) * total
  const family =
    families.find((f) => (familyRoll -= PREFLOP_FAMILY_WEIGHTS[f]) < 0) ??
    families.at(-1)!
  const available = pools.filter((p) => p.context.scenario === family)
  const different = available.filter((p) => p.context.id !== last?.context)
  const familyPools =
    !options.context && different.length ? different : available
  const pool = familyPools[Math.floor(roll(random) * familyPools.length)]
  const fullBucket = continuing ? pool.playable : pool.folds
  const repeated = new Set(
    history.filter((h) => h.context === pool.context.id).map((h) => h.hand),
  )
  const varied = new Set(
    [...fullBucket].filter((h) => h !== last?.hand && !repeated.has(h)),
  )
  // Very narrow ranges may have only one class; never invent an alternative.
  const bucket = varied.size ? varied : fullBucket
  const tried = new Set<number>()
  for (let draw = 0; draw < MAX_PRACTICE_DRAWS; draw++) {
    const seed = seedSource()
    if (!Number.isInteger(seed) || seed < 0 || seed > 4294967295)
      throw Error('Invalid practice deal seed')
    if (tried.has(seed) || history.some((h) => h.seed === seed)) continue
    tried.add(seed)
    const label = ownHand({
      seed,
      hero: pool.context.hero,
      config: preflopConfig(),
    })
    if (bucket.has(label)) return { context: pool.context, seed }
  }
  throw Error(
    'Could not draw a fresh matching practice hand. Try again; your current hand is kept.',
  )
}
