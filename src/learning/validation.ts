import { isTopic } from '@/fundamentals/content'
import { isGameMode } from '@/lib/gameModes'
import { isPlayerCount, isPosition, positionsFor } from '@/lib/positions'
import { isFormat, isOpenSize, isRangeType, isStack } from '@/lib/scenarios'
import { gradeIndex } from '@/lib/trainer'
import { classify } from './classification'
import { unpackHand } from './checkpoints'
import { canonicalJson } from './identity'
import type {
  Cursor,
  LearningBackup,
  LearningConfig,
  SavedPrompt,
  SchedulerState,
  SourceRecord,
} from './types'
const integer = (n: number) => Number.isSafeInteger(n) && n >= 0
const text = (s: string, max = 500) => typeof s === 'string' && s.length <= max
const timestamp = (n: number | null) =>
  n === null || (Number.isFinite(n) && n >= 0)
export function validateConfig(c: LearningConfig) {
  if (
    !c ||
    !isGameMode(c.mode) ||
    !isFormat(c.format) ||
    !isStack(c.stack) ||
    !isRangeType(c.rangeType) ||
    !isOpenSize(c.openSize) ||
    !isPlayerCount(c.players) ||
    (c.seat &&
      (!isPosition(c.seat) || !positionsFor(c.players).includes(c.seat))) ||
    !text(c.rangesId)
  )
    throw Error('Invalid saved setup')
}
function validatePrompt(p: SavedPrompt) {
  if (
    !p ||
    !['preflop', 'flop', 'turn', 'river'].includes(p.street) ||
    !text(p.title) ||
    !Array.isArray(p.options) ||
    p.options.length < 1 ||
    p.options.length > 12 ||
    p.options.some(
      (o) => !o || !text(o.label, 200) || !text(o.key, 20) || !text(o.kind, 30),
    ) ||
    !integer(p.expected) ||
    p.expected >= p.options.length ||
    !Array.isArray(p.probs) ||
    p.probs.length !== p.options.length ||
    p.probs.some((n) => !Number.isFinite(n) || n < 0 || n > 100) ||
    !p.reference ||
    typeof p.reference.applicable !== 'boolean' ||
    ![1, 100].includes(p.reference.scale) ||
    !Array.isArray(p.reference.values) ||
    p.reference.values.length !== p.options.length ||
    p.reference.values.some(
      (n) => !Number.isFinite(n) || n < 0 || n > p.reference.scale,
    )
  )
    throw Error('Invalid saved prompt')
}
export function validateScheduler(s: SchedulerState) {
  if (
    !s ||
    (s.slotUsed !== undefined && typeof s.slotUsed !== 'boolean') ||
    s.version !== 1 ||
    typeof s.enabled !== 'boolean' ||
    !integer(s.seed) ||
    s.seed > 0xffffffff ||
    !integer(s.interval) ||
    s.interval < 2 ||
    s.interval > 20 ||
    !integer(s.index) ||
    s.index >= s.interval ||
    !integer(s.slot) ||
    s.slot >= s.interval
  )
    throw Error('Invalid scheduler')
}
export function validateCursor(c: Cursor, sources: Map<string, SourceRecord>) {
  if (
    !c ||
    c.version !== 1 ||
    (c.resultShown !== undefined && typeof c.resultShown !== 'boolean') ||
    !text(c.handId) ||
    !['npc', 'hero', 'verdict'].includes(c.phase) ||
    !integer(c.ordinal) ||
    !integer(c.decisions) ||
    typeof c.forcedFold !== 'boolean' ||
    !integer(c.rng) ||
    c.rng > 0xffffffff ||
    (c.npcAction !== null && !['raise', 'call', 'fold'].includes(c.npcAction))
  )
    throw Error('Invalid checkpoint')
  const source = sources.get(c.hand?.rangesId)
  if (!source) throw Error('Missing checkpoint source')
  unpackHand(c.hand, source)
  if (
    !c.score ||
    (['answered', 'correct', 'partial', 'streak', 'bestStreak'] as const).some(
      (k) => !integer(c.score[k]),
    )
  )
    throw Error('Invalid score')
  if (
    c.play &&
    (!integer(c.play.streetIndex) ||
      c.play.streetIndex > 2 ||
      !integer(c.play.nodeIndex) ||
      !c.play.bets ||
      !Number.isFinite(c.play.bets.ip) ||
      c.play.bets.ip < 0 ||
      !Number.isFinite(c.play.bets.oop) ||
      c.play.bets.oop < 0 ||
      typeof c.play.done !== 'boolean')
  )
    throw Error('Invalid script checkpoint')
  if ((c.phase === 'verdict') !== !!c.verdict)
    throw Error('Checkpoint feedback mismatch')
  if (c.verdict) {
    validatePrompt(c.verdict.prompt)
    if (
      !integer(c.verdict.guess) ||
      c.verdict.guess >= c.verdict.prompt.options.length ||
      !['correct', 'partial', 'wrong'].includes(c.verdict.legacyGrade) ||
      !text(c.verdict.decisionId)
    )
      throw Error('Invalid feedback')
  }
}
export function validateRecords(d: LearningBackup) {
  const sources = new Map(d.sources.map((s) => [s.id, s]))
  for (const s of d.sessions) {
    if (
      s.startedAt === null ||
      !timestamp(s.startedAt) ||
      s.lastActivityAt === null ||
      !timestamp(s.lastActivityAt) ||
      !timestamp(s.endedAt) ||
      !Number.isFinite(s.activeMs) ||
      s.activeMs < 0 ||
      typeof s.compacted !== 'boolean' ||
      !s.counts
    )
      throw Error('Invalid session')
    for (const origin of ['regular', 'adaptive', 'manual'] as const) {
      const counts = s.counts[origin]
      if (
        !counts ||
        [
          'decisions',
          'hands',
          'match',
          'alternative',
          'outside',
          'ungraded',
        ].some(
          (k) =>
            !integer(
              counts[
                k as
                  | 'decisions'
                  | 'hands'
                  | 'match'
                  | 'alternative'
                  | 'outside'
                  | 'ungraded'
              ],
            ),
        )
      )
        throw Error('Invalid session counters')
      if (
        (counts.firstExposures !== undefined &&
          !integer(counts.firstExposures)) ||
        (counts.repeatExposures !== undefined &&
          !integer(counts.repeatExposures)) ||
        (counts.firstExposures ?? 0) + (counts.repeatExposures ?? 0) >
          counts.decisions
      )
        throw Error('Invalid exposure counters')
    }
  }
  for (const h of d.hands) {
    validateConfig(h.config)
    if (
      h.createdAt === null ||
      !timestamp(h.createdAt) ||
      !timestamp(h.completedAt) ||
      !integer(h.decisions) ||
      typeof h.foldHand !== 'boolean' ||
      typeof h.targetAnswered !== 'boolean' ||
      !Array.isArray(h.actions) ||
      h.actions.length > 500 ||
      h.actions.some((a) => !isPosition(a.position) || !text(a.action, 300)) ||
      (h.revision !== undefined && !integer(h.revision))
    )
      throw Error('Invalid hand')
    if (h.scriptId) {
      const s = sources.get(h.scriptId)
      if (
        s?.kind !== 'script' ||
        !h.suitMap ||
        new Set(Object.values(h.suitMap)).size !== 4 ||
        Object.values(h.suitMap).some((s) => !['s', 'h', 'd', 'c'].includes(s))
      )
        throw Error('Invalid scripted deal')
    }
    if (
      h.target &&
      (!text(h.target.problemId) ||
        !text(h.target.nodeKey) ||
        !['exact', 'related'].includes(h.target.variant))
    )
      throw Error('Invalid review target')
  }
  for (const a of d.decisions) {
    if (
      a.fundamentalSkills !== undefined &&
      (!Array.isArray(a.fundamentalSkills) ||
        a.fundamentalSkills.length > 6 ||
        a.fundamentalSkills.some((s) => !isTopic(s)))
    )
      throw Error('Invalid practice skill tags')
    validateConfig(a.config)
    validatePrompt(a.prompt)
    validateCursor(a.before, sources)
    if (
      !integer(a.executed) ||
      a.executed >= a.prompt.options.length ||
      !integer(a.chosen) ||
      !text(a.note, 2000) ||
      typeof a.pinned !== 'boolean' ||
      typeof a.targeted !== 'boolean' ||
      typeof a.firstExposure !== 'boolean' ||
      !text(a.nodeKey) ||
      !text(a.skillKey, 2000) ||
      !['regular', 'adaptive', 'manual'].includes(a.origin)
    )
      throw Error('Invalid attempt')
    const calculated = classify(a.prompt.reference, a.chosen)
    if (
      canonicalJson(calculated) !== canonicalJson(a.learning) ||
      gradeIndex(a.prompt.probs, a.chosen) !== a.legacyGrade
    )
      throw Error('Inconsistent version-one classification')
  }
  for (const p of d.problems) {
    if (
      p.fundamentalSkills !== undefined &&
      (!Array.isArray(p.fundamentalSkills) ||
        p.fundamentalSkills.length > 6 ||
        p.fundamentalSkills.some((s) => !isTopic(s)))
    )
      throw Error('Invalid practice skill tags')
    validateConfig(p.config)
    if (
      !text(p.title) ||
      !text(p.note, 2000) ||
      typeof p.pinned !== 'boolean' ||
      !isPosition(p.hero) ||
      !['preflop', 'flop', 'turn', 'river'].includes(p.street) ||
      ![p.errors, p.reviews, p.successes].every(integer) ||
      ![p.firstSeenAt, p.lastSeenAt, p.dueAt, p.lastReviewedAt].every(
        timestamp,
      ) ||
      !Array.isArray(p.successSessions) ||
      p.successSessions.length > 64 ||
      p.successSessions.some((s) => !text(s)) ||
      !Array.isArray(p.usedExamples) ||
      p.usedExamples.length > 64 ||
      p.usedExamples.some((s) => !text(s)) ||
      p.examples.length > 3
    )
      throw Error('Invalid mistake group')
  }
  validateScheduler(d.meta.scheduler)
  if (d.meta.nextScheduler) validateScheduler(d.meta.nextScheduler)
  if (d.meta.cursor) validateCursor(d.meta.cursor, sources)
  if (d.meta.resume) validateCursor(d.meta.resume, sources)
}
