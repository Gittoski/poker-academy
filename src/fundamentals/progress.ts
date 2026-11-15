import { newId } from '@/learning/identity'
import { isTopic, type Topic } from './content'
import { question, type Question } from './questions'
export interface Counts {
  onTime?: number
  answered: number
  correct: number
  fresh: number
  freshCorrect: number
}
export interface SkillProgress {
  id: Topic
  version: 1
  lessonRead: boolean
  untimed: Counts
  timed: Counts
  families: string[]
  errors: Record<string, number>
  lastPractice: number | null
}
export interface ActiveQuestion {
  id: string
  version: 1
  topic: Topic
  seed: number
  attemptId: string
  mode: 'untimed' | 'timed'
  startedAt: number
  selected: number | null
  from: string | null
}
export interface Attempt {
  id: string
  version: 1
  topic: Topic
  seed: number
  questionId: string
  family: string
  selected: number
  correct: boolean
  mode: 'untimed' | 'timed'
  withinTime: boolean | null
  novelty: 'fresh' | 'repeat' | 'unknown'
  at: number
  from: string | null
}
interface Exposure {
  firstAttemptId?: string
  id: string
  topic: Topic
  count: number
  errors: number
  lastAt: number
}
interface Submission {
  active: ActiveQuestion
  selected: number
  at: number
}
export interface PracticeBackup {
  version: 1
  skills: SkillProgress[]
  seen: Exposure[]
  attempts: Attempt[]
  active: ActiveQuestion[]
}
const stores = ['skills', 'seen', 'attempts', 'active'] as const
const counts = (): Counts => ({
  answered: 0,
  correct: 0,
  fresh: 0,
  freshCorrect: 0,
})
export const emptySkill = (id: Topic): SkillProgress => ({
  id,
  version: 1,
  lessonRead: false,
  untimed: counts(),
  timed: counts(),
  families: [],
  errors: {},
  lastPractice: null,
})
export const ready = (s: SkillProgress) =>
  s.lessonRead && s.untimed.freshCorrect >= 3 && s.families.length >= 2
const request = <T>(r: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
const completed = (tx: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onabort = () => reject(tx.error ?? Error('Practice save aborted'))
    tx.onerror = () => reject(tx.error ?? Error('Practice save failed'))
  })
export class PracticeRepository {
  private db: IDBDatabase | null = null
  private queue: Promise<unknown> = Promise.resolve()
  constructor(
    private name = 'poker-fundamentals-v1',
    private wal: Storage | null = typeof localStorage === 'undefined'
      ? null
      : localStorage,
  ) {}
  async open() {
    const r = indexedDB.open(this.name, 1)
    r.onupgradeneeded = () => {
      for (const name of stores) {
        const s = r.result.createObjectStore(name, { keyPath: 'id' })
        if (name === 'attempts') s.createIndex('at', 'at')
      }
    }
    this.db = await request(r)
    this.db.onversionchange = () => this.close()
  }
  close() {
    this.db?.close()
    this.db = null
  }
  private tx(names: readonly string[], mode: IDBTransactionMode = 'readonly') {
    if (!this.db) throw Error('Practice storage is unavailable')
    return this.db.transaction([...names], mode)
  }
  async skill(topic: Topic): Promise<SkillProgress> {
    return (
      (await request(this.tx(['skills']).objectStore('skills').get(topic))) ??
      emptySkill(topic)
    )
  }
  async skills() {
    return (await request(
      this.tx(['skills']).objectStore('skills').getAll(),
    )) as SkillProgress[]
  }
  async readLesson(topic: Topic) {
    const tx = this.tx(['skills'], 'readwrite'),
      done = completed(tx)
    const s =
      (await request(tx.objectStore('skills').get(topic))) ?? emptySkill(topic)
    tx.objectStore('skills').put({ ...s, lessonRead: true })
    await done
  }
  async active(topic: Topic): Promise<ActiveQuestion | null> {
    return (
      (await request(this.tx(['active']).objectStore('active').get(topic))) ??
      null
    )
  }
  async start(
    topic: Topic,
    mode: 'untimed' | 'timed',
    from: string | null = null,
  ) {
    if (mode === 'timed' && !ready(await this.skill(topic)))
      throw Error('Complete untimed practice across two question formats first')
    let q: Question = question(
      topic,
      crypto.getRandomValues(new Uint32Array(1))[0],
    )
    for (let i = 0; i < 40; i++) {
      q = question(topic, crypto.getRandomValues(new Uint32Array(1))[0])
      if (!(await request(this.tx(['seen']).objectStore('seen').get(q.id))))
        break
    }
    const a: ActiveQuestion = {
      id: topic,
      version: 1,
      topic,
      seed: q.seed,
      attemptId: newId('practice'),
      mode,
      startedAt: Date.now(),
      selected: null,
      from,
    }
    const tx = this.tx(['active', 'seen'], 'readwrite'),
      done = completed(tx)
    try {
      const shown: Exposure | undefined = await request(
        tx.objectStore('seen').get(q.id),
      )
      if (!shown && (await request(tx.objectStore('seen').count())) < 20000)
        tx.objectStore('seen').put({
          id: q.id,
          topic,
          count: 0,
          errors: 0,
          lastAt: a.startedAt,
          firstAttemptId: a.attemptId,
        })
      tx.objectStore('active').put(a)
      await done
    } catch (e) {
      try {
        tx.abort()
      } catch {}
      await done.catch(() => {})
      throw e
    }
    return a
  }
  private pending(): Submission[] {
    const raw = this.wal?.getItem(`${this.name}:pending`)
    if (!raw) return []
    if (new TextEncoder().encode(raw).length > 65536)
      throw Error('Practice recovery buffer is full')
    const x = JSON.parse(raw)
    if (
      !Array.isArray(x) ||
      x.some(
        (e) =>
          !isTopic(e.active?.topic) ||
          !Number.isInteger(e.selected) ||
          !Number.isFinite(e.at),
      )
    )
      throw Error(
        'Practice recovery data is damaged; export it before clearing',
      )
    return x
  }
  answer(
    active: ActiveQuestion,
    selected: number,
    at = Date.now(),
  ): Promise<Attempt> {
    const event = { active, selected, at }
    let staged = false
    try {
      const list = this.pending().filter(
        (e) => e.active.attemptId !== active.attemptId,
      )
      list.push(event)
      const text = JSON.stringify(list)
      if (new TextEncoder().encode(text).length > 65536)
        throw Error('Practice recovery buffer full')
      this.wal?.setItem(`${this.name}:pending`, text)
      staged = true
    } catch {
      /* IDB may still succeed; caller sees a failure if neither storage path succeeds. */
    }
    const work = this.queue
      .catch(() => {})
      .then(async () => {
        const saved = await this.commit(event)
        if (staged) {
          const list = this.pending().filter(
            (e) => e.active.attemptId !== active.attemptId,
          )
          if (list.length)
            this.wal?.setItem(`${this.name}:pending`, JSON.stringify(list))
          else this.wal?.removeItem(`${this.name}:pending`)
        }
        return saved
      })
    this.queue = work
    return work
  }
  private async commit(e: Submission): Promise<Attempt> {
    const q = question(e.active.topic, e.active.seed)
    if (
      !Number.isInteger(e.selected) ||
      e.selected < 0 ||
      e.selected >= q.choices.length ||
      !Number.isFinite(e.at)
    )
      throw Error('Invalid practice answer')
    const tx = this.tx(stores, 'readwrite'),
      done = completed(tx)
    try {
      const attempts = tx.objectStore('attempts'),
        old = await request(attempts.get(e.active.attemptId))
      if (old) {
        await done
        return old
      }
      if ((await request(attempts.count())) >= 1000) {
        const oldest = await request(attempts.index('at').openCursor())
        if (oldest && e.active.startedAt < oldest.value.at)
          throw Error(
            'This old attempt predates retained detail and cannot be safely counted again. Start a fresh exercise or restore its original backup.',
          )
      }
      const stats: SkillProgress =
        (await request(tx.objectStore('skills').get(q.topic))) ??
        emptySkill(q.topic)
      if (e.active.mode === 'timed' && !ready(stats))
        throw Error('Untimed competence required before timing')
      const exposure: Exposure | undefined = await request(
          tx.objectStore('seen').get(q.id),
        ),
        seenCount = await request(tx.objectStore('seen').count())
      const novelty = exposure
          ? exposure.firstAttemptId === e.active.attemptId &&
            exposure.count === 0
            ? 'fresh'
            : 'repeat'
          : seenCount < 20000
            ? 'fresh'
            : 'unknown',
        correct = e.selected === q.answer
      const attempt: Attempt = {
        id: e.active.attemptId,
        version: 1,
        topic: q.topic,
        seed: q.seed,
        questionId: q.id,
        family: q.family,
        selected: e.selected,
        correct,
        mode: e.active.mode,
        withinTime:
          e.active.mode === 'timed'
            ? Math.max(0, e.at - e.active.startedAt) <= 45000
            : null,
        novelty,
        at: e.at,
        from: e.active.from,
      }
      attempts.add(attempt)
      const c = stats[e.active.mode]
      c.answered++
      if (attempt.withinTime === true) c.onTime = (c.onTime ?? 0) + 1
      if (correct) c.correct++
      if (novelty === 'fresh') {
        c.fresh++
        if (correct) {
          c.freshCorrect++
          if (e.active.mode === 'untimed' && !stats.families.includes(q.family))
            stats.families.push(q.family)
        }
      }
      if (!correct) stats.errors[q.family] = (stats.errors[q.family] ?? 0) + 1
      stats.lastPractice = e.at
      tx.objectStore('skills').put(stats)
      if (novelty !== 'unknown')
        tx.objectStore('seen').put({
          id: q.id,
          firstAttemptId:
            exposure?.firstAttemptId ??
            (novelty === 'fresh' ? e.active.attemptId : undefined),
          topic: q.topic,
          count: (exposure?.count ?? 0) + 1,
          errors: (exposure?.errors ?? 0) + (correct ? 0 : 1),
          lastAt: e.at,
        })
      const live: ActiveQuestion | undefined = await request(
        tx.objectStore('active').get(q.topic),
      )
      if (!live || live.attemptId === e.active.attemptId)
        tx.objectStore('active').put({ ...e.active, selected: e.selected })
      const total = await request(attempts.count())
      if (total > 1000) {
        let remaining = total - 1000
        const cursor = attempts.index('at').openCursor()
        cursor.onsuccess = () => {
          const c = cursor.result
          if (c && remaining-- > 0) {
            c.delete()
            c.continue()
          }
        }
      }
      await done
      return attempt
    } catch (error) {
      try {
        tx.abort()
      } catch {}
      await done.catch(() => {})
      throw error
    }
  }
  async recover() {
    for (const e of this.pending())
      await this.answer(e.active, e.selected, e.at)
  }
  pendingText() {
    return this.wal?.getItem(`${this.name}:pending`) ?? '[]'
  }
  async recentErrors(limit = 20): Promise<Attempt[]> {
    const tx = this.tx(['attempts']),
      index = tx.objectStore('attempts').index('at')
    return new Promise((resolve, reject) => {
      const rows: Attempt[] = [],
        r = index.openCursor(undefined, 'prev')
      r.onerror = () => reject(r.error)
      r.onsuccess = () => {
        const c = r.result
        if (!c || rows.length >= limit) {
          resolve(rows)
          return
        }
        if (!c.value.correct) rows.push(c.value)
        c.continue()
      }
    })
  }
  async backup(): Promise<PracticeBackup> {
    await this.queue.catch(() => {})
    const tx = this.tx(stores),
      done = completed(tx),
      data = await Promise.all(
        stores.map((s) => request(tx.objectStore(s).getAll())),
      )
    await done
    return {
      version: 1,
      skills: data[0],
      seen: data[1],
      attempts: data[2],
      active: data[3],
    }
  }
  async importPending(value: unknown) {
    const data = value as {
      kind: string
      event: Submission | null
      stored?: string
    }
    if (!data || data.kind !== 'fundamentals-pending')
      throw Error('Invalid pending learning file')
    const stored = data.stored ? JSON.parse(data.stored) : []
    if (!Array.isArray(stored) || stored.length > 256)
      throw Error('Invalid recovery list')
    const events: Submission[] = [
      ...stored,
      ...(data.event ? [data.event] : []),
    ]
    for (const e of events) {
      validatePracticeBackup({
        version: 1,
        skills: [],
        seen: [],
        attempts: [],
        active: [e.active],
      })
      const q = question(e.active.topic, e.active.seed)
      if (
        !Number.isInteger(e.selected) ||
        e.selected < 0 ||
        e.selected >= q.choices.length ||
        !Number.isFinite(e.at)
      )
        throw Error('Invalid pending answer')
    }
    for (const e of events) await this.answer(e.active, e.selected, e.at)
  }
  async restore(input: unknown) {
    const b = validatePracticeBackup(input)
    const tx = this.tx(stores, 'readwrite'),
      done = completed(tx)
    try {
      for (const s of stores) {
        tx.objectStore(s).clear()
        for (const item of b[s]) tx.objectStore(s).put(item)
      }
      await done
      this.wal?.removeItem(`${this.name}:pending`)
    } catch (e) {
      try {
        tx.abort()
      } catch {}
      await done.catch(() => {})
      throw e
    }
  }
}
export function validatePracticeBackup(value: unknown): PracticeBackup {
  const b = value as PracticeBackup
  if (!b || b.version !== 1) throw Error('Unsupported learning backup')
  for (const s of stores)
    if (
      !Array.isArray(b[s]) ||
      b[s].length > (s === 'seen' ? 20000 : s === 'attempts' ? 1000 : 6) ||
      new Set(b[s].map((r) => r.id)).size !== b[s].length
    )
      throw Error('Invalid learning backup records')
  const number = (x: number) => Number.isSafeInteger(x) && x >= 0
  for (const s of b.skills) {
    if (
      !isTopic(s.id) ||
      s.version !== 1 ||
      typeof s.lessonRead !== 'boolean' ||
      !Array.isArray(s.families) ||
      s.families.length > 20 ||
      s.families.some((f) => typeof f !== 'string') ||
      !s.errors ||
      Object.values(s.errors).some((n) => !number(n))
    )
      throw Error('Invalid skill progress')
    for (const c of [s.untimed, s.timed])
      if (
        !c ||
        ![c.answered, c.correct, c.fresh, c.freshCorrect].every(number) ||
        Object.values(c).some((n) => !number(n)) ||
        c.correct > c.answered ||
        c.fresh > c.answered ||
        c.freshCorrect > c.fresh
      )
        throw Error('Invalid accuracy counters')
  }
  for (const a of b.active) {
    if (
      !isTopic(a.topic) ||
      a.id !== a.topic ||
      a.version !== 1 ||
      typeof a.attemptId !== 'string' ||
      !['untimed', 'timed'].includes(a.mode) ||
      !Number.isFinite(a.startedAt) ||
      (a.from !== null && typeof a.from !== 'string')
    )
      throw Error('Invalid active practice')
    const q = question(a.topic, a.seed)
    if (
      a.selected !== null &&
      (!number(a.selected) || a.selected >= q.choices.length)
    )
      throw Error('Invalid selected answer')
  }
  for (const a of b.attempts) {
    if (
      typeof a.id !== 'string' ||
      !isTopic(a.topic) ||
      a.version !== 1 ||
      (a.withinTime !== null && typeof a.withinTime !== 'boolean') ||
      (a.from !== null && typeof a.from !== 'string') ||
      !['fresh', 'repeat', 'unknown'].includes(a.novelty) ||
      !['untimed', 'timed'].includes(a.mode) ||
      !Number.isFinite(a.at)
    )
      throw Error('Invalid learning attempt')
    const q = question(a.topic, a.seed)
    if (
      q.id !== a.questionId ||
      q.family !== a.family ||
      !number(a.selected) ||
      a.selected >= q.choices.length ||
      a.correct !== (q.answer === a.selected)
    )
      throw Error('Inconsistent question or calculation')
  }
  for (const s of b.seen)
    if (
      typeof s.id !== 'string' ||
      (s.firstAttemptId !== undefined &&
        typeof s.firstAttemptId !== 'string') ||
      !isTopic(s.topic) ||
      !number(s.count) ||
      !number(s.errors) ||
      s.errors > s.count ||
      !Number.isFinite(s.lastAt)
    )
      throw Error('Invalid exposure record')
  return structuredClone(b)
}
