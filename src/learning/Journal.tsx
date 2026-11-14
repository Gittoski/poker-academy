'use client'
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { RangeEntry } from '@/data/types'
import type { TrainerSetup } from '@/lib/trainer'
import type { GameMode } from '@/lib/gameModes'
import type { HandIndex } from '@/lib/fullHands'
import { FullHandTrainer } from '@/components/FullHandTrainer'
import { HandTrainer } from '@/components/HandTrainer'
import { LearningRepository, defaultMeta } from './repository'
import { claimTab } from './ownership'
import { createSource } from './sources'
import { JournalRuntime } from './runtime'
import { ReviewArea } from './ReviewArea'
import type { LearningConfig, SchedulerState } from './types'

const Context = createContext<{
  journal: JournalRuntime
  paused: boolean
} | null>(null)
export function useJournal() {
  const value = useContext(Context)
  if (!value) throw Error('Missing learning journal')
  return value
}
export function downloadJson(text: string, name: string) {
  const url = URL.createObjectURL(
    new Blob([text], { type: 'application/json' }),
  )
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function JournalShell({
  entries,
  setup,
  mode,
  index,
  children,
}: {
  entries: RangeEntry[]
  setup: TrainerSetup
  mode: GameMode
  index?: HandIndex
  children: ReactNode
}) {
  const [journal, setJournal] = useState<JournalRuntime | null>(null)
  const [status, setStatus] = useState('Loading saved play…')
  const [failure, setFailure] = useState<string | null>(null)
  const [review, setReview] = useState(false)
  const [manual, setManual] = useState<JournalRuntime | null>(null)
  const [scheduler, setScheduler] = useState<SchedulerState | null>(null)
  const [bytes, setBytes] = useState<number | null>(null)
  const mounted = useRef(true)
  const signature = JSON.stringify({ setup, mode })
  const notify = useMemo(
    () => (message: string) => {
      if (mounted.current) setStatus(message)
    },
    [],
  )
  useEffect(() => {
    mounted.current = true
    let cancelled = false
    let releaseOwnership: (() => void) | undefined
    let repo: LearningRepository | null = null
    let heartbeat: ReturnType<typeof setInterval> | undefined
    const source = createSource('ranges', 'current-range-pack', entries)
    const config: LearningConfig = { ...setup, mode, rangesId: source.id }
    async function boot() {
      try {
        const claim = await claimTab()
        releaseOwnership = claim.release
        if (cancelled) {
          claim.release()
          return
        }
        const owner = claim.owner
        repo = new LearningRepository('poker-learning-v1', localStorage, owner)
        await repo.open()
        if (cancelled) {
          repo.close()
          return
        }
        if (!(await repo.acquire(Date.now(),claim.exclusive)))
          throw Error(
            'Another tab is playing. Close that tab, then reload to resume safely.',
          )
        await repo.recover()
        let meta = await repo.meta()
        // A reload during manual practice returns to the preserved live hand. Practice attempts remain saved.
        if (meta.resume) {
          meta = { ...meta, cursor: meta.resume, resume: null }
          await repo.setMeta(meta)
        }
        await repo.cache(source)
        const runtime = new JournalRuntime(repo, config, source, notify)
        await runtime.hydrate()
        if (cancelled) {
          repo.close()
          return
        }
        setJournal(runtime)
        setScheduler(
          (await repo.meta()).nextScheduler ?? (await repo.meta()).scheduler,
        )
        setStatus('Saved on this device')
        heartbeat = setInterval(() => {
          repo
            ?.acquire()
            .then((owned) => {
              if (!owned)
                notify(
                  'Not saved — another tab owns the simulator. Export pending work and reload.',
                )
            })
            .catch((e) => runtime.failed(e))
        }, 5000)
        repo
          .maintain()
          .then((stats) => {
            if (!cancelled) setBytes(stats.bytes)
          })
          .catch((e) => runtime.failed(e))
      } catch (e) {
        if (!cancelled) {
          setFailure(
            e instanceof Error ? e.message : 'Local history could not load',
          )
          setStatus('History unavailable')
        }
      }
    }
    void boot()
    return () => {
      cancelled = true
      mounted.current = false
      if (heartbeat) clearInterval(heartbeat)
      releaseOwnership?.()
      repo?.close()
    }
    // The shell is keyed by configuration. Don't restart recovery on UI status updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, entries, notify, mode])
  const context = useMemo(
    () => (journal ? { journal, paused: review || !!manual } : null),
    [journal, review, manual],
  )
  const manualContext = useMemo(
    () => (manual ? { journal: manual, paused: review } : null),
    [manual, review],
  )
  async function controls(enabled: boolean, interval: number) {
    if (!journal?.repo || !scheduler) return
    setScheduler({ ...scheduler, enabled, interval })
    try {
      await journal.flush()
      const next = await journal.repo.settings(enabled, interval)
      setScheduler(next)
    } catch (e) {
      journal.failed(e)
    }
  }
  async function returnToLive() {
    if (!journal?.repo) return
    try {
      if (manual) await manual.flush()
      const meta = await journal.repo.meta()
      if (meta.resume)
        await journal.repo.setMeta({
          ...meta,
          cursor: meta.resume,
          resume: null,
        })
      setManual(null)
      setReview(false)
      setTimeout(() => document.getElementById('open-review')?.focus(), 0)
    } catch (e) {
      journal.failed(e)
    }
  }
  if (!journal || !context)
    return (
      <section className="card" aria-live="polite">
        <h2>
          {failure ? 'Saved play needs attention' : 'Loading saved play…'}
        </h2>
        {failure && (
          <>
            <p>{failure}</p>
            <button className="btn" onClick={() => window.location.reload()}>
              Retry loading
            </button>
            <p>Your saved history has not been cleared.</p>
            <button
              className="btn"
              onClick={async () => {
                try {
                  const raw =
                    localStorage.getItem('poker-learning-v1:pending') ?? '[]'
                  downloadJson(raw, 'poker-raw-pending-recovery.json')
                } catch (e) {
                  setFailure(String(e))
                }
              }}
            >
              Export recovery buffer
            </button>
            <button
              className="btn"
              onClick={() => {
                const source = createSource(
                  'ranges',
                  'current-range-pack',
                  entries,
                )
                setJournal(
                  new JournalRuntime(
                    null,
                    { ...setup, mode, rangesId: source.id },
                    source,
                    notify,
                  ),
                )
                setStatus('Not saved — playing without local history')
              }}
            >
              Play without saving
            </button>
          </>
        )}
      </section>
    )
  return (
    <>
      <section className="card learning-bar" aria-label="Session and review">
        <div>
          <strong>{manual ? 'Manual practice' : 'Your session'}</strong>
          <span role="status">{status}</span>
        </div>
        <button
          id="open-review"
          className="btn"
          onClick={() => setReview(true)}
        >
          Review mistakes
        </button>
        {status.startsWith('Not saved') && (
          <>
            <button
              className="btn"
              disabled={!journal.repo}
              onClick={() =>
                void journal.retryPending().catch((e) => journal.failed(e))
              }
            >
              Retry saving
            </button>
            <button
              className="btn"
              onClick={() =>
                downloadJson(
                  journal.pendingExport(),
                  'poker-pending-recovery.json',
                )
              }
            >
              Export pending work
            </button>
          </>
        )}
        {scheduler && (
          <details>
            <summary>Practice settings</summary>
            <label className="learning-toggle">
              <input
                type="checkbox"
                checked={scheduler.enabled}
                onChange={(e) =>
                  void controls(e.target.checked, scheduler.interval)
                }
              />
              Mix in my mistakes
            </label>
            <label htmlFor="review-rate">
              About 1 review hand in every {scheduler.interval} hands
            </label>
            <input
              id="review-rate"
              type="range"
              min="2"
              max="20"
              step="1"
              value={scheduler.interval}
              onChange={(e) =>
                void controls(scheduler.enabled, Number(e.target.value))
              }
            />
            <p>
              Changes apply to the next hand. Errors still save when this is
              off. The actual share can be lower when no compatible review is
              due.
            </p>
          </details>
        )}
      </section>
      <Context.Provider value={context}>
        <div hidden={review || !!manual}>{children}</div>
      </Context.Provider>
      {manual && manualContext && (
        <Context.Provider value={manualContext}>
          <section className="card">
            <button className="btn" onClick={() => void returnToLive()}>
              Return to live hand
            </button>
            <p>Practice is recorded separately. Your live hand is paused.</p>
          </section>
          {manual.config.mode === 'full-hands' && index ? (
            <FullHandTrainer
              entries={
                manual.source.kind === 'ranges' ? manual.source.payload : []
              }
              setup={manual.config}
              index={index}
            />
          ) : (
            <HandTrainer
              entries={
                manual.source.kind === 'ranges' ? manual.source.payload : []
              }
              setup={manual.config}
            />
          )}
        </Context.Provider>
      )}
      {review && (
        <ReviewArea
          journal={journal}
          bytes={bytes}
          onClose={() => setReview(false)}
          onPractice={async (runtime) => {
            if (!journal.repo) return
            await journal.flush()
            const meta = await journal.repo.meta()
            await journal.repo.setMeta({
              ...meta,
              resume: meta.resume ?? meta.cursor,
            })
            setManual(runtime)
            setReview(false)
          }}
        />
      )}
    </>
  )
}
export { defaultMeta }
