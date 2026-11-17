'use client'
import { useEffect, useRef, useState } from 'react'
import { Segmented } from '@/components/Segmented'
import { TrainerSetupPanel } from '@/components/TrainerSetupPanel'
import { InterfaceIcon } from '@/components/InterfaceIcon'
import { GAME_MODES, GAME_MODE_INFO } from '@/lib/gameModes'
import { loadTheme, saveTheme, THEMES, type Theme } from '@/lib/theme'
import { OfflineCard } from '@/offline/OfflineCard'
import { claimTab } from '@/learning/ownership'
import { LearningRepository } from '@/learning/repository'
import type { SchedulerState } from '@/learning/types'
import {
  preferencesFrom,
  normalizePreferences,
  playHref,
  playParams,
  savePreferences,
  type PlayPreferences,
} from './preferences'

export function ArchivedExerciseSettings({
  preferences,
  onChange,
  onClose,
}: {
  preferences: PlayPreferences
  onChange: (p: PlayPreferences) => void
  onClose: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const persistedSchedule = useRef<SchedulerState | null>(null)
  const [theme, setTheme] = useState<Theme>('classic'),
    [error, setError] = useState(''),
    [scheduler, setScheduler] = useState<SchedulerState | null>(null),
    [busy, setBusy] = useState(false)
  useEffect(() => {
    setTheme(loadTheme())
    dialog.current?.showModal()
    const oldOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const repo = new LearningRepository()
    let stopped = false
    void repo
      .open()
      .then(() => repo.meta())
      .then((m) => {
        if (!stopped) {
          persistedSchedule.current = m.nextScheduler ?? m.scheduler
          setScheduler(persistedSchedule.current)
        }
      })
      .catch((e) => {
        if (!stopped) setError(String(e))
      })
      .finally(() => repo.close())
    return () => {
      stopped = true
      document.body.style.overflow = oldOverflow
      repo.close()
      dialog.current?.close()
    }
  }, [])
  function update(p: PlayPreferences) {
    try {
      const normalized = normalizePreferences(p)
      savePreferences(normalized)
      onChange(normalized)
      setError('')
    } catch (e) {
      setError(`Settings could not save. ${String(e)}`)
    }
  }
  async function updateSchedule(enabled: boolean, interval: number) {
    setScheduler((s) => (s ? { ...s, enabled, interval } : s))
    setBusy(true)
    let release: (() => void) | undefined
    try {
      const claim = await claimTab()
      release = claim.release
      // Use the same fenced tab owner as the simulator, without stealing another tab's lock.
      const writer = new LearningRepository(
        'poker-learning-v1',
        localStorage,
        claim.owner,
      )
      try {
        await writer.open()
        if (!(await writer.acquire(Date.now(), claim.exclusive)))
          throw Error(
            'Close other simulator tabs before changing practice settings.',
          )
        persistedSchedule.current = await writer.settings(enabled, interval)
        setScheduler(persistedSchedule.current)
        setError('')
      } finally {
        writer.close()
      }
    } catch (e) {
      setScheduler(persistedSchedule.current)
      setError(String(e))
    } finally {
      release?.()
      setBusy(false)
    }
  }
  const full = preferences.mode === 'full-hands'
  const setup = normalizePreferences(preferences).setup
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
          <h2 id="home-settings-title">Archived exercise settings</h2>
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
          <h3>Reference exercises</h3>
          <p className="home-help">
            These controls apply to the original chart exercises. Live play has
            its own table settings and recent decisions in Practice tools.
          </p>
          <a className="home-text-link" href="/live">
            Open live simulator
          </a>
          <Segmented
            ariaLabel="Game mode"
            options={GAME_MODES.map((mode) => ({
              value: mode,
              label: GAME_MODE_INFO[mode].label,
            }))}
            value={preferences.mode}
            onChange={(mode) => update({ ...preferences, mode })}
          />
          <p className="home-help">
            Choose settings for your next start. Resume hand keeps the saved
            hand’s original setup.
          </p>
        </section>
        <TrainerSetupPanel
          setup={setup}
          seatOnly={full}
          onChange={(patch) => {
            const params = playParams({
              ...preferences,
              setup: { ...setup, ...patch },
            })
            update(preferencesFrom(params))
          }}
        />
        <a href={playHref({ ...preferences, setup })} className="home-primary">
          Practice with these settings <InterfaceIcon name="arrow" />
        </a>
        <section className="card">
          <h3>Recurring reference mistakes</h3>
          {scheduler ? (
            <>
              <label className="learning-toggle">
                <input
                  type="checkbox"
                  disabled={busy}
                  checked={scheduler.enabled}
                  onChange={(e) =>
                    void updateSchedule(e.target.checked, scheduler.interval)
                  }
                />
                Mix in my mistakes
              </label>
              <label htmlFor="home-review-rate">
                About 1 review hand in every {scheduler.interval} hands
              </label>
              <input
                id="home-review-rate"
                type="range"
                min="2"
                max="20"
                step="1"
                value={scheduler.interval}
                disabled={busy}
                onChange={(e) => {
                  const value = Number(e.target.value)
                  setScheduler((s) => (s ? { ...s, interval: value } : s))
                }}
                onPointerUp={(e) =>
                  void updateSchedule(
                    scheduler.enabled,
                    Number(e.currentTarget.value),
                  )
                }
                onKeyUp={(e) => {
                  if (
                    [
                      'ArrowLeft',
                      'ArrowRight',
                      'Home',
                      'End',
                      'PageUp',
                      'PageDown',
                    ].includes(e.key)
                  )
                    void updateSchedule(
                      scheduler.enabled,
                      Number(e.currentTarget.value),
                    )
                }}
              />
              <p className="home-help">
                Applied to the next hand. Mistakes always save. Reviews are
                randomly blended when a compatible saved spot is due.
              </p>
            </>
          ) : (
            <p className="home-help">Loading practice settings…</p>
          )}
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
        <p className="home-help">
          History, notes, backups and recovery tools are in All reviews on Home.
          Learning progress backups remain in Learn.
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
