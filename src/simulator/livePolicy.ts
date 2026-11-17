import { evaluateHand } from '../../scripts/lib/handEval.mjs'
import type { Card, HoleCards, Rng } from '@/lib/cards'
import {
  legalLiveActions,
  type LiveAction,
  type LiveLegal,
  type LiveState,
} from './liveEngine'
import type { OpponentStyle } from './liveSession'

/** The policy receives no opponent hole cards, burns, future board, or deck. */
export interface LiveObservation {
  cards: HoleCards
  board: Card[]
  street: LiveState['street']
  legal: LiveLegal
  pot: number
  bet: number
  bigBlind: number
  isSmallBlind: boolean
}
export function observeLivePlayer(state: LiveState): LiveObservation {
  if (state.toAct === null) throw Error('No acting opponent')
  return structuredClone({
    cards: state.seats[state.toAct].cards,
    board: state.board,
    street: state.street,
    legal: legalLiveActions(state),
    pot: state.pot,
    bet: state.bet,
    bigBlind: state.config.bigBlind,
    isSmallBlind:
      state.toAct ===
      (state.seats.length === 2
        ? state.config.button
        : (state.config.button + 1) % state.seats.length),
  })
}
function strength(o: LiveObservation): number {
  const ranks = '23456789TJQKA'
  if (o.street === 'preflop') {
    const [a, b] = o.cards.map((c) => ranks.indexOf(c.rank) + 2)
    return Math.min(
      1,
      a === b
        ? 0.5 + a / 28
        : (Math.max(a, b) + Math.min(a, b) * 0.5) / 28 +
            (o.cards[0].suit === o.cards[1].suit ? 0.08 : 0),
    )
  }
  const category = Math.floor(
    evaluateHand([...o.cards, ...o.board].map((c) => c.rank + c.suit)).score /
      1048576,
  )
  return Math.min(1, 0.15 + category * 0.18)
}
/** Transparent heuristic sparring partner, not a solver or an equity estimate. */
export function chooseLiveOpponent(
  o: LiveObservation,
  style: OpponentStyle,
  rng: Rng,
  referenceRaiseTo?: number,
): LiveAction {
  const s = strength(o),
    roll = rng(),
    looseness = style === 'loose' ? 0.12 : style === 'tight' ? -0.12 : 0
  const price = o.legal.call / Math.max(1, o.pot + o.legal.call)
  if (o.legal.minRaiseTo !== null && s + looseness > 0.66 && roll < 0.55) {
    // When the public betting history has an exact chart, use its documented
    // sizing. The heuristic still decides WHETHER to raise using only this
    // player's observation; chart action frequencies never drive the opponent.
    const chartSize =
      o.street === 'preflop' &&
      Number.isSafeInteger(referenceRaiseTo) &&
      referenceRaiseTo! >= o.legal.minRaiseTo &&
      referenceRaiseTo! <= o.legal.maxRaiseTo!
        ? referenceRaiseTo
        : undefined
    const target =
      chartSize ??
      (o.street === 'preflop'
        ? o.bet <= o.bigBlind
          ? o.bigBlind * (o.isSmallBlind ? 3 : 2.5)
          : o.bet * 3
        : o.bet > 0
          ? o.bet * 3
          : o.pot * 0.5)
    return {
      kind: 'raise',
      to: Math.min(
        o.legal.maxRaiseTo!,
        Math.max(o.legal.minRaiseTo, Math.round(target)),
      ),
    }
  }
  if (o.legal.check) return { kind: 'check' }
  if (s + looseness + roll * 0.15 > Math.max(0.37, price + 0.2))
    return { kind: 'call' }
  return { kind: 'fold' }
}
