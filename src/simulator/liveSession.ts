import { isGameMode, type GameMode } from '@/lib/gameModes'
import { contentHash } from '@/learning/identity'
import { parseRangeEntries } from '@/lib/rangeEntries'
import { resolveActions } from '@/lib/range'
import { handOf } from '@/lib/cards'
import { liveReference, LIVE_UNGRADED_REASONS, type LiveReference } from './liveReference'
import { actLive, newLiveHand, type LiveAction, type LiveConfig, type LiveState } from './liveEngine'
import { PREFLOP_CONTEXTS, preflopPrefix } from './preflopCatalog'

export type OpponentStyle = 'tight' | 'balanced' | 'loose'
export interface LiveDeal { graded?: { version: 1; context: string; seat?: number }; attempt?: true; acknowledgedAction?: number; mode?: GameMode; seed: number; config: LiveConfig; hero: number; style: OpponentStyle; actions: LiveAction[]; feedback?: { index: number; reference: LiveReference }[] }
export interface LiveSession { version: 1 | 2 | 3 | 4; current: LiveDeal; archive: LiveDeal[]; parked?: Partial<Record<GameMode, LiveDeal>> }
export const LIVE_SAVE_KEY = 'poker-academy:live:v1'
export const LIVE_LOCK = 'poker-academy:live-writer:v1'
export function seededLiveRandom(seed: number): () => number {
  let value = seed >>> 0
  return () => { value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return value / 4294967296 }
}
export function liveSeed(): number {
  const seed = new Uint32Array(1)
  if (globalThis.crypto?.getRandomValues) return globalThis.crypto.getRandomValues(seed)[0]
  return Math.floor(Math.random() * 4294967296)
}
export function playLiveDeal(deal: LiveDeal, count = deal.actions.length): LiveState {
  let state = newLiveHand(deal.config, seededLiveRandom(deal.seed), deal.mode === 'preflop')
  for (const action of deal.actions.slice(0, count)) state = actLive(state, action)
  return state
}
export function freshLiveDeal(config: LiveConfig, hero: number, style: OpponentStyle = 'balanced', seed = liveSeed(), mode: GameMode = 'full-hands'): LiveDeal {
  const deal = { mode, seed, config: structuredClone(config), hero, style, actions: [] }
  validateDeal(deal)
  return deal
}
/** Expected history length guards same-frame duplicate or stale timer submissions. */
function validateDeal(value: unknown): asserts value is LiveDeal {
  if (!value || typeof value !== 'object') throw Error('Missing live hand')
  const d = value as LiveDeal
  if ((d.mode !== undefined && !isGameMode(d.mode)) || !Number.isInteger(d.seed) || d.seed < 0 || d.seed > 4294967295
    || !d.config || !Array.isArray(d.config.stacks) || ![6, 8, 9].includes(d.config.stacks.length)
    || d.config.button !== d.config.stacks.length - 3 || d.config.smallBlind !== 50 || d.config.bigBlind !== 100
    || !Number.isSafeInteger(d.hero) || d.hero < 0 || d.hero >= d.config.stacks.length
    || !['tight', 'balanced', 'loose'].includes(d.style) || !Array.isArray(d.actions) || d.actions.length > 20000) throw Error('Unsupported live hand format')
  if ((d.attempt !== undefined && d.attempt !== true) || (d.acknowledgedAction !== undefined && (!Number.isInteger(d.acknowledgedAction) || d.acknowledgedAction < -1 || d.acknowledgedAction >= d.actions.length))) throw Error('Invalid learning checkpoint')
  if (d.feedback !== undefined && !Array.isArray(d.feedback)) throw Error('Invalid saved feedback list')
  if (d.graded !== undefined) {
    const g=d.graded, context=PREFLOP_CONTEXTS.find(c=>c.id===g?.context)
    if (!g || g.version!==1 || !context || d.mode!=='preflop' || d.config.stacks.length!==6 || d.config.stacks.some(s=>s!==10000)
      || (d.config.ante?.amount??0)!==0 || context.hero!==d.hero
      || (g.seat!==undefined && (!Number.isInteger(g.seat)||g.seat<0||g.seat>5||g.seat!==d.hero))) throw Error('Invalid graded preflop profile')
    const prefix=preflopPrefix(context)
    if(d.actions.length>100 || (d.attempt && d.feedback?.length!==1)) throw Error('Invalid graded attempt history')
    if(d.actions.length<prefix.length || prefix.some((a,i)=>a.kind!==d.actions[i]?.kind || (a.kind==='raise' && (d.actions[i].kind!=='raise' || a.to!==(d.actions[i] as {to:number}).to)))) throw Error('Invalid graded preflop setup')
    let before=newLiveHand(d.config,seededLiveRandom(d.seed),true)
    for(let i=0;i<d.actions.length;i++) {
      if(i>=prefix.length && before.seats[d.hero].folded)throw Error('Actions after graded learner fold')
      if(i>=prefix.length && liveReference({...d,actions:d.actions.slice(0,i)},before,d.actions[i],[]).reason!=='missing')throw Error('Saved action outside covered preflop progression')
      if(i>=prefix.length && before.toAct===d.hero && (!d.attempt || d.feedback?.some(f=>f.index===i))) {
        const f=d.feedback?.find(f=>f.index===i)
        if(!f?.reference.chart || f.reference.status==='ungraded') throw Error('Missing graded learner feedback')
      }
      before=actLive(before,d.actions[i])
    }
    if(d.feedback?.some(f=>f.index<prefix.length)) throw Error('Setup actions are not learner attempts')
  }
  if (new Set((d.feedback ?? []).map(f => f.index)).size !== (d.feedback ?? []).length) throw Error('Duplicate saved feedback')
  for (const f of d.feedback ?? []) {
    if (!Number.isInteger(f.index) || f.index < 0 || f.index >= d.actions.length || !f.reference
      || !['match', 'alternative', 'outside', 'ungraded'].includes(f.reference.status)
      || typeof f.reference.explanation !== 'string' || typeof f.reference.source !== 'string'
      || (f.reference.reason !== undefined && !LIVE_UNGRADED_REASONS.includes(f.reference.reason))
      || (f.reference.referenceHash !== undefined && !/^[0-9a-f]{64}$/.test(f.reference.referenceHash))
      || (f.reference.frequencies && Math.abs(Object.values(f.reference.frequencies).reduce((a, b) => a + b, 0) - 1) > 0.000001)
      || (f.reference.frequency !== undefined && (!Number.isFinite(f.reference.frequency) || f.reference.frequency < 0 || f.reference.frequency > 1))
      || (f.reference.frequencies && ['raise', 'call', 'fold'].some(k => { const v = f.reference.frequencies![k as 'raise']; return !Number.isFinite(v) || v < 0 || v > 1 }))) throw Error('Invalid saved feedback')
  }
  for (const f of d.feedback ?? []) {
    const chart = f.reference.chart
    if (!chart) continue // v1 saves without a chart remain compatible.
    if (chart.version !== 1 || typeof chart.title !== 'string' || chart.title.length > 200
      || !['raise', 'call', 'fold'].includes(chart.action) || f.reference.status === 'ungraded') throw Error('Invalid saved range grid')
    const [entry] = parseRangeEntries(JSON.stringify([chart.entry]))
    if (entry.id !== f.reference.entryId || contentHash(entry) !== f.reference.referenceHash) throw Error('Saved range source hash mismatch')
    const before = playLiveDeal(d, f.index)
    if (before.toAct !== d.hero || handOf(before.seats[d.hero].cards).label !== chart.hand) throw Error('Saved range hand mismatch')
    const action = d.actions[f.index]
    if (action.kind !== chart.action) throw Error('Saved range action mismatch')
    const weights = resolveActions(entry.range).get(chart.hand)
    if (!weights || !f.reference.frequencies || ['raise', 'call', 'fold'].some(k => weights[k as 'raise'] !== f.reference.frequencies![k as 'raise'])) throw Error('Saved range frequencies mismatch')
    const applicable = liveReference({ ...d, actions: d.actions.slice(0, f.index) }, before, action, [entry])
    if (!applicable.chart || applicable.referenceHash !== f.reference.referenceHash
      || applicable.frequency !== f.reference.frequency || applicable.status !== f.reference.status) throw Error('Saved range classification or context mismatch')
  }
  for (const a of d.actions) {
    if (!a || !['fold', 'check', 'call', 'raise'].includes(a.kind)
      || (a.kind === 'raise' && (!Number.isSafeInteger(a.to) || a.to < 0))) throw Error('Invalid saved action')
  }
  playLiveDeal(d) // Rebuild the ledger and deck from validated inputs, never trust a saved native state.
}
export function encodeLiveSession(session: LiveSession): string {
  if ([session.current, ...session.archive, ...Object.values(session.parked ?? {})].some(d => d.actions.length > 20000)) throw Error('Live action-history save limit reached')
  // Older builds reject v3 instead of resuming opponents after a learning fold.
  const version = liveSessionVersion(session)
  const text = JSON.stringify({ ...session, version })
  if (text.length > 2_000_000) throw Error('Live save size limit reached')
  return text
}
export function liveSessionVersion(session:LiveSession):3|4 {
  return session.version===4 || [session.current,...session.archive,...Object.values(session.parked??{})].some(d=>d.graded) ? 4 : 3
}
export function decodeLiveSession(text: string): LiveSession {
  if (text.length > 2_000_000) throw Error('Live save exceeds the supported size')
  const s = JSON.parse(text) as LiveSession
  if (![1, 2, 3, 4].includes(s?.version) || !Array.isArray(s.archive) || s.archive.length > 20) throw Error('Unsupported live save version')
  if(s.version!==4 && [s.current,...s.archive,...Object.values(s.parked??{})].some(d=>d?.graded!==undefined)) throw Error('Graded practice requires save version four')
  validateDeal(s.current)
  if (s.parked !== undefined) {
    if (!s.parked || typeof s.parked !== 'object' || Array.isArray(s.parked) || Object.keys(s.parked).length > 1) throw Error('Invalid parked mode hands')
    for (const [mode, deal] of Object.entries(s.parked)) {
      if (!isGameMode(mode) || mode === (s.current.mode ?? 'full-hands')) throw Error('Invalid parked mode')
      validateDeal(deal)
      if ((deal.mode ?? 'full-hands') !== mode) throw Error('Parked hand mode mismatch')
    }
  }
  for (const d of s.archive) validateDeal(d)
  return { ...s, version: s.version===4 ? 4 : 3 }
}

export function replayLiveDeal(deal: LiveDeal, until = deal.actions.length): LiveState {
  let state = newLiveHand(deal.config, seededLiveRandom(deal.seed), deal.mode === 'preflop')
  for (const action of deal.actions.slice(0, until)) state = actLive(state, action)
  return state
}
export function appendLiveAction(deal: LiveDeal, action: LiveAction, expectedIndex: number, reference?: LiveReference): LiveDeal {
  if (deal.actions.length !== expectedIndex) return deal
  actLive(practiceLiveDeal(deal), action) // Legality also checked for manual and stale input.
  return { ...deal, actions: [...deal.actions, structuredClone(action)], feedback: [...(deal.feedback ?? []), ...(reference ? [{ index: expectedIndex, reference: structuredClone(reference) }] : [])] }
}

/** Focused presentation/replay also truncates old saves at the learner's fold.
 * Historical raw replay above remains available for validating old action logs. */
export function practiceLiveDeal(deal: LiveDeal, until = deal.actions.length): LiveState {
  let state = newLiveHand(deal.config, seededLiveRandom(deal.seed), deal.mode === 'preflop', deal.hero)
  for (const action of deal.actions.slice(0, until)) {
    if (state.heroFolded) break
    state = actLive(state, action)
  }
  return state
}
/** Restore the last answered spot while retaining its source-backed mistake. */
export function retryLiveDecision(session: LiveSession): LiveSession {
  const deal = session.current, record = deal.feedback?.at(-1)
  if (!record || record.index !== deal.actions.length - 1) throw Error('This decision is no longer the live checkpoint')
  const attempt = { ...structuredClone(deal), attempt: true as const, feedback: [structuredClone(record)] }
  const current = { ...deal, actions: deal.actions.slice(0, record.index), feedback: (deal.feedback ?? []).filter(f => f.index < record.index), acknowledgedAction: Math.min(deal.acknowledgedAction ?? -1, record.index - 1) }
  delete current.attempt
  return { ...session, current, archive: [...session.archive, attempt].slice(-20) }
}
