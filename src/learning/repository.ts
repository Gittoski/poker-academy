import { newId } from './identity'
import { initialScheduler, advanceScheduler } from './scheduler'
import { createSession, needsSession, touchSession } from './sessions'
import type {
  Cursor,
  DecisionRecord,
  HandRecord,
  LearningBackup,
  LearningMeta,
  ProblemRecord,
  SessionRecord,
  SourceRecord,
} from './types'
import { validateSource } from './sources'
import { unpackHand } from './checkpoints'
import { validateRecords } from './validation'
import { compatible } from './scheduler'
import type { LearningConfig } from './types'
import { configureScheduler } from './scheduler'
import { compactBackup } from './retention'
import { activityFrom, countAnswer } from '@/activity/calendar'
import { isGameMode, type GameMode } from '@/lib/gameModes'

const TABLES = [
  'sources',
  'sessions',
  'hands',
  'decisions',
  'problems',
] as const
const STORES = [...TABLES, 'meta'] as const
export const SOFT_BYTES = 20 * 1024 * 1024
export const MAX_ATTEMPTS = 5000
const WAL_LIMIT = 512 * 1024
const META = 'state',
  LEASE = 'lease'
type Store = (typeof STORES)[number]
export interface WriteEvent {
  id: string
  revision: number
  sources?: SourceRecord[]
  source?: SourceRecord
  hand: HandRecord
  cursor: Cursor
  decision?: DecisionRecord
  finished?: boolean
  at: number
}
const req = <T>(request: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
const done = (tx: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onabort = () => reject(tx.error ?? Error('Storage transaction aborted'))
    tx.onerror = () => reject(tx.error ?? Error('Storage transaction failed'))
  })
export const defaultMeta = (): LearningMeta => ({
  version: 1,
  cursor: null,
  resume: null,
  sessionId: null,
  scheduler: initialScheduler(),
  lastHandFinished: null,
})

export class LearningRepository {
  private db: IDBDatabase | null = null
  private overBudget = false
  private owner = newId('writer')
  private queue: Promise<unknown> = Promise.resolve()
  private walKey: string
  constructor(
    private name = 'poker-learning-v1',
    private pending: Storage | null = typeof localStorage === 'undefined'
      ? null
      : localStorage,
    owner?: string,
  ) {
    if (owner) this.owner = owner
    this.walKey = `${name}:pending`
  }
  async open(): Promise<void> {
    const opening = indexedDB.open(this.name, 4)
    opening.onupgradeneeded = () => {
      const db = opening.result
      for (const name of STORES) {
        const store = db.objectStoreNames.contains(name)
          ? opening.transaction!.objectStore(name)
          : db.createObjectStore(name, { keyPath: 'id' })
        if (
          (name === 'decisions' || name === 'hands') &&
          !store.indexNames.contains('sessionId')
        )
          store.createIndex('sessionId', 'sessionId')
        if (name === 'decisions' && !store.indexNames.contains('handId'))
          store.createIndex('handId', 'handId')
        if (name === 'decisions' && !store.indexNames.contains('skillKey'))
          store.createIndex('skillKey', 'skillKey')
        if (name === 'decisions' && !store.indexNames.contains('nodeKey'))
          store.createIndex('nodeKey', 'nodeKey')
        if (name === 'problems' && !store.indexNames.contains('time'))
          store.createIndex('time', 'lastSeenAt')
        if (name === 'problems' && !store.indexNames.contains('dueAt'))
          store.createIndex('dueAt', 'dueAt')
        if (
          (name === 'sessions' || name === 'decisions' || name === 'hands') &&
          !store.indexNames.contains('time')
        )
          store.createIndex(
            'time',
            name === 'sessions' ? 'startedAt' : 'createdAt',
          )
      }
    }
    this.db = await req(opening)
    this.db.onversionchange = () => this.close()
    // Migrate only retained timestamped decisions; session totals can span days.
    const tx = this.tx(['meta', 'decisions'], 'readwrite'),
      completion = done(tx)
    const state: LearningMeta =
      (await req(tx.objectStore('meta').get(META))) ?? defaultMeta()
    if (!state.activity) {
      const decisions: DecisionRecord[] = await req(
        tx.objectStore('decisions').getAll(),
      )
      state.activity = activityFrom(decisions.map((d) => d.createdAt))
      tx.objectStore('meta').put({ ...state, id: META })
    }
    await completion
  }
  close() {
    if (this.db) {
      try {
        const tx = this.db.transaction('meta', 'readwrite'),
          s = tx.objectStore('meta'),
          r = s.get(LEASE)
        r.onsuccess = () => {
          if (r.result?.owner === this.owner) s.delete(LEASE)
        }
      } catch {}
      this.db.close()
      this.db = null
    }
  }
  private tx(stores: Store[], mode: IDBTransactionMode = 'readonly') {
    if (!this.db) throw Error('Local history is unavailable')
    return this.db.transaction(stores, mode)
  }
  async acquire(now = Date.now(), exclusive = false): Promise<boolean> {
    const tx = this.tx(['meta'], 'readwrite'),
      completion = done(tx),
      store = tx.objectStore('meta')
    const old = await req(store.get(LEASE))
    if (old && old.owner !== this.owner && old.until > now && !exclusive) {
      await completion
      return false
    }
    store.put({ id: LEASE, owner: this.owner, until: now + 15000 })
    await completion
    return true
  }
  private async fence(tx: IDBTransaction) {
    const lease = await req(tx.objectStore('meta').get(LEASE))
    if (lease?.owner !== this.owner || lease.until < Date.now())
      throw Error(
        'Another tab owns this simulator. Close it and reload this tab.',
      )
    tx.objectStore('meta').put({ ...lease, until: Date.now() + 15000 })
  }
  async get<T>(store: Store, id: string): Promise<T | null> {
    const tx = this.tx([store])
    return (await req(tx.objectStore(store).get(id))) ?? null
  }
  async list<T>(
    store: Store,
    limit = 100,
    index?: string,
    key?: string,
    offset = 0,
    accept?: (value: T) => boolean,
  ): Promise<T[]> {
    const tx = this.tx([store]),
      table = tx.objectStore(store)
    const source = index ? table.index(index) : table
    return new Promise((resolve, reject) => {
      const out: T[] = []
      let skipped = offset === 0
      let acceptedSkip = 0
      const r = source.openCursor(
        key ? IDBKeyRange.only(key) : undefined,
        'prev',
      )
      r.onerror = () => reject(r.error)
      r.onsuccess = () => {
        const cursor = r.result
        if (cursor && accept) {
          if (!accept(cursor.value)) {
            cursor.continue()
            return
          }
          if (acceptedSkip < offset) {
            acceptedSkip++
            cursor.continue()
            return
          }
        }
        if (cursor && !accept && !skipped) {
          skipped = true
          cursor.advance(offset)
          return
        }
        if (!cursor || out.length >= limit) {
          resolve(out)
          return
        }
        out.push(cursor.value)
        cursor.continue()
      }
    })
  }
  async dueProblems(config: LearningConfig, now: number) {
    const tx = this.tx(['problems']),
      store = tx.objectStore('problems').index('dueAt')
    return new Promise<ProblemRecord[]>((resolve, reject) => {
      const candidates: ProblemRecord[] = [],
        r = store.openCursor(IDBKeyRange.upperBound(now))
      const compare = (a: ProblemRecord, b: ProblemRecord) =>
        (a.status === 'active' ? 0 : 1) - (b.status === 'active' ? 0 : 1) ||
        a.dueAt - b.dueAt ||
        b.errors - a.errors
      r.onerror = () => reject(r.error)
      r.onsuccess = () => {
        const c = r.result
        if (!c) {
          resolve(candidates)
          return
        }
        const p = c.value as ProblemRecord
        if (compatible(p, config)) {
          candidates.push(p)
          candidates.sort(compare)
          if (candidates.length > 50) candidates.pop()
        }
        c.continue()
      }
    })
  }
  async relatedExamples(problem: ProblemRecord, config: LearningConfig) {
    const tx = this.tx(['decisions']),
      index = tx.objectStore('decisions').index('skillKey')
    return new Promise<DecisionRecord[]>((resolve, reject) => {
      const found = new Map<string, DecisionRecord>(),
        r = index.openCursor(IDBKeyRange.only(problem.skillKey), 'prev')
      const compare = (a: DecisionRecord, b: DecisionRecord) =>
        Number(problem.usedExamples.includes(a.nodeKey)) -
          Number(problem.usedExamples.includes(b.nodeKey)) ||
        a.createdAt - b.createdAt
      r.onerror = () => reject(r.error)
      r.onsuccess = () => {
        const c = r.result
        if (!c) {
          resolve([...found.values()].sort(compare))
          return
        }
        const d = c.value as DecisionRecord,
          key = d.exampleKey ?? d.nodeKey
        if (
          key !== (problem.exampleKey ?? problem.nodeKey) &&
          d.learning.kind !== 'ungraded' &&
          compatible({ config: d.config, hero: d.before.hand.hero }, config)
        ) {
          if (!found.has(key)) found.set(key, d)
          if (found.size > 20) {
            const worst = [...found.values()].sort(compare).at(-1)!
            found.delete(worst.exampleKey ?? worst.nodeKey)
          }
        }
        c.continue()
      }
    })
  }
  async usage() {
    const tx = this.tx([...STORES])
    const sizes = await Promise.all(
      STORES.map(
        (name) =>
          new Promise<number>((resolve, reject) => {
            let size = 0
            const r = tx.objectStore(name).openCursor()
            r.onerror = () => reject(r.error)
            r.onsuccess = () => {
              const c = r.result
              if (!c) {
                resolve(size)
                return
              }
              if (c.key !== LEASE)
                size += new TextEncoder().encode(JSON.stringify(c.value)).length
              c.continue()
            }
          }),
      ),
    )
    return sizes.reduce((a, b) => a + b, 0)
  }
  async meta(): Promise<LearningMeta> {
    const state = await this.get<LearningMeta>('meta', META)
    if (state && state.version !== 1) throw Error('Unsupported history version')
    return state ?? defaultMeta()
  }
  async cache(source: SourceRecord) {
    validateSource(source)
    const tx = this.tx(['sources', 'meta'], 'readwrite'),
      completion = done(tx)
    try {
      await this.fence(tx)
      tx.objectStore('sources').put(source)
      await completion
    } catch (e) {
      tx.abort()
      await completion.catch(() => {})
      throw e
    }
  }
  async setMeta(meta: LearningMeta) {
    const tx = this.tx(['meta'], 'readwrite'),
      completion = done(tx)
    try {
      await this.fence(tx)
      tx.objectStore('meta').put({ ...meta, id: META })
      await completion
    } catch (e) {
      try {
        tx.abort()
      } catch {}
      await completion.catch(() => {})
      throw e
    }
  }
  /** Atomic parking/restoration of at most two live hands. Manual practice
   * parks its preserved live cursor, never a retry masquerading as live play. */
  async switchMode(
    current: GameMode,
    next: GameMode,
  ): Promise<LearningConfig | null> {
    if (!isGameMode(current) || !isGameMode(next) || current === next)
      throw Error('Invalid mode change')
    await this.queue
    const tx = this.tx(['meta', 'hands'], 'readwrite'),
      completion = done(tx)
    try {
      await this.fence(tx)
      const store = tx.objectStore('meta'),
        hands = tx.objectStore('hands')
      const state: LearningMeta = (await req(store.get(META))) ?? defaultMeta()
      const parked = { ...state.modeCursors },
        live = state.resume ?? state.cursor
      if (live) {
        const hand: HandRecord | undefined = await req(hands.get(live.handId))
        if (!hand || hand.origin === 'manual' || hand.config.mode !== current)
          throw Error('Save the current live hand before changing modes.')
        parked[current] = live
      }
      const target = parked[next] ?? null
      const hand: HandRecord | undefined = target
        ? await req(hands.get(target.handId))
        : undefined
      if (
        target &&
        (!hand || hand.config.mode !== next || hand.origin === 'manual')
      )
        throw Error(
          'The saved hand for this mode is unavailable. Your current hand has been kept.',
        )
      store.put({
        ...state,
        modeCursors: parked,
        cursor: target,
        resume: null,
        id: META,
      })
      await completion
      return hand?.config ?? null
    } catch (e) {
      try {
        tx.abort()
      } catch {}
      await completion.catch(() => {})
      throw e
    }
  }
  private readPending(): WriteEvent[] {
    const raw = this.pending?.getItem(this.walKey)
    if (!raw) return []
    if (new TextEncoder().encode(raw).length > WAL_LIMIT)
      throw Error(
        'Pending recovery data exceeds its safety limit; export it before clearing.',
      )
    const parsed = JSON.parse(raw)
    if (
      !Array.isArray(parsed) ||
      parsed.some(
        (e) =>
          !e ||
          typeof e.id !== 'string' ||
          !e.hand ||
          !e.cursor ||
          !Number.isFinite(e.at),
      )
    )
      throw Error('Pending recovery data is damaged; it has not been erased.')
    return parsed
  }
  pendingText() {
    return this.pending?.getItem(this.walKey) ?? '[]'
  }
  submit(event: WriteEvent): Promise<void> {
    // Synchronous write-ahead: answer submission doesn't depend on Continue or unload.
    let walError: unknown
    try {
      const pending = this.readPending()
      const events = pending.filter(
        (e) =>
          e.id !== event.id &&
          (e.hand.id !== event.hand.id || !!e.decision || !!e.finished),
      )
      const source =
        event.source ??
        pending.find((e) => e.hand.id === event.hand.id && e.source)?.source
      const sources =
        event.sources ??
        pending.find((e) => e.hand.id === event.hand.id && e.sources)?.sources
      events.push({
        ...event,
        ...(source ? { source } : {}),
        ...(sources ? { sources } : {}),
      })
      const text = JSON.stringify(events)
      if (new TextEncoder().encode(text).length > WAL_LIMIT)
        throw Error('Pending buffer is full')
      this.pending?.setItem(this.walKey, text)
    } catch (e) {
      walError = e
    }
    const work = this.queue
      .catch(() => {})
      .then(async () => {
        await this.commit(event)
        try {
          const rest = this.readPending().filter((e) => e.id !== event.id)
          if (rest.length)
            this.pending?.setItem(this.walKey, JSON.stringify(rest))
          else this.pending?.removeItem(this.walKey)
        } catch (e) {
          if (walError) throw e
        }
      })
    this.queue = work
    return work
  }
  async recover() {
    for (const event of this.readPending()) await this.submit(event)
  }
  private async commit(event: WriteEvent) {
    if (this.overBudget)
      throw Error(
        'Protected history fills the local learning budget. Export history and clear unneeded data before saving more.',
      )
    const tx = this.tx(
        ['sources', 'sessions', 'hands', 'decisions', 'problems', 'meta'],
        'readwrite',
      ),
      completion = done(tx)
    try {
      await this.fence(tx)
      for (const source of event.sources ?? []) {
        validateSource(source)
        tx.objectStore('sources').put(source)
      }
      if (event.source) {
        validateSource(event.source)
        tx.objectStore('sources').put(event.source)
      }
      const m = tx.objectStore('meta'),
        state: LearningMeta = (await req(m.get(META))) ?? defaultMeta()
      const hs = tx.objectStore('hands'),
        ss = tx.objectStore('sessions'),
        ds = tx.objectStore('decisions'),
        ps = tx.objectStore('problems')
      const existing: HandRecord | undefined = await req(hs.get(event.hand.id))
      if (
        existing?.revision !== undefined &&
        existing.revision >= event.revision &&
        !event.decision
      ) {
        await completion
        return
      }
      // A replayed event cannot rewind an already committed cursor.
      if (event.decision && (await req(ds.get(event.decision.id)))) {
        await completion
        return
      }
      let session: SessionRecord | undefined = await req(
        ss.get(existing?.sessionId ?? event.hand.sessionId),
      )
      if (!session) {
        const previous: SessionRecord | undefined = state.sessionId
          ? await req(ss.get(state.sessionId))
          : undefined
        if (needsSession(previous ?? null, event.at)) {
          if (previous && !previous.endedAt) {
            previous.endedAt = previous.lastActivityAt
            ss.put(previous)
          }
          session = createSession(event.at)
          session.id = event.hand.sessionId
        } else session = previous!
      }
      const stale =
        existing?.revision !== undefined && existing.revision >= event.revision
      const hand = {
        ...(stale ? existing : event.hand),
        revision: Math.max(existing?.revision ?? 0, event.revision),
        sessionId: session.id,
        completedAt: existing?.completedAt ?? event.hand.completedAt,
      }
      if (event.decision) {
        const d = { ...event.decision, sessionId: session.id }
        d.firstExposure =
          (await req(ds.index('nodeKey').count(d.nodeKey))) === 0
        ds.add(d)
        state.activity = countAnswer(
          state.activity ?? activityFrom([]),
          d.createdAt,
        )
        if (
          existing &&
          event.at - session.lastActivityAt >= 30 * 60 * 1000 &&
          session.endedAt === null
        )
          session.endedAt = session.lastActivityAt
        session = touchSession(session, event.at)
        session.counts[d.origin].decisions++
        const exposure = d.firstExposure ? 'firstExposures' : 'repeatExposures'
        session.counts[d.origin][exposure] =
          (session.counts[d.origin][exposure] ?? 0) + 1
        session.counts[d.origin][d.learning.kind]++
        let problem: ProblemRecord | undefined =
          d.targeted && hand.target
            ? await req(ps.get(hand.target.problemId))
            : undefined
        if (!problem && d.problemId) problem = await req(ps.get(d.problemId))
        if (!problem && d.problemId)
          problem = {
            version: 1,
            id: d.problemId,
            nodeKey: d.nodeKey,
            skillKey: d.skillKey,
            fundamentalSkills: d.fundamentalSkills ?? [],
            exampleKey: d.exampleKey,
            config: d.config,
            hero: d.before.hand.hero,
            street: d.prompt.street,
            title: d.prompt.title,
            firstSeenAt: event.at,
            lastSeenAt: event.at,
            errors: 0,
            reviews: 0,
            successes: 0,
            successSessions: [],
            examples: [],
            usedExamples: [],
            status: 'active',
            dueAt: event.at,
            lastReviewedAt: null,
            note: '',
            pinned: false,
          }
        if (problem) {
          problem.lastSeenAt = event.at
          if (d.learning.kind === 'outside') {
            problem.errors++
            problem.status = 'active'
            problem.successes = 0
            problem.successSessions = []
            problem.dueAt = event.at + 60_000
          }
          if (d.targeted && d.learning.kind !== 'ungraded') {
            problem.reviews++
            problem.lastReviewedAt = event.at
            hand.targetAnswered = true
            if (d.learning.kind !== 'outside') {
              problem.successes++
              if (!problem.successSessions.includes(session.id))
                problem.successSessions = [
                  ...problem.successSessions.slice(-31),
                  session.id,
                ]
              if (!problem.usedExamples.includes(d.nodeKey))
                problem.usedExamples = [
                  ...problem.usedExamples.slice(-31),
                  d.nodeKey,
                ]
              problem.dueAt =
                event.at +
                Math.min(
                  30 * 86400000,
                  3600000 * 2 ** Math.min(problem.successes, 10),
                )
              const hasRelated = await new Promise<boolean>(
                (resolve, reject) => {
                  const r = ds
                    .index('skillKey')
                    .openCursor(IDBKeyRange.only(problem!.skillKey))
                  r.onerror = () => reject(r.error)
                  r.onsuccess = () => {
                    const c = r.result
                    if (!c) {
                      resolve(false)
                      return
                    }
                    const a = c.value as DecisionRecord
                    if (
                      (a.exampleKey ?? a.nodeKey) !==
                        (problem!.exampleKey ?? problem!.nodeKey) &&
                      a.learning.kind !== 'ungraded'
                    ) {
                      resolve(true)
                      return
                    }
                    c.continue()
                  }
                },
              )
              const varied =
                !hasRelated ||
                problem.usedExamples.some((k) => k !== problem!.nodeKey)
              if (
                problem.successes >= 3 &&
                problem.successSessions.length >= 2 &&
                varied
              )
                problem.status = 'maintenance'
              if (
                problem.successes >= 6 &&
                problem.successSessions.length >= 3 &&
                varied
              ) {
                problem.status = 'archive'
                problem.dueAt = event.at + 30 * 86400000
              }
            }
          }
          if (d.learning.kind === 'outside' && !problem.examples.includes(d.id))
            problem.examples = [...problem.examples.slice(-2), d.id]
          ps.put(problem)
        }
      }
      if (hand.decisions > (await req(ds.index('handId').count(hand.id))))
        throw Error(
          'An earlier answer is still pending. Retry saving or export pending work.',
        )
      if (event.finished && !existing?.completedAt) {
        hand.completedAt = event.at
        if (hand.decisions > 0) {
          session.counts[hand.origin].hands++
          if (hand.origin !== 'manual') {
            state.scheduler =
              state.nextScheduler ?? advanceScheduler(state.scheduler)
            delete state.nextScheduler
          }
        }
        state.lastHandFinished = hand.id
      }
      hs.put(hand)
      ss.put(session)
      state.sessionId = session.id
      if (!stale) {
        state.cursor = event.cursor
        if (hand.origin !== 'manual')
          state.modeCursors = {
            ...state.modeCursors,
            [hand.config.mode]: event.cursor,
          }
      }
      m.put({ ...state, id: META })
      await completion
    } catch (e) {
      try {
        tx.abort()
      } catch {}
      await completion.catch(() => {})
      throw e
    }
  }
  async backup(): Promise<LearningBackup> {
    const tx = this.tx([...STORES]),
      completion = done(tx)
    const arrays = await Promise.all(
      TABLES.map((s) => req(tx.objectStore(s).getAll())),
    )
    const meta = (await req(tx.objectStore('meta').get(META))) ?? defaultMeta()
    await completion
    return {
      version: 1,
      exportedAt: Date.now(),
      sources: arrays[0],
      sessions: arrays[1],
      hands: arrays[2],
      decisions: arrays[3],
      problems: arrays[4],
      meta,
    }
  }
  async importPending(input: unknown) {
    if (!input || typeof input !== 'object')
      throw Error('Invalid recovery file')
    const data = input as {
      version: number
      kind: string
      sources: SourceRecord[]
      events: WriteEvent[]
    }
    if (
      data.version !== 1 ||
      data.kind !== 'pending-recovery' ||
      !Array.isArray(data.sources) ||
      !Array.isArray(data.events) ||
      data.sources.length > 256 ||
      data.events.length > 2000
    )
      throw Error('Invalid recovery file')
    const existing = await this.backup(),
      sources = new Map(existing.sources.map((s) => [s.id, s]))
    for (const source of data.sources) {
      validateSource(source)
      sources.set(source.id, source)
    }
    for (const e of data.events) {
      if (
        !e ||
        typeof e.id !== 'string' ||
        !Number.isSafeInteger(e.revision) ||
        e.revision < 1 ||
        !Number.isFinite(e.at) ||
        e.at < 0 ||
        e.cursor?.handId !== e.hand?.id ||
        (e.decision && e.decision.handId !== e.hand.id)
      )
        throw Error('Invalid recovery event')
      for (const source of e.sources ?? []) {
        validateSource(source)
        sources.set(source.id, source)
      }
      if (e.source) {
        validateSource(e.source)
        sources.set(e.source.id, e.source)
      }
    }
    validateRecords({
      version: 1,
      exportedAt: Date.now(),
      sources: [...sources.values()],
      sessions: [],
      hands: data.events.map((e) => e.hand),
      decisions: data.events.flatMap((e) => (e.decision ? [e.decision] : [])),
      problems: [],
      meta: { ...defaultMeta(), cursor: null },
    })
    // Validation precedes writes. Replay is idempotent; a quota failure can be retried with the same file.
    for (const source of sources.values())
      if (!existing.sources.some((s) => s.id === source.id))
        await this.cache(source)
    for (const event of data.events) await this.submit(event)
  }
  async restore(input: unknown, clearPending = true) {
    const data = validateBackup(input)
    const tx = this.tx([...STORES], 'readwrite'),
      completion = done(tx)
    try {
      await this.fence(tx)
      for (const name of TABLES) {
        tx.objectStore(name).clear()
        for (const value of data[name]) tx.objectStore(name).put(value)
      }
      tx.objectStore('meta').put({ ...data.meta, id: META })
      if (!data.meta.activity)
        tx.objectStore('meta').put({
          ...data.meta,
          activity: activityFrom(data.decisions.map((d) => d.createdAt)),
          id: META,
        })
      await completion
      if (clearPending) this.pending?.removeItem(this.walKey)
      this.overBudget = false
    } catch (e) {
      try {
        tx.abort()
      } catch {}
      await completion.catch(() => {})
      throw e
    }
  }
  async maintain() {
    const task = this.queue
      .catch(() => {})
      .then(async () => {
        const tx = this.tx([...STORES], 'readwrite'),
          completion = done(tx)
        try {
          await this.fence(tx)
          const arrays = await Promise.all(
            TABLES.map((s) => req(tx.objectStore(s).getAll())),
          )
          const meta =
            (await req(tx.objectStore('meta').get(META))) ?? defaultMeta()
          const before: LearningBackup = {
            version: 1,
            exportedAt: Date.now(),
            sources: arrays[0],
            sessions: arrays[1],
            hands: arrays[2],
            decisions: arrays[3],
            problems: arrays[4],
            meta,
          }
          const result = compactBackup(before)
          if (
            result.removed > 0 ||
            result.data.hands.length !== before.hands.length ||
            result.data.sources.length !== before.sources.length
          ) {
            for (const name of TABLES) {
              const table = tx.objectStore(name)
              table.clear()
              for (const item of result.data[name]) table.put(item)
            }
          }
          await completion
          this.overBudget = result.protectedOverBudget
          if (result.protectedOverBudget)
            throw Error(
              'Protected history fills the local learning budget. Export history before saving more.',
            )
          return { bytes: result.bytes, removed: result.removed }
        } catch (e) {
          try {
            tx.abort()
          } catch {}
          await completion.catch(() => {})
          throw e
        }
      })
    this.queue = task
    return task
  }
  async reserveReview() {
    const tx = this.tx(['meta'], 'readwrite'),
      completion = done(tx)
    try {
      await this.fence(tx)
      const meta: LearningMeta =
        (await req(tx.objectStore('meta').get(META))) ?? defaultMeta()
      if (meta.nextScheduler) {
        meta.scheduler = meta.nextScheduler
        delete meta.nextScheduler
      }
      const previous = structuredClone(meta)
      if (
        meta.scheduler.enabled &&
        meta.scheduler.index === meta.scheduler.slot &&
        !meta.scheduler.slotUsed
      )
        meta.scheduler.slotUsed = true
      tx.objectStore('meta').put({ ...meta, id: META })
      await completion
      return previous
    } catch (e) {
      try {
        tx.abort()
      } catch {}
      await completion.catch(() => {})
      throw e
    }
  }
  async settings(enabled: boolean, interval: number) {
    const tx = this.tx(['meta'], 'readwrite'),
      completion = done(tx)
    try {
      await this.fence(tx)
      const meta: LearningMeta =
        (await req(tx.objectStore('meta').get(META))) ?? defaultMeta()
      meta.nextScheduler = configureScheduler(meta.scheduler, enabled, interval)
      tx.objectStore('meta').put({ ...meta, id: META })
      await completion
      return meta.nextScheduler
    } catch (e) {
      try {
        tx.abort()
      } catch {}
      await completion.catch(() => {})
      throw e
    }
  }
  async annotate(
    id: string,
    note: string,
    pinned: boolean,
    attemptId?: string,
  ) {
    if (note.length > 2000) throw Error('Notes are limited to 2,000 characters')
    const tx = this.tx(['problems', 'decisions', 'meta'], 'readwrite'),
      completion = done(tx)
    try {
      await this.fence(tx)
      const p = await req(tx.objectStore('problems').get(id))
      if (!p) throw Error('Problem unavailable')
      const chosen = pinned
        ? (attemptId ?? p.pinnedExample ?? p.examples.at(-1) ?? null)
        : null
      if (p.pinnedExample && p.pinnedExample !== chosen) {
        const old = await req(tx.objectStore('decisions').get(p.pinnedExample))
        if (old) tx.objectStore('decisions').put({ ...old, pinned: false })
      }
      if (chosen) {
        const selected = await req(tx.objectStore('decisions').get(chosen))
        if (!selected) throw Error('Pinned attempt is unavailable')
        tx.objectStore('decisions').put({ ...selected, pinned: true })
      }
      tx.objectStore('problems').put({
        ...p,
        note,
        pinned,
        pinnedExample: chosen,
      })
      await completion
    } catch (e) {
      try {
        tx.abort()
      } catch {}
      await completion.catch(() => {})
      throw e
    }
  }
}

export function validateBackup(input: unknown): LearningBackup {
  if (!input || typeof input !== 'object') throw Error('Invalid backup')
  const d = input as LearningBackup
  if (
    d.version !== 1 ||
    !Number.isFinite(d.exportedAt) ||
    !d.meta ||
    d.meta.version !== 1
  )
    throw Error('Unsupported backup version')
  for (const name of TABLES) {
    const values = d[name]
    if (
      !Array.isArray(values) ||
      values.length > 100000 ||
      new Set(values.map((v) => v?.id)).size !== values.length ||
      values.some((v) => !v || v.version !== 1 || typeof v.id !== 'string')
    )
      throw Error(`Invalid ${name}`)
  }
  const sources = new Map(
    d.sources.map((s) => {
      validateSource(s)
      return [s.id, s] as const
    }),
  )
  const sessions = new Set(d.sessions.map((s) => s.id)),
    hands = new Map(d.hands.map((h) => [h.id, h]))
  for (const h of d.hands) {
    if (
      !sessions.has(h.sessionId) ||
      !['regular', 'adaptive', 'manual'].includes(h.origin)
    )
      throw Error('Invalid hand relationship')
    const source = sources.get(h.config.rangesId)
    if (!source) throw Error('Missing range source')
    unpackHand(h.initial, source)
    if (h.scriptId && !sources.has(h.scriptId))
      throw Error('Missing script source')
  }
  for (const a of d.decisions) {
    if (
      !hands.has(a.handId) ||
      !sessions.has(a.sessionId) ||
      !Array.isArray(a.prompt?.options) ||
      a.chosen < 0 ||
      a.chosen >= a.prompt.options.length ||
      !['match', 'alternative', 'outside', 'ungraded'].includes(
        a.learning?.kind,
      ) ||
      !Number.isFinite(a.createdAt)
    )
      throw Error('Invalid decision')
    const source = sources.get(a.config.rangesId)
    if (!source) throw Error('Missing decision source')
    unpackHand(a.before.hand, source)
  }
  for (const p of d.problems) {
    if (
      !Array.isArray(p.examples) ||
      p.examples.some((id) => !d.decisions.some((a) => a.id === id)) ||
      !Number.isFinite(p.errors) ||
      !['active', 'maintenance', 'archive'].includes(p.status)
    )
      throw Error('Invalid problem')
  }
  const s = d.meta.scheduler
  if (
    !s ||
    !Number.isInteger(s.interval) ||
    s.interval < 2 ||
    s.interval > 20 ||
    !Number.isInteger(s.index) ||
    s.index < 0 ||
    s.index >= s.interval ||
    !Number.isInteger(s.slot) ||
    s.slot < 0 ||
    s.slot >= s.interval
  )
    throw Error('Invalid scheduler')
  if (d.meta.cursor && !hands.has(d.meta.cursor.handId))
    throw Error('Missing live hand')
  validateRecords(d)
  return structuredClone(d)
}
