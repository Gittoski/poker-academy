import {
  resultMessage,
  type HandScript,
  type PostflopPlay,
} from '@/lib/fullHands'
import type { HandState } from '@/lib/handSim'

/** A fold ends participation; an all-in call can end betting before the river, not the stored runout. */
export function completionSummary(
  script: HandScript,
  hand: HandState,
  play: PostflopPlay | null,
): string | null {
  if (!play) {
    if (!hand.ended || hand.ended.kind === 'flop') return null
    return hand.ended.kind === 'hero-folded'
      ? 'You folded preflop. Your hand ends here; no showdown is available for these folded cards.'
      : hand.ended.message
  }
  if (!play.done) return null
  const street = script.streets[play.streetIndex]?.street ?? 'river'
  const explanation =
    script.result.kind === 'fold'
      ? `The hand ended with a fold on the ${street}. `
      : street !== 'river'
        ? `Betting finished on the ${street}. The remaining board was dealt for showdown. `
        : ''
  return explanation + resultMessage(script)
}

/** UI only: after answering, keep that street visible until Continue / View hand result. Never persist this as an engine cursor. */
export function postAnswerPresentation(
  script: HandScript,
  before: PostflopPlay,
): PostflopPlay {
  const node = script.streets[before.streetIndex]?.nodes[before.nodeIndex]
  const bets = { ...before.bets }
  const action = node?.actions[node.chosen]
  if (node && action?.to !== undefined) bets[node.p] = action.to
  return {
    streetIndex: before.streetIndex,
    nodeIndex: before.nodeIndex + 1,
    bets,
    done: false,
  }
}
