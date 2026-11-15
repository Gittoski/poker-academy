'use client'
import type { ReactNode } from 'react'
import { usePlayUI } from './PlayFrame'
/** Finish at the table; mobile has no extra end-of-hand review popup. */
export function HandResult({
  children,
  action,
}: {
  children: ReactNode
  action: ReactNode
}) {
  const ui = usePlayUI()
  return (
    <section className="hand-result" aria-label="Hand result">
      {ui?.mobile ? <h3>Hand complete</h3> : children}
      {action}
    </section>
  )
}
