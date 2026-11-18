import type { LiveReference } from './liveReference'
import { appendLiveAction, type LiveDeal } from './liveSession'
import type { LiveAction } from './liveEngine'

/** Unknown strategy answers remain saved, but never interrupt Full hands play. */
export function requiresDecisionFeedback(
  deal: LiveDeal,
  reference: LiveReference,
): boolean {
  return (
    (deal.mode ?? 'full-hands') !== 'full-hands' ||
    reference.status !== 'ungraded'
  )
}

export function pendingLiveFeedback(deal: LiveDeal | undefined): boolean {
  const record = deal?.feedback?.at(-1)
  return (
    !!deal &&
    !!record &&
    record.index === deal.actions.length - 1 &&
    (deal.acknowledgedAction ?? -1) < record.index &&
    requiresDecisionFeedback(deal, record.reference)
  )
}

export function appendLearnerAction(
  deal: LiveDeal,
  action: LiveAction,
  index: number,
  reference: LiveReference,
): LiveDeal {
  const next = appendLiveAction(deal, action, index, reference)
  if (next === deal || requiresDecisionFeedback(deal, reference)) return next
  return { ...next, acknowledgedAction: index }
}
