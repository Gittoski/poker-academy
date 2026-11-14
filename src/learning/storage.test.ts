import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { DECK, type HoleCards } from '@/lib/cards'
import { startHand, decisionFor } from '@/lib/handSim'
import { preflopPrompt, EMPTY_SCORE } from '@/lib/trainer'
import type { RangeEntry } from '@/data/types'
import { createSource } from './sources'
import { packHand } from './checkpoints'
import { preflopReference } from './classification'
import {
  createSession,
  needsSession,
  SESSION_GAP_MS,
  touchSession,
} from './sessions'
import {
  LearningRepository,
  validateBackup,
  type WriteEvent,
} from './repository'
import { buildDecision } from './attempts'
import { compactBackup } from './retention'
import {
  initialScheduler,
  advanceScheduler,
  configureScheduler,
} from './scheduler'
import type {
  Cursor,
  HandRecord,
  LearningConfig,
  SavedPrompt,
  SourceRecord,
} from './types'
class MemoryStorage implements Storage {
  data = new Map<string, string>()
  get length() {
    return this.data.size
  }
  clear() {
    this.data.clear()
  }
  key(i: number) {
    return [...this.data.keys()][i] ?? null
  }
  getItem(k: string) {
    return this.data.get(k) ?? null
  }
  removeItem(k: string) {
    this.data.delete(k)
  }
  setItem(k: string, v: string) {
    this.data.set(k, v)
  }
}
function fixture(): { source: SourceRecord; event: WriteEvent } {
  const entries: RangeEntry[] = [
    {
      id: 'open',
      scenario: 'open',
      rangeTypes: ['gto'],
      hero: ['LJ'],
      range: { raise: 'AA' },
    },
  ]
  const source = createSource('ranges', 'test', entries, Date.now())
  const config: LearningConfig = {
    mode: 'preflop',
    format: 'cash',
    stack: 100,
    rangeType: 'gto',
    openSize: 2.5,
    players: 6,
    seat: 'LJ',
    rangesId: source.id,
  }
  const hand = startHand(
    config,
    () => 0.5,
    'LJ',
    Array.from(
      { length: 6 },
      (_, i) => DECK.slice(i * 2, i * 2 + 2) as HoleCards,
    ),
  )
  const packed = packHand(hand, source.id)
  const h: HandRecord = {
    version: 1,
    id: 'hand',
    sessionId: 'session',
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
    decisions: 1,
    actions: [],
  }
  const c: Cursor = {
    version: 1,
    handId: h.id,
    hand: packed,
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
  const decision = decisionFor(hand, config, entries)!
  const p: SavedPrompt = {
    ...preflopPrompt(decision, config),
    street: 'preflop',
    reference: preflopReference(decision),
  }
  const d = buildDecision(h, c, p, 1, 101, 'open:LJ', true)
  const cursor: Cursor = {
    ...c,
    phase: 'verdict',
    ordinal: 1,
    decisions: 1,
    verdict: {
      decisionId: d.id,
      prompt: p,
      guess: 1,
      legacyGrade: d.legacyGrade,
      learning: d.learning,
    },
  }
  return {
    source,
    event: { id: 'event1', revision: 1, hand: h, cursor, decision: d, at: 101 },
  }
}
let counter = 0
async function repository(
  storage = new MemoryStorage(),
  name = `test-${++counter}`,
) {
  const repo = new LearningRepository(name, storage)
  await repo.open()
  expect(await repo.acquire()).toBe(true)
  return repo
}
describe('atomic durable local journal', () => {
  it('saves before Continue, survives reload, and ignores duplicate/reordered writes', async () => {
    const { source, event } = fixture(),
      storage = new MemoryStorage(),
      name = `test-${++counter}`
    const repo = await repository(storage, name)
    await repo.cache(source)
    const pending = repo.submit(event)
    expect(storage.getItem(`${name}:pending`)).toContain('event1')
    await pending
    await repo.submit(event)
    await repo.submit({
      ...event,
      id: 'old',
      revision: 0,
      decision: undefined,
      cursor: { ...event.cursor, phase: 'npc' },
    })
    const backup = await repo.backup()
    expect(backup.decisions).toHaveLength(1)
    expect(backup.problems[0].errors).toBe(1)
    expect(backup.sessions[0].counts.regular.decisions).toBe(1)
    expect(backup.meta.cursor?.phase).toBe('verdict')
    expect(storage.length).toBe(0)
    repo.close()
    const reopened = new LearningRepository(name, storage)
    await reopened.open()
    expect((await reopened.meta()).cursor).toEqual(event.cursor)
    reopened.close()
  })
  it('recovers interrupted write-ahead records idempotently', async () => {
    const { source, event } = fixture(),
      storage = new MemoryStorage(),
      name = `test-${++counter}`
    const repo = await repository(storage, name)
    await repo.cache(source)
    storage.setItem(`${name}:pending`, JSON.stringify([event, event]))
    await repo.recover()
    expect((await repo.backup()).decisions).toHaveLength(1)
    expect(storage.length).toBe(0)
    repo.close()
  })
  it('fences competing tabs and leaves failed writes available for recovery', async () => {
    const { event } = fixture(),
      storage = new MemoryStorage(),
      name = `test-${++counter}`
    const a = await repository(storage, name),
      b = new LearningRepository(name, storage)
    await b.open()
    expect(await b.acquire()).toBe(false)
    await expect(b.submit(event)).rejects.toThrow(/Another tab/)
    expect(storage.length).toBe(1)
    expect((await a.backup()).decisions).toHaveLength(0)
    a.close()
    b.close()
  })
  it('keeps damaged recovery data and rejects malformed import before replacing anything', async () => {
    const { source, event } = fixture(),
      storage = new MemoryStorage(),
      name = `test-${++counter}`,
      repo = await repository(storage, name)
    await repo.cache(source)
    await repo.submit(event)
    const good = await repo.backup()
    expect(validateBackup(good)).toEqual(good)
    const bad = structuredClone(good)
    bad.sources[0].hash = 'bad'
    await expect(repo.restore(bad)).rejects.toThrow()
    expect((await repo.backup()).decisions).toHaveLength(1)
    storage.setItem(`${name}:pending`, 'broken')
    await expect(repo.recover()).rejects.toThrow()
    expect(storage.getItem(`${name}:pending`)).toBe('broken')
    repo.close()
  })
  it('compacts eligible detail while preserving counts, live cursor and unresolved representative', async () => {
    const { source, event } = fixture(),
      repo = await repository()
    await repo.cache(source)
    await repo.submit(event)
    const backup = await repo.backup()
    backup.meta.cursor = null
    const extra = structuredClone(backup.hands[0])
    extra.id = 'disposable'
    extra.createdAt = 0
    backup.hands.push(extra)
    backup.decisions.push({
      ...structuredClone(backup.decisions[0]),
      id: 'extra',
      handId: extra.id,
    })
    const result = compactBackup(backup, 0, 1)
    expect(result.data.hands.map((h) => h.id)).toEqual(['hand'])
    expect(result.data.decisions).toHaveLength(1)
    expect(result.data.sessions[0].counts).toEqual(backup.sessions[0].counts)
    expect(result.protectedOverBudget).toBe(true)
    expect(result.removed).toBe(1)
    repo.close()
  })
})
it('session inactivity and rollback rules exclude passive/long idle time', () => {
  const s = createSession(1000)
  expect(needsSession(s, 1001)).toBe(false)
  expect(needsSession(s, 1000 + SESSION_GAP_MS)).toBe(true)
  expect(touchSession(s, 0).activeMs).toBe(0)
  expect(touchSession(s, 1000 + SESSION_GAP_MS).activeMs).toBe(0)
  expect(touchSession(s, 2000).activeMs).toBe(1000)
})
it('random review slots persist exactly one opportunity per eligible block without dealer RNG', () => {
  let s = initialScheduler(42),
    opportunities = 0
  for (let i = 0; i < 10000; i++) {
    if (s.index === s.slot) opportunities++
    s = advanceScheduler(s)
  }
  expect(opportunities).toBe(1000)
  s = configureScheduler(s, false, 2)
  expect(advanceScheduler(s)).toEqual(s)
  expect(() => configureScheduler(s, true, 1)).toThrow()
})

it('commits despite denied localStorage, and rejects unavailable IDB without claiming success', async () => {
  const { source, event } = fixture(),
    storage = new MemoryStorage()
  storage.setItem = () => {
    throw new DOMException('Quota exceeded', 'QuotaExceededError')
  }
  const repo = await repository(storage)
  await repo.cache(source)
  await repo.submit(event)
  expect((await repo.backup()).decisions).toHaveLength(1)
  repo.close()
  await expect(
    repo.submit({ ...event, id: 'unavailable', revision: 2 }),
  ).rejects.toThrow(/unavailable/)
})
it('finishes an idle interrupted hand in its old session and starts fresh at the next deal', async () => {
  const { source, event } = fixture(),
    repo = await repository()
  await repo.cache(source)
  await repo.submit(event)
  const next = structuredClone(event)
  next.id = 'later'
  next.revision = 2
  next.at += SESSION_GAP_MS + 1
  next.decision = undefined
  next.finished = true
  await repo.submit(next)
  const third = structuredClone(next)
  third.id = 'new-hand'
  third.revision = 1
  third.hand.id = 'fresh'
  third.hand.sessionId = 'fresh-session'
  third.hand.completedAt = null
  third.hand.decisions = 0
  third.cursor.decisions = 0
  third.cursor.ordinal = 0
  third.cursor.handId = 'fresh'
  third.cursor.phase = 'npc'
  third.cursor.verdict = null
  third.finished = false
  await repo.submit(third)
  const backup = await repo.backup()
  expect(backup.sessions).toHaveLength(2)
  expect(backup.hands.find((h) => h.id === 'hand')?.sessionId).toBe('session')
  expect(backup.hands.find((h) => h.id === 'fresh')?.sessionId).toBe(
    'fresh-session',
  )
  repo.close()
})
it('applies review settings only at the next completed hand boundary', async () => {
  const { source, event } = fixture(),
    repo = await repository()
  await repo.cache(source)
  await repo.submit(event)
  const original = (await repo.meta()).scheduler
  await repo.settings(false, 2)
  expect((await repo.meta()).scheduler).toEqual(original)
  await repo.submit({
    ...event,
    id: 'finished',
    revision: 2,
    decision: undefined,
    finished: true,
  })
  expect((await repo.meta()).scheduler.enabled).toBe(false)
  expect((await repo.meta()).scheduler.interval).toBe(2)
  expect((await repo.meta()).nextScheduler).toBeUndefined()
  repo.close()
})

import { JournalRuntime } from './runtime'
import { unpackHand } from './checkpoints'
import { referenceFamily } from './families'
it('reserves a random slot once, including an empty/unreached review, with no catch-up burst', async () => {
  const repo = await repository()
  const meta = await repo.meta()
  meta.scheduler = { ...meta.scheduler, index: 0, slot: 0 }
  await repo.setMeta(meta)
  expect((await repo.reserveReview()).scheduler.slotUsed).toBeFalsy()
  expect((await repo.reserveReview()).scheduler.slotUsed).toBe(true)
  repo.close()
})
it('uses exact-first adaptive deals from preflop and keeps source/config filters', async () => {
  const { source, event } = fixture(),
    repo = await repository()
  await repo.cache(source)
  await repo.submit(event)
  let meta = await repo.meta()
  meta.scheduler = { ...meta.scheduler, index: 0, slot: 0 }
  await repo.setMeta(meta)
  const runtime = new JournalRuntime(repo, event.hand.config, source, () => {})
  const review = await runtime.chooseReview()
  expect(review?.hand.origin).toBe('adaptive')
  expect(review?.cursor.play).toBeNull()
  expect(review?.cursor.phase).toBe('npc')
  expect(review?.cursor.hand).toEqual(event.hand.initial)
  expect(review?.hand.target?.variant).toBe('exact')
  expect(await runtime.chooseReview()).toBeNull()
  meta = await repo.meta()
  meta.scheduler.slotUsed = false
  await repo.setMeta(meta)
  const incompatible = new JournalRuntime(
    repo,
    { ...event.hand.config, stack: 40 },
    source,
    () => {},
  )
  expect(await incompatible.chooseReview()).toBeNull()
  repo.close()
})
it('uses synchronous pending writes and a one-submission latch in the live adapter', async () => {
  const { source, event } = fixture(),
    storage = new MemoryStorage(),
    name = `test-${++counter}`,
    repo = await repository(storage, name)
  await repo.cache(source)
  const messages: string[] = [],
    runtime = new JournalRuntime(repo, event.hand.config, source, (m) =>
      messages.push(m),
    )
  const native = unpackHand(event.hand.initial, source)
  runtime.begin(native)
  const decision = decisionFor(
    native,
    event.hand.config,
    source.kind === 'ranges' ? source.payload : [],
  )!
  const prompt = { ...preflopPrompt(decision, event.hand.config), decision }
  const before = {
    hand: native,
    phase: 'hero' as const,
    score: EMPTY_SCORE,
    decisions: 0,
  }
  runtime.persist(before)
  const after = { ...before, phase: 'verdict' as const, decisions: 1 }
  expect(runtime.answer(before, prompt, 1, after)?.learning.kind).toBe(
    'outside',
  )
  expect(storage.getItem(`${name}:pending`)).toContain('decision:0')
  expect(runtime.answer(before, prompt, 1, after)).toBeNull()
  await runtime.flush()
  expect((await repo.backup()).decisions).toHaveLength(1)
  expect(messages.at(-1)).toBe('Saved on this device')
  repo.close()
})
it('requires success across sessions before maintenance, then reactivates on another miss', async () => {
  const { source, event } = fixture(),
    repo = await repository()
  await repo.cache(source)
  await repo.submit(event)
  const problem = (await repo.backup()).problems[0]
  for (let i = 1; i <= 3; i++) {
    const hand = {
      ...structuredClone(event.hand),
      id: `review${i}`,
      sessionId: `session${i}`,
      origin: 'adaptive' as const,
      target: {
        problemId: problem.id,
        nodeKey: problem.nodeKey,
        variant: 'exact' as const,
      },
    }
    const cursor = {
      ...structuredClone(event.decision!.before),
      handId: hand.id,
    }
    const a = buildDecision(
      hand,
      cursor,
      event.decision!.prompt,
      0,
      event.at + i * SESSION_GAP_MS + 1,
      event.decision!.skillKey,
      false,
    )
    await repo.submit({
      id: `success${i}`,
      revision: 1,
      hand,
      cursor: {
        ...cursor,
        phase: 'verdict',
        ordinal: 1,
        decisions: 1,
        verdict: {
          decisionId: a.id,
          prompt: a.prompt,
          guess: 0,
          legacyGrade: a.legacyGrade,
          learning: a.learning,
        },
      },
      decision: a,
      finished: true,
      at: event.at + i * SESSION_GAP_MS + 1,
    })
  }
  let p = (await repo.backup()).problems[0]
  expect(p.successes).toBe(3)
  expect(p.status).toBe('maintenance')
  expect(p.successSessions.length).toBeGreaterThanOrEqual(2)
  const again = structuredClone(event)
  again.id = 'again'
  again.hand.id = 'again-hand'
  again.hand.sessionId = 'again-session'
  again.decision!.id = 'again-decision'
  again.decision!.handId = 'again-hand'
  again.decision!.before.handId = 'again-hand'
  again.cursor.handId = 'again-hand'
  again.cursor.verdict!.decisionId = 'again-decision'
  again.at += 5 * SESSION_GAP_MS
  await repo.submit(again)
  p = (await repo.backup()).problems[0]
  expect(p.status).toBe('active')
  expect(p.successes).toBe(0)
  expect(p.errors).toBe(2)
  repo.close()
})
it('uses public context for families and treats cosmetic suit swaps as the same example', () => {
  const { event } = fixture(),
    a = event.decision!,
    before = structuredClone(a.before)
  const first = referenceFamily(a.config, before, a.prompt, null, null)
  const suits = { s: 'h', h: 's', d: 'c', c: 'd' } as const
  for (const seat of before.hand.seats)
    for (const card of seat.cards) card.suit = suits[card.suit]
  expect(referenceFamily(a.config, before, a.prompt, null, null)).toEqual(first)
  before.hand.seats[2].cards = before.hand.seats[3].cards
  expect(referenceFamily(a.config, before, a.prompt, null, null)).toEqual(first)
})
it('compacts thousands of real-shaped records without losing aggregate session counts', async () => {
  const { source, event } = fixture(),
    repo = await repository()
  await repo.cache(source)
  await repo.submit(event)
  const backup = await repo.backup()
  backup.meta.cursor = null
  for (let i = 0; i < 5100; i++) {
    const hand = {
      ...structuredClone(backup.hands[0]),
      id: `bulk-${i}`,
      createdAt: i,
    }
    backup.hands.push(hand)
    backup.decisions.push({
      ...structuredClone(backup.decisions[0]),
      id: `bulk-${i}`,
      handId: hand.id,
    })
  }
  const result = compactBackup(backup)
  expect(result.data.decisions.length).toBeLessThanOrEqual(5000)
  expect(result.data.hands.length).toBeLessThanOrEqual(5000)
  expect(result.data.sessions[0].counts).toEqual(backup.sessions[0].counts)
  expect(result.data.decisions.some((d) => d.id === event.decision!.id)).toBe(
    true,
  )
  repo.close()
})

it('uses each related example’s own reference after the first exact review', async () => {
  const { source, event } = fixture(),
    repo = await repository()
  await repo.cache(source)
  await repo.submit(event)
  const originalProblem = (await repo.backup()).problems[0]
  const hand = {
    ...structuredClone(event.hand),
    id: 'related',
    sessionId: 'related-session',
    decisions: 1,
  }
  ;[hand.initial.seats[0].cards, hand.initial.seats[2].cards] = [
    hand.initial.seats[2].cards,
    hand.initial.seats[0].cards,
  ]
  const native = unpackHand(hand.initial, source),
    decision = decisionFor(
      native,
      hand.config,
      source.kind === 'ranges' ? source.payload : [],
    )!
  const prompt: SavedPrompt = {
    ...preflopPrompt(decision, hand.config),
    street: 'preflop',
    reference: preflopReference(decision),
  }
  const before = {
    ...structuredClone(event.decision!.before),
    handId: hand.id,
    hand: hand.initial,
  }
  const a = buildDecision(
    hand,
    before,
    prompt,
    1,
    102,
    event.decision!.skillKey,
    true,
  )
  a.exampleKey = 'different-covered-example'
  expect(a.learning.kind).toBe('match')
  expect(a.prompt.reference.values).not.toEqual(
    event.decision!.prompt.reference.values,
  )
  await repo.submit({
    id: 'related',
    revision: 1,
    hand,
    cursor: {
      ...before,
      phase: 'verdict',
      ordinal: 1,
      decisions: 1,
      verdict: {
        decisionId: a.id,
        prompt: a.prompt,
        guess: 1,
        legacyGrade: a.legacyGrade,
        learning: a.learning,
      },
    },
    decision: a,
    finished: true,
    at: 102,
  })
  const backup = await repo.backup()
  backup.problems[0].reviews = 1
  backup.problems[0].dueAt = 0
  backup.meta.scheduler = {
    ...backup.meta.scheduler,
    index: 0,
    slot: 0,
    slotUsed: false,
  }
  await repo.restore(backup)
  const runtime = new JournalRuntime(repo, event.hand.config, source, () => {}),
    review = await runtime.chooseReview()
  expect(review?.hand.target?.problemId).toBe(originalProblem.id)
  expect(review?.hand.target?.variant).toBe('related')
  expect(review?.hand.initial).toEqual(hand.initial)
  expect(review?.hand.target?.nodeKey).toBe(a.nodeKey)
  repo.close()
})

it('recovers an exported pending-work file idempotently without replacing existing history', async () => {
  const { source, event } = fixture(),
    repo = await repository()
  const recovery = {
    version: 1,
    kind: 'pending-recovery',
    sources: [source],
    events: [event],
  }
  await repo.importPending(recovery)
  await repo.importPending(recovery)
  expect((await repo.backup()).decisions).toHaveLength(1)
  const bad = structuredClone(recovery)
  bad.events[0].cursor.handId = 'wrong'
  await expect(repo.importPending(bad)).rejects.toThrow()
  expect((await repo.backup()).decisions).toHaveLength(1)
  repo.close()
})

import { vi } from 'vitest'
it('rolls back the entire answer transaction on quota failure and then recovers the pending answer', async () => {
  const { source, event } = fixture(),
    storage = new MemoryStorage(),
    repo = await repository(storage)
  await repo.cache(source)
  const original = IDBObjectStore.prototype.add
  const failure = vi
    .spyOn(IDBObjectStore.prototype, 'add')
    .mockImplementation(function (
      this: IDBObjectStore,
      value: unknown,
      key?: IDBValidKey,
    ) {
      if (this.name === 'decisions')
        throw new DOMException('Quota full', 'QuotaExceededError')
      return original.call(this, value, key)
    })
  await expect(repo.submit(event)).rejects.toThrow(/Quota full/)
  failure.mockRestore()
  let backup = await repo.backup()
  expect(backup.decisions).toHaveLength(0)
  expect(backup.sessions).toHaveLength(0)
  expect(storage.length).toBe(1)
  await repo.recover()
  backup = await repo.backup()
  expect(backup.decisions).toHaveLength(1)
  expect(backup.problems[0].errors).toBe(1)
  repo.close()
})
it('upgrades a previous database without deleting immutable references', async () => {
  const { source } = fixture(),
    name = `legacy-${++counter}`
  await new Promise<void>((resolve, reject) => {
    const r = indexedDB.open(name, 1)
    r.onupgradeneeded = () => {
      for (const store of [
        'sources',
        'sessions',
        'hands',
        'decisions',
        'problems',
        'meta',
      ])
        r.result.createObjectStore(store, { keyPath: 'id' })
      r.transaction!.objectStore('sources').put(source)
    }
    r.onerror = () => reject(r.error)
    r.onsuccess = () => {
      r.result.close()
      resolve()
    }
  })
  const repo = await repository(new MemoryStorage(), name)
  expect(await repo.get('sources', source.id)).toEqual(source)
  expect(await repo.list('problems', 50, 'time')).toEqual([])
  expect(
    await repo.dueProblems({ ...fixture().event.hand.config }, Date.now()),
  ).toEqual([])
  repo.close()
})

it('a pinned representative stays protected after later misses replace the recent examples', async () => {
  const { source, event } = fixture(),
    repo = await repository()
  await repo.cache(source)
  await repo.submit(event)
  const problem = (await repo.backup()).problems[0]
  await repo.annotate(
    problem.id,
    'Watch my opening range',
    true,
    event.decision!.id,
  )
  for (let i = 1; i <= 4; i++) {
    const e = structuredClone(event)
    e.id = `miss${i}`
    e.hand.id = `miss${i}`
    e.hand.sessionId = `miss-session${i}`
    e.decision!.id = `miss-decision${i}`
    e.decision!.handId = e.hand.id
    e.decision!.before.handId = e.hand.id
    e.cursor.handId = e.hand.id
    e.cursor.verdict!.decisionId = e.decision!.id
    await repo.submit(e)
  }
  const backup = await repo.backup()
  backup.meta.cursor = null
  const compact = compactBackup(backup, 0, 1)
  expect(
    compact.data.decisions.some((d) => d.id === event.decision!.id && d.pinned),
  ).toBe(true)
  expect(compact.data.problems[0].note).toBe('Watch my opening range')
  repo.close()
})

it('a later cursor cannot hide an earlier failed answer before recovery', async () => {
  const { source, event } = fixture(),
    storage = new MemoryStorage(),
    repo = await repository(storage)
  await repo.cache(source)
  const original = IDBObjectStore.prototype.add
  const failure = vi
    .spyOn(IDBObjectStore.prototype, 'add')
    .mockImplementation(function (
      this: IDBObjectStore,
      value: unknown,
      key?: IDBValidKey,
    ) {
      if (this.name === 'decisions')
        throw new DOMException('Quota full', 'QuotaExceededError')
      return original.call(this, value, key)
    })
  await expect(repo.submit(event)).rejects.toThrow()
  failure.mockRestore()
  await expect(
    repo.submit({
      ...event,
      id: 'later-cursor',
      revision: 2,
      decision: undefined,
    }),
  ).rejects.toThrow(/earlier answer/)
  expect((await repo.backup()).decisions).toHaveLength(0)
  await repo.recover()
  const backup = await repo.backup()
  expect(backup.decisions).toHaveLength(1)
  expect(backup.sessions[0].counts.regular.decisions).toBe(1)
  expect(backup.meta.cursor?.verdict?.decisionId).toBe(event.decision!.id)
  repo.close()
})

it('restores an initial range reference atomically after orphan-cache cleanup', async () => {
  const { source, event } = fixture(),
    repo = await repository()
  await repo.cache(source)
  await repo.maintain()
  expect(await repo.get('sources', source.id)).toBeNull()
  const runtime = new JournalRuntime(repo, event.hand.config, source, () => {}),
    hand = unpackHand(event.hand.initial, source)
  runtime.begin(hand)
  runtime.persist({ hand, phase: 'hero', score: EMPTY_SCORE, decisions: 0 })
  await runtime.flush()
  const backup = await repo.backup()
  expect(backup.sources.some((s) => s.id === source.id)).toBe(true)
  expect(validateBackup(backup)).toEqual(backup)
  repo.close()
})

it('keeps randomized review shares and bounded gaps at every slider endpoint', () => {
  for (const interval of [2, 10, 20]) {
    let scheduler = configureScheduler(initialScheduler(42), true, interval),
      hits = 0,
      last = -1
    const slots = new Set<number>()
    for (let i = 0; i < 10000; i++) {
      if (scheduler.index === scheduler.slot) {
        hits++
        slots.add(scheduler.slot)
        if (last >= 0) expect(i - last).toBeLessThanOrEqual(2 * interval - 1)
        last = i
      }
      scheduler = advanceScheduler(scheduler)
    }
    expect(hits).toBe(10000 / interval)
    expect(slots.size).toBe(interval)
  }
})

it('an interrupted replacement import rolls back instead of erasing existing history', async () => {
  const { source, event } = fixture(),
    repo = await repository()
  await repo.cache(source)
  await repo.submit(event)
  const original = await repo.backup(),
    replacement = structuredClone(original)
  replacement.problems[0].note = 'imported'
  const put = IDBObjectStore.prototype.put
  const failure = vi
    .spyOn(IDBObjectStore.prototype, 'put')
    .mockImplementation(function (
      this: IDBObjectStore,
      value: unknown,
      key?: IDBValidKey,
    ) {
      if (this.name === 'hands')
        throw new DOMException('Quota full', 'QuotaExceededError')
      return put.call(this, value, key)
    })
  await expect(repo.restore(replacement)).rejects.toThrow()
  failure.mockRestore()
  const retained = await repo.backup()
  expect(retained.decisions).toEqual(original.decisions)
  expect(retained.problems).toEqual(original.problems)
  expect(retained.sessions).toEqual(original.sessions)
  repo.close()
})
