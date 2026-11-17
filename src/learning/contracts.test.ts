import { describe, expect, it, vi } from 'vitest'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { DECK, type HoleCards } from '@/lib/cards'
import { act, decisionFor, sampleAction, startHand } from '@/lib/handSim'
import { gradeIndex, preflopPrompt, type TrainerSetup } from '@/lib/trainer'
import {
  advancePostflop,
  currentNode,
  startPostflop,
  type HandScript,
} from '@/lib/fullHands'
import type { RangeEntry } from '@/data/types'
import { classify, formatFrequency, preflopReference } from './classification'
import { canonicalJson, contentHash, newId, sha256 } from './identity'
import { packHand, unpackHand } from './checkpoints'
import { createSource, validateSource } from './sources'
import { decisionId, decisionKey } from './keys'
import type { LearningConfig, SavedPrompt } from './types'

const setup: TrainerSetup = {
  format: 'cash',
  stack: 100,
  rangeType: 'gto',
  openSize: 2.5,
  players: 6,
  seat: 'LJ',
}
const entries: RangeEntry[] = [
  {
    id: 'tiny',
    scenario: 'open',
    rangeTypes: ['gto'],
    hero: ['LJ'],
    range: { raise: 'AA:0.004' },
  },
]
const source = createSource('ranges', 'test-ranges', entries, 100)
const dealt = Array.from(
  { length: 6 },
  (_, i) => structuredClone(DECK.slice(i * 2, i * 2 + 2)) as HoleCards,
)
const hand = startHand(setup, () => 0.5, 'LJ', dealt)
const decision = decisionFor(hand, setup, entries)!
const config: LearningConfig = {
  ...setup,
  mode: 'preflop',
  rangesId: source.id,
}
const prompt: SavedPrompt = {
  ...preflopPrompt(decision, setup),
  street: 'preflop',
  reference: preflopReference(decision),
}

describe('learning classification and drill reference precision', () => {
  it('retains tiny positive support in both the drill and learning feedback', () => {
    expect(prompt.probs[0]).toBe(0.4)
    expect(gradeIndex(prompt.probs, 0)).toBe('partial')
    expect(classify(preflopReference(decision), 0)).toEqual({
      version: 1,
      kind: 'alternative',
      frequency: 0.004,
    })
    expect(formatFrequency(0.004)).toBe('0.4%')
    expect(formatFrequency(0.00000001)).toBe('<0.1%')
  })
  it('handles ties, zero support and invalid/unavailable references', () => {
    const ref = { values: [0.5, 0.5, 0], scale: 1 as const, applicable: true }
    expect(classify(ref, 0).kind).toBe('match')
    expect(classify(ref, 1).kind).toBe('match')
    expect(classify(ref, 2).kind).toBe('outside')
    for (const values of [
      [],
      [0, 0],
      [NaN, 1],
      [-0.1, 1.1],
      [0.1, 0.2],
      [Infinity, 0],
    ])
      expect(classify({ ...ref, values }, 0).kind).toBe('ungraded')
    expect(classify(null, 0).kind).toBe('ungraded')
    expect(classify({ ...ref, applicable: false }, 0).kind).toBe('ungraded')
    for (const index of [-1, 3, 0.5])
      expect(classify(ref, index).kind).toBe('ungraded')
    expect(
      classify({ values: [33, 33, 33], scale: 100, applicable: true }, 2).kind,
    ).toBe('match')
    expect(
      classify(
        { values: [0.000000001, 0.999999999], scale: 1, applicable: true },
        0,
      ).kind,
    ).toBe('alternative')
  })
})
describe('content identities and compact checkpoints', () => {
  it('uses standard SHA-256, canonical JSON and no dealer randomness', () => {
    for (const input of ['', 'abc', 'poker ♠♥♦♣', 'x'.repeat(10000)])
      expect(sha256(input)).toBe(
        createHash('sha256').update(input).digest('hex'),
      )
    expect(contentHash({ b: 2, a: 1 })).toBe(contentHash({ a: 1, b: 2 }))
    expect(() => canonicalJson({ bad: NaN })).toThrow()
    expect(() => canonicalJson([undefined])).toThrow()
    const cycle: Record<string, unknown> = {}
    cycle.self = cycle
    expect(() => canonicalJson(cycle)).toThrow()
    const random = vi.spyOn(Math, 'random').mockImplementation(() => {
      throw Error('Dealer randomness consumed')
    })
    try {
      expect(newId('hand')).not.toBe(newId('hand'))
    } finally {
      random.mockRestore()
    }
  })
  it('restores the original engine hand and decisions without embedded charts', () => {
    const advanced = act(hand, setup, 'raise', decision)
    const packed = packHand(advanced, source.id)
    expect(JSON.stringify(packed)).not.toContain('rangeTypes')
    expect(JSON.stringify(packed)).not.toContain('"entry":')
    expect(unpackHand(packed, source)).toEqual(advanced)
    const restored = unpackHand(packed, source)
    expect(sampleAction(restored.seats[0].lastDecision!, () => 0.001)).toBe(
      sampleAction(advanced.seats[0].lastDecision!, () => 0.001),
    )
    expect(() => unpackHand(packed, { ...source, id: 'other' })).toThrow(
      /version/,
    )
    const duplicate = structuredClone(packed)
    duplicate.seats[1].cards = duplicate.seats[0].cards
    expect(() => unpackHand(duplicate, source)).toThrow(/duplicate/)
  })
  it('keys use public context and hero class, not opponents or future cards', () => {
    const packed = packHand(hand, source.id)
    const key = decisionKey(config, packed, prompt, null, null)
    packed.seats[2].cards = structuredClone(packed.seats[3].cards)
    expect(decisionKey(config, packed, prompt, null, null)).toBe(key)
    packed.seats[2].committed = 3
    expect(decisionKey(config, packed, prompt, null, null)).not.toBe(key)
    expect(decisionId('hand', 0)).toBe('hand:decision:0')
    expect(() => decisionId('h', -1)).toThrow()
  })
  it('validates immutable source identities and preserves scripted chosen-vs-executed behavior', () => {
    validateSource(source)
    const bad = structuredClone(source)
    bad.payload[0].range.raise = 'AA'
    expect(() => validateSource(bad)).toThrow(/mismatch/)
    const script = JSON.parse(
      readFileSync('public/full-hands/3bp-BTN-BB/7s6h3d-5.json', 'utf8'),
    ) as HandScript
    const s = createSource('script', '3bp-BTN-BB/7s6h3d-5', script, 100)
    validateSource(s)
    let play = startPostflop(),
      count = 0
    while (!play.done) {
      const node = currentNode(script, play)!
      const copy = structuredClone(play)
      const selected = node.actions.length - 1
      expect(advancePostflop(script, play)).toEqual(
        advancePostflop(script, copy),
      )
      expect(selected).toBeGreaterThanOrEqual(0)
      // The core consumes node.chosen, never a learning classification or guessed branch.
      const next = advancePostflop(script, play)
      expect(play).toEqual(copy)
      play = next
      if (++count > 100) throw Error('Unbounded script')
    }
    expect(count).toBeGreaterThan(3)
  })
})

import { readdirSync } from 'node:fs'
import path from 'node:path'
import { buildDecision } from './attempts'
import type { Cursor, HandRecord } from './types'
it('captures immutable attempts with chosen and scripted actions distinct, without mutating the game', () => {
  const packed = packHand(hand, source.id)
  const h: HandRecord = {
    version: 1,
    id: 'hand:test',
    sessionId: 'session:test',
    config,
    origin: 'regular',
    createdAt: 100,
    completedAt: null,
    initial: packed,
    scriptId: null,
    suitMap: null,
    foldHand: false,
    target: null,
    targetAnswered: false,
    decisions: 0,
    actions: [],
  }
  const before: Cursor = {
    version: 1,
    handId: h.id,
    hand: packed,
    play: null,
    phase: 'hero',
    verdict: null,
    score: { answered: 0, correct: 0, partial: 0, streak: 0, bestStreak: 0 },
    ordinal: 0,
    decisions: 0,
    forcedFold: false,
    npcAction: null,
    rng: 42,
  }
  const record = buildDecision(h, before, prompt, 0, 101, 'skill:open', true)
  expect(record.legacyGrade).toBe('partial')
  expect(record.learning.kind).toBe('alternative')
  expect(record.problemId).toBeNull()
  expect(record.executed).toBe(0)
  const scripted = buildDecision(
    { ...h, config: { ...config, mode: 'full-hands' } },
    before,
    prompt,
    0,
    101,
    'skill:open',
    true,
  )
  expect(scripted.chosen).toBe(0)
  expect(scripted.executed).toBe(prompt.expected)
  expect(scripted.executed).not.toBe(scripted.chosen)
  record.before.hand.seats[0].committed = 999
  expect(before.hand.seats[0].committed).toBe(0)
  expect(() =>
    buildDecision(
      h,
      { ...before, phase: 'verdict' },
      prompt,
      0,
      102,
      'skill',
      false,
    ),
  ).toThrow()
  expect(buildDecision(h, before, prompt, 0, 103, 'skill', false).id).toBe(
    record.id,
  )
})
it('validates every supplied full-hand reference without changing or regenerating it', () => {
  const directory = 'public/full-hands'
  function files(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory()
        ? files(path.join(dir, e.name))
        : e.name.endsWith('.json') && e.name !== 'index.json'
          ? [path.join(dir, e.name)]
          : [],
    )
  }
  const all = files(directory)
  expect(all.length).toBe(780)
  for (const file of all) {
    const payload = JSON.parse(readFileSync(file, 'utf8')) as HandScript
    const s = createSource('script', file, payload, 100)
    expect(s.hash).toHaveLength(64)
  }
})
