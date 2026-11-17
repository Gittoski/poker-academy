'use client'
import { useEffect, useRef, type ReactNode } from 'react'

/** Native modal focus containment, Escape support and internal scrolling. */
export function LiveSheet({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const element = dialog.current
    const previous = document.activeElement
    const overflow = document.body.style.overflow
    element?.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      element?.close()
      document.body.style.overflow = overflow
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus({ preventScroll: true })
    }
  }, [])
  return (
    <dialog
      ref={dialog}
      className="sim-sheet live-sheet"
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
    >
      <header>
        <strong>{title}</strong>
        <button className="btn" onClick={onClose}>
          Back to hand
        </button>
      </header>
      <div className="sim-sheet__scroll">{children}</div>
    </dialog>
  )
}
