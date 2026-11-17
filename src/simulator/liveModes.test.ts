import { expect, it } from 'vitest'
import { actLive, assertLiveState, legalLiveActions, newLiveHand } from './liveEngine'
import { appendLiveAction, decodeLiveSession, encodeLiveSession, freshLiveDeal, replayLiveDeal, seededLiveRandom, type LiveSession } from './liveSession'
import { allLiveDeals, modeOf, switchLiveMode } from './liveModes'

const config = { stacks: Array(6).fill(10000), button: 3, smallBlind: 50, bigBlind: 100 }
const session = (): LiveSession => ({ version: 1, current: freshLiveDeal(config, 0, 'balanced', 42), archive: [] })
it('uses the same shuffled cards and legal choices in either mode', () => {
  const full = newLiveHand(config, seededLiveRandom(42))
  const pre = newLiveHand(config, seededLiveRandom(42), true)
  expect(pre.deck).toEqual(full.deck)
  expect(pre.seats).toEqual(full.seats)
  expect(legalLiveActions(pre)).toEqual(legalLiveActions(full))
  const called = actLive(pre, { kind: 'call' })
  const folded = actLive(pre, { kind: 'fold' })
  expect(called.seats[0].committed).toBe(100)
  expect(folded.seats[0].folded).toBe(true)
})
it('stops after the BB option without drawing a flop or awarding a winner', () => {
  let pre = newLiveHand(config, seededLiveRandom(42), true)
  let full = newLiveHand(config, seededLiveRandom(42))
  for (let i = 0; i < 6; i++) {
    const action = { kind: i === 5 ? 'check' : 'call' } as const
    pre = actLive(pre, action); full = actLive(full, action)
  }
  expect(pre.preflopComplete).toBe(true)
  expect(pre.street).toBe('preflop')
  expect(pre.board).toEqual([]); expect(pre.burns).toEqual([])
  expect(pre.cursor).toBe(12); expect(pre.toAct).toBeNull()
  expect(pre.pot).toBe(600); expect(pre.payouts).toEqual(Array(6).fill(0))
  expect(pre.pots).toEqual([])
  expect(legalLiveActions(pre).fold).toBe(false)
  expect(() => actLive(pre, { kind: 'check' })).toThrow()
  expect(full.street).toBe('flop'); expect(full.board).toHaveLength(3)
  assertLiveState(pre); assertLiveState(full)
})
it('leaves preflop all-ins unsettled without runout, while full hands still settle', () => {
  let pre = newLiveHand(config, seededLiveRandom(42), true)
  let full = newLiveHand(config, seededLiveRandom(42))
  for (let i = 0; i < 6; i++) {
    const action = i === 0 ? { kind: 'raise' as const, to: 10000 } : { kind: 'call' as const }
    pre = actLive(pre, action); full = actLive(full, action)
  }
  expect(pre.preflopComplete).toBe(true)
  expect(pre.board).toEqual([]); expect(pre.pots).toEqual([])
  expect(pre.pot).toBe(60000)
  expect(pre.payouts).toEqual(Array(6).fill(0))
  expect(full.street).toBe('complete'); expect(full.board).toHaveLength(5)
  expect(full.payouts.reduce((a,b) => a+b, 0)).toBe(60000)
  assertLiveState(pre); assertLiveState(full)
})
it('still awards a real uncontested preflop pot when everyone folds', () => {
  let s = newLiveHand(config, seededLiveRandom(42), true)
  for (let i = 0; i < 5; i++) s = actLive(s, { kind: 'fold' })
  expect(s.street).toBe('complete'); expect(s.preflopComplete).toBeUndefined()
  expect(s.board).toEqual([]); expect(s.pots[0].winners).toEqual([5])
  assertLiveState(s)
})
it('parks and resumes exact hands, settings, actions and feedback across reloads', () => {
  const start = session()
  start.current = appendLiveAction(start.current, { kind: 'call' }, 0)
  const full = structuredClone(start.current)
  let s = switchLiveMode(start, 'preflop')
  expect(s.parked?.['full-hands']).toEqual(full)
  s.current = appendLiveAction(s.current, { kind: 'raise', to: 250 }, 0)
  const pre = structuredClone(s.current)
  s = decodeLiveSession(encodeLiveSession(s))
  s = switchLiveMode(s, 'full-hands')
  expect(s.current).toEqual(full); expect(s.parked?.preflop).toEqual(pre)
  expect(allLiveDeals(s)).toHaveLength(2)
  s = switchLiveMode(decodeLiveSession(encodeLiveSession(s)), 'preflop')
  expect(s.current).toEqual(pre); expect(s.archive).toEqual([])
  expect(encodeLiveSession(s)).not.toContain('deck')
})
it('accepts old full-hand saves without mode fields and rejects corrupt parked slots', () => {
  const old = session(); delete old.current.mode
  const migrated = decodeLiveSession(JSON.stringify(old))
  expect(migrated.version).toBe(3)
  expect(migrated.current).toEqual(old.current)
  expect(JSON.parse(encodeLiveSession(old)).version).toBe(3)
  expect(old.version).toBe(1)
  expect(modeOf(migrated.current)).toBe('full-hands')
  const parked = switchLiveMode(old, 'preflop')
  for (const corrupt of [
    { ...parked, parked: { preflop: parked.current } },
    { ...parked, parked: { nope: old.current } },
    { ...parked, parked: { 'full-hands': { ...old.current, mode: 'preflop' } } },
    { ...old, current: { ...old.current, mode: 'bad' } },
  ]) expect(() => decodeLiveSession(JSON.stringify(corrupt))).toThrow()
})
it('keeps a completed preflop boundary on reload without accepting postflop actions', () => {
  const s = switchLiveMode(session(), 'preflop')
  for (let i = 0; i < 6; i++) s.current = appendLiveAction(s.current, { kind: i === 5 ? 'check' : 'call' }, i)
  const loaded = decodeLiveSession(encodeLiveSession(s))
  expect(replayLiveDeal(loaded.current).preflopComplete).toBe(true)
  expect(() => appendLiveAction(loaded.current, { kind: 'check' }, 6)).toThrow()
})
