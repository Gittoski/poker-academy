import { expect, it } from 'vitest'
import { allLiveDeals } from './liveModes'
import { actLive, newLiveHand } from './liveEngine'
import { appendLiveAction, decodeLiveSession, encodeLiveSession, practiceLiveDeal, replayLiveDeal, retryLiveDecision, seededLiveRandom, type LiveDeal, type LiveSession } from './liveSession'
import { liveReference } from './liveReference'
import { handOf } from '@/lib/cards'
import type { RangeEntry } from '@/data/types'
const config = { stacks: Array(6).fill(10000), button:3, smallBlind:50, bigBlind:100 }
const deal = (hero = 0): LiveDeal => ({ seed:42, hero, config, style:'balanced', actions:[] })
it('ends at the hero fold in either mode without recording any more action or exposing cards', () => {
  for (const mode of ['full-hands','preflop'] as const) {
    let d = { ...deal(5), mode }
    for (let i=0;i<5;i++) d = appendLiveAction(d,{kind:'call'},i) as typeof d
    d = appendLiveAction(d,{kind:'fold'},5) as typeof d
    const p = practiceLiveDeal(d)
    expect(p.heroFolded).toBe(true); expect(p.board).toEqual([]); expect(p.burns).toEqual([])
    expect(p.toAct).toBeNull(); expect(p.pots).toEqual([]); expect(p.payouts).toEqual(Array(6).fill(0))
    expect(() => appendLiveAction(d,{kind:'check'},6)).toThrow()
  }
})
it('ends a postflop learner fold on its exact visible board', () => {
  let d = deal(4)
  for (let i=0;i<6;i++) d=appendLiveAction(d,{kind:i===5?'check':'call'},i)
  const before=practiceLiveDeal(d)
  expect(before.street).toBe('flop'); expect(before.toAct).toBe(4)
  d=appendLiveAction(d,{kind:'fold'},6)
  const after=practiceLiveDeal(d)
  expect(after.heroFolded).toBe(true); expect(after.board).toEqual(before.board)
  expect(after.cursor).toBe(before.cursor); expect(after.pot).toBe(before.pot)
})
it('retains and validates old logs but presents them only up to the learner fold', () => {
  const d=deal()
  d.actions=[{kind:'fold'},{kind:'raise',to:10000},...Array(4).fill({kind:'call'})]
  expect(replayLiveDeal(d).board).toHaveLength(5)
  const loaded=decodeLiveSession(JSON.stringify({version:2,current:d,archive:[]}))
  expect(loaded.current.actions).toEqual(d.actions)
  expect(loaded.version).toBe(3)
  expect(practiceLiveDeal(loaded.current).board).toEqual([])
  expect(practiceLiveDeal(loaded.current).heroFolded).toBe(true)
})
it('retries the same spot, keeps the error once, and plays the newly chosen legal action', () => {
  const d=deal(), before=practiceLiveDeal(d)
  const entries:RangeEntry[]=[{id:'open',scenario:'open',rangeTypes:['pto'],formats:['cash'],hero:['LJ'],range:{raise:handOf(before.seats[0].cards).label}}]
  const wrong=liveReference(d,before,{kind:'fold'},entries)
  expect(wrong.status).toBe('outside')
  const saved:LiveSession={version:3,current:appendLiveAction(d,{kind:'fold'},0,wrong),archive:[]}
  const retry=retryLiveDecision(saved)
  expect(practiceLiveDeal(retry.current).seats).toEqual(before.seats)
  expect(retry.current.actions).toEqual([]); expect(retry.current.feedback).toEqual([])
  expect(retry.archive[0].attempt).toBe(true)
  expect(retry.archive[0].feedback![0].reference).toEqual(wrong)
  const action={kind:'raise' as const,to:250}
  const correct=liveReference(retry.current,practiceLiveDeal(retry.current),action,entries)
  retry.current=appendLiveAction(retry.current,action,0,correct)
  const restored=decodeLiveSession(encodeLiveSession(retry))
  expect(restored.current.actions).toEqual([action])
  expect(allLiveDeals(restored).flatMap(d=>d.feedback??[])).toHaveLength(2)
  expect(restored.current.feedback![0].reference.status).toBe('match')
  expect(practiceLiveDeal(restored.current).seats[0].folded).toBe(false)
})
it('keeps normal rules-engine fold behavior available outside learning focus', () => {
  let s=newLiveHand(config,seededLiveRandom(42))
  s=actLive(s,{kind:'fold'})
  expect(s.heroFolded).toBeUndefined(); expect(s.toAct).toBe(1)
})
