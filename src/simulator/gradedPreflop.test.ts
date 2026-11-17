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
import { PREFLOP_CONTEXTS, preflopConfig } from './preflopCatalog'
import {
  newGradedPreflop,
  gradedPreflopStatus,
  chooseGradedOpponent,
  upgradePreflop,
  switchGradedMode,
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
