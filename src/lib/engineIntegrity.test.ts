import { expect, it } from 'vitest'
import { act, decisionFor, startHand, stopWithoutReference } from './handSim'
import { packHand, unpackHand } from '@/learning/checkpoints'
import { createSource } from '@/learning/sources'
import type { TrainerSetup } from './trainer'
import { gradeIndex } from './trainer'
import type { RangeEntry } from '@/data/types'

it('an SB limp stops without awarding a walk and survives session recovery', () => {
  const setup: TrainerSetup = { format: 'mtt', stack: 100, rangeType: 'pto', openSize: 2.5, players: 6 }
  const entries: RangeEntry[] = [{ id: 'limp', scenario: 'open', formats: ['mtt'], rangeTypes: ['pto'], hero: ['SB'], range: { call: '22+' } }]
  let hand = startHand(setup, () => 0.37, 'BB')
  for (let i = 0; i < 4; i++) hand = act(hand, setup, 'fold', null)
  hand = act(hand, setup, 'call', decisionFor(hand, setup, entries))
  expect(hand.ended?.kind).toBe('unsupported')
  expect(hand.ended?.message).toContain('No winner is assigned')
  expect(hand.seats.filter(s => !s.folded).map(s => s.position)).toEqual(['SB', 'BB'])
  expect(hand.seats.slice(-2).map(s => s.committed)).toEqual([1, 1])
  const source = createSource('ranges', 'limp-test', entries, 100)
  expect(unpackHand(packHand(hand, source.id), source)).toEqual(hand)
})

it('keeps all-fold walks valid for every supported table size', () => {
  for (const players of [6, 8, 9] as const) {
    const setup: TrainerSetup = { format: 'cash', stack: 100, rangeType: 'pto', openSize: 2.5, players }
    let hand = startHand(setup, () => 0.37, 'BB')
    for (let i = 0; i < players - 1; i++) hand = act(hand, setup, 'fold', null)
    expect(hand.ended?.kind).toBe('walk')
  }
})

it('scores tied reference maxima equally without rewarding zero or invalid actions', () => {
  expect(gradeIndex([50, 50, 0], 0)).toBe('correct')
  expect(gradeIndex([50, 50, 0], 1)).toBe('correct')
  expect(gradeIndex([70, 30, 0], 1)).toBe('partial')
  for (const guess of [-1, 0.5, 3]) expect(gradeIndex([50, 50, 0], guess)).toBe('wrong')
  expect(gradeIndex([0, 0], 0)).toBe('wrong')
})


it('missing charts stop a reference exercise without folding, spending chips or leaking a winner', () => {
  for (const hero of ['LJ', 'BB'] as const) {
    const setup: TrainerSetup = { format: 'cash', stack: 100, rangeType: 'pto', openSize: 2.5, players: 6 }
    const hand = startHand(setup, () => 0.37, hero)
    const before = structuredClone(hand)
    expect(decisionFor(hand, setup, [])).toBeNull()
    const stopped = stopWithoutReference(hand)
    expect(hand).toEqual(before)
    expect(stopped.seats).toEqual(hand.seats)
    expect(stopped.ended?.kind).toBe('unsupported')
    expect(stopped.ended?.message).toContain('No action was taken')
    expect(stopped.toAct).toBeNull()
    expect(stopWithoutReference(stopped)).toBe(stopped)
    const source = createSource('ranges', 'unrelated', [{ id: 'unrelated', scenario: 'open', rangeTypes: ['pto'], hero: ['SB'], range: { raise: 'AA' } }], 100)
    expect(unpackHand(packHand(stopped, source.id), source)).toEqual(stopped)
  }
})

it('a cold re-raise remains a live decision until coverage explicitly stops the exercise', () => {
  const setup: TrainerSetup = { format: 'cash', stack: 100, rangeType: 'pto', openSize: 2.5, players: 6 }
  let hand = startHand(setup, () => 0.37, 'BB')
  // Explicit actions create LJ open, HJ three-bet; CO is still entitled to act.
  hand = act(hand, setup, 'raise', null)
  hand = act(hand, setup, 'raise', null)
  expect(hand.seats[hand.toAct!].position).toBe('CO')
  expect(decisionFor(hand, setup, [])).toBeNull()
  const stopped = stopWithoutReference(hand)
  expect(stopped.seats[2].folded).toBe(false)
  expect(stopped.ended?.message).toContain('cold re-raise')
  expect(stopped.seats.map(s => s.committed)).toEqual(hand.seats.map(s => s.committed))
})

it('does not substitute heads-up opening charts for limped or multiway decisions', () => {
  const setup: TrainerSetup = { format: 'cash', stack: 100, rangeType: 'pto', openSize: 2.5, players: 6 }
  const entries: RangeEntry[] = [
    { id: 'open', scenario: 'open', rangeTypes: ['pto'], hero: ['LJ', 'HJ', 'CO'], range: { raise: 'AA' } },
    { id: 'respond', scenario: 'vs-raise', rangeTypes: ['pto'], hero: ['HJ', 'CO'], villain: ['LJ'], range: { call: 'AA' } },
  ]
  let limped = startHand(setup, () => 0.37, 'BB')
  limped = act(limped, setup, 'call', null)
  expect(decisionFor(limped, setup, entries)).toBeNull()
  let multiway = startHand(setup, () => 0.37, 'BB')
  multiway = act(multiway, setup, 'raise', decisionFor(multiway, setup, entries))
  multiway = act(multiway, setup, 'call', decisionFor(multiway, setup, entries))
  expect(multiway.seats[multiway.toAct!].position).toBe('CO')
  expect(decisionFor(multiway, setup, entries)).toBeNull()
  expect(stopWithoutReference(multiway).ended?.message).toContain('prior limps or callers')
})
