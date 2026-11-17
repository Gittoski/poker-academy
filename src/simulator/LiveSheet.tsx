'use client'
import { useEffect, useRef, type ReactNode } from 'react'

/** Native modal focus containment, Escape support and internal scrolling. */
export function LiveSheet({
  title,
  onClose,
  children,
  footer,
  navigation,
  closeLabel = 'Back to hand',
  className = '',
}: {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  navigation?: ReactNode
  closeLabel?: string
  className?: string
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
      className={`sim-sheet live-sheet ${className}`}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
    >
      <header>
        <strong>{title}</strong>
        <button className="btn" onClick={onClose}>
          {closeLabel}
        </button>
      </header>
      {navigation}
      <div className="sim-sheet__scroll">{children}</div>
      {footer && <footer className="sim-sheet__actions">{footer}</footer>}
    </dialog>
  )
}
