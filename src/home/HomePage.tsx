'use client'
import { useEffect, useRef, useState } from 'react'
import { InterfaceIcon } from '@/components/InterfaceIcon'
import { loadTheme } from '@/lib/theme'
import { LearningRepository } from '@/learning/repository'
import { PracticeRepository } from '@/fundamentals/progress'
import type { HandRecord, ProblemRecord } from '@/learning/types'
import { emptyActivity, type Activity } from '@/activity/calendar'
import { ActivityGrid } from './ActivityGrid'
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
  const [hasHand, setHasHand] = useState(false),
    [completed, setCompleted] = useState(false),
    [settings, setSettings] = useState(false)
  const [activity, setActivity] = useState<Activity>(emptyActivity),
    [now, setNow] = useState<Date | null>(null)
  const [status, setStatus] = useState('Loading saved progress…'),
    [available, setAvailable] = useState(false),
    [due, setDue] = useState(0),
    [total, setTotal] = useState(0)
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
    async function refresh() {
      if (refreshing || stopped || !ready) return
      refreshing = true
      setNow(new Date())
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
        setHasHand(!!hand)
        setCompleted(!!hand?.completedAt && !!cursor?.resultShown)
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
    href = playHref(play),
    review = playHref(play, true)
  return (
    <main className="home-page">
      <header className="home-header">
        <div className="home-brand">
          <span className="home-spade" aria-hidden="true">
            ♠
          </span>
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
          {hasHand ? 'CONTINUE TRAINING' : 'YOUR NEXT HAND'}
        </p>
        <h2 id="continue-title">
          {hasHand
            ? completed
              ? 'Ready for your next hand?'
              : 'Pick up where you left off'
            : 'Better decisions start here'}
        </h2>
        <p className="home-game">
          {play.mode === 'full-hands'
            ? '6-max cash · Full hands'
            : `${play.setup.players}-max ${play.setup.format === 'cash' ? 'cash' : 'MTT'} · Preflop`}
        </p>
        <a className="home-primary" href={href}>
          <InterfaceIcon name="play" />
          {hasHand
            ? completed
              ? 'Continue training'
              : 'Resume hand'
            : 'Start training'}
        </a>
        <p
          className={`home-save${available ? '' : ' home-save--pending'}`}
          role="status"
        >
          {status}
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
        <a className="home-practice-link" href={review}>
          <span className="home-review-icon">
            <InterfaceIcon name="review" />
          </span>
          <span>
            <strong>Revisit saved mistakes</strong>
            <small>
              {available
                ? due
                  ? `${due} ${due === 1 ? 'spot' : 'spots'} ready to review`
                  : total
                    ? 'Your saved spots are here when you need them'
                    : 'Your mistakes will appear here automatically'
                : 'Open your saved reviews'}
            </small>
          </span>
          <InterfaceIcon name="arrow" />
        </a>
        <a className="home-text-link home-all-reviews" href={review}>
          All reviews <InterfaceIcon name="arrow" />
        </a>
      </section>
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
