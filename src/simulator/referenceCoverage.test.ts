import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import type { RangeEntry } from '@/data/types'
import {
  freshLiveDeal,
  appendLiveAction,
  practiceLiveDeal,
  decodeLiveSession,
  encodeLiveSession,
} from './liveSession'
import {
  liveReference,
  liveUngradedSummary,
  retryLiveReference,
} from './liveReference'
import { chooseLiveOpponent, observeLivePlayer } from './livePolicy'

const entries: RangeEntry[] = JSON.parse(
  readFileSync('public/ranges/Cash_100_PTO.json', 'utf8'),
)
const config = {
  stacks: Array(6).fill(10000),
  button: 3,
  smallBlind: 50,
  bigBlind: 100,
}

it('grades fresh actual-data opening choices in every non-BB position without changing the cards', () => {
  for (let hero = 0; hero < 5; hero++) {
    let d = freshLiveDeal(config, hero, 'balanced', 42)
    for (let i = 0; i < hero; i++)
      d = appendLiveAction(d, { kind: 'fold' }, d.actions.length)
    const s = practiceLiveDeal(d),
      cards = structuredClone(s.seats[hero].cards)
    const reference = liveReference(d, s, { kind: 'fold' }, entries)
    expect(reference.status).not.toBe('ungraded')
    expect(reference.chart).toBeDefined()
    expect(s.seats[hero].cards).toEqual(cards)
    const hiddenChanged = structuredClone(s)
    hiddenChanged.deck.reverse()
    hiddenChanged.seats.forEach((p, i) => {
      if (i !== hero)
        p.cards = [
          { rank: 'A', suit: 'h' },
          { rank: 'A', suit: 's' },
        ]
    })
    expect(liveReference(d, hiddenChanged, { kind: 'fold' }, entries)).toEqual(
      reference,
    )
  }
})

it('uses documented OOP 3bet and IP 4bet sizes to preserve genuine reference coverage', () => {
  let d = freshLiveDeal(config, 3, 'balanced', 42)
  for (const action of [
    { kind: 'fold' },
    { kind: 'fold' },
    { kind: 'fold' },
    { kind: 'raise', to: 250 },
  ] as const)
    d = appendLiveAction(d, action, d.actions.length)
  const s = practiceLiveDeal(d)
  expect(s.toAct).toBe(4) // SB faces BTN open.
  const reference = liveReference(d, s, { kind: 'fold' }, entries)
  expect(reference.raiseTo).toBe(1250)
  // A strong observed hand forces the existing heuristic's raise branch;
  // chart frequencies do not determine whether the opponent raises.
  const observation = {
    ...observeLivePlayer(s),
    cards: [
      { rank: 'A', suit: 's' },
      { rank: 'A', suit: 'h' },
    ] as import('@/lib/cards').HoleCards,
  }
  const action = chooseLiveOpponent(
    observation,
    'balanced',
    () => 0,
    reference.raiseTo,
  )
  expect(action).toEqual({ kind: 'raise', to: 1250 })
  expect(chooseLiveOpponent(observation, 'balanced', () => 0)).toEqual({
    kind: 'raise',
    to: 750,
  })
  const original = appendLiveAction(
    d,
    { kind: 'raise', to: 750 },
    d.actions.length,
  )
  const outsideSize = appendLiveAction(
    original,
    { kind: 'fold' },
    original.actions.length,
  )
  expect(
    liveReference(
      outsideSize,
      practiceLiveDeal(outsideSize),
      { kind: 'fold' },
      entries,
    ).reason,
  ).toBe('history-size')
  d = appendLiveAction(d, action, d.actions.length)
  d = appendLiveAction(d, { kind: 'fold' }, d.actions.length)
  const answer = liveReference(
    d,
    practiceLiveDeal(d),
    { kind: 'call' },
    entries,
  )
  expect(answer.status).not.toBe('ungraded')
  expect(answer.raiseTo).toBe(2500)
  d = appendLiveAction(d, { kind: 'call' }, d.actions.length, answer)
  expect(
    decodeLiveSession(
      encodeLiveSession({ version: 3, current: d, archive: [] }),
    ).current.feedback?.at(-1)?.reference,
  ).toEqual(answer)
})

it('does not use chart sizing to alter calls, folds or postflop action selection', () => {
  const d = freshLiveDeal(config, 0, 'balanced', 42)
  const o = observeLivePlayer(practiceLiveDeal(d))
  for (const roll of [0.6, 0.8, 0.99])
    expect(chooseLiveOpponent(o, 'balanced', () => roll, 250)).toEqual(
      chooseLiveOpponent(o, 'balanced', () => roll),
    )
  let flop = freshLiveDeal(config, 5, 'balanced', 42)
  for (let i = 0; i < 5; i++) flop = appendLiveAction(flop, { kind: 'call' }, i)
  flop = appendLiveAction(flop, { kind: 'check' }, 5)
  const postflop = observeLivePlayer(practiceLiveDeal(flop))
  for (const roll of [0, 0.5, 0.99])
    expect(chooseLiveOpponent(postflop, 'balanced', () => roll, 250)).toEqual(
      chooseLiveOpponent(postflop, 'balanced', () => roll),
    )
})

it('reports genuine reference gaps, keeps their explanation and never gives them a grade', () => {
  let d = freshLiveDeal(config, 5, 'loose', 42)
  for (let i = 0; i < 5; i++) d = appendLiveAction(d, { kind: 'call' }, i)
  const priorCallers = liveReference(
    d,
    practiceLiveDeal(d),
    { kind: 'check' },
    entries,
  )
  expect(priorCallers.reason).toBe('callers')
  expect(liveUngradedSummary(priorCallers)).toContain('Prior callers')
  d = appendLiveAction(d, { kind: 'check' }, 5)
  const s = practiceLiveDeal(d)
  expect(s.street).toBe('flop')
  const postflop = liveReference(d, s, { kind: 'check' }, entries)
  expect(postflop.reason).toBe('postflop')
  expect(postflop.status).toBe('ungraded')
  expect(postflop.chart).toBeUndefined()
  const changed = structuredClone(s)
  changed.seats.forEach((p, i) => {
    if (i !== s.toAct)
      p.cards = [
        { rank: 'A', suit: 'h' },
        { rank: 'A', suit: 's' },
      ]
  })
  changed.deck.reverse()
  expect(liveReference(d, changed, { kind: 'check' }, entries)).toEqual(
    postflop,
  )
  expect(retryLiveReference(postflop, { kind: 'check' }).reason).toBe(
    'postflop',
  )
  const legacy = { ...postflop }
  delete legacy.reason
  expect(retryLiveReference(legacy, { kind: 'check' }).reason).toBeUndefined()
  expect(
    liveUngradedSummary(retryLiveReference(legacy, { kind: 'check' })),
  ).toContain('open the explanation')
})
