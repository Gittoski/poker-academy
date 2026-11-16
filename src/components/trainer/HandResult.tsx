'use client'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import type { ScriptResult } from '@/lib/fullHands'
import { useJournal } from '@/learning/Journal'
import { usePlayUI } from './PlayFrame'
/** Show the recorded terminal outcome only after the completed runout is acknowledged. */
export function HandResult({
  children,
  action,
  outcome,
}: {
  children: ReactNode
  action: ReactNode
  outcome?: ScriptResult
}) {
  const ui = usePlayUI(),
    { paused } = useJournal(),
    id = useId(),
    dialog = useRef<HTMLDialogElement>(null),
    opener = useRef<HTMLButtonElement>(null)
  const [expanded, setExpanded] = useState(true)
  const title =
    outcome?.winner === 'hero'
      ? 'You win'
      : outcome?.winner === 'villain'
        ? 'Villain wins'
        : 'Split pot'
  useEffect(() => {
    const d = dialog.current
    if (!d) return
    if (outcome && expanded && !paused && !ui?.settings) {
      if (!d.open) {
        d.showModal()
        d.focus({ preventScroll: true })
        const body = d.querySelector('.sim-sheet__scroll')
        if (body) body.scrollTop = 0
      }
    } else if (d.open) {
      d.close()
      if (!expanded) requestAnimationFrame(() => opener.current?.focus())
    }
  }, [outcome, expanded, paused, ui?.settings])
  return (
    <>
      <section
        hidden={!!outcome && expanded}
        className={`hand-result${outcome ? ' has-outcome' : ''}`}
        aria-label="Hand result"
      >
        {outcome ? (
          <>
            <h3>
              {title} · {outcome.pot} BB pot
            </h3>
            <button
              ref={opener}
              className="btn"
              onClick={() => setExpanded(true)}
            >
              Show result
            </button>
          </>
        ) : ui?.mobile ? (
          <h3>Hand complete</h3>
        ) : (
          children
        )}
        {action}
      </section>
      {outcome && (
        <dialog
          ref={dialog}
          tabIndex={-1}
          className={`sim-sheet hand-outcome-dialog hand-outcome--${outcome.winner}`}
          aria-labelledby={id}
          onCancel={(e) => {
            e.preventDefault()
            setExpanded(false)
          }}
        >
          <section className="hand-outcome-content" aria-label="Hand result">
            <div className="sim-sheet__scroll">
              <p className="outcome-eyebrow">SHOWDOWN</p>
              <h2 id={id}>{title}</h2>
              <p className="outcome-pot">
                {outcome.pot} <span>BB pot</span>
              </p>
              <dl className="outcome-hands">
                <div
                  className={outcome.winner === 'hero' ? 'outcome-winner' : ''}
                >
                  <dt>Hero · You</dt>
                  <dd>{outcome.heroHand ?? 'Hand name not supplied'}</dd>
                </div>
                <div
                  className={
                    outcome.winner === 'villain' ? 'outcome-winner' : ''
                  }
                >
                  <dt>Villain</dt>
                  <dd>{outcome.villainHand ?? 'Hand name not supplied'}</dd>
                </div>
              </dl>
              <p className="outcome-source">
                Recorded result of the supplied hand.
              </p>
              <details>
                <summary>Hand details</summary>
                {children}
              </details>
            </div>
            <footer className="sim-sheet__actions">
              <button className="btn" onClick={() => setExpanded(false)}>
                Back to table
              </button>
              {action}
            </footer>
          </section>
        </dialog>
      )}
    </>
  )
}
