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
import { configureScheduler } from './scheduler'
import { compactBackup } from './retention'

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
    const opening = indexedDB.open(this.name, 3)
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
        if(name==='decisions'&&!store.indexNames.contains('skillKey'))store.createIndex('skillKey','skillKey')
        if (name === 'decisions' && !store.indexNames.contains('nodeKey'))
          store.createIndex('nodeKey', 'nodeKey')
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
  async acquire(now = Date.now()): Promise<boolean> {
    const tx = this.tx(['meta'], 'readwrite'),
      completion = done(tx),
      store = tx.objectStore('meta')
    const old = await req(store.get(LEASE))
    if (old && old.owner !== this.owner && old.until > now) {
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
  ): Promise<T[]> {
    const tx = this.tx([store]),
      table = tx.objectStore(store)
    const source = index ? table.index(index) : table
    return new Promise((resolve, reject) => {
      const out: T[] = []
      const r = source.openCursor(
        key ? IDBKeyRange.only(key) : undefined,
        'prev',
      )
      r.onerror = () => reject(r.error)
      r.onsuccess = () => {
        const cursor = r.result
        if (!cursor || out.length >= limit) {
          resolve(out)
          return
        }
        out.push(cursor.value)
        cursor.continue()
      }
    })
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
  private readPending(): WriteEvent[] {
    const raw = this.pending?.getItem(this.walKey)
    if (!raw) return []
    if (raw.length > WAL_LIMIT)
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
      const events = this.readPending().filter((e) => e.id !== event.id)
      events.push(event)
      const text = JSON.stringify(events)
      if (text.length > WAL_LIMIT) throw Error('Pending buffer is full')
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
    const tx = this.tx(
        ['sources', 'sessions', 'hands', 'decisions', 'problems', 'meta'],
        'readwrite',
      ),
      completion = done(tx)
    try {
      await this.fence(tx)
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
        existing.revision >= event.revision
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
      const hand = {
        ...event.hand,
        revision: event.revision,
        sessionId: session.id,
        completedAt: existing?.completedAt ?? event.hand.completedAt,
      }
      if (event.decision) {
        const d = { ...event.decision, sessionId: session.id }
        d.firstExposure =
          (await req(ds.index('nodeKey').count(d.nodeKey))) === 0
        ds.add(d)
        if (
          existing &&
          event.at - session.lastActivityAt >= 30 * 60 * 1000 &&
          session.endedAt === null
        )
          session.endedAt = session.lastActivityAt
        session = touchSession(session, event.at)
        session.counts[d.origin].decisions++
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
                problem.successSessions=[...problem.successSessions.slice(-31),session.id]
              if (!problem.usedExamples.includes(d.nodeKey))
                problem.usedExamples=[...problem.usedExamples.slice(-31),d.nodeKey]
              problem.dueAt =
                event.at +
                Math.min(
                  30 * 86400000,
                  3600000 * 2 ** Math.min(problem.successes, 10),
                )
              const covered:DecisionRecord[]=await req(ds.index('skillKey').getAll(problem.skillKey,1000))
              const hasRelated=covered.some(a=>a.nodeKey!==problem!.nodeKey&&a.learning.kind!=='ungraded')
              const varied=!hasRelated||problem.usedExamples.some(k=>k!==problem!.nodeKey)
              if(problem.successes>=3&&problem.successSessions.length>=2&&varied)problem.status='maintenance'
              if(problem.successes>=6&&problem.successSessions.length>=3&&varied){problem.status='archive';problem.dueAt=event.at+30*86400000}
            }
          }
          if (d.learning.kind === 'outside' && !problem.examples.includes(d.id))
            problem.examples = [...problem.examples.slice(-2), d.id]
          ps.put(problem)
        }
      }
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
      state.cursor = event.cursor
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
  async restore(input: unknown) {
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
      await completion
      this.pending?.removeItem(this.walKey)
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
        const result = compactBackup(await this.backup())
        if (result.removed > 0) await this.restore(result.data)
        if (result.protectedOverBudget)
          throw Error(
            'Protected history exceeds the local budget. Export history; new details may not fit.',
          )
        return { bytes: result.bytes, removed: result.removed }
      })
    this.queue = task
    return task
  }
  async settings(enabled:boolean,interval:number){
    const tx=this.tx(['meta'],'readwrite'),completion=done(tx)
    try{await this.fence(tx);const meta:LearningMeta=(await req(tx.objectStore('meta').get(META)))??defaultMeta();meta.nextScheduler=configureScheduler(meta.scheduler,enabled,interval);tx.objectStore('meta').put({...meta,id:META});await completion;return meta.nextScheduler}catch(e){try{tx.abort()}catch{}await completion.catch(()=>{});throw e}
  }
  async annotate(id: string, note: string, pinned: boolean) {
    if (note.length > 2000) throw Error('Notes are limited to 2,000 characters')
    const tx = this.tx(['problems', 'meta'], 'readwrite'),
      completion = done(tx)
    try {
      await this.fence(tx)
      const p = await req(tx.objectStore('problems').get(id))
      if (!p) throw Error('Problem unavailable')
      tx.objectStore('problems').put({ ...p, note, pinned })
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
