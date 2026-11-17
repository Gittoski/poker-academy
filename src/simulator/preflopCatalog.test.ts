import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import type { RangeEntry } from '@/data/types'
import { ALL_HANDS } from '@/lib/hands'
import { handOf } from '@/lib/cards'
import { resolveActions } from '@/lib/range'
import { legalLiveActions } from './liveEngine'
import { liveReference } from './liveReference'
import {
  practiceLiveDeal,
  seededLiveRandom,
  type LiveDeal,
} from './liveSession'
import { newLiveHand } from './liveEngine'
import {
  auditPreflopCharts,
  entryForPreflop,
  PREFLOP_CONTEXTS,
  preflopConfig,
  preflopPrefix,
} from './preflopCatalog'

const entries: RangeEntry[] = JSON.parse(
  readFileSync('public/ranges/Cash_100_PTO.json', 'utf8'),
)
it('audits every declared six-max reference context and all 10,985 hand classes', () => {
  expect(auditPreflopCharts(entries)).toEqual({
    contexts: 65,
    handClasses: 10985,
    mixedClasses: 0,
  })
  expect(new Set(PREFLOP_CONTEXTS.map((c) => c.id)).size).toBe(65)
  expect(() => auditPreflopCharts([])).toThrow('Missing preflop chart')
})

it('replays all 65 legal contexts and grades every hand class and applicable action from actual shuffled deals', () => {
  // Find genuine seeds rather than mutating hole cards or trusting fake game states.
  const seeds = Array.from({ length: 6 }, () => new Map<string, number>())
  for (let seed = 0; seed < 100000 && seeds.some((m) => m.size < 169); seed++) {
    const s = newLiveHand(preflopConfig(), seededLiveRandom(seed))
    s.seats.forEach((seat, i) => {
      const label = handOf(seat.cards).label
      if (!seeds[i].has(label)) seeds[i].set(label, seed)
    })
  }
  expect(seeds.map((m) => m.size)).toEqual(Array(6).fill(169))
  let tested = 0
  for (const context of PREFLOP_CONTEXTS) {
    const entry = entryForPreflop(context, entries),
      weights = resolveActions(entry.range)
    const actions = preflopPrefix(context)
    for (const hand of ALL_HANDS) {
      const d: LiveDeal = {
        seed: seeds[context.hero].get(hand.label)!,
        mode: 'preflop',
        config: preflopConfig(),
        hero: context.hero,
        style: 'balanced',
        actions,
      }
      const state = practiceLiveDeal(d),
        legal = legalLiveActions(state)
      expect(state.toAct).toBe(context.hero)
      expect(state.board).toEqual([])
      expect(handOf(state.seats[context.hero].cards).label).toBe(hand.label)
      const initial = liveReference(d, state, { kind: 'fold' }, entries)
      const options = [
        { kind: 'fold' } as const,
        ...(legal.call ? [{ kind: 'call' } as const] : []),
        ...(initial.raiseTo !== undefined && legal.minRaiseTo !== null
          ? [{ kind: 'raise', to: initial.raiseTo } as const]
          : []),
      ]
      for (const action of options) {
        const answer = liveReference(d, state, action, entries),
          frequency = weights.get(hand.label)![action.kind]
        expect(answer.entryId).toBe(entry.id)
        expect(answer.chart?.hand).toBe(hand.label)
        expect(answer.frequency).toBe(frequency)
        expect(answer.status).toBe(
          frequency > 0
            ? frequency === Math.max(...Object.values(weights.get(hand.label)!))
              ? 'match'
              : 'alternative'
            : 'outside',
        )
      }
      tested++
    }
  }
  expect(tested).toBe(10985)
}, 120000)

it('retains independently readable source examples rather than claiming solver EVs', () => {
  const lj = entryForPreflop(
    PREFLOP_CONTEXTS.find((c) => c.id === 'open:LJ')!,
    entries,
  )
  const weights = resolveActions(lj.range)
  expect(weights.get('AA')).toEqual({ raise: 1, call: 0, fold: 0 })
  expect(weights.get('72o')).toEqual({ raise: 0, call: 0, fold: 1 })
})
