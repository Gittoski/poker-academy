import { expect, it } from 'vitest'
import {
  potOdds,
  bluffThreshold,
  nextCardProbability,
  byRiverProbability,
  callEV,
  bluffEV,
} from './math'
import { best, five, compare, deck } from './evaluator'
import { cards, exactEquity } from './equity'
it('reuses pot odds with the call counted exactly once and terminal EV algebra', () => {
  expect(potOdds(60, 20)).toBe(0.25)
  expect(potOdds(150, 50)).toBe(0.25)
  expect(callEV(150, 50, 0.25)).toBe(0)
  expect(callEV(60, 20, 0.5)).toBe(20)
  for (const [p, b] of [
    [100, 50],
    [80, 80],
    [40, 100],
  ])
    expect(bluffEV(p, b, bluffThreshold(p, b))).toBeCloseTo(0, 12)
  for (const f of [potOdds, bluffThreshold])
    for (const pair of [
      [0, 0],
      [-1, 2],
      [NaN, 2],
      [Infinity, 1],
      [1, -1],
    ])
      expect(() => f(pair[0], pair[1])).toThrow()
  expect(() => callEV(100, 20, 1.1)).toThrow()
})
it('distinguishes one and two cards and validates the fixed-out model', () => {
  expect(nextCardProbability(9, 47)).toBe(9 / 47)
  expect(nextCardProbability(9, 46)).toBe(9 / 46)
  expect(byRiverProbability(9, 47)).toBeCloseTo(1 - (38 * 37) / (47 * 46), 14)
  expect(byRiverProbability(47, 47)).toBe(1)
  expect(byRiverProbability(0)).toBe(0)
  for (const f of [nextCardProbability, byRiverProbability])
    expect(() => f(48, 47)).toThrow()
  expect(() => byRiverProbability(1, 1)).toThrow()
})
it('reuses the ranking evaluator: wheel, kickers, board playing and two triplets', () => {
  expect(five(cards('Ac 2c 3c 4c 5c'))).toEqual([8, 5])
  expect(best(cards('Ac Ad Ah Kc Kd Kh 2s'))).toEqual([6, 14, 13])
  expect(
    compare(
      best(cards('Ac Ad Kc Kd Qs 2s 3s')),
      best(cards('Ah As Kh Ks Jc 2h 3h')),
    ),
  ).toBe(1)
  expect(
    compare(
      best(cards('Ac Kc Qc Jc Tc 2d 3d')),
      best(cards('Ac Kc Qc Jc Tc 4h 5h')),
    ),
  ).toBe(0)
  expect(() => five([0, 0, 1, 2, 3])).toThrow()
})
it('exact equity includes ties and weighted ranges, removes blockers, never uses actual hidden cards', () => {
  const h = cards('Ac Ad') as [number, number],
    board = cards('2c 3d 7h 9s Kc')
  const r = [
    { cards: cards('Kh Kd') as [number, number], weight: 1 },
    { cards: cards('Qh Qd') as [number, number], weight: 3 },
    { cards: cards('Ac As') as [number, number], weight: 5 },
  ]
  expect(exactEquity(h, board, r)).toMatchObject({
    equity: 0.75,
    blocked: 1,
    runouts: 2,
  })
  expect(
    exactEquity(cards('2d 3d') as [number, number], cards('Ac Kc Qc Jc Tc'), [
      { cards: cards('4h 5h') as [number, number], weight: 1 },
    ]).equity,
  ).toBe(0.5)
  expect(
    exactEquity(h, cards('2c 3d 7h 9s'), [
      { cards: cards('Kh Kd') as [number, number], weight: 1 },
    ]).runouts,
  ).toBe(44)
  expect(() => exactEquity(h, board, [r[2]])).toThrow()
  expect(() => exactEquity(h, board, [r[0], r[0]])).toThrow()
})
it('all 2,598,960 five-card combinations have standard category frequencies', () => {
  const counts = Array(9).fill(0)
  expect(deck()).toHaveLength(52)
  for (let a = 0; a < 48; a++)
    for (let b = a + 1; b < 49; b++)
      for (let c = b + 1; c < 50; c++)
        for (let d = c + 1; d < 51; d++)
          for (let e = d + 1; e < 52; e++) counts[five([a, b, c, d, e])[0]]++
  expect(counts).toEqual([
    1302540, 1098240, 123552, 54912, 10200, 5108, 3744, 624, 40,
  ])
}, 30000)
