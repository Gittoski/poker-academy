import { boardShown, type HandScript, type SuitMap } from '@/lib/fullHands'
import { potOdds } from './math'
import type { DecisionRecord } from '@/learning/types'
import type { Topic } from './content'
export interface SkillLink {
  topic: Topic
  label: string
  reason: string
}
/** Related learning, NOT a causal diagnosis of why a reference action was missed. Only the pre-decision public state is read. */
export function supportedSkills(
  a: DecisionRecord,
  script: HandScript | null,
  suits: SuitMap | null,
): {
  tag: string
  links: SkillLink[]
  price: null | { pot: number; cost: number; threshold: number }
} {
  const canCall = a.prompt.options.some(
      (o) => o.kind === 'C' || o.kind === 'call',
    ),
    links: SkillLink[] = []
  let pot = 0,
    cost = 0
  if (a.before.play && script) {
    const before = a.before.play
    const bets = before.bets,
      own = bets[script.heroPlayer]
    pot = script.streets[before.streetIndex].pot + bets.ip + bets.oop
    cost = Math.max(bets.ip, bets.oop) - own
  } else {
    const seats = a.before.hand.seats,
      own = seats.find((s) => s.position === a.before.hand.hero)!
    pot = seats.reduce((sum, s) => sum + s.committed, 0)
    cost = Math.max(...seats.map((s) => s.committed)) - own.committed
  }
  const price =
    canCall && pot > 0 && cost > 0
      ? { pot, cost, threshold: potOdds(pot, cost) }
      : null
  if (price) {
    links.push({
      topic: 'pot-odds',
      label: 'Pot odds',
      reason:
        'A call price is available from the public pot and bets. This does not establish your equity or prove a mathematics error.',
    })
    if (a.prompt.street === 'river') {
      links.push(
        {
          topic: 'equity',
          label: 'Equity against a range',
          reason:
            'River calls need an explicitly justified range, not the opponent’s later revealed hand.',
        },
        {
          topic: 'ev',
          label: 'Expected value',
          reason:
            'With no future betting, a stated equity assumption can be combined with the call price. No such equity is inferred here.',
        },
      )
    }
  }
  if (
    script &&
    suits &&
    a.before.play &&
    ['flop', 'turn'].includes(a.prompt.street)
  ) {
    const hero = a.before.hand.seats.find(
        (s) => s.position === a.before.hand.hero,
      )!,
      known = [...hero.cards, ...boardShown(script, a.before.play, suits)],
      counts = known.reduce<Record<string, number>>((r, c) => {
        r[c.suit] = (r[c.suit] ?? 0) + 1
        return r
      }, {})
    if (Object.values(counts).some((n) => n === 4))
      links.push({
        topic: 'draws',
        label: 'Outs and draw probabilities',
        reason:
          'A visible four-card flush structure supports draw-completion practice. Winning outs and range equity remain unknown.',
      })
  }
  return {
    tag:
      a.prompt.street === 'preflop'
        ? `Preflop ${a.prompt.decision?.scenario ?? 'range'} selection`
        : canCall
          ? 'Facing a postflop bet'
          : 'Postflop bet/check selection',
    links,
    price,
  }
}
