'use client'
import { useEffect, useRef, useState } from 'react'
import { Segmented } from '@/components/Segmented'
import { InterfaceIcon } from '@/components/InterfaceIcon'
import { loadTheme, saveTheme, THEMES, type Theme } from '@/lib/theme'
import { OfflineCard } from '@/offline/OfflineCard'
import { playHref, playParams, type PlayPreferences } from './preferences'

export function HomeSettings({
  preferences,
  onClose,
}: {
  preferences: PlayPreferences
  onChange: (p: PlayPreferences) => void
  onClose: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [theme, setTheme] = useState<Theme>('classic')
  const [error, setError] = useState('')
  useEffect(() => {
    const element = dialog.current
    setTheme(loadTheme())
    element?.showModal()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      element?.close()
      document.body.style.overflow = overflow
    }
  }, [])
  return (
    <dialog
      ref={dialog}
      className="home-settings sim-sheet"
      aria-labelledby="home-settings-title"
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
    >
      <header>
        <div>
          <p className="home-eyebrow">MAKE IT YOURS</p>
          <h2 id="home-settings-title">Settings</h2>
        </div>
        <button
          className="home-icon-button"
          onClick={onClose}
          aria-label="Close settings"
        >
          <InterfaceIcon name="close" />
        </button>
      </header>
      <div className="sim-sheet__scroll">
        {error && (
          <p role="alert" className="home-error">
            {error}
          </p>
        )}
        <section className="card">
          <h3>Simulator</h3>
          <p className="home-help">
            Shuffled hands and your legal choices determine the game. Table
            settings and recent decisions are saved separately from earlier
            exercises.
          </p>
          <a className="home-primary" href="/live?tools=settings">
            Table settings <InterfaceIcon name="arrow" />
          </a>
          <nav className="live-nav" aria-label="Simulator modes">
            <a className="home-text-link" href="/live?mode=full-hands">
              Full hands
            </a>
            <a className="home-text-link" href="/live?mode=preflop">
              Preflop
            </a>
          </nav>
        </section>
        <section className="card">
          <h3>Chart colors</h3>
          <Segmented
            ariaLabel="Chart colors"
            options={THEMES.map((t) => ({
              value: t,
              label: t === 'classic' ? 'Classic' : 'Cool',
            }))}
            value={theme}
            onChange={(t) => {
              try {
                saveTheme(t)
                setTheme(t)
                document.documentElement.dataset.theme = t
              } catch (e) {
                setError(String(e))
              }
            }}
          />
          <p className="home-help">
            The app keeps its navy theme. This changes range-chart colors only.
          </p>
          <a
            className="home-text-link"
            href={`/ranges?${playParams(preferences)}`}
          >
            Range setup & custom ranges <InterfaceIcon name="arrow" />
          </a>
        </section>
        <OfflineCard />
        <details className="card">
          <summary>Earlier exercise history</summary>
          <p className="home-help">
            Earlier scripted exercises and settings are archived for future
            lessons. Existing history, notes, backups and recovery tools remain
            available.
          </p>
          <a className="home-text-link" href={playHref(preferences, true)}>
            Saved exercise reviews <InterfaceIcon name="arrow" />
          </a>
        </details>
        <p className="home-help">
          Live practice exports are in Play → Practice tools. Learning progress
          backups remain in Learn.
        </p>
      </div>
      <footer>
        <button className="home-primary" onClick={onClose}>
          Done
        </button>
      </footer>
    </dialog>
  )
}
