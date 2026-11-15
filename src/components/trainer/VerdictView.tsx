import { LEARNING_LABELS, formatFrequency } from '@/learning/classification'
import type { LearningResult, FrequencyReference } from '@/learning/types'
import { useEffect, useRef, useState, useId, type ReactNode } from 'react'
import { useJournal } from '@/learning/Journal'
import { usePlayUI, useSurface } from './PlayFrame'
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
  const headingId = useId()
  const ui = usePlayUI(),
    surface = useSurface(),
    { retryDecision, paused } = useJournal()
  const [expanded, setExpanded] = useState(false),
    [tab, setTab] = useState<'explanation' | 'chart'>('explanation'),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  const dialog = useRef<HTMLDialogElement>(null),
    opener = useRef<HTMLButtonElement>(null)
  const { prompt, guess, result, learning } = verdict
  const missed = learning ? learning.kind === 'outside' : result !== 'correct'
  useEffect(() => {
    if (ui?.mobile && missed) setExpanded(true)
  }, [ui?.mobile, missed])
  useEffect(() => {
    const d = dialog.current
    if (!d) return
    if (expanded && ui?.mobile && !ui.settings && !paused) {
      if (!d.open) d.showModal()
    } else if (d.open) {
      d.close()
      if (!expanded) requestAnimationFrame(() => opener.current?.focus())
    }
  }, [expanded, ui?.mobile, ui?.settings, paused])
  function close() {
    setExpanded(false)
    opener.current?.focus()
  }
  function proceed() {
    dialog.current?.close()
    onProceed()
  }
  async function retry() {
    setBusy(true)
    setError('')
    try {
      await retryDecision()
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(false)
    }
  }
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
  const frequencies = (
    <div
      className={actionsClass(prompt)}
      role="group"
      aria-label="Chart frequencies"
    >
      {prompt.options.map((o, i) => (
        <button
          key={i}
          type="button"
          className={`action-btn action-btn--${o.kind}${i === guess ? ' action-btn--chosen' : ''}${i === prompt.expected ? ' action-btn--best' : ''}`}
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
      ))}
    </div>
  )
  const basis = (
    <p>
      {source === 'chart'
        ? 'Supplied preflop chart weights for the selected configuration and your hand.'
        : 'Supplied postflop frequencies at this recorded decision node.'}{' '}
      Your choice is compared with those reference frequencies, not the actual
      hidden opponent cards or later winner. This does not calculate an EV loss.
      Learning priorities and spacing are heuristics, separate from the strategy
      reference.
    </p>
  )
  const title = learning ? LEARNING_LABELS[learning.kind] : GRADE_TEXT[result]
  const nextLabel = proceedLabel ?? (handOver ? 'Next hand' : 'Continue')
  if (ui?.mobile)
    return (
      <>
        <div
          hidden={expanded}
          className={`verdict sim-compact verdict--${missed ? 'wrong' : 'correct'}`}
          aria-live="polite"
        >
          <strong>{title}.</strong>
          <span>{missed ? `Reference action: ${expected}.` : text}</span>
          <button
            ref={opener}
            className="btn"
            onClick={() => setExpanded(true)}
          >
            Explanation & chart
          </button>
          <button className="btn btn--primary verdict__next" onClick={proceed}>
            {nextLabel}
          </button>
        </div>
        <dialog
          ref={dialog}
          className="sim-sheet sim-feedback"
          aria-labelledby={headingId}
          onCancel={(e) => {
            e.preventDefault()
            close()
          }}
        >
          <header>
            <h2 id={headingId}>Review this decision</h2>
            <button
              className="btn"
              onClick={close}
              aria-label="Close explanation"
            >
              ✕
            </button>
          </header>
          <nav aria-label="Feedback views">
            <button
              className="btn"
              aria-pressed={tab === 'explanation'}
              onClick={() => setTab('explanation')}
            >
              Explanation
            </button>
            <button
              className="btn"
              aria-pressed={tab === 'chart'}
              onClick={() => setTab('chart')}
            >
              Chart
            </button>
          </nav>
          <div className="sim-sheet__scroll">
            <section
              hidden={tab !== 'explanation'}
              className={`verdict verdict--${missed ? 'wrong' : 'correct'}`}
            >
              <strong>{title}.</strong>
              <p>Your choice: {prompt.options[guess].label}</p>
              <p>
                {text} {handOver}
              </p>
              <h3>Where this answer comes from</h3>
              {basis}
              {children}
            </section>
            <section hidden={tab !== 'chart'}>
              {frequencies}
              <div ref={surface?.setTarget} />
            </section>
            {error && <p role="alert">{error}</p>}
          </div>
          <footer className="sim-sheet__actions">
            <button
              className="btn"
              disabled={busy}
              onClick={() => void retry()}
            >
              Retry
            </button>
            <button
              className="btn btn--primary verdict__next"
              disabled={busy}
              onClick={proceed}
            >
              {nextLabel}
            </button>
          </footer>
        </dialog>
      </>
    )
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
