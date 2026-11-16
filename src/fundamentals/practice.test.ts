import 'fake-indexeddb/auto'
import { expect, it, vi } from 'vitest'
import { TOPICS } from './content'
import { question } from './questions'
import {
  PracticeRepository,
  ready,
  validatePracticeBackup,
  type ActiveQuestion,
} from './progress'
class Memory implements Storage {
  map = new Map<string, string>()
  get length() {
    return this.map.size
  }
  getItem(k: string) {
    return this.map.get(k) ?? null
  }
  setItem(k: string, v: string) {
    this.map.set(k, v)
  }
  removeItem(k: string) {
    this.map.delete(k)
  }
  clear() {
    this.map.clear()
  }
  key(i: number) {
    return [...this.map.keys()][i] ?? null
  }
}
let id = 0
const active = (
  topic: ActiveQuestion['topic'],
  seed: number,
  attemptId = `attempt${++id}`,
): ActiveQuestion => ({
  id: topic,
  version: 1,
  topic,
  seed,
  attemptId,
  mode: 'untimed',
  startedAt: 1,
  selected: null,
  from: null,
})
async function repo() {
  const r = new PracticeRepository(`practice-test-${++id}`, new Memory())
  await r.open()
  return r
}
it('all topics generate deterministic, valid, explained questions with explicit basis and assumptions', () => {
  for (const topic of [...TOPICS, 'hand-ranking'] as const)
    for (let seed = 0; seed < 90; seed++) {
      const q = question(topic, seed)
      expect(q).toEqual(question(topic, seed))
      expect(q.answer).toBeGreaterThanOrEqual(0)
      expect(q.answer).toBeLessThan(q.choices.length)
      expect(new Set(q.choices).size).toBe(q.choices.length)
      expect(q.steps.join(' ').length).toBeGreaterThan(30)
      expect(q.assumptions.length).toBeGreaterThan(0)
      expect(JSON.stringify(q)).not.toMatch(/NaN|Infinity|undefined/)
    }
})
it('pot/EV questions agree with independent arithmetic on the declared terminal inputs', () => {
  for (let seed = 0; seed < 60; seed++) {
    const p = question('pot-odds', seed),
      values = p.prompt.match(/\d+(?:\.\d+)?/g)!.map(Number)
    expect(values[1]).toBeLessThan(values[0])
    if (seed % 3 === 0)
      expect(p.choices[p.answer]).toBe(
        `${((values[1] / (values[0] + values[1])) * 100).toFixed(1)}%`,
      )
    const q = question('ev', seed),
      nums = q.prompt.match(/\d+(?:\.\d+)?/g)!.map(Number),
      pot = nums[0],
      cost = nums[1],
      prob = nums[2] / 100
    const raw = prob * pot - (1 - prob) * cost,
      ev = Math.abs(raw) < 1e-9 ? 0 : raw
    expect(q.choices[q.answer]).toBe(`${ev >= 0 ? '+' : ''}${ev.toFixed(2)} BB`)
  }
})
it('cosmetic seed/shuffle changes do not make static examples unfamiliar', () => {
  expect(question('equity', 2).id).toBe(question('equity', 5).id)
  expect(question('hand-ranking', 0).id).toBe(question('hand-ranking', 3).id)
})
it('one answer is atomic/idempotent; repeats never inflate fresh accuracy', async () => {
  const r = await repo(),
    a = active('pot-odds', 0),
    q = question(a.topic, a.seed)
  await Promise.all([r.answer(a, q.answer, 100), r.answer(a, q.answer, 100)])
  let s = await r.skill(a.topic)
  expect(s.untimed).toMatchObject({
    answered: 1,
    correct: 1,
    fresh: 1,
    freshCorrect: 1,
  })
  const b = await r.answer({ ...a, attemptId: 'repeat' }, q.answer, 101)
  expect(b.novelty).toBe('repeat')
  s = await r.skill(a.topic)
  expect(s.untimed.answered).toBe(2)
  expect(s.untimed.fresh).toBe(1)
  expect(validatePracticeBackup(await r.backup()).attempts).toHaveLength(2)
  r.close()
})
it('timing waits for lesson and successful unfamiliar examples across formats; timeout is separate from accuracy', async () => {
  const r = await repo()
  await expect(r.start('pot-odds', 'timed')).rejects.toThrow()
  for (const seed of [0, 1, 4]) {
    const a = active('pot-odds', seed)
    await r.answer(a, question(a.topic, seed).answer, 100)
  }
  expect(ready(await r.skill('pot-odds'))).toBe(false)
  await r.readLesson('pot-odds')
  expect(ready(await r.skill('pot-odds'))).toBe(true)
  const timed = await r.start('pot-odds', 'timed'),
    q = question(timed.topic, timed.seed),
    a = await r.answer(timed, q.answer, timed.startedAt + 50000)
  expect(a.correct).toBe(true)
  expect(a.withinTime).toBe(false)
  expect((await r.skill('pot-odds')).timed.answered).toBe(1)
  r.close()
})
it('quota rollback leaves a recoverable attempt; backup/import validates calculations before replacement', async () => {
  const r = await repo(),
    a = active('draws', 2),
    q = question(a.topic, a.seed),
    original = IDBObjectStore.prototype.add
  const failure = vi
    .spyOn(IDBObjectStore.prototype, 'add')
    .mockImplementation(function (
      this: IDBObjectStore,
      value: unknown,
      key?: IDBValidKey,
    ) {
      if (this.name === 'attempts')
        throw new DOMException('Quota exceeded', 'QuotaExceededError')
      return original.call(this, value, key)
    })
  await expect(r.answer(a, q.answer, 100)).rejects.toThrow()
  failure.mockRestore()
  expect((await r.skill(a.topic)).untimed.answered).toBe(0)
  await r.recover()
  expect((await r.skill(a.topic)).untimed.correct).toBe(1)
  const b = await r.backup(),
    bad = structuredClone(b)
  bad.attempts[0].correct = !bad.attempts[0].correct
  await expect(r.restore(bad)).rejects.toThrow()
  expect((await r.backup()).attempts).toHaveLength(1)
  const missingCounts = structuredClone(b)
  delete (missingCounts.skills[0].untimed as Partial<{ answered: number }>)
    .answered
  await expect(r.restore(missingCounts)).rejects.toThrow('accuracy counters')
  expect((await r.skill(a.topic)).untimed.answered).toBe(1)
  const restored = await repo()
  await restored.restore(b)
  expect(await restored.skills()).toEqual(await r.skills())
  r.close()
  restored.close()
})
it('pending exports can be merged twice without duplicating results', async () => {
  const r = await repo(),
    a = active('ev', 0),
    q = question(a.topic, a.seed),
    data = {
      kind: 'fundamentals-pending',
      event: { active: a, selected: q.answer, at: 100 },
    }
  await r.importPending(data)
  await r.importPending(data)
  expect((await r.skill('ev')).untimed.answered).toBe(1)
  r.close()
})

it('presentation is recorded even before answering; a later attempt cannot masquerade as unfamiliar', async () => {
  const r = await repo(),
    first = await r.start('pot-odds', 'untimed'),
    q = question(first.topic, first.seed)
  const before = await r.backup()
  expect(before.seen.find((s) => s.id === q.id)?.count).toBe(0)
  const later = { ...first, attemptId: 'later-answer' }
  expect((await r.answer(later, q.answer, Date.now())).novelty).toBe('repeat')
  expect((await r.skill('pot-odds')).untimed.fresh).toBe(0)
  r.close()
})
it('resuming the same first exposure preserves its first-attempt classification', async () => {
  const r = await repo(),
    first = await r.start('draws', 'untimed'),
    resumed = (await r.active('draws'))!,
    q = question(resumed.topic, resumed.seed)
  expect(resumed.attemptId).toBe(first.attemptId)
  expect((await r.answer(resumed, q.answer)).novelty).toBe('fresh')
  r.close()
})

it('detail retention preserves aggregates and rejects recounting a compacted old submission', async () => {
  const r = await repo(),
    a = active('pot-odds', 0),
    q = question(a.topic, a.seed)
  await r.answer(a, q.answer, 100)
  const backup = await r.backup(),
    template = backup.attempts[0]
  backup.attempts = Array.from({ length: 1000 }, (_, i) => ({
    ...template,
    id: `history-${i}`,
    at: 100 + i,
  }))
  backup.skills[0].untimed = {
    answered: 1000,
    correct: 1000,
    fresh: 1,
    freshCorrect: 1,
  }
  await r.restore(backup)
  const current = { ...a, attemptId: 'new-after-retention', startedAt: 2000 }
  await r.answer(current, q.answer, 2001)
  const kept = await r.backup()
  expect(kept.attempts).toHaveLength(1000)
  expect(kept.attempts.some((x) => x.id === 'history-0')).toBe(false)
  expect(kept.skills[0].untimed.answered).toBe(1001)
  await expect(
    r.answer({ ...a, attemptId: 'history-0', startedAt: 99 }, q.answer, 100),
  ).rejects.toThrow('predates retained detail')
  expect((await r.skill(a.topic)).untimed.answered).toBe(1001)
  r.close()
})

it('daily practice totals survive duplicate recovery, detail retention, export and old-backup migration', async () => {
  const r = await repo(),
    a = active('pot-odds', 4),
    at = new Date(2026, 10, 16, 9).getTime()
  await r.answer(a, 0, at)
  await r.answer(a, 0, at)
  expect((await r.activity()).days['2026-11-16']).toBe(1)
  const backup = await r.backup()
  backup.attempts = [] // aggregates must not depend on retained detail
  await r.restore(backup)
  expect((await r.activity()).days['2026-11-16']).toBe(1)
  const old = await r.backup()
  delete old.activity
  await r.restore(old)
  expect((await r.activity()).days).toEqual({}) // no invented dates from skill totals
  r.close()
})

it('upgrades an actual version-one practice database without resetting attempts or inventing dates', async () => {
  const original = await repo(),
    a = active('pot-odds', 4)
  await original.answer(a, 0, new Date(2026, 10, 15, 23, 59).getTime())
  const backup = await original.backup(),
    name = `old-practice-${++id}`
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const open = indexedDB.open(name, 1)
    open.onupgradeneeded = () => {
      for (const name of ['skills', 'seen', 'attempts', 'active'] as const) {
        const store = open.result.createObjectStore(name, { keyPath: 'id' })
        if (name === 'attempts') store.createIndex('at', 'at')
        for (const value of backup[name]) store.put(value)
      }
    }
    open.onsuccess = () => resolve(open.result)
    open.onerror = () => reject(open.error)
  })
  db.close()
  const migrated = new PracticeRepository(name, new Memory())
  await migrated.open()
  expect((await migrated.backup()).attempts).toEqual(backup.attempts)
  expect((await migrated.activity()).days).toEqual({ '2026-11-15': 1 })
  migrated.close()
  original.close()
})
