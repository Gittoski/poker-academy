import { expect, it } from 'vitest'
import { newLiveHand, actLive, legalLiveActions, assertLiveState } from './liveEngine'
import { appendLiveAction, decodeLiveSession, encodeLiveSession, replayLiveDeal, seededLiveRandom, type LiveDeal, type LiveSession } from './liveSession'
import { chooseLiveOpponent, observeLivePlayer } from './livePolicy'
import { handOf } from '@/lib/cards'
import { liveReference, recoverLiveChart, retryLiveReference } from './liveReference'
import type { RangeEntry } from '@/data/types'
const config = { stacks: Array(6).fill(10000), button: 3, smallBlind: 50, bigBlind: 100 }
const deal = (): LiveDeal => ({ seed: 42, config, hero: 0, style: 'balanced', actions: [], feedback: [] })
const session = (): LiveSession => ({ version: 1, current: deal(), archive: [] })
function opening() {
  const d = deal(), s = replayLiveDeal(d)
  const entries: RangeEntry[] = [{ id: 'open-LJ', scenario: 'open', hero: ['LJ'], formats: ['cash'], players: [6], stacks: [100], rangeTypes: ['pto'], range: { raise: handOf(s.seats[0].cards).label } }]
  return { d, s, entries }
}
it('reconstructs the same deck, acting seat and ledger from seed and legal actions', () => {
  const initial = session()
  initial.current = appendLiveAction(initial.current, { kind: 'raise', to: 250 }, 0)
  initial.current = appendLiveAction(initial.current, { kind: 'call' }, 1)
  const restored = decodeLiveSession(encodeLiveSession(initial))
  expect(replayLiveDeal(restored.current)).toEqual(replayLiveDeal(initial.current))
  expect(encodeLiveSession(initial)).not.toContain('deck')
  expect(encodeLiveSession(initial)).not.toContain('cards')
})
it('rejects corrupt or incompatible saves and illegal stored transitions', () => {
  for (const mutate of [
    (s: LiveSession) => { s.version = 999 as 1 },
    (s: LiveSession) => { s.current.hero = 0.5 },
    (s: LiveSession) => { s.current.seed = -1 },
    (s: LiveSession) => { s.current.config = { ...config, button: 0 } },
    (s: LiveSession) => { s.current.actions = [{ kind: 'raise', to: 3 }] },
    (s: LiveSession) => { s.current.actions = [{ kind: 'check' }] },
  ]) {
    const s = structuredClone(session()); mutate(s)
    expect(() => decodeLiveSession(JSON.stringify(s))).toThrow()
  }
  expect(() => decodeLiveSession('not json')).toThrow()
})
it('duplicate/stale input cannot append a second action with the same revision', () => {
  const d = appendLiveAction(deal(), { kind: 'call' }, 0)
  expect(appendLiveAction(d, { kind: 'call' }, 0)).toBe(d)
  expect(d.actions).toHaveLength(1)
})
it('the chosen action changes the live continuation rather than a script correcting it', () => {
  const d = deal(), s = replayLiveDeal(d)
  const folded = actLive(s, { kind: 'fold' }), raised = actLive(s, { kind: 'raise', to: 250 })
  expect(folded.seats[0].folded).toBe(true)
  expect(raised.seats[0].folded).toBe(false)
  expect(raised.pot).toBeGreaterThan(folded.pot)
  expect(s.seats[0].folded).toBe(false)
})
it('opponent observation excludes other hole cards and future cards', () => {
  const s = newLiveHand(config, seededLiveRandom(12)), before = observeLivePlayer(s), changed = structuredClone(s)
  changed.deck.reverse()
  changed.seats[1].cards.reverse()
  changed.seats[2].cards = changed.seats[0].cards
  expect(observeLivePlayer(changed)).toEqual(before)
  expect(Object.keys(before).sort()).toEqual(['bet', 'bigBlind', 'board', 'cards', 'isSmallBlind', 'legal', 'pot', 'street'].sort())
  expect(chooseLiveOpponent(before, 'balanced', () => 0.3)).toEqual(chooseLiveOpponent(observeLivePlayer(changed), 'balanced', () => 0.3))
})
it('all three opponent styles generate legal actions and finish hands', () => {
  for (const style of ['tight', 'balanced', 'loose'] as const) for (let seed = 1; seed <= 40; seed++) {
    const rng = seededLiveRandom(seed)
    let s = newLiveHand(config, rng), steps = 0
    while (s.street !== 'complete' && steps++ < 400) {
      const action = chooseLiveOpponent(observeLivePlayer(s), style, rng)
      const l = legalLiveActions(s)
      if (action.kind === 'raise') expect(action.to).toBeGreaterThanOrEqual(l.minRaiseTo!)
      s = actLive(s, action); assertLiveState(s)
    }
    expect(s.street).toBe('complete')
  }
})
it('matches exact imported references while refusing unmatched sizing, stacks and unavailable data', () => {
  const { d, s, entries } = opening()
  const match = liveReference(d, s, { kind: 'raise', to: 250 }, entries)
  expect(match.status).toBe('match')
  expect(match.referenceHash).toMatch(/^[0-9a-f]{64}$/)
  expect(match.source).toContain('not independently verified')
  expect(liveReference(d, s, { kind: 'raise', to: 400 }, entries).status).toBe('ungraded')
  expect(liveReference(d, s, { kind: 'call' }, null).status).toBe('ungraded')
  const short = { ...d, config: { ...config, stacks: [5000, ...config.stacks.slice(1)] } }
  expect(liveReference(short, replayLiveDeal(short), { kind: 'fold' }, entries).status).toBe('ungraded')
  const limped = appendLiveAction(d, { kind: 'call' }, 0)
  expect(liveReference(limped, replayLiveDeal(limped), { kind: 'fold' }, entries).status).toBe('ungraded')
})
it('feedback survives reload and retry uses original frequencies without touching the live hand', () => {
  const { d, s, entries } = opening()
  const reference = liveReference(d, s, { kind: 'fold' }, entries)
  const saved = session(); saved.current = appendLiveAction(d, { kind: 'fold' }, 0, reference)
  const restored = decodeLiveSession(encodeLiveSession(saved))
  expect(restored.current.feedback![0].reference).toEqual(reference)
  const before = encodeLiveSession(restored)
  expect(retryLiveReference(restored.current.feedback![0].reference, { kind: 'raise', to: 250 }).status).toBe('match')
  expect(encodeLiveSession(restored)).toBe(before)
})
it('does not write oversized saves that the recovery decoder could not load', () => {
  const oversized = { ...session(), extra: 'x'.repeat(2_000_000) }
  expect(() => encodeLiveSession(oversized)).toThrow(/size limit/)
  expect(() => decodeLiveSession(JSON.stringify(oversized))).toThrow(/size/)
})

it('saves the full matching grid, highlights the original hand and survives source changes', () => {
  const { d, s, entries } = opening()
  const reference = liveReference(d, s, { kind: 'raise', to: 250 }, entries)
  const originalHash = reference.referenceHash
  expect(reference.chart?.hand).toBe(handOf(s.seats[0].cards).label)
  expect(reference.chart?.title).toBe('LJ Open')
  expect(reference.chart?.action).toBe('raise')
  entries[0].range.raise = ''
  expect(reference.chart?.entry.range.raise).not.toBe('')
  const pack = session(); pack.current = appendLiveAction(d, { kind: 'raise', to: 250 }, 0, reference)
  const restored = decodeLiveSession(encodeLiveSession(pack))
  expect(restored.current.feedback![0].reference.chart).toEqual(reference.chart)
  expect(restored.current.feedback![0].reference.referenceHash).toBe(originalHash)
  expect(recoverLiveChart(reference, restored.current, 0, null)).toEqual(reference.chart)
})
it('rejects corrupt saved grids rather than showing the wrong source, hand or action', () => {
  const { d, s, entries } = opening()
  const reference = liveReference(d, s, { kind: 'raise', to: 250 }, entries)
  const pack = session(); pack.current = appendLiveAction(d, { kind: 'raise', to: 250 }, 0, reference)
  for (const change of [
    (r: typeof reference) => { r.frequency = 0 },
    (r: typeof reference) => { r.status = 'outside' },
    (r: typeof reference) => { r.chart!.entry.range.raise = '' },
    (r: typeof reference) => { r.chart!.hand = r.chart!.hand === 'AA' ? 'KK' : 'AA' },
    (r: typeof reference) => { r.chart!.action = 'call' },
    (r: typeof reference) => { r.frequencies = { raise: 0.5, call: 0.5, fold: 0 } },
  ]) {
    const modified = structuredClone(pack); change(modified.current.feedback![0].reference)
    expect(() => decodeLiveSession(encodeLiveSession(modified))).toThrow(/range/)
  }
})
it('recovers an old grid only when the source entry hash and saved frequencies still match', () => {
  const { d, s, entries } = opening()
  const reference = liveReference(d, s, { kind: 'fold' }, entries)
  const expected = reference.chart
  delete reference.chart
  const played = appendLiveAction(d, { kind: 'fold' }, 0, reference)
  expect(recoverLiveChart(reference, played, 0, entries)).toEqual(expected)
  expect(recoverLiveChart(reference, played, 0, null)).toBeUndefined()
  entries[0].range.raise = ''
  expect(recoverLiveChart(reference, played, 0, entries)).toBeUndefined()
})
it('unsupported situations and retry sizes cannot display an unrelated grid', () => {
  const { d, s, entries } = opening()
  expect(liveReference(d, s, { kind: 'raise', to: 400 }, entries).chart).toBeUndefined()
  expect(liveReference(d, s, { kind: 'fold' }, null).chart).toBeUndefined()
  const reference = liveReference(d, s, { kind: 'fold' }, entries)
  expect(retryLiveReference(reference, { kind: 'raise', to: 400 }).chart).toBeUndefined()
  expect(retryLiveReference(reference, { kind: 'raise', to: 250 }).chart?.action).toBe('raise')
})

it('reference feedback ignores opponents’ private cards and the unrevealed deck', () => {
  const { d, s, entries } = opening()
  const original = liveReference(d, s, { kind: 'raise', to: 250 }, entries)
  const changed = structuredClone(s)
  changed.deck.reverse()
  changed.seats.slice(1).forEach(p => p.cards.reverse())
  expect(liveReference(d, changed, { kind: 'raise', to: 250 }, entries)).toEqual(original)
})
