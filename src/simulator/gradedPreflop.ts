import type { RangeEntry } from '@/data/types'
import { legalLiveActions, type LiveAction } from './liveEngine'
import { liveReference, type LiveReference } from './liveReference'
import {
  liveSeed,
  practiceLiveDeal,
  seededLiveRandom,
  type LiveDeal,
  type LiveSession,
} from './liveSession'
import {
  auditPreflopCharts,
  PREFLOP_CONTEXTS,
  preflopConfig,
  preflopPrefix,
} from './preflopCatalog'
import { switchLiveMode } from './liveModes'

export const isGradedPreflop = (d: LiveDeal): boolean => !!d.graded
export function newGradedPreflop(
  entries: RangeEntry[],
  options: { seat?: number; seed?: number; context?: string } = {},
): LiveDeal {
  auditPreflopCharts(entries)
  if (
    options.seat !== undefined &&
    (!Number.isInteger(options.seat) || options.seat < 0 || options.seat > 5)
  )
    throw Error('Choose a valid training position')
  const candidates = PREFLOP_CONTEXTS.filter(
    (c) => options.seat === undefined || c.hero === options.seat,
  )
  // Context selection is independent of the card seed; never search for favorable cards.
  const context = options.context
    ? candidates.find((c) => c.id === options.context)
    : candidates[Math.floor((liveSeed() / 4294967296) * candidates.length)]
  if (!context) throw Error('Unknown preflop context')
  return {
    mode: 'preflop',
    graded: {
      version: 1,
      context: context.id,
      ...(options.seat !== undefined ? { seat: options.seat } : {}),
    },
    seed: options.seed ?? liveSeed(),
    config: preflopConfig(),
    hero: context.hero,
    style: 'balanced',
    actions: preflopPrefix(context),
    feedback: [],
  }
}
export type GradedStatus =
  | { kind: 'decision'; reference: LiveReference }
  | { kind: 'boundary' | 'problem'; message: string }
export function gradedPreflopStatus(
  deal: LiveDeal,
  entries: RangeEntry[] | null,
): GradedStatus | null {
  if (!deal.graded || !entries) return null
  const state = practiceLiveDeal(deal)
  if (state.heroFolded || state.preflopComplete || state.street === 'complete')
    return null
  const reference = liveReference(deal, state, { kind: 'fold' }, entries)
  if (reference.status !== 'ungraded') return { kind: 'decision', reference }
  if (reference.reason === 'callers')
    return {
      kind: 'boundary',
      message:
        'A call takes the remaining responses beyond these two-position charts. The actual actions are kept; no later actions or winner are assumed. Retry your last decision or start another hand.',
    }
  if (reference.reason === 'tree')
    return {
      kind: 'boundary',
      message:
        'A player outside the original two-player raise exchange is next. These charts do not cover that response. The actual actions are kept and no winner is assigned.',
    }
  return {
    kind: 'problem',
    message: `This covered practice has no applicable reference: ${reference.explanation} Reload the charts to retry; your hand is kept.`,
  }
}
export function chooseGradedOpponent(
  deal: LiveDeal,
  entries: RangeEntry[],
): LiveAction {
  const status = gradedPreflopStatus(deal, entries),
    state = practiceLiveDeal(deal)
  if (
    status?.kind !== 'decision' ||
    state.toAct === null ||
    state.toAct === deal.hero
  )
    throw Error('No covered opponent decision')
  const legal = legalLiveActions(state),
    ref = status.reference
  const weighted = [
    {
      action: { kind: 'raise', to: ref.raiseTo! } as LiveAction,
      weight: ref.frequencies!.raise,
    },
    { action: { kind: 'call' } as LiveAction, weight: ref.frequencies!.call },
    { action: { kind: 'fold' } as LiveAction, weight: ref.frequencies!.fold },
  ]
  let roll = seededLiveRandom(
    (deal.seed ^ Math.imul(deal.actions.length + 1, 0x9e3779b9)) >>> 0,
  )()
  for (const choice of weighted) {
    if (choice.weight <= 0) continue
    if (
      (choice.action.kind === 'raise' &&
        (legal.minRaiseTo === null ||
          choice.action.to < legal.minRaiseTo ||
          choice.action.to > legal.maxRaiseTo!)) ||
      (choice.action.kind === 'call' && !legal.call)
    )
      throw Error('Reference action is illegal')
    roll -= choice.weight
    if (roll < 0) return choice.action
  }
  throw Error('Invalid reference distribution')
}
export function upgradePreflop(
  session: LiveSession,
  entries: RangeEntry[],
  seat?: number,
): LiveSession {
  if (session.current.mode !== 'preflop')
    throw Error('Open Preflop before upgrading')
  const current = newGradedPreflop(entries, { seat })
  return {
    ...session,
    version: 4,
    current,
    archive: [...session.archive, session.current].slice(-20),
  }
}
export function switchGradedMode(
  session: LiveSession,
  mode: 'full-hands' | 'preflop',
  entries: RangeEntry[],
): LiveSession {
  const hadTarget = !!session.parked?.[mode],
    previous = session.current.mode ?? 'full-hands'
  const next = switchLiveMode(session, mode)
  if (mode === 'preflop' && previous !== mode && !hadTarget)
    return { ...next, version: 4, current: newGradedPreflop(entries) }
  return next
}
/** Restore the learner checkpoint even when covered opponents acted afterward. */
export function retryGradedPreflop(session: LiveSession): LiveSession {
  const d = session.current,
    record = d.feedback?.at(-1)
  if (!d.graded || !record) throw Error('No graded decision to retry')
  const current = {
    ...d,
    actions: d.actions.slice(0, record.index),
    feedback: (d.feedback ?? []).filter((f) => f.index < record.index),
    acknowledgedAction: Math.min(d.acknowledgedAction ?? -1, record.index - 1),
  }
  delete current.attempt
  return {
    ...session,
    current,
    archive: [
      ...session.archive,
      {
        ...structuredClone(d),
        attempt: true as const,
        feedback: [structuredClone(record)],
      },
    ].slice(-20),
  }
}
