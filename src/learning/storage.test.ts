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

it('commits despite denied localStorage, and rejects unavailable IDB without claiming success',async()=>{
 const {source,event}=fixture(),storage=new MemoryStorage()
 storage.setItem=()=>{throw new DOMException('Quota exceeded','QuotaExceededError')}
 const repo=await repository(storage);await repo.cache(source);await repo.submit(event);expect((await repo.backup()).decisions).toHaveLength(1)
 repo.close();await expect(repo.submit({...event,id:'unavailable',revision:2})).rejects.toThrow(/unavailable/)
})
it('finishes an idle interrupted hand in its old session and starts fresh at the next deal',async()=>{
 const {source,event}=fixture(),repo=await repository();await repo.cache(source);await repo.submit(event)
 const next=structuredClone(event);next.id='later';next.revision=2;next.at+=SESSION_GAP_MS+1;next.decision=undefined;next.finished=true
 await repo.submit(next)
 const third=structuredClone(next);third.id='new-hand';third.revision=1;third.hand.id='fresh';third.hand.sessionId='fresh-session';third.hand.completedAt=null;third.cursor.handId='fresh';third.cursor.phase='npc';third.cursor.verdict=null;third.finished=false
 await repo.submit(third)
 const backup=await repo.backup();expect(backup.sessions).toHaveLength(2);expect(backup.hands.find(h=>h.id==='hand')?.sessionId).toBe('session');expect(backup.hands.find(h=>h.id==='fresh')?.sessionId).toBe('fresh-session');repo.close()
})
it('applies review settings only at the next completed hand boundary',async()=>{
 const {source,event}=fixture(),repo=await repository();await repo.cache(source);await repo.submit(event)
 const original=(await repo.meta()).scheduler;await repo.settings(false,2);expect((await repo.meta()).scheduler).toEqual(original)
 await repo.submit({...event,id:'finished',revision:2,decision:undefined,finished:true});expect((await repo.meta()).scheduler.enabled).toBe(false);expect((await repo.meta()).scheduler.interval).toBe(2);expect((await repo.meta()).nextScheduler).toBeUndefined();repo.close()
})
