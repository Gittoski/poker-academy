import { expect, it } from 'vitest'
import {
  newPositionedDeal,
  positionChoice,
  randomLivePosition,
} from './livePositions'
import {
  appendLiveAction,
  decodeLiveSession,
  encodeLiveSession,
  practiceLiveDeal,
  retryLiveDecision,
  type LiveSession,
} from './liveSession'
import { switchLiveMode } from './liveModes'

const config = (n = 6) => ({
  stacks: Array(n).fill(10000),
  button: n - 3,
  smallBlind: 50,
  bigBlind: 100,
})
const reference = {
  status: 'ungraded' as const,
  reason: 'missing' as const,
  explanation: 'No matching reference.',
  source: 'Test fixture; no strategy grade.',
}

it.each([6, 8, 9])(
  'reaches every %i-player position and excludes the previous position uniformly',
  (n) => {
    expect(
      Array.from({ length: n }, (_, i) =>
        randomLivePosition(n, undefined, () => (i + 0.5) / n),
      ),
    ).toEqual(Array.from({ length: n }, (_, i) => i))
    for (let previous = 0; previous < n; previous++) {
      const choices = Array.from({ length: n - 1 }, (_, i) =>
        randomLivePosition(n, previous, () => (i + 0.5) / (n - 1)),
      )
      expect(choices).toEqual(
        Array.from({ length: n }, (_, i) => i).filter((i) => i !== previous),
      )
    }
    expect(randomLivePosition(n, n - 1, () => 0)).toBe(0)
    expect(randomLivePosition(n, 0, () => 1 - Number.EPSILON)).toBe(n - 1)
  },
)

it('rejects unsupported tables and invalid randomness', () => {
  for (const n of [0, 2, 7, 10])
    expect(() => randomLivePosition(n)).toThrow('table size')
  for (const value of [-1, 1, NaN, Infinity])
    expect(() => randomLivePosition(6, 0, () => value)).toThrow('random source')
})

it('selects the learner independently of cards and keeps fixed practice available', () => {
  const a = newPositionedDeal(
    config(),
    'random',
    'balanced',
    'full-hands',
    undefined,
    42,
    () => 0,
  )
  const b = newPositionedDeal(
    config(),
    'random',
    'balanced',
    'full-hands',
    undefined,
    42,
    () => 0.99,
  )
  expect(a.hero).toBe(0)
  expect(b.hero).toBe(5)
  expect(a.randomPosition).toBe(true)
  expect(b.randomPosition).toBe(true)
  expect(practiceLiveDeal(a).deck).toEqual(practiceLiveDeal(b).deck)
  expect(practiceLiveDeal(a).seats).toEqual(practiceLiveDeal(b).seats)
  const fixed = newPositionedDeal(
    config(),
    3,
    'loose',
    'full-hands',
    3,
    42,
    () => {
      throw Error('Fixed mode must not sample a seat')
    },
  )
  expect(fixed.hero).toBe(3)
  expect(fixed.randomPosition).toBeUndefined()
  expect(positionChoice(a)).toBe(-1)
  expect(positionChoice(fixed)).toBe(3)
  expect(
    positionChoice({ ...fixed, graded: { version: 1, context: 'open:BTN' } }),
  ).toBe(-1)
  expect(
    positionChoice({
      ...fixed,
      graded: { version: 1, context: 'open:BTN', seat: 3 },
    }),
  ).toBe(3)
})

it('preserves exact seats/cards on reload, retry and mode parking, then varies the next hand', () => {
  let deal = newPositionedDeal(
    config(),
    'random',
    'balanced',
    'full-hands',
    5,
    42,
    () => 0,
  )
  const initial = structuredClone(deal)
  deal = appendLiveAction(deal, { kind: 'fold' }, 0, reference)
  let session: LiveSession = { version: 3, current: deal, archive: [] }
  session = decodeLiveSession(encodeLiveSession(session))
  expect(session.version).toBe(5)
  expect(session.current).toEqual(deal)
  session = retryLiveDecision(session)
  expect(session.current.hero).toBe(initial.hero)
  expect(session.current.seed).toBe(initial.seed)
  expect(session.current.randomPosition).toBe(true)
  expect(session.current.actions).toEqual([])
  const retried = structuredClone(session.current)
  session = switchLiveMode(session, 'preflop')
  session = switchLiveMode(
    decodeLiveSession(encodeLiveSession(session)),
    'full-hands',
  )
  expect(session.current).toEqual(retried)
  const next = newPositionedDeal(
    config(),
    'random',
    'balanced',
    'full-hands',
    session.current.hero,
    100,
    () => 0,
  )
  expect(next.hero).toBe(1)
  expect(next.randomPosition).toBe(true)
})

it('uses version five for random preferences in any slot, retaining older fixed saves', () => {
  const fixed = newPositionedDeal(
    config(),
    0,
    'balanced',
    'full-hands',
    undefined,
    42,
  )
  const random = { ...fixed, randomPosition: true as const }
  for (const session of [
    { version: 3 as const, current: random, archive: [] },
    { version: 3 as const, current: fixed, archive: [random] },
    {
      version: 3 as const,
      current: { ...fixed, mode: 'preflop' as const },
      archive: [],
      parked: { 'full-hands': random },
    },
  ])
    expect(decodeLiveSession(encodeLiveSession(session)).version).toBe(5)
  for (const version of [1, 2, 3, 4, 5] as const) {
    const restored = decodeLiveSession(
      JSON.stringify({ version, current: fixed, archive: [] }),
    )
    expect(restored.current).toEqual(fixed)
    expect(restored.version).toBe(Math.max(3, version))
  }
  for (const version of [1, 2, 3, 4])
    expect(() =>
      decodeLiveSession(
        JSON.stringify({ version, current: random, archive: [] }),
      ),
    ).toThrow('version five')
  for (const invalid of [
    { ...random, randomPosition: false },
    { ...random, mode: 'preflop', graded: { version: 1, context: 'open:LJ' } },
  ])
    expect(() =>
      decodeLiveSession(
        JSON.stringify({ version: 5, current: invalid, archive: [] }),
      ),
    ).toThrow('random-position')
})
