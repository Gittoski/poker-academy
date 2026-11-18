import { positionsFor, type PlayerCount } from '@/lib/positions'
import { practiceLiveDeal, type LiveDeal } from './liveSession'

export const SETUP_BEAT_MS = 650
export interface LiveSetupPlayback {
  deal: LiveDeal
  shown: number
}

/** Presentation only: a new covered exercise already contains its public setup.
 * Never append those actions again or record them as learner answers. */
export function startSetupPlayback(deal: LiveDeal): LiveSetupPlayback | null {
  return deal.graded && !deal.feedback?.length && !deal.attempt
    ? { deal, shown: 0 }
    : null
}

export function publicActionLabel(
  deal: LiveDeal,
  count = deal.actions.length,
): string | null {
  if (count === 0) return null
  if (!Number.isInteger(count) || count < 0 || count > deal.actions.length)
    throw Error('Invalid public action index')
  const before = practiceLiveDeal(deal, count - 1)
  if (before.toAct === null) return null
  const position = positionsFor(deal.config.stacks.length as PlayerCount)[
    before.toAct
  ]
  const action = deal.actions[count - 1]
  return action.kind === 'raise'
    ? `${position} ${before.bet === 0 ? 'bets' : 'raises to'} ${Number((action.to / 100).toFixed(2))} BB`
    : `${position} ${action.kind === 'fold' ? 'folds' : action.kind === 'call' ? 'calls' : 'checks'}`
}
