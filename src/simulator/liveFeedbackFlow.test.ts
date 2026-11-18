import { expect, it } from 'vitest'
import { preflopConfig } from './preflopCatalog'
import {
  freshLiveDeal,
  encodeLiveSession,
  decodeLiveSession,
  practiceLiveDeal,
} from './liveSession'
import type { LiveReference } from './liveReference'
import {
  appendLearnerAction,
  pendingLiveFeedback,
  requiresDecisionFeedback,
} from './liveFeedbackFlow'
const unknown: LiveReference = {
  status: 'ungraded',
  reason: 'callers',
  explanation: 'No applicable reference.',
  source: 'Test fixture; no strategy grade.',
}
it('saves the actual ungraded full-hand action and acknowledges it without creating a feedback checkpoint', () => {
  const d = freshLiveDeal(preflopConfig(), 0, 'balanced', 42)
  const next = appendLearnerAction(d, { kind: 'call' }, 0, unknown)
  expect(next.actions).toEqual([{ kind: 'call' }])
  expect(next.feedback).toEqual([{ index: 0, reference: unknown }])
  expect(next.acknowledgedAction).toBe(0)
  expect(pendingLiveFeedback(next)).toBe(false)
  const restored = decodeLiveSession(
    encodeLiveSession({ version: 3, current: next, archive: [] }),
  )
  expect(restored.current).toEqual(next)
  expect(practiceLiveDeal(restored.current).toAct).toBe(1)
  expect(appendLearnerAction(next, { kind: 'call' }, 0, unknown)).toBe(next)
})
it('ignores older ungraded full-hand checkpoints without changing their saved source or history', () => {
  const d = freshLiveDeal(preflopConfig(), 0, 'balanced', 42)
  const old = {
    ...d,
    mode: undefined,
    actions: [{ kind: 'call' } as const],
    feedback: [{ index: 0, reference: unknown }],
  }
  const original = structuredClone(old)
  expect(pendingLiveFeedback(old)).toBe(false)
  expect(old).toEqual(original)
})
it('still pauses for real reference grades and preserves ungraded legacy-preflop behavior', () => {
  const full = freshLiveDeal(preflopConfig(), 0, 'balanced', 42)
  for (const status of ['match', 'alternative', 'outside'] as const) {
    const reference = { ...unknown, status }
    expect(requiresDecisionFeedback(full, reference)).toBe(true)
    const next = appendLearnerAction(full, { kind: 'call' }, 0, reference)
    expect(pendingLiveFeedback(next)).toBe(true)
    expect(pendingLiveFeedback({ ...next, acknowledgedAction: 0 })).toBe(false)
  }
  const pre = { ...full, mode: 'preflop' as const }
  const next = appendLearnerAction(pre, { kind: 'call' }, 0, unknown)
  expect(requiresDecisionFeedback(pre, unknown)).toBe(true)
  expect(pendingLiveFeedback(next)).toBe(true)
})
it('never advances opponents or deals another hand after an ungraded learner fold', () => {
  const d = freshLiveDeal(preflopConfig(), 0, 'balanced', 42)
  const next = appendLearnerAction(d, { kind: 'fold' }, 0, unknown),
    state = practiceLiveDeal(next)
  expect(state.heroFolded).toBe(true)
  expect(state.toAct).toBeNull()
  expect(state.board).toEqual([])
  expect(next.seed).toBe(d.seed)
  expect(pendingLiveFeedback(next)).toBe(false)
})
