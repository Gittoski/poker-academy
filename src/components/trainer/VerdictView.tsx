import { LEARNING_LABELS, formatFrequency } from '@/learning/classification'
import type { LearningResult, FrequencyReference } from '@/learning/types'
import type { ReactNode } from 'react'
import type { Grade, Prompt } from '@/lib/trainer'
import { actionsClass } from './ActionPrompt'

export interface Verdict {
  prompt: Prompt
  guess: number
  result: Grade
  learning?: LearningResult
  reference?: FrequencyReference
}

const GRADE_TEXT: Record<Grade, string> = {
  correct: 'Correct',
  partial: 'Partly right',
  wrong: 'Wrong',
}

interface Props {
  children?: ReactNode
  proceedLabel?: string
  verdict: Verdict
  /** Where the answer came from, for the explanation. */
  source: 'chart' | 'reference'
  /** Whether the hand carries on along the expected option after a wrong answer. */
  continues: boolean
  /** Set when the hand is over: shown after the explanation and turns the button into "Next hand". */
  handOver: string | null
  onProceed: () => void
}

/** Feedback on an answer: every option with its frequency, the expected one outlined, and an explanation. */
export function VerdictView({
  verdict,
  source,
  continues,
  handOver,
  onProceed,
  children,
  proceedLabel,
}: Props) {
  const { prompt, guess, result, learning } = verdict
  const expected = prompt.options[prompt.expected].label
  const mostly = prompt.probs[prompt.expected] < 100
  let text: string
  if (result === 'correct') text = `${expected} is the ${source}'s move.`
  else {
    text = `The ${source} ${mostly ? 'mostly ' : ''}plays ${expected.toLowerCase()}${mostly ? ` (${prompt.probs[prompt.expected]}%)` : ''}`
    text += continues ? ', so the hand continues that way.' : '.'
  }
  if (learning) {
    text =
      learning.kind === 'match'
        ? 'Your choice is a most-frequent supported action.'
        : learning.kind === 'alternative'
          ? 'Your choice has positive support in this reference.'
          : learning.kind === 'outside'
            ? 'Your choice has zero support in this reference.'
            : 'No applicable valid reference is available.'
    if (continues && guess !== prompt.expected)
      text += ` The supplied hand continues with ${expected.toLowerCase()}.`
  }
  return (
    <>
      <div
        className={actionsClass(prompt)}
        role="group"
        aria-label="Chart frequencies"
      >
        {prompt.options.map((o, i) => {
          const classes = ['action-btn', `action-btn--${o.kind}`]
          if (i === guess) classes.push('action-btn--chosen')
          if (i === prompt.expected) classes.push('action-btn--best')
          if (i !== guess && i !== prompt.expected)
            classes.push('action-btn--dim')
          return (
            <button
              key={i}
              type="button"
              className={classes.join(' ')}
              disabled
            >
              <span>{o.label}</span>
              <small>
                {verdict.reference
                  ? formatFrequency(
                      verdict.reference.values[i] / verdict.reference.scale,
                    )
                  : `${prompt.probs[i]}%`}
              </small>
            </button>
          )
        })}
      </div>
      <div
        className={`verdict verdict--${learning?.kind === 'match' || learning?.kind === 'alternative' ? 'correct' : result}`}
        aria-live="polite"
      >
        <strong>
          {learning ? LEARNING_LABELS[learning.kind] : GRADE_TEXT[result]}.
        </strong>{' '}
        <span>
          {text}
          {handOver ? ` ${handOver}` : ''}
        </span>
        <details className="feedback-basis">
          <summary>Where this answer comes from</summary>
          <p>
            {source === 'chart'
              ? 'Supplied preflop chart weights for the selected configuration and your hand.'
              : 'Supplied postflop frequencies at this recorded decision node.'}{' '}
            Your choice is compared with those reference frequencies, not the
            actual hidden opponent cards or later winner. This does not
            calculate an EV loss. Learning priorities and spacing are
            heuristics, separate from the strategy reference.
          </p>
        </details>
        {children}
        <button
          type="button"
          className="btn btn--primary verdict__next"
          onClick={onProceed}
          autoFocus
        >
          {proceedLabel ?? (handOver ? 'Next hand' : 'Continue')}
        </button>
      </div>
    </>
  )
}
