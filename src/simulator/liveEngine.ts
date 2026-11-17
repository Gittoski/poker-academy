import { DECK, type Card, type HoleCards, type Rng } from '@/lib/cards'
import { evaluateHand } from '../../scripts/lib/handEval.mjs'

/** Chip amounts are integer units; the UI chooses how many units represent one BB. */
export interface LiveConfig {
  stacks: number[]
  button: number
  smallBlind: number
  bigBlind: number
  ante?: { kind: 'each' | 'big-blind'; amount: number }
}
export interface LiveSeat {
  cards: HoleCards
  stack: number
  committed: number
  streetBet: number
  folded: boolean
  /** Bet level when this player last completed an action; null means unacted. */
  actedAt: number | null
}
export type LiveStreet = 'preflop' | 'flop' | 'turn' | 'river' | 'complete'
export interface LivePot { amount: number; eligible: number[]; winners: number[] }
export interface LiveState {
  version: 1
  /** A training boundary, never a showdown result. */
  trainingHero?: number
  heroFolded?: true
  preflopOnly?: true
  preflopComplete?: true
  config: LiveConfig
  seats: LiveSeat[]
  deck: Card[]
  cursor: number
  board: Card[]
  burns: Card[]
  street: LiveStreet
  toAct: number | null
  bet: number
  minRaise: number
  pot: number
  deadMoney: number
  totalChips: number
  payouts: number[]
  pots: LivePot[]
  refunds: { seat: number; amount: number }[]
}
export type LiveAction = { kind: 'fold' | 'check' | 'call' } | { kind: 'raise'; to: number }
export interface LiveLegal {
  fold: boolean
  check: boolean
  call: number
  minRaiseTo: number | null
  maxRaiseTo: number | null
}
const integer = (n: number) => Number.isSafeInteger(n) && n >= 0
const livePlayers = (s: LiveState) => s.seats.map((p, i) => ({ p, i })).filter(({ p }) => !p.folded)
const next = (s: LiveState, i: number) => (i + 1) % s.seats.length
const label = (c: Card) => c.rank + c.suit

function clone(s: LiveState): LiveState { return structuredClone(s) }
function draw(s: LiveState): Card {
  const card = s.deck[s.cursor++]
  if (!card) throw Error('Deck exhausted')
  return card
}
function post(s: LiveState, index: number, amount: number, street: boolean) {
  const p = s.seats[index]
  const paid = Math.min(p.stack, amount)
  p.stack -= paid
  p.committed += paid
  if (street) p.streetBet += paid
  s.pot += paid
}
export function newLiveHand(config: LiveConfig, rng: Rng = Math.random, preflopOnly = false, trainingHero?: number): LiveState {
  const n = config.stacks.length
  if (n < 2 || n > 9 || config.stacks.some(x => !integer(x) || x === 0)
    || !integer(config.button) || config.button >= n
    || !integer(config.smallBlind) || !integer(config.bigBlind)
    || config.smallBlind === 0 || config.bigBlind < config.smallBlind
    || (config.ante && (!['each', 'big-blind'].includes(config.ante.kind) || !integer(config.ante.amount)))
    || !Number.isSafeInteger(config.stacks.reduce((a, b) => a + b, 0))) throw Error('Invalid live table configuration')
  const deck = DECK.map(c => ({ ...c }))
  for (let i = deck.length - 1; i > 0; i--) {
    const roll = rng()
    if (!Number.isFinite(roll) || roll < 0 || roll >= 1) throw Error('Invalid random source')
    const j = Math.floor(roll * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  const s: LiveState = {
    version: 1, ...(trainingHero !== undefined ? { trainingHero } : {}), ...(preflopOnly ? { preflopOnly: true as const } : {}), config: structuredClone(config), deck, cursor: 0, board: [], burns: [],
    seats: config.stacks.map(stack => ({ cards: [] as unknown as HoleCards, stack, committed: 0, streetBet: 0, folded: false, actedAt: null })),
    street: 'preflop', toAct: null, bet: config.bigBlind, minRaise: config.bigBlind,
    pot: 0, deadMoney: 0, totalChips: config.stacks.reduce((a, b) => a + b, 0), payouts: config.stacks.map(() => 0), pots: [], refunds: [],
  }
  const sb = n === 2 ? config.button : next(s, config.button)
  const bb = next(s, sb)
  for (let round = 0; round < 2; round++) {
    for (let k = 0; k < n; k++) s.seats[(sb + k) % n].cards.push(draw(s))
  }
  // Per-player antes are posted first. BBA is table dead money, posted after the blind.
  if (config.ante?.kind === 'each') {
    for (let i = 0; i < n; i++) post(s, i, config.ante.amount, false)
  }
  post(s, sb, config.smallBlind, true)
  post(s, bb, config.bigBlind, true)
  if (config.ante?.kind === 'big-blind') {
    const paid = Math.min(s.seats[bb].stack, config.ante.amount)
    s.seats[bb].stack -= paid
    s.deadMoney += paid
    s.pot += paid
  }
  advance(s, bb)
  assertLiveState(s)
  return s
}

export function legalLiveActions(s: LiveState): LiveLegal {
  const none: LiveLegal = { fold: false, check: false, call: 0, minRaiseTo: null, maxRaiseTo: null }
  if (s.street === 'complete' || s.toAct === null) return none
  const p = s.seats[s.toAct]
  const call = Math.min(p.stack, Math.max(0, s.bet - p.streetBet))
  const hasOpponent = s.seats.some((q, i) => i !== s.toAct && !q.folded && q.stack > 0)
  const reopened = p.actedAt === null || p.actedAt === 0 || s.bet - p.actedAt >= s.minRaise
  const max = p.streetBet + p.stack
  const canRaise = hasOpponent && reopened && max > s.bet
  return { fold: true, check: p.streetBet >= s.bet, call,
    minRaiseTo: canRaise ? Math.min(max, s.bet + s.minRaise) : null,
    maxRaiseTo: canRaise ? max : null }
}

/** Pure transition: reject illegal actions before changing any chips or state. */
export function actLive(state: LiveState, action: LiveAction): LiveState {
  const legal = legalLiveActions(state)
  if (state.toAct === null || state.street === 'complete') throw Error('No live decision')
  if ((action.kind === 'check' && !legal.check)
    || (action.kind === 'call' && legal.call === 0)
    || (action.kind === 'raise' && (!integer(action.to) || legal.minRaiseTo === null
      || action.to < legal.minRaiseTo || action.to > legal.maxRaiseTo!))) throw Error('Illegal live action')
  if (!['fold', 'check', 'call', 'raise'].includes(action.kind)) throw Error('Unknown live action')
  const s = clone(state), actor = s.toAct!, p = s.seats[actor]
  switch (action.kind) {
    case 'fold': p.folded = true; break
    case 'call': post(s, actor, legal.call, true); break
    case 'check': break
    case 'raise': {
      const delta = action.to - s.bet
      post(s, actor, action.to - p.streetBet, true)
      if (delta >= s.minRaise) s.minRaise = delta
      s.bet = action.to
      break
    }
  }
  p.actedAt = s.bet
  if (action.kind === 'fold' && actor === s.trainingHero) {
    s.heroFolded = true; s.toAct = null; assertLiveState(s); return s
  }
  advance(s, actor)
  assertLiveState(s)
  return s
}

function refundUncalled(s: LiveState) {
  const ordered = s.seats.map((p, i) => ({ p, i })).sort((a, b) => b.p.streetBet - a.p.streetBet)
  const highest = ordered[0], excess = highest.p.streetBet - ordered[1].p.streetBet
  if (excess > 0) {
    highest.p.streetBet -= excess
    highest.p.committed -= excess
    highest.p.stack += excess
    s.pot -= excess
    s.refunds.push({ seat: highest.i, amount: excess })
  }
}
function dealStreet(s: LiveState) {
  s.burns.push(draw(s))
  const count = s.street === 'preflop' ? 3 : 1
  for (let i = 0; i < count; i++) s.board.push(draw(s))
  s.street = s.street === 'preflop' ? 'flop' : s.street === 'flop' ? 'turn' : 'river'
  s.bet = 0
  s.minRaise = s.config.bigBlind
  for (const p of s.seats) { p.streetBet = 0; p.actedAt = null }
}
function advance(s: LiveState, after: number) {
  if (livePlayers(s).length === 1) { refundUncalled(s); settle(s); return }
  const funded = livePlayers(s).filter(({ p }) => p.stack > 0)
  if (funded.length < 2) s.bet = Math.max(...livePlayers(s).map(({ p }) => p.streetBet))
  // Once nobody can contest more chips, do not ask a lone funded player to check each street.
  const needs = (i: number) => {
    const p = s.seats[i]
    return !p.folded && p.stack > 0 && (p.streetBet < s.bet || (funded.length > 1 && p.actedAt === null))
  }
  for (let k = 1; k <= s.seats.length; k++) {
    const i = (after + k) % s.seats.length
    if (needs(i)) { s.toAct = i; return }
  }
  refundUncalled(s)
  if (s.preflopOnly && s.street === 'preflop') { s.preflopComplete = true; s.toAct = null; return }
  if (s.street === 'river') { settle(s); return }
  if (funded.length < 2) {
    while (s.board.length < 5) dealStreet(s)
    settle(s)
    return
  }
  dealStreet(s)
  advance(s, s.config.button)
}
function settle(s: LiveState) {
  const active = livePlayers(s)
  const scores = new Map(active.map(({ p, i }) => [i, active.length === 1 ? 0 : evaluateHand([...p.cards, ...s.board].map(label)).score]))
  const levels = [...new Set(s.seats.map(p => p.committed).filter(x => x > 0))].sort((a, b) => a - b)
  let previous = 0
  const pots: { amount: number; eligible: number[] }[] = []
  for (const level of levels) {
    const contributors = s.seats.map((p, i) => ({ p, i })).filter(({ p }) => p.committed >= level)
    const amount = (level - previous) * contributors.length + (previous === 0 ? s.deadMoney : 0)
    // Uncontested winner receives all remaining pots, including dead money.
    const eligible = active.length === 1 ? [active[0].i] : contributors.filter(({ p }) => !p.folded).map(({ i }) => i)
    if (!eligible.length) throw Error('Pot has no eligible winner')
    // Folded contributions are dead money, not separate all-in pots. Coalesce
    // identical eligibility BEFORE splitting, so odd chips are awarded once.
    const last = pots.at(-1)
    if (last && last.eligible.length === eligible.length && last.eligible.every((seat, i) => seat === eligible[i])) last.amount += amount
    else pots.push({ amount, eligible })
    previous = level
  }
  for (const { amount, eligible } of pots) {
    const best = Math.max(...eligible.map(i => scores.get(i)!))
    const winners = eligible.filter(i => scores.get(i) === best)
    // Odd chips go to the first tied winner clockwise after the button.
    winners.sort((a, b) => ((a - s.config.button - 1 + s.seats.length) % s.seats.length) - ((b - s.config.button - 1 + s.seats.length) % s.seats.length))
    const share = Math.floor(amount / winners.length), remainder = amount % winners.length
    winners.forEach((i, k) => { const won = share + (k < remainder ? 1 : 0); s.seats[i].stack += won; s.payouts[i] += won })
    s.pots.push({ amount, eligible, winners })
  }
  s.pot = 0
  s.street = 'complete'
  s.toAct = null
}

/** Runtime invariants also used by deterministic randomized tests. */
export function assertLiveState(s: LiveState) {
  if (s.heroFolded && (s.trainingHero === undefined || !s.seats[s.trainingHero]?.folded || s.toAct !== null)) throw Error('Invalid learning fold boundary')
  if (s.preflopComplete && (!s.preflopOnly || s.street !== 'preflop' || s.board.length || s.burns.length || s.toAct !== null || s.pots.length || s.payouts.some(n => n !== 0))) throw Error('Invalid preflop boundary')
  if (!integer(s.pot) || s.seats.some(p => !integer(p.stack) || !integer(p.committed) || !integer(p.streetBet))) throw Error('Invalid chip ledger')
  if (s.seats.reduce((a, p) => a + p.stack, 0) + s.pot !== s.totalChips) throw Error('Chip conservation failure')
  const dealt = [...s.seats.flatMap(p => p.cards), ...s.burns, ...s.board].map(label)
  if (new Set(dealt).size !== dealt.length || dealt.length !== s.cursor || s.deck.length !== 52 || new Set(s.deck.map(label)).size !== 52
    || s.deck.some(c => !DECK.some(d => label(c) === label(d)))
    || dealt.some(c => !s.deck.slice(0, s.cursor).some(d => label(d) === c))) throw Error('Invalid live deck')
  if (s.toAct !== null && (s.seats[s.toAct].folded || s.seats[s.toAct].stack === 0)) throw Error('Invalid acting player')
}
