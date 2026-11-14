import { gradeIndex } from '@/lib/trainer'
import { classify } from './classification'
import { decisionId, decisionKey } from './keys'
import type { Cursor, DecisionRecord, HandRecord, SavedPrompt } from './types'

/** Pure capture before the controller advances. No storage or state-updater side effects. */
export function buildDecision(
  hand: HandRecord,
  before: Cursor,
  prompt: SavedPrompt,
  chosen: number,
  now: number,
  skillKey: string,
  firstExposure: boolean,
): DecisionRecord {
  if (
    before.handId !== hand.id ||
    before.phase !== 'hero' ||
    before.verdict ||
    before.hand.rangesId !== hand.config.rangesId ||
    before.hand.hero !== hand.initial.hero ||
    (before.hand.toAct === null && prompt.street === 'preflop') ||
    !Number.isSafeInteger(before.ordinal) ||
    before.ordinal < 0
  )
    throw Error('Not an answerable checkpoint')
  if (
    !Number.isInteger(chosen) ||
    chosen < 0 ||
    chosen >= prompt.options.length ||
    !Number.isInteger(prompt.expected) ||
    prompt.expected < 0 ||
    prompt.expected >= prompt.options.length ||
    prompt.probs.length !== prompt.options.length ||
    !Number.isFinite(now) ||
    now < 0
  )
    throw Error('Invalid submitted choice')
  const nodeKey = decisionKey(
    hand.config,
    before.hand,
    prompt,
    hand.scriptId,
    before.play,
  )
  const learning = classify(prompt.reference, chosen)
  return {
    version: 1,
    history: structuredClone(hand.actions),
    id: decisionId(hand.id, before.ordinal),
    handId: hand.id,
    sessionId: hand.sessionId,
    createdAt: now,
    origin: hand.origin,
    config: structuredClone(hand.config),
    before: structuredClone(before),
    prompt: structuredClone(prompt),
    chosen,
    executed: hand.config.mode === 'full-hands' ? prompt.expected : chosen,
    legacyGrade: gradeIndex(prompt.probs, chosen),
    learning,
    nodeKey,
    skillKey,
    problemId: learning.kind === 'outside' ? `problem:${nodeKey}` : null,
    targeted: hand.target?.nodeKey === nodeKey,
    firstExposure,
    pinned: false,
    note: '',
  }
}
