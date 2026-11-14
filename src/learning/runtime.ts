import { shortActionLabel, positionOf } from '@/lib/fullHands'
import type { HandState } from '@/lib/handSim'
import type { HandScript, PostflopPlay, SuitMap } from '@/lib/fullHands'
import { EMPTY_SCORE, type Score, type Prompt } from '@/lib/trainer'
import { createSource, validateSource } from './sources'
import {
  packDecision,
  packHand,
  unpackDecision,
  unpackHand,
} from './checkpoints'
import { preflopReference } from './classification'
import { newId } from './identity'
import { buildDecision } from './attempts'
import { referenceFamily } from './families'
import { configKey, decisionKey } from './keys'
import { LearningRepository, type WriteEvent } from './repository'
import { selectProblem } from './scheduler'
import type {
  Cursor,
  DecisionRecord,
  HandRecord,
  LearningConfig,
  SavedPrompt,
  SourceRecord,
} from './types'
import type { Decision } from '@/lib/handSim'
export interface NativePrompt extends Prompt {
  street?: SavedPrompt['street']
  decision?: Decision
  grid?: Record<string, number[]>
  kinds?: string[]
}
export interface NativeState {
  hand: HandState
  play?: PostflopPlay | null
  phase: 'npc' | 'hero' | 'verdict'
  score: Score
  decisions: number
  forcedFold?: boolean
}
export interface Restored {
  hand: HandRecord
  cursor: Cursor
  script: HandScript | null
  attempt: DecisionRecord | null
}
export function savedPrompt(prompt: NativePrompt): SavedPrompt {
  return {
    title: prompt.title,
    options: structuredClone(prompt.options),
    probs: [...prompt.probs],
    expected: prompt.expected,
    street: prompt.street ?? 'preflop',
    reference: prompt.decision
      ? preflopReference(prompt.decision)
      : { values: [...prompt.probs], scale: 100, applicable: true },
    ...(prompt.decision ? { decision: packDecision(prompt.decision) } : {}),
  }
}
export class JournalRuntime {
  feedback: DecisionRecord | null = null
  active: HandRecord | null = null
  restored: Restored | null = null
  private script: HandScript | null = null
  private ordinal = 0
  private revision = 0
  private rng = crypto.getRandomValues(new Uint32Array(1))[0] || 1
  private recoverySources = new Map<string, SourceRecord>()
  private pendingSource: SourceRecord | null = null
  private verdict: Cursor['verdict'] = null
  private lastCursor: Cursor | null = null
  private saveFailed = false
  private unsaved = new Map<string, WriteEvent>()
  private chain: Promise<unknown> = Promise.resolve()
  constructor(
    readonly repo: LearningRepository | null,
    readonly config: LearningConfig,
    readonly source: SourceRecord,
    private notify: (message: string) => void,
    readonly manual = false,
  ) {}
  async hydrate() {
    if (!this.repo) return
    const meta = await this.repo.meta()
    if (meta.cursor) {
      const hand = await this.repo.get<HandRecord>('hands', meta.cursor.handId)
      if (
        hand &&
        configKey(hand.config) === configKey(this.config) &&
        (!this.config.seat || hand.initial.hero === this.config.seat)
      ) {
        const restored = await this.restore(hand, meta.cursor)
        this.adopt(restored)
        return
      }
    }
    const review = await this.chooseReview()
    if (review) this.adopt(review)
  }
  async restore(hand: HandRecord, cursor: Cursor): Promise<Restored> {
    unpackHand(cursor.hand, this.source)
    const scriptSource = hand.scriptId
      ? await this.repo?.get<SourceRecord>('sources', hand.scriptId)
      : null
    if (hand.scriptId && scriptSource?.kind !== 'script')
      throw Error(
        'Original script is unavailable. The saved hand has not been replaced.',
      )
    if (scriptSource) validateSource(scriptSource)
    return {
      hand,
      cursor,
      script: scriptSource?.kind === 'script' ? scriptSource.payload : null,
      attempt: cursor.verdict
        ? ((await this.repo?.get<DecisionRecord>(
            'decisions',
            cursor.verdict.decisionId,
          )) ?? null)
        : null,
    }
  }
  adopt(restored: Restored) {
    this.script = restored.script
    this.recoverySources.set(this.source.id, this.source)
    if (restored.script) {
      const source = createSource(
        'script',
        `restored:${restored.script.spot}`,
        restored.script,
      )
      this.recoverySources.set(source.id, source)
    }
    this.feedback = restored.attempt
    this.restored = restored
    this.active = structuredClone(restored.hand)
    this.ordinal = restored.cursor.ordinal
    this.revision = restored.hand.revision ?? 0
    this.verdict = restored.cursor.verdict
    this.rng = restored.cursor.rng
    this.lastCursor = restored.cursor
  }
  nativeHand() {
    if (!this.restored) throw Error('No saved hand')
    return unpackHand(this.restored.cursor.hand, this.source)
  }
  nativePrompt(
    saved: SavedPrompt,
    script: HandScript | null,
    play: PostflopPlay | null,
  ): NativePrompt {
    const node =
      script && play
        ? script.streets[play.streetIndex]?.nodes[play.nodeIndex]
        : null
    return {
      ...saved,
      ...(saved.decision
        ? { decision: unpackDecision(saved.decision, this.source) }
        : { decision: undefined }),
      ...(node ? { grid: node.grid, kinds: node.actions.map((a) => a.a) } : {}),
    }
  }
  begin(
    hand: HandState,
    script?: HandScript,
    suitMap?: SuitMap,
    foldHand = false,
  ) {
    this.script = script ?? null
    const source = script
      ? createSource(
          'script',
          `${script.spot}:${script.heroCards.join('')}:${script.board.join('')}`,
          script,
        )
      : null
    this.pendingSource = source ?? this.source
    this.recoverySources.set(this.source.id, this.source)
    if (source && this.recoverySources.size < 128)
      this.recoverySources.set(source.id, source)
    this.active = {
      version: 1,
      id: newId('hand'),
      sessionId: newId('session'),
      config: this.config,
      origin: this.manual ? 'manual' : 'regular',
      createdAt: Date.now(),
      completedAt: null,
      initial: packHand(hand, this.source.id),
      scriptId: source?.id ?? null,
      suitMap: suitMap ?? null,
      foldHand,
      target: null,
      targetAnswered: false,
      decisions: 0,
      actions: [],
    }
    this.ordinal = 0
    this.revision = 0
    this.verdict = null
    this.restored = null
    this.feedback = null
  }
  cursor(state: NativeState): Cursor {
    if (!this.active) throw Error('No active hand')
    return {
      version: 1,
      handId: this.active.id,
      hand: packHand(state.hand, this.source.id),
      play: state.play ?? null,
      phase: state.phase,
      verdict: state.phase === 'verdict' ? this.verdict : null,
      score: state.score,
      ordinal: this.ordinal,
      decisions: state.decisions,
      forcedFold: state.forcedFold ?? false,
      npcAction: null,
      rng: this.rng,
    }
  }
  persist(state: NativeState, finished = false, decision?: DecisionRecord) {
    if (!this.active) return
    const cursor = this.cursor(state)
    const previous = this.lastCursor
    if (previous?.handId === cursor.handId) {
      for (const seat of state.hand.seats) {
        const old = previous.hand.seats.find(
          (s) => s.position === seat.position,
        )
        if (seat.lastAction && old?.lastAction !== seat.lastAction)
          this.active.actions.push({
            position: seat.position,
            action: seat.lastAction,
          })
      }
      if (
        this.script &&
        previous.play &&
        !previous.play.done &&
        JSON.stringify(previous.play) !== JSON.stringify(cursor.play)
      ) {
        const node =
          this.script.streets[previous.play.streetIndex]?.nodes[
            previous.play.nodeIndex
          ]
        if (node)
          this.active.actions.push({
            position: positionOf(this.script, node.p),
            action: shortActionLabel(node.actions[node.chosen]),
          })
      }
    }
    this.lastCursor = cursor
    this.active.decisions = state.decisions
    const event: WriteEvent = {
      ...(this.pendingSource
        ? {
            source: this.pendingSource,
            ...(this.pendingSource.kind === 'script'
              ? { sources: [this.source] }
              : {}),
          }
        : {}),
      id: `${this.active.id}:revision:${++this.revision}`,
      revision: this.revision,
      hand: structuredClone(this.active),
      cursor,
      at: Date.now(),
      ...(decision ? { decision } : {}),
      finished,
    }
    this.pendingSource = null
    for (const [id, older] of this.unsaved)
      if (
        !older.decision &&
        !older.finished &&
        older.hand.id === event.hand.id &&
        !older.source
      )
        this.unsaved.delete(id)
    const pendingBytes = JSON.stringify([...this.unsaved.values()]).length
    if (pendingBytes + JSON.stringify(event).length > 2 * 1024 * 1024) {
      this.notify(
        'Not saved — recovery buffer is full. Export pending work before continuing; this new checkpoint cannot be retained.',
      )
      return
    }
    this.unsaved.set(event.id, event)
    if (!this.repo) {
      this.notify(
        'Not saved — local history is unavailable. Export pending work before closing.',
      )
      return
    }
    const firstFinish = finished && this.active.completedAt === null
    if (firstFinish) this.active.completedAt = Date.now()
    this.notify(
      this.saveFailed
        ? 'Not saved — earlier work is pending. Retry saving or export it.'
        : 'Saving…',
    )
    const write = this.repo.submit(event)
    this.chain = write
      .then(async () => {
        this.unsaved.delete(event.id)
        const needed = new Set([
          this.active?.scriptId,
          this.source.id,
          ...[...this.unsaved.values()].flatMap((e) => [
            e.hand.scriptId,
            e.hand.config.rangesId,
          ]),
        ])
        for (const id of this.recoverySources.keys())
          if (!needed.has(id)) this.recoverySources.delete(id)
        if (firstFinish) await this.repo!.maintain()
        if (!this.unsaved.size) this.saveFailed = false
        this.notify(
          this.unsaved.size
            ? this.saveFailed
              ? 'Not saved — earlier work is pending. Retry saving or export it.'
              : 'Saving…'
            : 'Saved on this device',
        )
      })
      .catch((e) => this.failed(e))
  }
  answer(
    before: NativeState,
    prompt: NativePrompt,
    chosen: number,
    after: NativeState,
  ): DecisionRecord | null {
    if (!this.active) return null
    // A synchronous latch: one answer per decision, including same-frame key/click repeats.
    if (
      this.lastCursor?.phase === 'verdict' &&
      this.lastCursor.ordinal === this.ordinal
    )
      return null
    const saved = savedPrompt(prompt),
      cursor = this.cursor({ ...before, phase: 'hero' })
    const family = referenceFamily(
      this.config,
      cursor,
      saved,
      this.script,
      this.active.suitMap,
    )
    const skill = family.skillKey
    const key = decisionKey(
      this.config,
      cursor.hand,
      saved,
      this.active.scriptId,
      cursor.play,
    )
    const record = buildDecision(
      this.active,
      cursor,
      saved,
      chosen,
      Date.now(),
      skill,
      true,
    )
    // Exposure is established transactionally against prior records by the repository.
    record.nodeKey = key
    record.exampleKey = family.exampleKey
    this.feedback = record
    this.ordinal++
    this.verdict = {
      decisionId: record.id,
      prompt: saved,
      guess: chosen,
      legacyGrade: record.legacyGrade,
      learning: record.learning,
    }
    if (record.targeted) this.active.targetAnswered = true
    this.persist(after, false, record)
    return record
  }
  async flush() {
    await this.chain
  }
  async retryPending() {
    if (!this.repo) return
    for (const event of this.unsaved.values()) {
      await this.repo.submit(event)
      this.unsaved.delete(event.id)
    }
    if (this.active && this.lastCursor)
      await this.repo.submit({
        id: `${this.active.id}:revision:${++this.revision}`,
        revision: this.revision,
        hand: structuredClone(this.active),
        cursor: structuredClone(this.lastCursor),
        at: Date.now(),
      })
    this.notify('Saved on this device')
  }
  pendingExport() {
    return JSON.stringify(
      {
        version: 1,
        kind: 'pending-recovery',
        sources: [...this.recoverySources.values()],
        events: [...this.unsaved.values()],
      },
      null,
      2,
    )
  }
  failed(error: unknown) {
    this.saveFailed = true
    this.notify(
      `Not saved — ${error instanceof Error ? error.message : 'Storage failed'}. Pending work can be exported.`,
    )
  }
  async chooseReview(): Promise<Restored | null> {
    if (!this.repo || this.manual) return null
    await this.flush()
    const meta = await this.repo.reserveReview()
    if (
      !meta.scheduler.enabled ||
      meta.scheduler.slotUsed ||
      meta.scheduler.index !== meta.scheduler.slot
    )
      return null
    const problems = await this.repo.dueProblems(this.config, Date.now())
    const problem = selectProblem(
      meta.scheduler,
      problems,
      this.config,
      Date.now(),
    )
    if (!problem) return null
    let attempt = await this.repo.get<DecisionRecord>(
      'decisions',
      problem.examples.at(-1) ?? '',
    )
    let variant: 'exact' | 'related' = 'exact'
    if (problem.reviews > 0 && problem.reviews % 3 !== 0) {
      const alternatives = await this.repo.relatedExamples(problem, this.config)
      if (alternatives[0]) {
        attempt = alternatives[0]
        variant = 'related'
      }
    }
    if (!attempt) return null
    const original = await this.repo.get<HandRecord>('hands', attempt.handId)
    if (!original) return null
    const hand: HandRecord = {
      ...structuredClone(original),
      id: newId('hand'),
      sessionId: newId('session'),
      revision: 0,
      origin: 'adaptive',
      createdAt: Date.now(),
      completedAt: null,
      target: {
        problemId: problem.id,
        nodeKey: attempt.nodeKey,
        variant,
      },
      targetAnswered: false,
      decisions: 0,
      actions: [],
    }
    const cursor: Cursor = {
      version: 1,
      handId: hand.id,
      hand: hand.initial,
      play: null,
      phase: 'npc',
      verdict: null,
      score: this.lastCursor?.score ?? EMPTY_SCORE,
      ordinal: 0,
      decisions: 0,
      forcedFold: false,
      npcAction: null,
      rng: crypto.getRandomValues(new Uint32Array(1))[0] || 1,
    }
    try {
      return await this.restore(hand, cursor)
    } catch {
      this.notify(
        'Review source unavailable — dealing a regular hand. Saved context remains in Review.',
      )
      return null
    }
  }
  /** Persist deterministic NPC sampling independent of the dealer and scheduler. */
  random = () => {
    let n = this.rng
    n ^= n << 13
    n ^= n >>> 17
    n ^= n << 5
    this.rng = n >>> 0 || 1
    return this.rng / 4294967296
  }
}
