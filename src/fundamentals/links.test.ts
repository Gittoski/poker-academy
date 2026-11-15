import { expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { createSource } from '@/learning/sources'
import { packHand } from '@/learning/checkpoints'
import { startHand, decisionFor } from '@/lib/handSim'
import { preflopPrompt, EMPTY_SCORE } from '@/lib/trainer'
import { preflopReference } from '@/learning/classification'
import { buildDecision } from '@/learning/attempts'
import type { HandRecord, Cursor, LearningConfig } from '@/learning/types'
import type { HandScript } from '@/lib/fullHands'
import { supportedSkills } from './links'
const configBase = {
  mode: 'full-hands',
  format: 'cash',
  stack: 100,
  rangeType: 'pto',
  openSize: 2.5,
  players: 6,
  seat: 'LJ',
} as const
const source = createSource('ranges', 'test', [
  {
    id: 'LJ',
    scenario: 'open',
    rangeTypes: ['pto'],
    hero: ['LJ'],
    range: { raise: 'AA' },
  },
])
function record() {
  const config: LearningConfig = { ...configBase, rangesId: source.id },
    native = startHand(config, () => 0.5, 'LJ'),
    hand = packHand(native, source.id),
    decision = decisionFor(
      native,
      config,
      source.kind === 'ranges' ? source.payload : [],
    )!
  const h: HandRecord = {
    version: 1,
    id: 'h',
    sessionId: 's',
    config,
    origin: 'regular',
    createdAt: 0,
    completedAt: null,
    initial: hand,
    scriptId: null,
    suitMap: null,
    foldHand: false,
    target: null,
    targetAnswered: false,
    decisions: 0,
    actions: [],
  }
  const c: Cursor = {
    version: 1,
    handId: 'h',
    hand,
    play: null,
    phase: 'hero',
    verdict: null,
    score: EMPTY_SCORE,
    ordinal: 0,
    decisions: 0,
    forcedFold: false,
    npcAction: null,
    rng: 42,
  }
  return buildDecision(
    h,
    c,
    {
      ...preflopPrompt(decision, config),
      street: 'preflop',
      reference: preflopReference(decision),
    },
    0,
    1,
    'test',
    true,
  )
}
it('does not label a preflop opening reference error a math error', () => {
  const links = supportedSkills(record(), null, null)
  expect(links.tag).toContain('Preflop')
  expect(links.links).toEqual([])
  expect(links.price).toBeNull()
})
it('uses public pot/bets and exposes a price, not inferred equity or EV loss', () => {
  const a = record(),
    script = JSON.parse(
      readFileSync('public/full-hands/3bp-BTN-BB/7s6h3d-5.json', 'utf8'),
    ) as HandScript
  a.prompt.street = 'river'
  a.prompt.options = [
    { kind: 'C', key: 'c', label: 'Call' },
    { kind: 'F', key: 'f', label: 'Fold' },
  ]
  a.before.play = {
    streetIndex: 2,
    nodeIndex: 0,
    bets: { ip: 0, oop: 20 },
    done: false,
  }
  script.heroPlayer = 'ip'
  const value = supportedSkills(a, script, { s: 's', h: 'h', d: 'd', c: 'c' })
  expect(value.price?.cost).toBe(20)
  expect(value.price?.pot).toBe(script.streets[2].pot + 20)
  expect(value.links.map((l) => l.topic)).toEqual(['pot-odds', 'equity', 'ev'])
  expect(value.links[0].reason).toContain('does not establish your equity')
})
it('later cards, actual opponent holes and final winner cannot change public skill links', () => {
  const a = record(),
    script = JSON.parse(
      readFileSync('public/full-hands/3bp-BTN-BB/7s6h3d-5.json', 'utf8'),
    ) as HandScript
  a.prompt.street = 'flop'
  a.prompt.options = [
    { kind: 'C', key: 'c', label: 'Call' },
    { kind: 'F', key: 'f', label: 'Fold' },
  ]
  a.before.play = {
    streetIndex: 0,
    nodeIndex: 1,
    bets: { ip: 0, oop: 8.4 },
    done: false,
  }
  script.heroPlayer = 'ip'
  const map = { s: 's', h: 'h', d: 'd', c: 'c' } as const,
    first = supportedSkills(a, script, map),
    changed = structuredClone(script)
  changed.villainCards = ['2s', 'Ac']
  changed.board[3] = 'Ah'
  changed.board[4] = 'Ad'
  changed.result.winner = changed.result.winner === 'hero' ? 'villain' : 'hero'
  for (const seat of a.before.hand.seats)
    if (seat.position !== a.before.hand.hero)
      seat.cards = [
        { rank: '2', suit: 'd' },
        { rank: '3', suit: 'd' },
      ]
  expect(supportedSkills(a, changed, map)).toEqual(first)
  expect(first.links.some((l) => l.topic === 'ev')).toBe(false)
})
