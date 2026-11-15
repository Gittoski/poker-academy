'use client'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { useJournal } from '@/learning/Journal'
import { usePlayUI } from './PlayFrame'
/** Keep long final summaries in the same overlay pattern as decision feedback. */
export function HandResult({
  children,
  action,
}: {
  children: ReactNode
  action: ReactNode
}) {
  const ui = usePlayUI(),
    { paused } = useJournal(),
    id = useId(),
    dialog = useRef<HTMLDialogElement>(null),
    opener = useRef<HTMLButtonElement>(null)
  const [expanded, setExpanded] = useState(true)
  useEffect(() => {
    const d = dialog.current
    if (!d) return
    if (ui?.mobile && expanded && !paused && !ui.settings) {
      if (!d.open) d.showModal()
    } else if (d.open) {
      d.close()
      if (!expanded) requestAnimationFrame(() => opener.current?.focus())
    }
  }, [expanded, ui?.mobile, ui?.settings, paused])
  if (!ui?.mobile)
    return (
      <section className="hand-result" aria-label="Hand result">
        {children}
        {action}
      </section>
    )
  return (
    <>
      <section
        hidden={expanded}
        className="hand-result"
        aria-label="Hand result"
      >
        <h3>Hand complete</h3>
        <button ref={opener} className="btn" onClick={() => setExpanded(true)}>
          Result & showdown
        </button>
        {action}
      </section>
      <dialog
        ref={dialog}
        className="sim-sheet"
        aria-labelledby={id}
        onCancel={(e) => {
          e.preventDefault()
          setExpanded(false)
        }}
      >
        <header>
          <h2 id={id}>Hand result</h2>
          <button className="btn" onClick={() => setExpanded(false)}>
            Back to table
          </button>
        </header>
        <div className="sim-sheet__scroll">{children}</div>
        <footer className="sim-sheet__actions">{action}</footer>
      </dialog>
    </>
  )
}
