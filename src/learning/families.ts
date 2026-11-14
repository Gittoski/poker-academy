import { handOf } from '@/lib/cards'
import { boardShown, type HandScript } from '@/lib/fullHands'
import { configKey } from './keys'
import { contentHash } from './identity'
import type { Cursor, LearningConfig, SavedPrompt } from './types'
import type { SuitMap } from '@/lib/fullHands'
/** Descriptive reference families, not a solver, poker-strength model or a claim of strategic equivalence. */
export function referenceFamily(
  config: LearningConfig,
  cursor: Cursor,
  prompt: SavedPrompt,
  script: HandScript | null,
  suits: SuitMap | null,
): { skillKey: string; exampleKey: string } {
  const hero = cursor.hand.seats.find((s) => s.position === cursor.hand.hero)!
  const board =
    script && cursor.play && suits ? boardShown(script, cursor.play, suits) : []
  const ranks = board.map((c) => c.rank),
    suitCounts = board.reduce<Record<string, number>>((out, c) => {
      out[c.suit] = (out[c.suit] ?? 0) + 1
      return out
    }, {})
  const publicLine =
    script && cursor.play
      ? script.streets
          .slice(0, cursor.play.streetIndex + 1)
          .map((street, i) =>
            street.nodes
              .slice(
                0,
                i === cursor.play!.streetIndex
                  ? cursor.play!.nodeIndex
                  : undefined,
              )
              .map((n) => ({ p: n.p, action: n.actions[n.chosen] })),
          )
      : []
  const family = {
    config: configKey(config),
    hero: cursor.hand.hero,
    street: prompt.street,
    scenario: prompt.decision?.scenario,
    villain: prompt.decision?.villain ?? script?.villain,
    kind: script?.kind,
    actions: prompt.options.map((o) => o.kind),
    paired: board.length - new Set(ranks).size,
    suited: Math.max(0, ...Object.values(suitCounts)),
    line: publicLine.map((street) =>
      street.map((n) => ({ p: n.p, a: n.action.a })),
    ),
  }
  // Canonical suit labels make a suit permutation the same example, including future-blind identity.
  const suitNames = new Map<string, number>()
  const visible = [...hero.cards, ...board].map((c) => {
    if (!suitNames.has(c.suit)) suitNames.set(c.suit, suitNames.size)
    return `${c.rank}:${suitNames.get(c.suit)}`
  })
  const example =
    prompt.street === 'preflop'
      ? {
          heroClass: handOf(hero.cards).label,
          decision: prompt.decision?.scenario,
          villain: prompt.decision?.villain,
          seats: cursor.hand.seats.map((s) => ({
            p: s.position,
            folded: s.folded,
            committed: s.committed,
          })),
        }
      : {
          visible,
          publicLine,
          pot:
            script && cursor.play
              ? script.streets[cursor.play.streetIndex].pot
              : null,
        }
  return {
    skillKey: contentHash(family),
    exampleKey: contentHash({ family, example }),
  }
}
