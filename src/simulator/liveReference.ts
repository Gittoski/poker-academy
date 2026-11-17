import { contentHash } from '@/learning/identity'
import type { RangeEntry } from '@/data/types'
import { handOf } from '@/lib/cards'
import { positionsFor, type PlayerCount } from '@/lib/positions'
import { resolveActions } from '@/lib/range'
import { resolveRange } from '@/lib/resolve'
import { headline, heroRaise, type Scenario } from '@/lib/scenarios'
import { actLive, newLiveHand, type LiveAction, type LiveState } from './liveEngine'
import { seededLiveRandom, type LiveDeal } from './liveSession'

export interface LiveReference {
  status: 'match' | 'alternative' | 'outside' | 'ungraded'
  explanation: string
  source: string
  frequency?: number
  entryId?: string
  referenceHash?: string
  raiseTo?: number
  chart?: { version: 1; entry: RangeEntry; hand: string; title: string; action: 'raise' | 'call' | 'fold' }
  frequencies?: { raise: number; call: number; fold: number }
}
const source = 'Imported Cash 100bb PTO chart; solver provenance not independently verified.'
const ungraded = (why: string): LiveReference => ({ status: 'ungraded', explanation: why, source })
const scenarios: Scenario[] = ['open', 'vs-raise', 'vs-3bet', 'vs-4bet', 'vs-5bet']
/** Grade only an exact supported reference situation. Game legality never depends on this adapter. */
export function liveReference(deal: LiveDeal, state: LiveState, action: LiveAction, entries: RangeEntry[] | null): LiveReference {
  if (!entries) return ungraded('Reference data is unavailable. Your legal action still applies.')
  if (state.street !== 'preflop') return ungraded('No verified live postflop reference is available for this board and betting history.')
  if (deal.config.stacks.some(s => s !== 10000) || (deal.config.ante?.amount ?? 0) !== 0) return ungraded('These imported charts cover 100bb cash without antes; this setup is outside their scope.')
  const positions = positionsFor(state.seats.length as PlayerCount)
  let raises = 0, opener: number | null = null, previousRaiser: number | null = null, responder: number | null = null
  let before = newLiveHand(deal.config, seededLiveRandom(deal.seed))
  for (const a of deal.actions) {
    if (before.street !== 'preflop') return ungraded('The preflop reference does not cover this street.')
    if (a.kind === 'call') return ungraded('A prior limp or caller makes this a situation outside the supplied heads-up response charts.')
    if (a.kind === 'raise') {
      const actor = before.toAct!
      if (raises > 1 && actor !== responder) return ungraded('A cold re-raise is outside this reference tree.')
      const scenario = scenarios[raises]
      if (!scenario) return ungraded('This raise sequence is outside the reference tree.')
      const expected = heroRaise(scenario, { format: 'cash', stack: 100, rangeType: 'pto', openSize: 2.5 }, positions[actor], previousRaiser === null ? undefined : positions[previousRaiser])
      if (!expected || Math.round(expected.size * 100) !== a.to) return ungraded('An earlier raise size differs from the reference sizing.')
      if (opener === null) opener = actor
      responder = previousRaiser
      previousRaiser = actor
      raises++
    }
    before = actLive(before, a)
  }
  if (state.toAct === null || (raises >= 2 && state.toAct !== responder)) return ungraded('This cold re-raise response has no matching supplied chart.')
  const scenario = scenarios[raises]
  if (!scenario) return ungraded('No chart covers this raise sequence.')
  const hero = positions[state.toAct], villain = previousRaiser === null ? undefined : positions[previousRaiser]
  const setup = { format: 'cash' as const, stack: 100 as const, rangeType: 'pto' as const, openSize: 2.5 as const }
  if (action.kind === 'check') return ungraded('No supplied chart grades this check decision.')
  if (action.kind === 'raise') {
    const expected = heroRaise(scenario, setup, hero, villain)
    if (!expected || Math.round(expected.size * 100) !== action.to) return ungraded('Your raise size is legal but differs from the reference size; no score is assigned.')
  }
  const resolved = resolveRange(entries, { ...setup, scenario, hero, villain, players: state.seats.length as PlayerCount })
  if (!resolved || !resolved.entry.rangeTypes.includes('pto') || (resolved.entry.formats && !resolved.entry.formats.includes('cash'))) return ungraded('No exact chart matches this decision.')
  const frequencies = resolveActions(resolved.entry.range).get(handOf(state.seats[state.toAct].cards).label)!
  const kind = action.kind === 'raise' ? 'raise' : action.kind === 'call' ? 'call' : 'fold'
  const frequency = frequencies[kind], maximum = Math.max(...Object.values(frequencies))
  const status = frequency === maximum ? 'match' : frequency > 0 ? 'alternative' : 'outside'
  return { status, source, frequency, frequencies,
    chart: { version: 1, entry: structuredClone(resolved.entry), hand: handOf(state.seats[state.toAct].cards).label, title: headline(scenario, setup, hero, villain).title, action: kind }, entryId: resolved.entry.id, referenceHash: contentHash(resolved.entry),
    raiseTo: heroRaise(scenario, setup, hero, villain)?.size ? Math.round(heroRaise(scenario, setup, hero, villain)!.size * 100) : undefined, explanation: status === 'match'
    ? 'Your action matches a most-frequent action in this imported reference. This is not an EV-loss measurement.'
    : status === 'alternative' ? 'The reference supports this action at a positive frequency. One action does not measure your long-run mix.'
      : 'This reference assigns no frequency to your action. Your action still determines the live hand.' }
}

/** Review uses the saved action frequencies, not whatever charts may load on a later visit. */
export function retryLiveReference(reference: LiveReference, action: LiveAction): LiveReference {
  if (!reference.frequencies || action.kind === 'check' || (action.kind === 'raise' && action.to !== reference.raiseTo))
    return { ...reference, chart: undefined, status: 'ungraded', frequency: undefined, explanation: 'This action or size has no saved applicable reference. It is not scored.' }
  const frequency = reference.frequencies[action.kind]
  return { ...reference, chart: reference.chart ? { ...reference.chart, action: action.kind } : undefined, frequency, status: frequency === Math.max(...Object.values(reference.frequencies)) ? 'match' : frequency > 0 ? 'alternative' : 'outside', explanation: 'Compared with the original saved reference frequencies; this retry does not advance your live hand.' }
}

/** Older saves may recover a grid only from the identical source entry and original frequencies. */
export function recoverLiveChart(reference: LiveReference, deal: LiveDeal, index: number, entries: RangeEntry[] | null): LiveReference['chart'] {
  if (reference.chart) return reference.chart
  if (reference.status === 'ungraded' || !entries || !reference.entryId || !reference.referenceHash || !reference.frequencies) return undefined
  const entry = entries.find(e => e.id === reference.entryId && contentHash(e) === reference.referenceHash)
  if (!entry || index < 0 || index >= deal.actions.length) return undefined
  const prefix = { ...deal, actions: deal.actions.slice(0, index) }
  let state = newLiveHand(deal.config, seededLiveRandom(deal.seed))
  for (const action of prefix.actions) state = actLive(state, action)
  if (state.toAct !== deal.hero) return undefined
  const recovered = liveReference(prefix, state, deal.actions[index], [entry])
  if (recovered.frequencies && ['raise', 'call', 'fold'].every(k => recovered.frequencies![k as 'raise'] === reference.frequencies![k as 'raise'])) return recovered.chart
  return undefined
}
