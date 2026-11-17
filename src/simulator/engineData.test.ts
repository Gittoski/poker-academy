import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { RangeEntry } from '@/data/types'
import { dealForScript, mapHole, randomSuitMap, type HandIndex, type HandScript } from '@/lib/fullHands'
import { act, decisionFor, startHand } from '@/lib/handSim'
import { gradeIndex, type TrainerSetup } from '@/lib/trainer'

const setup: TrainerSetup = { format: 'cash', stack: 100, rangeType: 'pto', openSize: 2.5, players: 6 }
const entries: RangeEntry[] = JSON.parse(readFileSync('public/ranges/Cash_100_PTO.json', 'utf8'))
const index: HandIndex = JSON.parse(readFileSync('public/full-hands/index.json', 'utf8'))
const scripts: HandScript[] = index.hands.map(h => JSON.parse(readFileSync(`public/full-hands/${h.id}.json`, 'utf8')))
let seed = 12345
const rng = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296 }

describe('poker behavior invariants', () => {
  it('deals every stored hand without any hole-card/board collisions under randomized suits', () => {
    expect(scripts.length).toBeGreaterThan(0)
    for (const script of scripts) {
      for (let sample = 0; sample < 3; sample++) {
        const map = randomSuitMap(rng)
        const dealt = dealForScript(script, map, setup, entries, rng)
        const board = script.board.map(c => mapHole([c, c], map)[0])
        const cards = [...dealt.flat(), ...board].map(c => c.rank + c.suit)
        expect(new Set(cards).size, script.spot).toBe(cards.length)
      }
    }
  })

  it('keeps stored pot accounting, stacks and hero action probabilities consistent', () => {
    for (const script of scripts) {
      let pot = script.pot
      const spent = { ip: 0, oop: 0 }
      for (const street of script.streets) {
        expect(street.pot).toBeCloseTo(pot, 1)
        const bets = { ip: 0, oop: 0 }
        for (const node of street.nodes) {
          expect(node.chosen).toBeGreaterThanOrEqual(0)
          expect(node.chosen).toBeLessThan(node.actions.length)
          if (node.probs) {
            expect(node.probs).toHaveLength(node.actions.length)
            expect(node.probs.every(p => p >= 0 && p <= 100)).toBe(true)
            expect(Math.abs(node.probs.reduce((a, b) => a + b, 0) - 100)).toBeLessThanOrEqual(1)
          }
          const action = node.actions[node.chosen]
          if (action.to !== undefined) {
            expect(action.to).toBeGreaterThanOrEqual(bets[node.p])
            bets[node.p] = action.to
            expect(spent[node.p] + action.to).toBeLessThanOrEqual(script.stack + 0.1)
          }
        }
        spent.ip += bets.ip
        spent.oop += bets.oop
        pot += bets.ip + bets.oop
      }
      expect(script.result.pot).toBeCloseTo(pot, 1)
    }
  })

  it('distinguishes an SB limp from a BB walk, preserving both live players and chips', () => {
    const mtt: TrainerSetup = { ...setup, format: 'mtt' }
    const ranges: RangeEntry[] = JSON.parse(readFileSync('public/ranges/MTT_100_PTO.json', 'utf8'))
    let hand = startHand(mtt, rng, 'BB')
    for (let i = 0; i < 4; i++) hand = act(hand, mtt, 'fold', decisionFor(hand, mtt, ranges))
    hand = act(hand, mtt, 'call', decisionFor(hand, mtt, ranges))
    expect(hand.ended?.kind).toBe('unsupported')
    expect(hand.ended?.message).toContain('No winner is assigned')
    expect(hand.seats.filter(s => !s.folded).map(s => s.position)).toEqual(['SB', 'BB'])
    expect(hand.seats.slice(-2).map(s => s.committed)).toEqual([1, 1])
  })

  it('gives equal credit to tied reference actions and never awards an empty reference', () => {
    expect(gradeIndex([50, 50, 0], 0)).toBe('correct')
    expect(gradeIndex([50, 50, 0], 1)).toBe('correct')
    expect(gradeIndex([50, 50, 0], 2)).toBe('wrong')
    expect(gradeIndex([0, 0], 0)).toBe('wrong')
    expect(gradeIndex([100], -1)).toBe('wrong')
  })
})
