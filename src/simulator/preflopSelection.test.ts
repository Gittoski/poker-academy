import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { RangeEntry } from '@/data/types'
import { handOf } from '@/lib/cards'
import { resolveActions } from '@/lib/range'
import { newLiveHand } from './liveEngine'
import {
  decodeLiveSession,
  encodeLiveSession,
  seededLiveRandom,
  type LiveDeal,
} from './liveSession'
import {
  entryForPreflop,
  PREFLOP_CONTEXTS,
  preflopConfig,
  preflopPrefix,
  type PreflopContext,
} from './preflopCatalog'
import { newGradedPreflop } from './gradedPreflop'
import { liveReference } from './liveReference'
import { MAX_PRACTICE_DRAWS, selectPreflopPractice } from './preflopSelection'
const entries: RangeEntry[] = JSON.parse(
  readFileSync('public/ranges/Cash_100_PTO.json', 'utf8'),
)
function source(seed = 9234) {
  const rng = seededLiveRandom(seed)
  return () => Math.floor(rng() * 4294967296)
}
function deal(selection: { context: PreflopContext; seed: number }): LiveDeal {
  return {
    mode: 'preflop',
    graded: { version: 1, context: selection.context.id },
    seed: selection.seed,
    hero: selection.context.hero,
    style: 'balanced',
    config: preflopConfig(),
    actions: preflopPrefix(selection.context),
    feedback: [],
  }
}
function label(d: LiveDeal) {
  return handOf(
    newLiveHand(d.config, seededLiveRandom(d.seed)).seats[d.hero].cards,
  ).label
}
describe('balanced preflop study selection', () => {
  it('reproducibly offers about 60% continuing hands and favors common situations without altering reference grades', () => {
    const random = seededLiveRandom(1234),
      seedSource = source(9234),
      history: LiveDeal[] = []
    const weights = new Map(
      PREFLOP_CONTEXTS.map((c) => [
        c.id,
        resolveActions(entryForPreflop(c, entries).range),
      ]),
    )
    let playable = 0,
      common = 0,
      maxDraws = 0,
      totalDraws = 0
    const classes = new Set<string>(),
      contexts = new Set<string>()
    for (let i = 0; i < 1200; i++) {
      let draws = 0
      const selected = selectPreflopPractice(entries, {
        random,
        seedSource: () => {
          draws++
          return seedSource()
        },
        recent: history,
      })
      const d = deal(selected),
        hand = label(d),
        w = weights.get(selected.context.id)!.get(hand)!
      if (w.raise > 0 || w.call > 0) playable++
      if (
        selected.context.scenario === 'open' ||
        selected.context.scenario === 'vs-raise'
      )
        common++
      if (history.length)
        expect(selected.context.id).not.toBe(history.at(-1)!.graded!.context)
      classes.add(hand)
      contexts.add(selected.context.id)
      history.push(d)
      if (history.length > 6) history.shift()
      maxDraws = Math.max(maxDraws, draws)
      totalDraws += draws
      expect(
        new Set(
          newLiveHand(d.config, seededLiveRandom(d.seed)).seats.flatMap((s) =>
            s.cards.map((c) => c.rank + c.suit),
          ),
        ).size,
      ).toBe(12)
    }
    expect(playable / 1200).toBeGreaterThan(0.54)
    expect(playable / 1200).toBeLessThan(0.66)
    expect(common / 1200).toBeGreaterThan(0.74)
    expect(common / 1200).toBeLessThan(0.86)
    expect(contexts.size).toBeGreaterThanOrEqual(50)
    expect(classes.size).toBeGreaterThan(90)
    expect(maxDraws).toBeLessThanOrEqual(MAX_PRACTICE_DRAWS)
    console.info(
      'Balanced preflop sample:',
      JSON.stringify({
        hands: 1200,
        playable,
        foldOnly: 1200 - playable,
        common,
        advanced: 1200 - common,
        contexts: contexts.size,
        handClasses: classes.size,
        maxDraws,
        averageDraws: totalDraws / 1200,
      }),
    )
  }, 120000)
  it('retains every context and both categories, including fixed-position practice', () => {
    for (const context of PREFLOP_CONTEXTS)
      for (const continuing of [true, false]) {
        let call = 0
        const rng = seededLiveRandom(772),
          seedSource = source(991)
        const selected = selectPreflopPractice(entries, {
          context: context.id,
          seat: context.hero,
          random: () => (call++ === 0 ? (continuing ? 0.1 : 0.9) : rng()),
          seedSource,
        })
        expect(selected.context.id).toBe(context.id)
        const d = deal(selected),
          w = resolveActions(entryForPreflop(context, entries).range).get(
            label(d),
          )!
        expect(w.raise > 0 || w.call > 0).toBe(continuing)
      }
  }, 30000)
  it('varies recent hands without treating retries as new exposures or mutating history', () => {
    const history: LiveDeal[] = [],
      random = seededLiveRandom(55),
      seedSource = source(99)
    for (let i = 0; i < 30; i++) {
      const d = deal(
        selectPreflopPractice(entries, {
          context: 'open:LJ',
          recent: history,
          random,
          seedSource,
        }),
      )
      expect(history.slice(-6).map(label)).not.toContain(label(d))
      history.push(d)
    }
    const original = structuredClone(history),
      options = {
        recent: history,
        random: seededLiveRandom(345),
        seedSource: source(678),
      }
    const a = selectPreflopPractice(entries, options)
    const b = selectPreflopPractice(entries, {
      recent: [...history, { ...history.at(-1)!, attempt: true }],
      random: seededLiveRandom(345),
      seedSource: source(678),
    })
    expect(a).toEqual(b)
    expect(history).toEqual(original)
  })
  it('bounds failed draws and refuses impossible categories instead of quietly offering folds', () => {
    const c = PREFLOP_CONTEXTS.find((c) => c.id === 'open:LJ')!,
      seed = 42
    const w = resolveActions(entryForPreflop(c, entries).range).get(
      label(deal({ context: c, seed })),
    )!
    let draws = 0
    expect(() =>
      selectPreflopPractice(entries, {
        context: c.id,
        random: () => (w.raise + w.call > 0 ? 0.9 : 0.1),
        seedSource: () => {
          draws++
          return seed
        },
      }),
    ).toThrow('Could not draw')
    expect(draws).toBe(MAX_PRACTICE_DRAWS)
    const allFold = entries.map((e) => ({ ...e, range: {} }))
    expect(() => selectPreflopPractice(allFold, { random: () => 0.1 })).toThrow(
      'No reference supports',
    )
    expect(() => selectPreflopPractice(entries, { random: () => 1 })).toThrow(
      'Invalid practice random',
    )
    expect(() =>
      selectPreflopPractice(entries, {
        random: () => 0.1,
        seedSource: () => -1,
      }),
    ).toThrow('Invalid practice deal seed')
  })
  it('uses the balanced factory for new hands while preserving explicit seeds, saves and answer privacy', () => {
    for (let i = 0; i < 12; i++) {
      const d = newGradedPreflop(entries)
      expect(Object.keys(d.graded!).sort()).toEqual(['context', 'version'])
      expect(
        decodeLiveSession(
          encodeLiveSession({ version: 4, current: d, archive: [] }),
        ).current,
      ).toEqual(d)
    }
    const fixture = newGradedPreflop(entries, { context: 'open:LJ', seed: 42 })
    expect(fixture.seed).toBe(42)
    expect(label(fixture)).toBe(
      handOf(newLiveHand(preflopConfig(), seededLiveRandom(42)).seats[0].cards)
        .label,
    )
    const context = PREFLOP_CONTEXTS.find((c) => c.id === 'open:LJ')!
    for (const continuing of [true, false]) {
      let calls = 0
      const selected = selectPreflopPractice(entries, {
        context: context.id,
        random: () => (calls++ === 0 ? (continuing ? 0.1 : 0.9) : 0.2),
        seedSource: source(144),
      })
      const d = deal(selected),
        state = newLiveHand(d.config, seededLiveRandom(d.seed)),
        answer = liveReference(d, state, { kind: 'fold' }, entries)
      expect(answer.status === 'outside').toBe(continuing)
    }
  })
  it('preserves common-family weighting in a fixed seat even when only one opening context exists', () => {
    const random = seededLiveRandom(123),
      seedSource = source(456),
      history: LiveDeal[] = []
    let opens = 0
    for (let i = 0; i < 160; i++) {
      const d = deal(
        selectPreflopPractice(entries, {
          seat: 0,
          recent: history,
          random,
          seedSource,
        }),
      )
      expect(d.hero).toBe(0)
      if (d.graded!.context === 'open:LJ') {
        opens++
        if (history.at(-1)?.graded!.context === 'open:LJ')
          expect(label(d)).not.toBe(label(history.at(-1)!))
      }
      history.push(d)
      if (history.length > 6) history.shift()
    }
    expect(opens / 160).toBeGreaterThan(0.6)
  })
})
