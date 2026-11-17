import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import type { RangeEntry } from '@/data/types'
import { handOf } from '@/lib/cards'
import {
  appendLiveAction,
  decodeLiveSession,
  encodeLiveSession,
  freshLiveDeal,
  practiceLiveDeal,
  retryLiveDecision,
  type LiveSession,
} from './liveSession'
import { liveReference } from './liveReference'
import { legalLiveActions, assertLiveState } from './liveEngine'
import {
  PREFLOP_CONTEXTS,
  preflopConfig,
  entryForPreflop,
} from './preflopCatalog'
import {
  newGradedPreflop,
  gradedPreflopStatus,
  chooseGradedOpponent,
  upgradePreflop,
  switchGradedMode,
  retryGradedPreflop,
} from './gradedPreflop'
const entries: RangeEntry[] = JSON.parse(
  readFileSync('public/ranges/Cash_100_PTO.json', 'utf8'),
)
it('runs all scenario families with fresh cards, actual choices, graded prompts and honest boundaries', () => {
  let learner = 0,
    boundaries = 0,
    terminals = 0
  for (const context of PREFLOP_CONTEXTS)
    for (let seed = 1; seed <= 5; seed++) {
      let d = newGradedPreflop(entries, { context: context.id, seed }),
        steps = 0
      while (steps++ < 30) {
        const s = practiceLiveDeal(d)
        assertLiveState(s)
        expect(s.board).toEqual([])
        if (s.heroFolded || s.preflopComplete || s.street === 'complete') {
          terminals++
          break
        }
        const status = gradedPreflopStatus(d, entries)
        expect(status?.kind).not.toBe('problem')
        if (status?.kind === 'boundary') {
          boundaries++
          break
        }
        expect(status?.kind).toBe('decision')
        if (s.toAct === d.hero) {
          const ref = liveReference(d, s, { kind: 'fold' }, entries),
            legal = legalLiveActions(s)
          const action =
            seed % 3 === 0
              ? ({ kind: 'fold' } as const)
              : seed % 3 === 1 &&
                  ref.raiseTo !== undefined &&
                  legal.minRaiseTo !== null
                ? ({ kind: 'raise', to: ref.raiseTo } as const)
                : ({ kind: 'call' } as const)
          const answer = liveReference(d, s, action, entries)
          expect(answer.status).not.toBe('ungraded')
          d = appendLiveAction(d, action, d.actions.length, answer)
          learner++
        } else
          d = appendLiveAction(
            d,
            chooseGradedOpponent(d, entries),
            d.actions.length,
          )
      }
      expect(steps).toBeLessThan(30)
      const restored = decodeLiveSession(
        encodeLiveSession({ version: 4, current: d, archive: [] }),
      )
      expect(restored.current).toEqual(d)
    }
  expect(learner).toBeGreaterThanOrEqual(325)
  expect(boundaries + terminals).toBe(325)
  console.info(
    'Covered preflop sample:',
    JSON.stringify({
      hands: 325,
      learnerDecisions: learner,
      referenceBoundaries: boundaries,
      pokerTerminals: terminals,
    }),
  )
  expect(boundaries).toBeGreaterThan(0)
  expect(terminals).toBeGreaterThan(0)
}, 60000)
it('retains original reference answers and exact cards through live retry and reload', () => {
  const d = newGradedPreflop(entries, { context: 'vs-3bet:BTN:BB', seed: 42 }),
    s = practiceLiveDeal(d)
  const reference = liveReference(d, s, { kind: 'fold' }, entries)
  const answered = appendLiveAction(
    d,
    { kind: 'fold' },
    d.actions.length,
    reference,
  )
  const retry = retryLiveDecision({
    version: 4,
    current: answered,
    archive: [],
  })
  expect(retry.current.actions).toEqual(d.actions)
  expect(practiceLiveDeal(retry.current).seats[d.hero].cards).toEqual(
    s.seats[d.hero].cards,
  )
  expect(retry.archive[0].feedback?.[0].reference).toEqual(reference)
  expect(decodeLiveSession(encodeLiveSession(retry))).toEqual(retry)
})
it('preserves an incompatible old hand during explicit upgrade and parks Full hands exactly', () => {
  const old = freshLiveDeal(
    { stacks: Array(9).fill(5000), button: 6, smallBlind: 50, bigBlind: 100 },
    8,
    'loose',
    42,
    'preflop',
  )
  const full = freshLiveDeal(preflopConfig(), 2, 'tight', 19)
  const session: LiveSession = {
    version: 3,
    current: old,
    archive: [],
    parked: { 'full-hands': full },
  }
  const next = upgradePreflop(session, entries)
  expect(next.archive[0]).toEqual(old)
  expect(next.parked?.['full-hands']).toEqual(full)
  expect(next.current.config.stacks).toEqual(Array(6).fill(10000))
  expect(JSON.parse(encodeLiveSession(next)).version).toBe(4)
  expect(switchGradedMode(next, 'full-hands', entries).current).toEqual(full)
  expect(session.current).toEqual(old)
})
it('rejects corrupt profile metadata, source gaps, altered setup and missing learner grading', () => {
  const d = newGradedPreflop(entries, { context: 'vs-5bet:LJ:BB', seed: 42 })
  expect(() => newGradedPreflop([])).toThrow('Missing preflop chart')
  expect(() => newGradedPreflop(entries, { seat: 9 })).toThrow()
  expect(() => newGradedPreflop(entries, { seed: -1 })).toThrow()
  const pack: LiveSession = { version: 4, current: d, archive: [] }
  for (const mutate of [
    (p: LiveSession) => {
      p.current.graded!.context = 'bad'
    },
    (p: LiveSession) => {
      p.current.actions = []
    },
    (p: LiveSession) => {
      p.version = 3
    },
    (p: LiveSession) => {
      p.current.actions.push({ kind: 'call' })
    },
    (p: LiveSession) => {
      p.current.config.stacks[0] = 5000
    },
  ]) {
    const p = structuredClone(pack)
    mutate(p)
    expect(() => decodeLiveSession(JSON.stringify(p))).toThrow()
  }
  const s = practiceLiveDeal(d)
  expect(legalLiveActions(s).minRaiseTo).toBeNull()
  expect(liveReference(d, s, { kind: 'call' }, entries).status).not.toBe(
    'ungraded',
  )
})
it('does not condition context selection on strong cards or opponent private information', () => {
  const labels = new Set<string>()
  for (let seed = 0; seed < 100; seed++) {
    const d = newGradedPreflop(entries, { context: 'open:LJ', seed }),
      s = practiceLiveDeal(d)
    labels.add(handOf(s.seats[d.hero].cards).label)
    const answer = liveReference(d, s, { kind: 'fold' }, entries),
      changed = structuredClone(s)
    changed.deck.reverse()
    changed.seats.slice(1).forEach(
      (p) =>
        (p.cards = [
          { rank: 'A', suit: 'h' },
          { rank: 'A', suit: 's' },
        ]),
    )
    expect(liveReference(d, changed, { kind: 'fold' }, entries)).toEqual(answer)
  }
  expect(labels.size).toBeGreaterThan(40)
})

it('preserves multiple learner decisions once when retrying a later checkpoint', () => {
  let found = false
  for (let seed = 0; seed < 1000; seed++) {
    let d = newGradedPreflop(entries, { context: 'vs-3bet:BTN:BB', seed })
    let s = practiceLiveDeal(d),
      ref = liveReference(d, s, { kind: 'raise', to: 2500 }, entries)
    d = appendLiveAction(d, { kind: 'raise', to: 2500 }, d.actions.length, ref)
    const opponent = chooseGradedOpponent(d, entries)
    if (opponent.kind !== 'raise') continue
    d = appendLiveAction(d, opponent, d.actions.length)
    s = practiceLiveDeal(d)
    ref = liveReference(d, s, { kind: 'call' }, entries)
    d = appendLiveAction(d, { kind: 'call' }, d.actions.length, ref)
    const retried = retryGradedPreflop({ version: 4, current: d, archive: [] })
    expect(retried.current.feedback).toHaveLength(1)
    expect(retried.archive[0].feedback).toHaveLength(1)
    expect(retried.archive[0].actions).toEqual(d.actions)
    expect(decodeLiveSession(encodeLiveSession(retried))).toEqual(retried)
    found = true
    break
  }
  expect(found).toBe(true)
}, 30000)

it('refuses a stored opponent continuation after a declared caller boundary', () => {
  let d = newGradedPreflop(entries, { context: 'open:LJ', seed: 42 })
  const ref = liveReference(d, practiceLiveDeal(d), { kind: 'call' }, entries)
  d = appendLiveAction(d, { kind: 'call' }, d.actions.length, ref)
  expect(gradedPreflopStatus(d, entries)?.kind).toBe('boundary')
  d = appendLiveAction(d, { kind: 'fold' }, d.actions.length)
  expect(() =>
    decodeLiveSession(
      encodeLiveSession({ version: 4, current: d, archive: [] }),
    ),
  ).toThrow('outside covered preflop progression')
})

it('keeps lower-frequency supported alternatives and ties valid in a mixed source fixture', () => {
  const mixed = structuredClone(entries),
    context = PREFLOP_CONTEXTS.find((c) => c.id === 'open:LJ')!
  const d = newGradedPreflop(mixed, { context: context.id, seed: 42 }),
    state = practiceLiveDeal(d),
    hand = handOf(state.seats[d.hero].cards).label
  const entry = entryForPreflop(context, mixed)
  entry.range = { raise: `${hand}:0.7`, call: `${hand}:0.3` }
  const alternative = liveReference(d, state, { kind: 'call' }, mixed)
  expect(alternative.status).toBe('alternative')
  expect(alternative.frequency).toBe(0.3)
  const answered = appendLiveAction(
    d,
    { kind: 'call' },
    d.actions.length,
    alternative,
  )
  expect(
    decodeLiveSession(
      encodeLiveSession({ version: 4, current: answered, archive: [] }),
    ).current.feedback?.[0].reference,
  ).toEqual(alternative)
  entry.range = { raise: `${hand}:0.5`, call: `${hand}:0.5` }
  expect(liveReference(d, state, { kind: 'call' }, mixed).status).toBe('match')
  expect(
    liveReference(d, state, { kind: 'raise', to: 250 }, mixed).status,
  ).toBe('match')
})
