'use client'
import { useState } from 'react'
import { formatFrequency } from '@/learning/classification'
import { liveUngradedSummary, type LiveReference } from './liveReference'
import { LiveRangeFeedback } from './LiveRangeFeedback'
import { LiveSheet } from './LiveSheet'

/** Matches the approved compact-success / automatic-error learning interaction. */
export function LiveDecisionFeedback({
  reference,
  action,
  retry,
  onRetry,
  onContinue,
  continueLabel,
  suspended = false,
}: {
  suspended?: boolean
  reference: LiveReference
  action: string
  retry: boolean
  onRetry: () => void
  onContinue: () => void
  continueLabel: string
}) {
  const outside = reference.status === 'outside'
  const supported =
    reference.status === 'match' || reference.status === 'alternative'
  const title = outside
    ? 'Outside range'
    : supported
      ? 'In range'
      : 'No matching range'
  const buttonText = continueLabel.startsWith('Deal next')
    ? 'Next hand'
    : continueLabel === 'Continue hand'
      ? 'Continue'
      : continueLabel
  const [expanded, setExpanded] = useState(outside)
  const [tab, setTab] = useState<'explanation' | 'chart'>('explanation')
  const supportedActions = reference.frequencies
    ? Object.entries(reference.frequencies)
        .filter(([, v]) => v > 0)
        .map(
          ([kind, v]) =>
            `${kind === 'raise' && reference.raiseTo ? `raise to ${reference.raiseTo / 100} BB` : kind} (${formatFrequency(v)})`,
        )
        .join(', ')
    : null
  return (
    <>
      <section
        hidden={expanded || suspended}
        className={`verdict sim-compact live-decision verdict--${outside ? 'wrong' : supported ? 'correct' : 'ungraded'}`}
        aria-label="Decision feedback"
        aria-live="polite"
      >
        <strong role="heading" aria-level={3}>
          {retry ? 'Retry: ' : ''}
          {title}.
        </strong>
        <span>
          {outside
            ? 'This reference gives your action zero support.'
            : supported
              ? 'Your choice is supported by this reference.'
              : liveUngradedSummary(reference)}
        </span>
        <button
          className="btn"
          onClick={() => {
            setExpanded(true)
            setTab('explanation')
          }}
        >
          Explanation & chart
        </button>
        <button
          className="btn btn--primary"
          onClick={onContinue}
          aria-label={continueLabel}
        >
          {buttonText}
        </button>
      </section>
      {expanded && !suspended && (
        <LiveSheet
          title="Review this decision"
          className="sim-feedback live-feedback"
          closeLabel="Close explanation"
          onClose={() => setExpanded(false)}
          navigation={
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
          }
          footer={
            <>
              <button className="btn" onClick={onRetry}>
                Retry
              </button>
              <button
                className="btn btn--primary"
                onClick={onContinue}
                aria-label={continueLabel}
              >
                {buttonText}
              </button>
            </>
          }
        >
          <section aria-label="Decision feedback">
            <div
              hidden={tab !== 'explanation'}
              className={`verdict verdict--${outside ? 'wrong' : supported ? 'correct' : 'ungraded'}`}
            >
              <h2>
                {retry ? 'Retry: ' : ''}
                {title}
              </h2>
              <p>
                Your choice: <strong>{action}</strong>
                {reference.chart ? ` with ${reference.chart.hand}.` : '.'}
              </p>
              {reference.chart && (
                <p>
                  {reference.chart.title} · Cash 100 BB · Before your decision.
                </p>
              )}
              <p>{reference.explanation}</p>
              {!supported && !outside && (
                <p>
                  Ungraded means we cannot label this decision correct or
                  incorrect. Live play uses imported preflop charts for matching
                  100 BB, no-ante situations. Random postflop boards, prior
                  callers and different sizing can fall outside those charts.
                  Winning or losing the hand does not supply a strategy grade.
                </p>
              )}
              {supportedActions && (
                <p>
                  The supplied reference supports:{' '}
                  <strong>{supportedActions}</strong>.
                </p>
              )}
              {outside && (
                <p>
                  Retry restores this decision so you can choose again. Your
                  original mistake stays saved. Continue keeps your actual
                  choice; it does not substitute a chart action.
                </p>
              )}
              <h3>Where this answer comes from</h3>
              <p>{reference.source}</p>
              <p>
                Only information available when you acted is used. Results and
                hidden opponent cards do not determine this feedback. A
                supported mixed action is valid even when less frequent. No EV
                loss is calculated.
              </p>
            </div>
            <div hidden={tab !== 'chart'}>
              <LiveRangeFeedback
                reference={reference}
                retry={retry}
                continueLabel={continueLabel}
                regionLabel="Range chart"
              />
            </div>
          </section>
        </LiveSheet>
      )}
    </>
  )
}
