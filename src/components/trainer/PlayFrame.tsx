'use client'
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
const UI = createContext<{
  mobile: boolean
  settings: boolean
  target: HTMLDivElement | null
  openSettings: () => void
  reportStatus: (text: string) => void
} | null>(null)
export const usePlayUI = () => useContext(UI)
export function PlayFrame({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState('Loading…')
  const [mobile, setMobile] = useState(false),
    [settings, setSettings] = useState(false),
    [target, setTarget] = useState<HTMLDivElement | null>(null)
  const dialog = useRef<HTMLDialogElement>(null),
    trigger = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const media = matchMedia(
      '(max-width: 768px), (max-width: 1024px) and (max-height: 600px)',
    )
    const sync = () => {
      setMobile(media.matches)
      document.body.classList.toggle('simulator-focus', media.matches)
    }
    sync()
    media.addEventListener('change', sync)
    return () => {
      media.removeEventListener('change', sync)
      document.body.classList.remove('simulator-focus')
    }
  }, [])
  useEffect(() => {
    const d = dialog.current
    if (!d) return
    if (settings) {
      d.showModal()
    } else if (d.open) d.close()
  }, [settings])
  function close() {
    setSettings(false)
    trigger.current?.focus()
  }
  return (
    <UI.Provider
      value={{
        mobile,
        settings,
        target,
        openSettings: () => setSettings(true),
        reportStatus: setStatus,
      }}
    >
      <main className="page play-page">
        <header className="sim-header">
          <a className="sim-back" href="/" aria-label="Leave simulator">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m14 6-6 6 6 6" />
            </svg>
          </a>
          <div className="sim-header__title">
            <strong>Simulator</strong>
            <span role="status" className="sim-save-status" title={status}>
              {status === 'Saved on this device' ? 'Saved on device' : status}
            </span>
          </div>
          {status.startsWith('Not saved') && (
            <button
              className="btn sim-menu"
              ref={trigger}
              onClick={() => setSettings(true)}
              aria-haspopup="dialog"
            >
              Save needs attention
            </button>
          )}
        </header>
        {children}
        <dialog
          ref={dialog}
          className="sim-sheet sim-settings"
          aria-labelledby="sim-settings-title"
          onCancel={(e) => {
            e.preventDefault()
            close()
          }}
        >
          <header>
            <h2 id="sim-settings-title">Hand details & recovery</h2>
            <button className="btn" onClick={close}>
              Back to hand
            </button>
          </header>
          <div className="sim-sheet__scroll" ref={setTarget} />
        </dialog>
      </main>
    </UI.Provider>
  )
}
export function PlayOptions({ children }: { children: ReactNode }) {
  const ui = usePlayUI()
  return ui ? (
    ui.target ? (
      createPortal(children, ui.target)
    ) : null
  ) : (
    <>{children}</>
  )
}
const Surface = createContext<{
  target: HTMLDivElement | null
  setTarget: (el: HTMLDivElement | null) => void
} | null>(null)
export const useSurface = () => useContext(Surface)
export function TrainerSurface({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<HTMLDivElement | null>(null)
  return (
    <Surface.Provider value={{ target, setTarget }}>
      <div className="trainer-surface">{children}</div>
    </Surface.Provider>
  )
}
export function MobileCharts({ children }: { children: ReactNode }) {
  const ui = usePlayUI(),
    surface = useSurface()
  return ui?.mobile ? (
    surface?.target ? (
      createPortal(children, surface.target)
    ) : null
  ) : (
    <>{children}</>
  )
}

/** Global page navigation stays outside the focused simulator's settings. */
export function DesktopOnly({ children }: { children: ReactNode }) {
  const ui = usePlayUI()
  return ui?.mobile ? null : <>{children}</>
}
