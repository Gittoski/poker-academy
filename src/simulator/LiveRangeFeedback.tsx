'use client'
import { useMemo, useState } from 'react'
import { RangeGrid } from '@/components/RangeGrid'
import { Legend } from '@/components/Legend'
import { actionTotals, resolveActions } from '@/lib/range'
import type { Hand } from '@/lib/hands'
import { formatFrequency } from '@/learning/classification'
import type { LiveReference } from './liveReference'

export function LiveRangeFeedback({
  reference,
  retry,
  onContinue,
  onTools,
  continueLabel,
}: {
  reference: LiveReference
  retry: boolean
  onContinue?: () => void
  onTools?: () => void
  continueLabel: string
}) {
  const [hovered, setHovered] = useState<Hand | null>(null)
  const weights = useMemo(
    () =>
      reference.chart ? resolveActions(reference.chart.entry.range) : null,
    [reference.chart],
  )
  const supported =
    reference.status === 'match' || reference.status === 'alternative'
  const heading =
    reference.status === 'ungraded'
      ? 'No matching range'
      : supported
        ? 'In range'
        : 'Outside range'
  const label = hovered?.label ?? reference.chart?.hand
  const inspected = label ? weights?.get(label) : undefined
  const action = reference.chart?.action
  return (
    <section
      className="card live-range-feedback"
      aria-label="Decision feedback"
      id="live-range-feedback"
    >
      <div className="live-range-heading">
        <h2>
          {retry ? 'Retry: ' : ''}
          {heading}
        </h2>
        {reference.chart && (
          <span className="pill">
            {reference.chart.hand} · {action}
          </span>
        )}
      </div>
      {reference.chart && weights ? (
        <>
          <p className="live-range-context">
            {reference.chart.title} · Cash 100bb PTO · Before your decision
          </p>
          <p>
            Your {reference.chart.hand} is outlined.{' '}
            {action && (
              <>
                The range plays {action} with this hand at{' '}
                <strong>
                  {formatFrequency(reference.frequencies![action])}
                </strong>
                .
              </>
            )}
          </p>
          <RangeGrid
            weights={weights}
            highlight={reference.chart.hand}
            onHover={setHovered}
          />
          <Legend totals={actionTotals(weights)} />
          <p className="live-range-inspect" aria-live="polite">
            {label && inspected
              ? `${hovered ? 'Inspecting' : 'Your hand'} ${label}: raise ${formatFrequency(inspected.raise)}, call ${formatFrequency(inspected.call)}, fold ${formatFrequency(inspected.fold)}.`
              : 'Tap or focus a hand to inspect its frequencies.'}
          </p>
        </>
      ) : (
        <p>
          {reference.status === 'ungraded'
            ? reference.explanation
            : 'This older decision has no saved grid, and the identical source is unavailable. New decisions save their matching range.'}
        </p>
      )}
      {onContinue && (
        <button className="btn btn--primary" onClick={onContinue}>
          {continueLabel}
        </button>
      )}
      {onTools && (
        <button className="btn" onClick={onTools}>
          Practice tools
        </button>
      )}
      <details>
        <summary>Range details</summary>
        <p>{reference.explanation}</p>
        <p>{reference.source}</p>
        {reference.referenceHash && (
          <small>
            Original source saved with this decision. Range support is not an
            EV-loss measurement.
          </small>
        )}
      </details>
    </section>
  )
}
