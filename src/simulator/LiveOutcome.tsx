'use client'
import { LiveSheet } from './LiveSheet'
import { CardFace } from '@/components/HoleCards'
import { positionsFor, type PlayerCount } from '@/lib/positions'
import type { LiveState } from './liveEngine'
import { evaluateHand } from '../../scripts/lib/handEval.mjs'
export function liveOutcomeTitle(state: LiveState, hero: number) {
  if (!state.payouts[hero]) return 'Opponents win'
  if (state.pots.every((p) => p.winners.length === 1 && p.winners[0] === hero))
    return 'You win'
  if (state.pots.every((p) => p.winners.includes(hero) && p.winners.length > 1))
    return 'Split pot'
  return 'Pots awarded'
}
export function LiveOutcome({
  state,
  hero,
  onClose,
  onNext,
}: {
  state: LiveState
  hero: number
  onClose: () => void
  onNext: () => void
}) {
  const order = positionsFor(state.seats.length as PlayerCount)
  const title = liveOutcomeTitle(state, hero)
  const pot = state.pots.reduce((n, p) => n + p.amount, 0) / 100
  const net = (state.seats[hero].stack - state.config.stacks[hero]) / 100
  return (
    <LiveSheet
      title="Showdown result"
      className="hand-outcome-dialog live-outcome"
      onClose={onClose}
      closeLabel="Back to table"
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Back to table
          </button>
          <button className="btn btn--primary" onClick={onNext}>
            Next hand
          </button>
        </>
      }
    >
      <section className="hand-outcome-content" aria-label="Live result">
        <p className="outcome-eyebrow">SHOWDOWN</p>
        <h2>{title}</h2>
        <p className="outcome-pot">
          {pot} <span>BB pot</span>
        </p>
        <p>
          Your net result:{' '}
          <strong>
            {net > 0 ? '+' : ''}
            {net} BB
          </strong>
          .
        </p>
        <div className="live-showdown" aria-label="Showdown">
          {state.seats.map(
            (p, i) =>
              !p.folded && (
                <section
                  key={i}
                  className={
                    state.pots.some((pot) => pot.winners.includes(i))
                      ? 'outcome-winner'
                      : ''
                  }
                >
                  <strong>
                    {order[i]}
                    {i === hero ? ' · You' : ''}
                  </strong>
                  <p>
                    {
                      evaluateHand(
                        [...p.cards, ...state.board].map(
                          (c) => c.rank + c.suit,
                        ),
                      ).name
                    }
                  </p>
                  <div className="hole-cards">
                    {p.cards.map((c) => (
                      <CardFace key={c.rank + c.suit} card={c} small />
                    ))}
                  </div>
                </section>
              ),
          )}
        </div>
        <details>
          <summary>Pot details</summary>
          <ul>
            {state.pots.map((p, i) => (
              <li key={i}>
                {i ? `Side pot ${i}` : 'Main pot'}: {p.amount / 100} BB to{' '}
                {p.winners.map((w) => order[w]).join(', ')}
              </li>
            ))}
          </ul>
          {state.refunds.length > 0 && (
            <p>
              Uncalled refunds:{' '}
              {state.refunds
                .map((r) => `${order[r.seat]} ${r.amount / 100} BB`)
                .join('; ')}
              .
            </p>
          )}
        </details>
        <p className="outcome-source">
          Calculated from the played cards and pot eligibility. Payouts include
          returned investments; winning does not grade your decision.
        </p>
      </section>
    </LiveSheet>
  )
}
