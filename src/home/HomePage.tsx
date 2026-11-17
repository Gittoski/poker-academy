'use client'
import { useEffect, useRef, useState } from 'react'
import { InterfaceIcon } from '@/components/InterfaceIcon'
import { AppLogo } from '@/components/AppLogo'
import {
  decodeLiveSession,
  practiceLiveDeal,
  LIVE_SAVE_KEY,
} from '@/simulator/liveSession'
import { allLiveDeals, modeOf } from '@/simulator/liveModes'
import { loadTheme } from '@/lib/theme'
import { LearningRepository } from '@/learning/repository'
import { PracticeRepository } from '@/fundamentals/progress'
import type { HandRecord, ProblemRecord } from '@/learning/types'
import { emptyActivity, type Activity } from '@/activity/calendar'
import { ActivityGrid } from './ActivityGrid'
import { ArchivedExerciseSettings } from './ArchivedExerciseSettings'
import { HomeSettings } from './HomeSettings'
import {
  defaultPreferences,
  loadPreferences,
  playHref,
  playParams,
  type PlayPreferences,
} from './preferences'

export function HomePage() {
  const [preferences, setPreferences] = useState(defaultPreferences),
    [saved, setSaved] = useState<PlayPreferences | null>(null)
  const [settings, setSettings] = useState(false)
  const [archivedSettings, setArchivedSettings] = useState(false)
  const [activity, setActivity] = useState<Activity>(emptyActivity),
    [now, setNow] = useState<Date | null>(null)
  const [status, setStatus] = useState('Loading saved progress…'),
    [available, setAvailable] = useState(false),
    [due, setDue] = useState(0),
    [total, setTotal] = useState(0)
  const [live, setLive] = useState<{
    players: number
    mode: string
    completed: boolean
    decisions: number
    outside: number
  } | null>(null)
  const [liveStatus, setLiveStatus] = useState(
    'Live hands save separately on this device',
  )
  const trigger = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    setNow(new Date())
    document.documentElement.dataset.theme = loadTheme()
    try {
      setPreferences(loadPreferences() ?? defaultPreferences())
    } catch {
      setStatus('Settings storage unavailable')
    }
    const learning = new LearningRepository('poker-learning-v1', null),
      practice = new PracticeRepository('poker-fundamentals-v1', null)
    let stopped = false,
      refreshing = false,
      ready = false
    function readLive() {
      try {
        const raw = localStorage.getItem(LIVE_SAVE_KEY)
        const savedLive = raw ? decodeLiveSession(raw) : null
        setLive(
          savedLive
            ? {
                players: savedLive.current.config.stacks.length,
                mode: modeOf(savedLive.current),
                completed:
                  practiceLiveDeal(savedLive.current).heroFolded ||
                  practiceLiveDeal(savedLive.current).street === 'complete' ||
                  !!practiceLiveDeal(savedLive.current).preflopComplete,
                decisions: allLiveDeals(savedLive).reduce(
                  (n, d) => n + (d.feedback?.length ?? 0),
                  0,
                ),
                outside: allLiveDeals(savedLive).reduce(
                  (n, d) =>
                    n +
                    (d.feedback?.filter((f) => f.reference.status === 'outside')
                      .length ?? 0),
                  0,
                ),
              }
            : null,
        )
        setLiveStatus(
          savedLive
            ? 'Live hand saved on this device'
            : 'Live hands save separately on this device',
        )
      } catch {
        setLiveStatus('Live save unavailable. Open play for recovery details.')
      }
    }
    readLive()
    async function refresh() {
      if (refreshing || stopped || !ready) return
      refreshing = true
      setNow(new Date())
      readLive()
      try {
        const [meta, skillsActivity, problems] = await Promise.all([
          learning.meta(),
          practice.activity(),
          learning.list<ProblemRecord>('problems', 100000),
        ])
        const cursor = meta.resume ?? meta.cursor
        const hand = cursor
          ? await learning.get<HandRecord>('hands', cursor.handId)
          : null
        if (stopped) return
        setSaved(hand ? { setup: hand.config, mode: hand.config.mode } : null)
        try {
          if (hand && !loadPreferences())
            setPreferences({ setup: hand.config, mode: hand.config.mode })
        } catch {
          /* Reading history does not depend on settings storage. */
        }
        const days = { ...meta.activity?.days }
        for (const [day, n] of Object.entries(skillsActivity.days))
          days[day] = (days[day] ?? 0) + n
        setActivity({ version: 1, days })
        setAvailable(true)
        setDue(
          problems.filter(
            (p) =>
              p.status !== 'archive' &&
              p.examples.length > 0 &&
              p.dueAt <= Date.now(),
          ).length,
        )
        setTotal(problems.length)
        setStatus('Progress saved on this device')
      } catch {
        if (!stopped) {
          setAvailable(false)
          setStatus(
            'Saved progress could not load. Reload to try again; your history has not been cleared.',
          )
        }
      } finally {
        refreshing = false
      }
    }
    void Promise.all([learning.open(), practice.open()])
      .then(async () => {
        if (!stopped) {
          ready = true
          await refresh()
        }
      })
      .catch(() => {
        if (!stopped)
          setStatus(
            'Local storage is unavailable. You can still open training, but progress may not save.',
          )
      })
      .finally(() => {
        if (stopped) {
          learning.close()
          practice.close()
        }
      })
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    window.addEventListener('pageshow', onVisible)
    document.addEventListener('visibilitychange', onVisible)
    const timer = setInterval(onVisible, 60000)
    return () => {
      stopped = true
      clearInterval(timer)
      window.removeEventListener('pageshow', onVisible)
      document.removeEventListener('visibilitychange', onVisible)
      learning.close()
      practice.close()
    }
  }, [])
  const play = saved ?? preferences,
    href = '/live',
    review = playHref(play, true)
  return (
    <main className="home-page">
      <header className="home-header">
        <div className="home-brand">
          <AppLogo className="app-logo--home" />
          <div>
            <h1>Poker Trainer</h1>
            <p>by Greg</p>
          </div>
        </div>
        <button
          ref={trigger}
          className="home-icon-button home-settings-trigger"
          onClick={() => setSettings(true)}
          aria-haspopup="dialog"
        >
          <InterfaceIcon name="settings" />
          <span>Settings</span>
        </button>
      </header>
      <nav className="home-nav" aria-label="Pages">
        <a href={`/ranges?${playParams(play)}`}>
          <InterfaceIcon name="ranges" />
          <span>Ranges</span>
        </a>
        <a href={href}>
          <InterfaceIcon name="play" />
          <span>Play</span>
        </a>
        <a href={`/learn?return=${encodeURIComponent(href)}`}>
          <InterfaceIcon name="learn" />
          <span>Learn</span>
        </a>
      </nav>
      <section
        className="home-panel home-continue"
        aria-labelledby="continue-title"
      >
        <p className="home-eyebrow">
          {live ? 'CONTINUE LIVE PLAY' : 'YOUR NEXT HAND'}
        </p>
        <h2 id="continue-title">
          {live
            ? live.completed
              ? 'Ready for your next hand?'
              : 'Pick up where you left off'
            : 'Better decisions start here'}
        </h2>
        <p className="home-game">
          {live?.players ?? 6}-max cash ·{' '}
          {live?.mode === 'preflop' ? 'Preflop only' : 'Full hands'} · Virtual
          chips
        </p>
        <a className="home-primary" href={href}>
          <InterfaceIcon name="play" />
          {live
            ? live.completed
              ? 'Continue training'
              : 'Resume hand'
            : 'Start training'}
        </a>
        <p className="home-help">{liveStatus}</p>
        <p
          className={`home-save${available ? '' : ' home-save--pending'}`}
          role="status"
        >
          Reference exercises & lessons: {status}
        </p>
      </section>
      {now ? (
        <ActivityGrid activity={activity} now={now} available={available} />
      ) : (
        <section
          className="home-panel home-activity"
          aria-label="Your activity"
        >
          <h2>Your activity</h2>
          <p>Loading activity…</p>
        </section>
      )}
      <section
        className="home-panel home-next"
        aria-labelledby="practice-title"
      >
        <p className="home-eyebrow" id="practice-title">
          NEXT PRACTICE
        </p>
        <a className="home-practice-link" href="/live?tools=review">
          <span className="home-review-icon">
            <InterfaceIcon name="review" />
          </span>
          <span>
            <strong>Review live decisions</strong>
            <small>
              {live?.decisions
                ? `${live.decisions} recent ${live.decisions === 1 ? 'decision' : 'decisions'} · ${live.outside} outside reference`
                : 'Your live decisions save automatically as you play'}
            </small>
          </span>
          <InterfaceIcon name="arrow" />
        </a>
        <p className="home-help">
          Replay a saved decision without changing your current hand.
          Unsupported spots stay ungraded.
        </p>
        <a
          className="home-text-link home-all-reviews"
          href="/live?tools=review"
        >
          All reviews <InterfaceIcon name="arrow" />
        </a>
        <details>
          <summary>Earlier exercise history</summary>
          <p className="home-help">
            Your previous exercise saves are preserved.{' '}
            {available
              ? `${total} saved mistake groups, ${due} due in the archived exercises.`
              : 'Open history to check saved records.'}
          </p>
          <button className="btn" onClick={() => setArchivedSettings(true)}>
            Archived exercise settings
          </button>
          <a className="home-text-link" href={review}>
            Saved exercise reviews <InterfaceIcon name="arrow" />
          </a>
        </details>
      </section>
      {archivedSettings && (
        <ArchivedExerciseSettings
          preferences={preferences}
          onChange={setPreferences}
          onClose={() => setArchivedSettings(false)}
        />
      )}
      {settings && (
        <HomeSettings
          preferences={preferences}
          onChange={setPreferences}
          onClose={() => {
            setSettings(false)
            setTimeout(() => trigger.current?.focus({ preventScroll: true }), 0)
          }}
        />
      )}
    </main>
  )
}
