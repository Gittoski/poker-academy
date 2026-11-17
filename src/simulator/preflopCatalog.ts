import type { RangeEntry } from '@/data/types'
import { ALL_HANDS } from '@/lib/hands'
import { positionsFor, type Position } from '@/lib/positions'
import { resolveActions } from '@/lib/range'
import { resolveRange } from '@/lib/resolve'
import { heroRaise, type Scenario } from '@/lib/scenarios'
import {
  actLive,
  newLiveHand,
  type LiveAction,
  type LiveConfig,
} from './liveEngine'

export const PREFLOP_SETUP = {
  format: 'cash',
  stack: 100,
  rangeType: 'pto',
  openSize: 2.5,
  players: 6,
} as const
export const PREFLOP_SCENARIOS: Scenario[] = [
  'open',
  'vs-raise',
  'vs-3bet',
  'vs-4bet',
  'vs-5bet',
]
export const PREFLOP_POSITIONS = positionsFor(6)
export interface PreflopContext {
  id: string
  scenario: Scenario
  hero: number
  villain?: number
}
export function preflopConfig(): LiveConfig {
  return {
    stacks: Array(6).fill(10000),
    button: 3,
    smallBlind: 50,
    bigBlind: 100,
  }
}
export const PREFLOP_CONTEXTS: readonly PreflopContext[] =
  PREFLOP_SCENARIOS.flatMap((scenario) =>
    PREFLOP_POSITIONS.flatMap<PreflopContext>((_position, hero) => {
      if (scenario === 'open')
        return hero === 5
          ? []
          : [{ id: `open:${PREFLOP_POSITIONS[hero]}`, scenario, hero }]
      const opener = scenario === 'vs-3bet' || scenario === 'vs-5bet'
      return PREFLOP_POSITIONS.flatMap((villainPosition, villain) =>
        (opener ? villain > hero : villain < hero)
          ? [
              {
                id: `${scenario}:${PREFLOP_POSITIONS[hero]}:${villainPosition}`,
                scenario,
                hero,
                villain,
              },
            ]
          : [],
      )
    }),
  )

/** Public scenario setup, not sampled cards or an assumed optimal action path.
 * Every setup is replayed through the same live integer-chip rules. */
export function preflopPrefix(context: PreflopContext): LiveAction[] {
  const stage = PREFLOP_SCENARIOS.indexOf(context.scenario)
  if (stage < 0 || (stage > 0 && context.villain === undefined))
    throw Error('Invalid preflop context')
  const raisers =
    stage === 0
      ? []
      : stage % 2 === 1
        ? [context.villain!, context.hero, context.villain!].slice(0, stage)
        : [
            context.hero,
            context.villain!,
            context.hero,
            context.villain!,
          ].slice(0, stage)
  let state = newLiveHand(preflopConfig(), () => 0.5, true)
  const actions: LiveAction[] = []
  const apply = (action: LiveAction) => {
    state = actLive(state, action)
    actions.push(action)
  }
  function foldUntil(actor: number) {
    let count = 0
    while (state.toAct !== actor) {
      if (state.toAct === null || count++ >= 6)
        throw Error('Unreachable preflop context')
      apply({ kind: 'fold' })
    }
  }
  raisers.forEach((actor, index) => {
    foldUntil(actor)
    const raise = heroRaise(
      PREFLOP_SCENARIOS[index],
      PREFLOP_SETUP,
      PREFLOP_POSITIONS[actor],
      index ? PREFLOP_POSITIONS[raisers[index - 1]] : undefined,
    )
    if (!raise) throw Error('Missing reference size')
    apply({ kind: 'raise', to: Math.round(raise.size * 100) })
  })
  foldUntil(context.hero)
  return actions
}

export function entryForPreflop(
  context: PreflopContext,
  entries: RangeEntry[],
): RangeEntry {
  const resolved = resolveRange(entries, {
    ...PREFLOP_SETUP,
    scenario: context.scenario,
    hero: PREFLOP_POSITIONS[context.hero],
    villain:
      context.villain === undefined
        ? undefined
        : PREFLOP_POSITIONS[context.villain],
  })
  if (
    !resolved ||
    !resolved.entry.rangeTypes.includes('pto') ||
    !(resolved.entry.formats ?? ['cash']).includes('cash')
  )
    throw Error(`Missing preflop chart: ${context.id}`)
  return resolved.entry
}

/** Fail closed for partial/corrupt sources; no silent reduced scenario catalog. */
export function auditPreflopCharts(entries: RangeEntry[]) {
  let handClasses = 0,
    mixedClasses = 0
  for (const context of PREFLOP_CONTEXTS) {
    const entry = entryForPreflop(context, entries),
      weights = resolveActions(entry.range)
    for (const hand of ALL_HANDS) {
      const values = Object.values(weights.get(hand.label) ?? {})
      if (
        values.length !== 3 ||
        values.some((v) => !Number.isFinite(v) || v < 0 || v > 1) ||
        Math.abs(values.reduce((a, b) => a + b, 0) - 1) > 1e-9
      )
        throw Error(`Invalid preflop weights: ${context.id} ${hand.label}`)
      handClasses++
      if (values.filter((v) => v > 0).length > 1) mixedClasses++
    }
  }
  return { contexts: PREFLOP_CONTEXTS.length, handClasses, mixedClasses }
}

export function preflopPosition(index: number): Position {
  return PREFLOP_POSITIONS[index]
}
