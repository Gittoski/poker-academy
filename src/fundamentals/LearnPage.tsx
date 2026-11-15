'use client'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { OfflineCard } from '@/offline/OfflineCard'
import { TopNav } from '@/components/TopNav'
import { loadTheme } from '@/lib/theme'
import { TOPICS, LESSONS, GLOSSARY, isTopic, type Topic } from './content'
import { question, type Question } from './questions'
import {
  PracticeRepository,
  emptySkill,
  ready,
  type ActiveQuestion,
  type SkillProgress,
  type Attempt,
} from './progress'
function download(text: string, name: string) {
  const url = URL.createObjectURL(
    new Blob([text], { type: 'application/json' }),
  )
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export function LearnPage() {
  const params = useSearchParams(),
    selected = params.get('topic'),
    topic: Topic = isTopic(selected) ? selected : 'pot-odds',
    from = params.get('from')?.slice(0, 150) ?? null
  const [repo, setRepo] = useState<PracticeRepository | null>(null),
    [skills, setSkills] = useState<SkillProgress[]>([]),
    [active, setActive] = useState<ActiveQuestion | null>(null),
    [view, setView] = useState<'home' | 'lesson' | 'practice' | 'progress'>(
      params.get('view') === 'progress'
        ? 'progress'
        : isTopic(selected)
          ? 'lesson'
          : 'home',
    )
  const [status, setStatus] = useState('Loading learning progress…'),
    [error, setError] = useState(''),
    [pending, setPending] = useState(false),
    [attempt, setAttempt] = useState<Attempt | null>(null),
    [now, setNow] = useState(Date.now()),
    [memory, setMemory] = useState(false),
    [recentErrors, setRecentErrors] = useState<Attempt[]>([])
  const latch = useRef(false),
    alive = useRef(true),
    pendingEvent = useRef<{
      active: ActiveQuestion
      selected: number
      at: number
    } | null>(null)
  const stats = skills.find((s) => s.id === topic) ?? emptySkill(topic),
    lesson = LESSONS[topic]
  const q: Question | null = active ? question(active.topic, active.seed) : null
  async function refresh(r = repo) {
    if (r) {
      setSkills(await r.skills())
      setRecentErrors(await r.recentErrors())
    }
  }
  useEffect(() => {
    document.documentElement.dataset.theme = loadTheme()
    alive.current = true
    let cancelled = false
    let r: PracticeRepository | null = null
    void (async () => {
      try {
        r = new PracticeRepository()
        await r.open()
        if (cancelled) {
          r.close()
          return
        }
        await r.recover()
        const saved = await r.active(topic)
        if (cancelled) return
        setRepo(r)
        setSkills(await r.skills())
        setRecentErrors(await r.recentErrors())
        setActive(saved)
        if (saved && params.get('view') !== 'progress') setView('practice')
        setStatus('Learning progress saved on this device')
      } catch (e) {
        if (!cancelled) {
          setError(String(e))
          setStatus('Learning storage unavailable')
        }
      }
    })()
    return () => {
      cancelled = true
      alive.current = false
      r?.close()
    }
  }, [topic])
  useEffect(() => {
    if (active?.mode !== 'timed' || active.selected !== null) return
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [active])
  useEffect(() => {
    latch.current = false
    setAttempt(null)
  }, [active?.attemptId])
  async function start(mode: 'untimed' | 'timed' = 'untimed') {
    setError('')
    setPending(true)
    try {
      const next = repo
        ? await repo.start(topic, mode, from)
        : {
            id: topic,
            version: 1 as const,
            topic,
            seed: crypto.getRandomValues(new Uint32Array(1))[0],
            attemptId: crypto.getRandomValues(new Uint32Array(4)).join('-'),
            mode: 'untimed' as const,
            startedAt: Date.now(),
            selected: null,
            from,
          }
      setActive(next)
      setView('practice')
      setNow(Date.now())
      setStatus(
        repo
          ? 'Learning progress saved on this device'
          : 'Not saved — memory-only practice',
      )
    } catch (e) {
      setError(String(e))
    } finally {
      setPending(false)
    }
  }
  async function markLesson() {
    try {
      if (repo) {
        await repo.readLesson(topic)
        await refresh()
      }
      await start()
    } catch (e) {
      setError(String(e))
    }
  }
  async function answer(index: number) {
    if (!active || active.selected !== null || latch.current) return
    latch.current = true
    const event = { active, selected: index, at: Date.now() }
    pendingEvent.current = event
    setActive({ ...active, selected: index })
    setPending(true)
    if (!repo) {
      setStatus('Not saved — export this attempt before closing')
      setPending(false)
      return
    }
    setStatus('Saving learning answer…')
    try {
      const saved = await repo.answer(active, index, event.at)
      if (!alive.current) return
      setAttempt(saved)
      pendingEvent.current = null
      await refresh()
      setStatus('Learning progress saved on this device')
    } catch (e) {
      setError(String(e))
      setStatus('Not saved — retry or export pending learning work')
    } finally {
      if (alive.current) setPending(false)
    }
  }
  async function retry() {
    if (!repo || !pendingEvent.current) return
    setPending(true)
    try {
      const e = pendingEvent.current,
        saved = await repo.answer(e.active, e.selected, e.at)
      pendingEvent.current = null
      setAttempt(saved)
      await refresh()
      setError('')
      setStatus('Learning progress saved on this device')
    } catch (e) {
      setError(String(e))
    } finally {
      setPending(false)
    }
  }
  async function restore(file: File) {
    if (!repo) return
    try {
      if (file.size > 10 * 1024 * 1024)
        throw Error('Learning backup exceeds 10 MiB')
      const data = JSON.parse(await file.text())
      if (
        !confirm(
          data.kind === 'fundamentals-pending'
            ? 'Recover pending learning answers? Existing progress is kept.'
            : 'Replace local fundamentals progress with this backup? Simulator history is kept separately.',
        )
      )
        return
      if (data.kind === 'fundamentals-pending') await repo.importPending(data)
      else await repo.restore(data)
      location.reload()
    } catch (e) {
      setError(`Import failed; existing progress retained. ${String(e)}`)
    }
  }
  const suggested =
    TOPICS.find(
      (t) => !ready(skills.find((s) => s.id === t) ?? emptySkill(t)),
    ) ?? 'pot-odds'
  const requestedReturn = params.get('return') ?? '/play'
  const returnTo =
    /^\/play(?:\?|$)/.test(requestedReturn) && requestedReturn.length < 1000
      ? requestedReturn
      : '/play'
  const learnHref = (t: Topic) =>
    `/learn?topic=${t}&return=${encodeURIComponent(returnTo)}${from ? '&from=' + encodeURIComponent(from) : ''}`
  const elapsed = active ? Math.max(0, now - active.startedAt) : 0
  const answered = active?.selected !== null && active?.selected !== undefined
  return (
    <main className="page fundamentals">
      <TopNav
        active="learn"
        setupParams={new URLSearchParams(returnTo.split('?')[1] ?? '')}
      />
      <section className="card">
        <div className="range-card__head">
          <div>
            <h1>Learn one step at a time</h1>
            <p>
              Six-max cash foundations. Learn, calculate, then return to the
              table.
            </p>
          </div>
          <a className="btn" href={returnTo}>
            Back to simulator
          </a>
        </div>
        <p role="status">{status}</p>
        {from && (
          <p className="fundamentals-note">
            Opened from a saved simulator decision. Related exercises prefer
            unfamiliar inputs when available and identify repeats. A chart
            deviation alone does not prove a mathematics error.
          </p>
        )}
        {error && (
          <p role="alert" className="learning-error">
            {error}
          </p>
        )}
        {!repo && !memory && (
          <button
            className="btn"
            onClick={() => {
              setMemory(true)
              setStatus('Not saved — memory-only practice')
              setView('lesson')
            }}
          >
            Practice without saving
          </button>
        )}
        {status.startsWith('Not saved') && (
          <div className="learning-actions">
            <button
              className="btn"
              onClick={() => void retry()}
              disabled={!repo || pending}
            >
              Retry saving
            </button>
            <button
              className="btn"
              onClick={() =>
                download(
                  JSON.stringify({
                    version: 1,
                    kind: 'fundamentals-pending',
                    event: pendingEvent.current,
                    stored: repo?.pendingText(),
                  }),
                  'poker-learning-pending.json',
                )
              }
            >
              Export pending learning work
            </button>
          </div>
        )}
        <nav className="learning-actions" aria-label="Learning views">
          <button className="btn" onClick={() => setView('home')}>
            Learning path
          </button>
          <button className="btn" onClick={() => setView('lesson')}>
            Lesson
          </button>
          <button
            className="btn"
            disabled={!repo && !memory}
            onClick={() => void start()}
          >
            Untimed practice
          </button>
          <button className="btn" onClick={() => setView('progress')}>
            Learning progress
          </button>
        </nav>
      </section>
      <OfflineCard />
      {view === 'home' ? (
        <section className="card">
          <span className="pill">Recommended next</span>
          <h2>{LESSONS[suggested].title}</h2>
          <p>
            One short lesson, a worked example and untimed practice. Free
            simulator play stays available.
          </p>
          <a className="btn btn--primary" href={learnHref(suggested)}>
            Start this topic
          </a>
          <details>
            <summary>All topics, in order</summary>
            <ol>
              {TOPICS.map((t) => (
                <li key={t}>
                  <a href={learnHref(t)}>{LESSONS[t].title}</a>
                  {ready(skills.find((s) => s.id === t) ?? emptySkill(t))
                    ? ' · practiced across question formats'
                    : ''}
                </li>
              ))}
            </ol>
            <a href={learnHref('hand-ranking')}>
              Optional hand-ranking refresher
            </a>
          </details>
        </section>
      ) : view === 'lesson' ? (
        <section className="card">
          <p className="pill">
            {TOPICS.includes(topic as (typeof TOPICS)[number])
              ? `Step ${TOPICS.indexOf(topic as (typeof TOPICS)[number]) + 1} of 5`
              : 'Optional refresher'}
          </p>
          <h2>{lesson.title}</h2>
          <details>
            <summary>Terms introduced</summary>
            <dl>
              {GLOSSARY.map(([term, definition]) => (
                <div key={term}>
                  <dt>
                    <strong>{term}</strong>
                  </dt>
                  <dd>{definition}</dd>
                </div>
              ))}
            </dl>
          </details>
          <p>
            <strong>{lesson.term}</strong>
          </p>
          {lesson.body.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          <h3>Worked example</h3>
          <p>{lesson.example}</p>
          <ol>
            {lesson.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
          <aside className="fundamentals-note">
            <strong>Assumptions and limits</strong>
            <p>{lesson.limits}</p>
          </aside>
          <button
            className="btn btn--primary"
            disabled={pending || (!repo && !memory)}
            onClick={() => void markLesson()}
          >
            I understand — start untimed practice
          </button>
        </section>
      ) : view === 'practice' && q && active ? (
        <section className="card" aria-labelledby="question-heading">
          <p className="pill">
            {active.mode === 'timed'
              ? 'Optional timed practice'
              : 'Untimed practice'}{' '}
            · {LESSONS[active.topic].title}
          </p>
          <h2 id="question-heading">{q.prompt}</h2>
          <p className="learning-score-note">
            Percentage answers are rounded to 0.1%; BB answers to 0.01 BB. Exact
            fractions and assumptions are shown in the explanation.
          </p>
          {active.mode === 'timed' && (
            <p role="timer">
              {Math.max(0, Math.ceil((45000 - elapsed) / 1000))} seconds
              remaining.{' '}
              {elapsed > 45000
                ? 'Time elapsed; take your time. Accuracy is still graded separately.'
                : ''}
            </p>
          )}
          <details>
            <summary>Model and information available</summary>
            <ul>
              {q.assumptions.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </details>
          <div
            className="fundamentals-answers"
            role="group"
            aria-label="Practice answers"
          >
            {q.choices.map((choice, i) => (
              <button
                className={`btn ${answered && i === q.answer ? 'fundamentals-correct' : ''} ${answered && i === active.selected && i !== q.answer ? 'fundamentals-wrong' : ''}`}
                disabled={answered || pending}
                key={choice}
                onClick={() => void answer(i)}
              >
                {choice}
              </button>
            ))}
          </div>
          {answered && (
            <div
              className={`fundamentals-explanation ${active.selected === q.answer ? 'fundamentals-correct' : 'fundamentals-wrong'}`}
              role="status"
            >
              <h3>
                {active.selected === q.answer
                  ? 'Correct'
                  : 'Review this calculation'}
              </h3>
              <p>
                <strong>Basis: {q.basis}</strong>
              </p>
              <ol>
                {q.steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
              <p>
                {attempt?.novelty === 'fresh'
                  ? 'First recorded exposure to these inputs.'
                  : attempt?.novelty === 'repeat'
                    ? 'Repeated inputs: recorded separately from unfamiliar-question accuracy.'
                    : 'Novelty is not confirmed until saved; reloaded attempts retain their original classification.'}
              </p>
              <button
                className="btn btn--primary"
                disabled={pending}
                onClick={() => void start(active.mode)}
              >
                Next example
              </button>
            </div>
          )}
          <details>
            <summary>Optional timing</summary>
            <p>
              Start untimed. Timing unlocks after this lesson and three correct
              fresh examples across at least two question formats. This is a
              practice threshold, not proof of mastery. Accuracy and time limits
              are separate.
            </p>
            <button
              className="btn"
              disabled={!ready(stats) || pending}
              onClick={() => void start('timed')}
            >
              Start 45-second practice
            </button>
          </details>
        </section>
      ) : view === 'progress' ? (
        <section className="card">
          <h2>Your learning progress</h2>
          <p>
            Fresh-input accuracy uses first recorded exposures and excludes
            repeated questions. New numbers are not proof of mastery or transfer
            to live poker. No accounts; this browser/device only.
          </p>
          {[...TOPICS, 'hand-ranking' as const].map((t) => {
            const s = skills.find((s) => s.id === t) ?? emptySkill(t)
            return (
              <article className="fundamentals-progress" key={t}>
                <h3>{LESSONS[t].title}</h3>
                <p>
                  Untimed: {s.untimed.correct}/{s.untimed.answered} correct.
                  Fresh inputs: {s.untimed.freshCorrect}/{s.untimed.fresh}.
                  Question formats with fresh success: {s.families.length}.
                </p>
                <p>
                  Timed: {s.timed.correct}/{s.timed.answered} correct;{' '}
                  {s.timed.onTime ?? 0} within the time limit, tracked
                  separately.
                </p>
                {Object.entries(s.errors).map(([family, n]) => (
                  <p key={family}>
                    Recorded errors · {family.replaceAll('-', ' ')}: {n}
                  </p>
                ))}
                <a className="btn" href={learnHref(t)}>
                  Practice this skill
                </a>
              </article>
            )
          })}
          <details>
            <summary>Recent calculation errors</summary>
            {recentErrors.length ? (
              recentErrors.map((a) => {
                const previous = question(a.topic, a.seed)
                return (
                  <article className="fundamentals-progress" key={a.id}>
                    <h3>{LESSONS[a.topic].title}</h3>
                    <p>{previous.prompt}</p>
                    <p>
                      Your answer: {previous.choices[a.selected]}. Expected:{' '}
                      {previous.choices[previous.answer]}.
                    </p>
                    <ol>
                      {previous.steps.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ol>
                    <a className="btn" href={learnHref(a.topic)}>
                      Practice this skill with new examples
                    </a>
                  </article>
                )
              })
            ) : (
              <p>No saved calculation errors yet.</p>
            )}
          </details>
          <details>
            <summary>Learning backups</summary>
            <p>
              Fundamentals progress is separate from simulator history. Up to
              1,000 detailed learning attempts and 20,000 exposure identities
              are retained; long-term accuracy and error totals remain. Beyond
              the exposure limit, novelty is unknown rather than falsely fresh.
            </p>
            <button
              className="btn"
              disabled={!repo}
              onClick={() =>
                void repo
                  ?.backup()
                  .then((b) =>
                    download(
                      JSON.stringify(b),
                      'poker-fundamentals-backup.json',
                    ),
                  )
                  .catch((e) => setError(String(e)))
              }
            >
              Export learning progress
            </button>
            <label className="btn">
              Import learning progress
              <input
                type="file"
                accept="application/json,.json"
                disabled={!repo}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void restore(f)
                  e.target.value = ''
                }}
              />
            </label>
          </details>
        </section>
      ) : (
        <section className="card">
          <h2>{lesson.title}</h2>
          <details>
            <summary>Terms introduced</summary>
            <dl>
              {GLOSSARY.map(([term, definition]) => (
                <div key={term}>
                  <dt>
                    <strong>{term}</strong>
                  </dt>
                  <dd>{definition}</dd>
                </div>
              ))}
            </dl>
          </details>
          <button className="btn" onClick={() => void start()}>
            Start untimed practice
          </button>
        </section>
      )}
    </main>
  )
}
