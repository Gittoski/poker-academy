'use client'
import { useEffect, useRef, useState } from 'react'
import { TableDiagram } from '@/components/TableDiagram'
import { BoardCards, HoleCards } from '@/components/HoleCards'
import { RangeGrid } from '@/components/RangeGrid'
import { StrategyGrid } from '@/components/StrategyGrid'
import { resolveActions } from '@/lib/range'
import {
  boardShown,
  positionOf,
  type ActionKind,
  type HandScript,
} from '@/lib/fullHands'
import type { Position } from '@/lib/positions'
import { EMPTY_SCORE } from '@/lib/trainer'
import { unpackDecision } from './checkpoints'
import { LESSONS, isTopic } from '@/fundamentals/content'
import { supportedSkills } from '@/fundamentals/links'
import { validateSource } from './sources'
import { newId } from './identity'
import { JournalRuntime } from './runtime'
import { LEARNING_LABELS, formatFrequency } from './classification'
import { downloadJson } from './Journal'
import { defaultMeta } from './repository'
import type {
  DecisionRecord,
  HandRecord,
  ProblemRecord,
  SessionRecord,
  SourceRecord,
} from './types'
interface Detail {
  attempt: DecisionRecord
  hand: HandRecord | null
  source: SourceRecord | null
  script: HandScript | null
}
export function ReviewArea({
  journal,
  bytes,
  onClose,
  onPractice,
}: {
  journal: JournalRuntime
  bytes: number | null
  onClose: () => void
  onPractice: (runtime: JournalRuntime) => Promise<void>
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [tab, setTab] = useState<'mistakes' | 'sessions'>('mistakes')
  const [problems, setProblems] = useState<ProblemRecord[]>([])
  const [sessions, setSessions] = useState<SessionRecord[]>([])
  const [attempts, setAttempts] = useState<DecisionRecord[]>([])
  const [detail, setDetail] = useState<Detail | null>(null)
  const [problem, setProblem] = useState<ProblemRecord | null>(null)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [busy, setBusy] = useState(false)
  const [page, setPage] = useState(0)
  const limit = 50
  const [usedBytes, setUsedBytes] = useState(bytes)
  const [attemptSession, setAttemptSession] = useState<string | null>(null)
  const [attemptPage, setAttemptPage] = useState(0)
  const repo = journal.repo
  async function refresh() {
    if (!repo) return
    await journal.flush()
    setProblems(
      await repo.list<ProblemRecord>(
        'problems',
        limit,
        'time',
        undefined,
        page * limit,
        (p) => filter === 'all' || p.status === filter,
      ),
    )
    setSessions(
      await repo.list<SessionRecord>(
        'sessions',
        limit,
        'time',
        undefined,
        page * limit,
        (s) => Object.values(s.counts).some((c) => c.decisions > 0),
      ),
    )
    setUsedBytes(await repo.usage())
  }
  useEffect(() => {
    void refresh().catch((e) => setError(String(e)))
  }, [repo, page, filter]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const d = dialog.current
    d?.showModal()
    return () => d?.close()
  }, [])
  const close = () => {
    // Release the native modal before its asynchronous parent close restores
    // play, so focus cannot be sent to an inert background element.
    dialog.current?.close()
    onClose()
    setTimeout(() => {
      const trigger = document.getElementById('open-review')
      if (trigger?.getClientRects().length) trigger.focus()
      else document.querySelector<HTMLAnchorElement>('.sim-back')?.focus()
    }, 0)
  }
  async function showSession(id: string, page = 0) {
    if (!repo) return
    setAttemptSession(id)
    setAttemptPage(page)
    setAttempts(
      await repo.list<DecisionRecord>(
        'decisions',
        50,
        'sessionId',
        id,
        page * 50,
      ),
    )
  }
  async function openAttempt(id: string, p: ProblemRecord | null = null) {
    if (!repo) return
    try {
      setError('')
      const attempt = await repo.get<DecisionRecord>('decisions', id)
      if (!attempt)
        throw Error('Detailed attempt was condensed; its summary remains.')
      const hand = await repo.get<HandRecord>('hands', attempt.handId),
        source = await repo.get<SourceRecord>(
          'sources',
          attempt.config.rangesId,
        ),
        scriptSource = hand?.scriptId
          ? await repo.get<SourceRecord>('sources', hand.scriptId)
          : null
      let validSource = source,
        validScript = scriptSource
      try {
        if (source) validateSource(source)
      } catch {
        validSource = null
      }
      try {
        if (scriptSource) validateSource(scriptSource)
      } catch {
        validScript = null
      }
      setDetail({
        attempt,
        hand,
        source: validSource,
        script: validScript?.kind === 'script' ? validScript.payload : null,
      })
      setProblem(p)
      setNote(p?.note ?? '')
    } catch (e) {
      setError(String(e))
    }
  }
  async function practice(whole: boolean) {
    if (!detail || !repo || !detail.hand || detail.source?.kind !== 'ranges')
      return
    try {
      setBusy(true)
      const a = detail.attempt,
        original = detail.hand
      const runtime = new JournalRuntime(
        repo,
        original.config,
        detail.source,
        (message) => {
          if (message.startsWith('Not saved')) setError(message)
        },
        true,
      )
      const hand: HandRecord = {
        ...structuredClone(original),
        id: newId('manual'),
        sessionId: newId('session'),
        revision: 0,
        origin: 'manual',
        createdAt: Date.now(),
        completedAt: null,
        decisions: 0,
        actions: [],
        target: {
          problemId: problem?.id ?? a.problemId ?? '',
          nodeKey: a.nodeKey,
          variant: 'exact',
        },
        targetAnswered: false,
      }
      const cursor = {
        ...structuredClone(a.before),
        handId: hand.id,
        hand: whole ? hand.initial : a.before.hand,
        play: whole ? null : a.before.play,
        phase: whole ? ('npc' as const) : ('hero' as const),
        verdict: null,
        score: EMPTY_SCORE,
        ordinal: 0,
        decisions: 0,
      }
      runtime.adopt(await runtime.restore(hand, cursor))
      await onPractice(runtime)
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(false)
    }
  }
  async function exportHistory() {
    if (!repo) return
    try {
      await journal.flush()
      downloadJson(
        JSON.stringify(await repo.backup()),
        'poker-review-backup.json',
      )
    } catch (e) {
      setError(String(e))
    }
  }
  async function importHistory(file: File) {
    if (!repo) return
    try {
      if (file.size > 30 * 1024 * 1024)
        throw Error('Backup exceeds the 30 MiB import limit')
      const data = JSON.parse(await file.text())
      if (
        !window.confirm(
          data.kind === 'pending-recovery'
            ? 'Recover pending decisions into local history? Existing history will be kept.'
            : 'Replace local learning history with this backup? Export your current history first if needed.',
        )
      )
        return
      await journal.flush()
      if (data.kind === 'pending-recovery') await repo.importPending(data)
      else await repo.restore(data)
      window.location.reload()
    } catch (e) {
      setError(`Import failed; existing history retained. ${String(e)}`)
    }
  }
  const a = detail?.attempt,
    hero = a?.before.hand.seats.find((s) => s.position === a.before.hand.hero)
  let weights: ReturnType<typeof resolveActions> | null = null
  try {
    if (a?.prompt.decision && detail?.source)
      weights = resolveActions(
        unpackDecision(a.prompt.decision, detail.source).entry.range,
      )
  } catch {}
  const shownBets: Partial<Record<Position, number>> =
    a?.before.play && detail?.script
      ? {
          [positionOf(detail.script, 'ip')]: a.before.play.bets.ip,
          [positionOf(detail.script, 'oop')]: a.before.play.bets.oop,
        }
      : Object.fromEntries(
          a?.before.hand.seats.map((s) => [s.position, s.committed]) ?? [],
        )
  const node =
    detail?.script && a?.before.play
      ? detail.script.streets[a.before.play.streetIndex]?.nodes[
          a.before.play.nodeIndex
        ]
      : null
  const related =
    detail && a
      ? supportedSkills(a, detail.script, detail.hand?.suitMap ?? null)
      : null
  const ready =
    !!detail?.source &&
    !!detail?.hand &&
    (!detail.hand.scriptId || !!detail.script)
  return (
    <dialog
      className="learning-dialog"
      ref={dialog}
      aria-labelledby="review-heading"
      onCancel={(e) => {
        e.preventDefault()
        close()
      }}
    >
      <header className="learning-dialog__head">
        <h2 id="review-heading">Review your play</h2>
        <button className="btn" onClick={close}>
          Back to simulator
        </button>
      </header>
      {error && (
        <p role="alert" className="learning-error">
          {error}
        </p>
      )}
      <nav aria-label="Review views">
        <button
          className="btn"
          aria-pressed={tab === 'mistakes'}
          onClick={() => {
            setTab('mistakes')
            setDetail(null)
            setAttempts([])
          }}
        >
          Mistakes
        </button>{' '}
        <button
          className="btn"
          aria-pressed={tab === 'sessions'}
          onClick={() => {
            setTab('sessions')
            setDetail(null)
            setAttempts([])
          }}
        >
          Sessions
        </button>
        <a
          className="btn"
          href={`/learn?view=progress&return=${encodeURIComponent(window.location.pathname + window.location.search)}`}
        >
          Learning errors and progress
        </a>
      </nav>
      {!repo && (
        <p>
          Local history is unavailable. Your simulator can still run; pending
          work can be exported from the session bar.
        </p>
      )}
      {detail && a && hero ? (
        <section className="card learning-detail">
          <button className="btn" onClick={() => setDetail(null)}>
            Back to list
          </button>
          <h3>{a.prompt.title}</h3>
          <p>
            {new Date(a.createdAt).toLocaleString()} · {a.origin} ·{' '}
            {a.firstExposure
              ? 'First recorded exposure'
              : 'Previously seen situation'}
          </p>
          <TableDiagram
            players={a.config.players}
            hero={a.before.hand.hero}
            folded={
              new Set(
                a.before.hand.seats
                  .filter((s) => s.folded)
                  .map((s) => s.position),
              )
            }
            bets={shownBets}
            pot={
              detail.script && a.before.play
                ? detail.script.streets[a.before.play.streetIndex]?.pot
                : undefined
            }
            labels={
              Object.fromEntries(
                a.before.hand.seats
                  .filter((s) => s.lastAction)
                  .map((s) => [s.position, s.lastAction!]),
              ) as Partial<Record<Position, string>>
            }
          />
          {detail.script && a.before.play && detail.hand?.suitMap && (
            <BoardCards
              cards={boardShown(
                detail.script,
                a.before.play,
                detail.hand.suitMap,
              )}
            />
          )}
          <HoleCards cards={hero.cards} />
          <p>
            <strong>{LEARNING_LABELS[a.learning.kind]}</strong>
          </p>
          <p>
            You chose <strong>{a.prompt.options[a.chosen]?.label}</strong>. The
            trainer executed{' '}
            <strong>{a.prompt.options[a.executed]?.label}</strong>.{' '}
            {a.config.mode === 'full-hands'
              ? 'Full-hand practice continues along the supplied script.'
              : 'Preflop practice follows your chosen action.'}
          </p>
          <ul>
            {a.prompt.options.map((o, i) => (
              <li key={i}>
                {o.label}:{' '}
                {a.prompt.reference.applicable
                  ? formatFrequency(
                      a.prompt.reference.values[i] / a.prompt.reference.scale,
                    )
                  : 'Unavailable'}
              </li>
            ))}
          </ul>
          <p>
            {a.learning.kind === 'outside'
              ? 'Your choice has zero support in this applicable reference. Review the supported actions and try the same decision again.'
              : a.learning.kind === 'alternative'
                ? 'Your action has positive support. A less frequent supported action is not automatically an error.'
                : 'These frequencies describe the supplied reference, not a measured EV loss or proof about every live opponent.'}
          </p>
          {related && (
            <aside className="fundamentals-note">
              <strong>Reference skill: {related.tag}</strong>
              {related.price && (
                <p>
                  Public call price: {related.price.cost} / ({related.price.pot}{' '}
                  + {related.price.cost}) ={' '}
                  {formatFrequency(related.price.threshold)}. This is a
                  break-even price, not an equity estimate or a solver EV loss.
                </p>
              )}
              {related.links.length ? (
                <>
                  <p>
                    Related practice, not a diagnosis that your chart deviation
                    was a mathematics error:
                  </p>
                  {related.links.map((link) => (
                    <div key={link.topic}>
                      <p>{link.reason}</p>
                      <a
                        className="btn"
                        href={`/learn?topic=${link.topic}&from=${encodeURIComponent(a.id)}&return=${encodeURIComponent(window.location.pathname + window.location.search)}`}
                      >
                        Practice this skill: {link.label}
                      </a>
                    </div>
                  ))}
                </>
              ) : (
                <p>
                  No verified fundamentals link applies to this saved context.
                  Dedicated range/strategy drills remain on the roadmap;
                  retrying this reference decision is available below.
                </p>
              )}
            </aside>
          )}
          <details>
            <summary>Public state at this decision</summary>
            {a.history && (
              <ol>
                {a.history.map((step, i) => (
                  <li key={i}>
                    {step.position}: {step.action}
                  </li>
                ))}
              </ol>
            )}
            <ul>
              {a.before.hand.seats
                .filter((s) => s.lastAction)
                .map((s) => (
                  <li key={s.position}>
                    {s.position}: {s.lastAction} · {s.committed} bb committed
                  </li>
                ))}
            </ul>
            <p>
              {a.prompt.street} · {a.config.format} · {a.config.stack} bb ·{' '}
              {a.config.players}-max · {a.config.rangeType}
            </p>
            <p className="learning-source">
              Range version: {a.config.rangesId}
              {detail.hand?.scriptId && (
                <> · Script version: {detail.hand.scriptId}</>
              )}
            </p>
          </details>
          {weights && <RangeGrid weights={weights} />}
          {node?.grid && (
            <StrategyGrid
              kinds={node.actions.map((x) => x.a) as ActionKind[]}
              labels={a.prompt.options.map((o) => o.label)}
              cells={node.grid}
            />
          )}
          {!ready && (
            <p>
              Original reference content is unavailable. This attempt is
              read-only; a newer chart will not replace its answer.
            </p>
          )}
          <div className="learning-actions">
            <button
              className="btn btn--primary"
              disabled={!ready || busy}
              onClick={() => void practice(false)}
            >
              Retry this decision
            </button>
            <button
              className="btn"
              disabled={!ready || busy}
              onClick={() => void practice(true)}
            >
              Play this hand
            </button>
          </div>
          {problem && (
            <>
              <label htmlFor="mistake-note">Reflection (optional)</label>
              <textarea
                id="mistake-note"
                maxLength={2000}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <div className="learning-actions">
                <button
                  className="btn"
                  onClick={() =>
                    void repo
                      ?.annotate(problem.id, note, problem.pinned)
                      .then(() => {
                        setProblem({ ...problem, note })
                        return refresh()
                      })
                      .catch((e) => setError(String(e)))
                  }
                >
                  Save reflection
                </button>
                <button
                  className="btn"
                  aria-pressed={problem.pinned}
                  onClick={() =>
                    void repo
                      ?.annotate(problem.id, note, !problem.pinned, a.id)
                      .then(() => {
                        setProblem({
                          ...problem,
                          pinned: !problem.pinned,
                          note,
                        })
                        return refresh()
                      })
                      .catch((e) => setError(String(e)))
                  }
                >
                  {problem.pinned ? 'Unpin' : 'Pin representative'}
                </button>
              </div>
            </>
          )}
        </section>
      ) : (
        <>
          {tab === 'mistakes' ? (
            <>
              <label htmlFor="mistake-filter">Show</label>
              <select
                id="mistake-filter"
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value)
                  setPage(0)
                }}
              >
                <option value="all">All mistakes</option>
                <option value="active">Active</option>
                <option value="maintenance">Maintenance</option>
                <option value="archive">Archive</option>
              </select>
              {!problems.length && (
                <p>
                  No saved mistakes yet. Keep playing—choices outside the
                  reference save automatically.
                </p>
              )}
              <ul className="learning-list">
                {problems
                  .filter((p) => filter === 'all' || p.status === filter)
                  .map((p) => (
                    <li key={p.id}>
                      <button
                        onClick={() =>
                          void openAttempt(p.examples.at(-1) ?? '', p)
                        }
                      >
                        <strong>{p.title}</strong>
                        <span>
                          {p.hero} · {p.street} · {p.errors} misses ·{' '}
                          {p.reviews} reviews · {p.status}
                          {p.pinned ? ' · pinned' : ''}
                          {p.fundamentalSkills?.length ? (
                            <span>
                              Related skills:{' '}
                              {p.fundamentalSkills
                                .filter(isTopic)
                                .map((t) => LESSONS[t].title)
                                .join(', ')}
                            </span>
                          ) : null}
                        </span>
                      </button>
                    </li>
                  ))}
              </ul>
            </>
          ) : (
            <>
              <p>
                Reference matches, supported alternatives and outside-reference
                choices are separate. Frequency-drill scores are not EV-loss
                scores.
              </p>
              <ul className="learning-list">
                {sessions.map((s) => (
                  <li key={s.id}>
                    <button
                      onClick={() =>
                        void showSession(s.id).catch((e) => setError(String(e)))
                      }
                    >
                      <strong>{new Date(s.startedAt).toLocaleString()}</strong>
                      {(['regular', 'adaptive', 'manual'] as const).map(
                        (origin) => (
                          <span key={origin}>
                            {origin}: {s.counts[origin].hands} hands ·{' '}
                            {s.counts[origin].decisions} decisions ·{' '}
                            {s.counts[origin].outside} misses ·{' '}
                            {s.counts[origin].alternative} supported
                            alternatives ·{' '}
                            {s.counts[origin].firstExposures ?? 0} first
                            recorded · {s.counts[origin].repeatExposures ?? 0}{' '}
                            repeats
                          </span>
                        ),
                      )}
                      {s.compacted && (
                        <span>Older detail condensed; totals retained</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
              {!sessions.length && (
                <p>Your first session will appear as you play.</p>
              )}
              <ul className="learning-list">
                {attempts.map((d) => (
                  <li key={d.id}>
                    <button
                      onClick={() =>
                        void openAttempt(
                          d.id,
                          problems.find((p) => p.id === d.problemId) ?? null,
                        )
                      }
                    >
                      {d.prompt.title}
                      <span>
                        {LEARNING_LABELS[d.learning.kind]} ·{' '}
                        {d.firstExposure
                          ? 'First exposure'
                          : 'Repeated context'}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
          {tab === 'sessions' && attemptSession && (
            <div className="learning-actions">
              <button
                className="btn"
                disabled={attemptPage === 0}
                onClick={() =>
                  void showSession(attemptSession, attemptPage - 1).catch((e) =>
                    setError(String(e)),
                  )
                }
              >
                Previous decisions
              </button>
              <button
                className="btn"
                disabled={attempts.length < 50}
                onClick={() =>
                  void showSession(attemptSession, attemptPage + 1).catch((e) =>
                    setError(String(e)),
                  )
                }
              >
                More decisions
              </button>
            </div>
          )}
          <div className="learning-actions">
            <button
              className="btn"
              disabled={page === 0}
              onClick={() => setPage((n) => Math.max(0, n - 1))}
            >
              Newer history
            </button>
            <button
              className="btn"
              disabled={
                (tab === 'sessions' ? sessions.length : problems.length) < 50
              }
              onClick={() => setPage((n) => n + 1)}
            >
              Older history
            </button>
          </div>
        </>
      )}
      <details className="learning-storage">
        <summary>Storage and backups</summary>
        <p>
          Saved only in this browser on this device. PC and phone do not sync
          automatically.
        </p>
        <p>
          {usedBytes !== null
            ? `${(usedBytes / 1048576).toFixed(2)} MiB of serialized learning data. `
            : ''}
          Older details are condensed around 5,000 attempts, 100 recent sessions
          or a 20 MiB soft budget. Summaries, counts and protected
          representatives remain. Browser quotas vary.
        </p>
        <div className="learning-actions">
          <button className="btn" onClick={() => void exportHistory()}>
            Export history
          </button>
          <label className="btn">
            Import backup
            <input
              type="file"
              accept="application/json,.json"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void importHistory(file)
                e.target.value = ''
              }}
            />
          </label>
          <button
            className="btn"
            onClick={async () => {
              if (
                !repo ||
                !window.confirm(
                  'Clear all learning history and the saved live hand on this device? Export a backup first if needed.',
                )
              )
                return
              try {
                await journal.flush()
                await repo.restore({
                  version: 1,
                  exportedAt: Date.now(),
                  sources: [],
                  sessions: [],
                  hands: [],
                  decisions: [],
                  problems: [],
                  meta: defaultMeta(),
                })
                window.location.reload()
              } catch (e) {
                setError(String(e))
              }
            }}
          >
            Clear learning history
          </button>
        </div>
      </details>
    </dialog>
  )
}
