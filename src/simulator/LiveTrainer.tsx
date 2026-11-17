'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { GameModeSwitch } from '@/components/trainer/GameModeSwitch'
import { Segmented } from '@/components/Segmented'
import { isGameMode, type GameMode } from '@/lib/gameModes'
import { modeOf, allLiveDeals, switchLiveMode } from './liveModes'
import { loadTheme } from '@/lib/theme'
import { chipsFromBB } from './liveAmounts'
import { LiveSheet } from './LiveSheet'
import { LiveDecisionFeedback } from './LiveDecisionFeedback'
import { LiveOutcome, liveOutcomeTitle } from './LiveOutcome'
import { InterfaceIcon } from '@/components/InterfaceIcon'
import { SimulatorTable } from '@/components/SimulatorTable'
import { positionsFor, type PlayerCount } from '@/lib/positions'
import { loadRangeSet } from '@/lib/rangeSets'
import type { RangeEntry } from '@/data/types'
import {
  legalLiveActions,
  type LiveAction,
  type LiveConfig,
} from './liveEngine'
import {
  appendLiveAction,
  practiceLiveDeal,
  retryLiveDecision,
  decodeLiveSession,
  encodeLiveSession,
  LIVE_LOCK,
  LIVE_SAVE_KEY,
  replayLiveDeal,
  seededLiveRandom,
  type LiveDeal,
  type LiveSession,
  type OpponentStyle,
} from './liveSession'
import { chooseLiveOpponent, observeLivePlayer } from './livePolicy'
import {
  liveReference,
  recoverLiveChart,
  retryLiveReference,
  type LiveReference,
} from './liveReference'

const bb = (n: number) => Number((n / 100).toFixed(2))
function fresh(
  config?: LiveConfig,
  hero = 0,
  style: OpponentStyle = 'balanced',
  mode: GameMode = 'full-hands',
): LiveDeal {
  const seed =
    globalThis.crypto?.getRandomValues(new Uint32Array(1))[0] ??
    Math.floor(Math.random() * 4294967296)
  return {
    mode,
    seed,
    config: config ?? {
      stacks: Array(6).fill(10000),
      button: 3,
      smallBlind: 50,
      bigBlind: 100,
    },
    hero,
    style,
    actions: [],
    feedback: [],
  }
}
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
export function LiveTrainer() {
  const switching = useRef(false)
  const [modeBusy, setModeBusy] = useState(false)
  const [tools, setTools] = useState(false)
  const [toolSection, setToolSection] = useState<string | null>(null)
  useEffect(() => {
    const requested = new URLSearchParams(location.search).get('tools')
    if (requested === 'review' || requested === 'settings') {
      setToolSection(requested)
      setTools(true)
      setPaused(true)
    }
  }, [])
  const [sizing, setSizing] = useState(false)
  const [sizeError, setSizeError] = useState('')
  const [raiseDraft, setRaiseDraft] = useState('')
  const [outcome, setOutcome] = useState(false)
  const outcomeSeen = useRef('')
  const [session, setSession] = useState<LiveSession | null>(null)
  const [owner, setOwner] = useState<'pending' | 'owner' | 'other' | 'unsaved'>(
    'pending',
  )
  const [message, setMessage] = useState('Loading live practice…')
  const [error, setError] = useState('')
  const [paused, setPaused] = useState(true)
  const [entries, setEntries] = useState<RangeEntry[] | null>(null)
  const [review, setReview] = useState<{
    deal: LiveDeal
    index: number
    reference: LiveReference
    answer?: LiveReference
  } | null>(null)
  const [players, setPlayers] = useState<PlayerCount>(6)
  const [stacks, setStacks] = useState('100, 100, 100, 100, 100, 100')
  const [heroSeat, setHeroSeat] = useState(0)
  const [anteKind, setAnteKind] = useState<'none' | 'each' | 'big-blind'>(
    'none',
  )
  const [ante, setAnte] = useState('1')
  const [style, setStyle] = useState<OpponentStyle>('balanced')
  const [raise, setRaise] = useState('2.5')
  const invalidSave = useRef<string | null>(null)
  const raiseEdit = useRef({ turn: '', edited: false })
  useEffect(() => {
    document.documentElement.dataset.theme = loadTheme()
  }, [])
  useEffect(() => {
    let gone = false
    loadRangeSet('Cash_100_PTO')
      .then((e) => {
        if (!gone) setEntries(e)
      })
      .catch(() => {})
    return () => {
      gone = true
    }
  }, [])
  useEffect(() => {
    let disposed = false,
      release: (() => void) | undefined
    function load(canSave: boolean) {
      if (disposed) return
      let saved: LiveSession | null = null
      try {
        const raw = localStorage.getItem(LIVE_SAVE_KEY)
        if (raw) {
          try {
            saved = decodeLiveSession(raw)
          } catch {
            invalidSave.current = raw
            throw Error(
              'Saved live hand could not be validated. The original save is untouched; this hand will be unsaved.',
            )
          }
        }
      } catch (e) {
        canSave = false
        setError(e instanceof Error ? e.message : 'Storage is unavailable.')
      }
      let next: LiveSession = saved ?? {
        version: 3 as const,
        current: fresh(),
        archive: [],
      }
      const params = new URLSearchParams(location.search)
      const requested = params.get('mode')
      if (isGameMode(requested) && modeOf(next.current) !== requested) {
        const hadTarget = !!next.parked?.[requested]
        next = switchLiveMode(next, requested)
        // Older setup links configure only a new slot; never replace a saved hand.
        if (
          !hadTarget &&
          (params.has('players') || params.has('seat') || params.has('stack'))
        ) {
          const players = [6, 8, 9].includes(Number(params.get('players')))
            ? (Number(params.get('players')) as PlayerCount)
            : (next.current.config.stacks.length as PlayerCount)
          let amount = next.current.config.stacks[0]
          try {
            const n = chipsFromBB(params.get('stack') ?? String(bb(amount)))
            if (n > 0 && n <= 1000000) amount = n
          } catch {
            /* Keep the supported previous setup. */
          }
          const hero = Math.max(
            0,
            positionsFor(players).findIndex((p) => p === params.get('seat')),
          )
          next = {
            ...next,
            current: fresh(
              {
                ...next.current.config,
                stacks: Array(players).fill(amount),
                button: players - 3,
              },
              hero,
              next.current.style,
              requested,
            ),
          }
        }
      }
      setSession(next)
      setOwner(canSave ? 'owner' : 'unsaved')
      setMessage(
        canSave
          ? 'Saved on this device'
          : 'Unsaved practice; export a backup before leaving',
      )
      setPlayers(next.current.config.stacks.length as PlayerCount)
      setStacks(next.current.config.stacks.map(bb).join(', '))
      setHeroSeat(next.current.hero)
      setStyle(next.current.style)
      setAnteKind(next.current.config.ante?.kind ?? 'none')
      setAnte(String(bb(next.current.config.ante?.amount ?? 100)))
      setPaused(
        !!saved ||
          ['review', 'settings'].includes(
            new URLSearchParams(location.search).get('tools') ?? '',
          ),
      )
    }
    if (navigator.locks) {
      void navigator.locks
        .request(LIVE_LOCK, { ifAvailable: true }, async (lock) => {
          if (disposed) return
          if (!lock) {
            setOwner('other')
            setMessage(
              'Live practice is open in another tab. Close that tab, then reload this one.',
            )
            return
          }
          load(true)
          await new Promise<void>((resolve) => {
            release = resolve
            if (disposed) resolve()
          })
        })
        .catch(() => load(false))
    } else load(false)
    return () => {
      disposed = true
      release?.()
    }
  }, [])
  useEffect(() => {
    if (owner !== 'owner' || !session) return
    try {
      localStorage.setItem(LIVE_SAVE_KEY, encodeLiveSession(session))
      setMessage('Saved on this device')
    } catch {
      setOwner('unsaved')
      setMessage('Saving failed. Practice continues unsaved; export a backup.')
      setError(
        'Storage is unavailable, full, or the supported save limit was reached. Your previous save was not replaced.',
      )
    }
  }, [session, owner])
  const current = session?.current
  const mode = current ? modeOf(current) : 'full-hands'
  const active = useMemo(
    () => (current ? practiceLiveDeal(current) : null),
    [current],
  )
  const lastRecord = current?.feedback?.at(-1)
  const pending =
    !!lastRecord &&
    lastRecord.index === current!.actions.length - 1 &&
    (current!.acknowledgedAction ?? -1) < lastRecord.index
  const displayed = useMemo(
    () =>
      review
        ? practiceLiveDeal(review.deal, review.index)
        : pending && current && lastRecord && !active?.heroFolded
          ? practiceLiveDeal(current, lastRecord.index)
          : active,
    [review, current, lastRecord, pending, active],
  )
  useEffect(() => {
    if (
      !active ||
      !current ||
      pending ||
      tools ||
      review ||
      sizing ||
      active.heroFolded ||
      active.street !== 'complete' ||
      active.board.length !== 5
    )
      return
    const key = `${current.seed}:${current.actions.length}`
    if (outcomeSeen.current !== key) {
      outcomeSeen.current = key
      setOutcome(true)
    }
  }, [active, current, pending, tools, review, sizing])
  const deal = review?.deal ?? current
  const allowed = owner === 'owner' || owner === 'unsaved'
  const commit = useCallback(
    (action: LiveAction, human: boolean) => {
      if (!current || !active || !allowed || review || switching.current) return
      const index = current.actions.length,
        seed = current.seed
      const reference = human
        ? liveReference(current, active, action, entries)
        : undefined
      try {
        const next = appendLiveAction(current, action, index, reference)
        setSession((prev) =>
          !prev ||
          prev.current.seed !== seed ||
          prev.current.actions.length !== index
            ? prev
            : { ...prev, current: next },
        )
        setError('')
        if (human) {
          setPaused(true)
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'The action was rejected.')
      }
    },
    [current, active, allowed, review, entries],
  )
  useEffect(() => {
    if (
      !active ||
      !current ||
      active.toAct === null ||
      active.preflopComplete ||
      active.heroFolded ||
      outcome ||
      sizing ||
      modeBusy ||
      active.toAct === current.hero ||
      paused ||
      tools ||
      review ||
      !allowed
    )
      return
    const timer = setTimeout(
      () =>
        commit(
          chooseLiveOpponent(
            observeLivePlayer(active),
            current.style,
            seededLiveRandom(
              (current.seed ^
                Math.imul(current.actions.length + 1, 0x9e3779b9)) >>>
                0,
            ),
          ),
          false,
        ),
      650,
    )
    return () => clearTimeout(timer)
  }, [
    active,
    current,
    commit,
    paused,
    tools,
    review,
    allowed,
    modeBusy,
    outcome,
    sizing,
  ])
  const legal = displayed ? legalLiveActions(displayed) : null
  const feedback = useMemo(() => {
    const reference = review
      ? review.answer
      : pending
        ? lastRecord?.reference
        : null
    if (!reference || !deal) return null
    const index = review?.index ?? lastRecord!.index
    const chart = recoverLiveChart(reference, deal, index, entries)
    return chart ? { ...reference, chart } : reference
  }, [review, lastRecord, deal, entries, pending])
  const suggestedRaise = useMemo(() => {
    if (!deal || !displayed || legal?.minRaiseTo == null) return 250
    const reference =
      review?.reference ??
      liveReference(deal, displayed, { kind: 'fold' }, entries)
    return reference.raiseTo !== undefined &&
      reference.raiseTo >= legal.minRaiseTo &&
      reference.raiseTo <= legal.maxRaiseTo!
      ? reference.raiseTo
      : legal.minRaiseTo
  }, [deal, displayed, legal?.minRaiseTo, legal?.maxRaiseTo, entries, review])
  useEffect(() => {
    const turn = `${current?.seed}:${current?.actions.length}:${review?.index ?? 'live'}`
    if (raiseEdit.current.turn !== turn)
      raiseEdit.current = { turn, edited: false }
    if (!raiseEdit.current.edited) setRaise(String(bb(suggestedRaise)))
  }, [suggestedRaise, current?.seed, current?.actions.length, review?.index])
  function raiseEntered() {
    try {
      submit({ kind: 'raise', to: chipsFromBB(raise) })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid raise amount')
    }
  }
  function submit(action: LiveAction) {
    if (!displayed || !deal || displayed.toAct !== deal.hero || !allowed) return
    if (review) {
      try {
        // The live hand remains untouched while a saved decision is retried.
        const prefix = {
          ...review.deal,
          actions: review.deal.actions.slice(0, review.index),
        }
        appendLiveAction(prefix, action, review.index)
        setReview({
          ...review,
          answer: retryLiveReference(review.reference, action),
        })
      } catch (e) {
        setError(String(e))
      }
    } else commit(action, true)
  }
  async function changeMode(nextMode: GameMode) {
    if (!session || !allowed || switching.current || nextMode === mode) return
    switching.current = true
    setModeBusy(true)
    setPaused(true)
    try {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      )
      const next = switchLiveMode(session, nextMode)
      const encoded = encodeLiveSession(next)
      if (owner === 'owner') localStorage.setItem(LIVE_SAVE_KEY, encoded)
      setSession(next)
      setReview(null)
      setError('')
      const d = next.current
      setPlayers(d.config.stacks.length as PlayerCount)
      setStacks(d.config.stacks.map(bb).join(', '))
      setHeroSeat(d.hero)
      setStyle(d.style)
      setAnteKind(d.config.ante?.kind ?? 'none')
      setAnte(String(bb(d.config.ante?.amount ?? 100)))
      const url = new URL(location.href)
      url.searchParams.set('mode', nextMode)
      history.replaceState(null, '', url)
    } catch {
      setOwner('unsaved')
      setMessage(
        'Not saved; current hand kept. Export a backup before leaving.',
      )
      setError(
        'Could not save the mode change. Your current hand and previous save were kept. Practice can continue unsaved.',
      )
    } finally {
      switching.current = false
      setModeBusy(false)
    }
  }
  function retryCurrent() {
    if (review) {
      setReview({ ...review, answer: undefined })
      return
    }
    if (!session || !allowed) return
    try {
      setSession(retryLiveDecision(session))
      setPaused(true)
      setError('')
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Could not restore this decision',
      )
    }
  }
  function continueDecision() {
    if (review) {
      setReview(null)
      setPaused(true)
      return
    }
    if (!current || !active || !lastRecord) return
    if (
      active.heroFolded ||
      active.preflopComplete ||
      (active.street === 'complete' && active.board.length === 0)
    ) {
      startHand(false)
      return
    }
    setSession((prev) =>
      !prev
        ? prev
        : {
            ...prev,
            current: { ...prev.current, acknowledgedAction: lastRecord.index },
          },
    )
    setPaused(false)
  }
  function startHand(applySettings: boolean) {
    if (!session || !allowed || switching.current) return
    try {
      let config = current!.config,
        hero = current!.hero,
        nextStyle = current!.style
      if (applySettings) {
        const amounts = stacks.split(',').map(chipsFromBB)
        if (
          amounts.length !== players ||
          amounts.some((x) => !Number.isSafeInteger(x) || x < 1 || x > 1000000)
        )
          throw Error(
            `Enter ${players} stack sizes in BB, each above zero and at most 10000 BB, to two decimal places.`,
          )
        const amount = anteKind === 'none' ? 0 : chipsFromBB(ante)
        if (
          anteKind !== 'none' &&
          (!Number.isSafeInteger(amount) || amount < 0 || amount > 1000000)
        )
          throw Error('Enter an ante in BB with up to two decimal places.')
        config = {
          stacks: amounts,
          button: players - 3,
          smallBlind: 50,
          bigBlind: 100,
          ...(anteKind !== 'none' ? { ante: { kind: anteKind, amount } } : {}),
        }
        hero = heroSeat
        nextStyle = style
      }
      const next = fresh(config, hero, nextStyle, mode)
      replayLiveDeal(next)
      setSession({
        ...session,
        current: next,
        archive: [...session.archive, session.current].slice(-20),
      })
      setTools(false)
      setSizing(false)
      setOutcome(false)
      setReview(null)
      setPaused(false)
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid setup')
    }
  }
  if (!session || !displayed || !deal || !active || !current)
    return (
      <main className="page live-page">
        <h1>Poker simulator</h1>
        <p role="status">{message}</p>
        <a href="/">Home</a>
        {owner === 'other' && (
          <button className="btn" onClick={() => location.reload()}>
            Retry ownership
          </button>
        )}
      </main>
    )
  const order = positionsFor(displayed.seats.length as PlayerCount)
  const hero = displayed.seats[deal.hero]
  const records = allLiveDeals(session)
  const decisions = records.flatMap((d) =>
    (d.feedback ?? []).map((f) => ({ ...f, deal: d })),
  )
  const completed = records.filter((d) => {
    const s = practiceLiveDeal(d)
    return (
      !d.attempt &&
      (s.street === 'complete' || s.preflopComplete || s.heroFolded)
    )
  }).length
  const ended =
    !!active.heroFolded ||
    !!active.preflopComplete ||
    active.street === 'complete'
  const nextLabel =
    mode === 'preflop' ? 'Deal next preflop hand' : 'Deal next live hand'
  const feedbackAction = review
    ? review.deal.actions[review.index]
    : lastRecord
      ? current.actions[lastRecord.index]
      : null
  const actionLabel = feedbackAction
    ? feedbackAction.kind === 'raise'
      ? `Raise to ${bb(feedbackAction.to)} BB`
      : feedbackAction.kind
    : ''
  return (
    <main className="page play-page live-page learning-play">
      <header className="sim-header live-header">
        <a className="sim-back" href="/" aria-label="Leave simulator">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="m14 6-6 6 6 6" />
          </svg>
        </a>
        <div className="sim-header__title">
          <h1 aria-label="Poker simulator">Simulator</h1>
          <span role="status" className="sim-save-status">
            {message === 'Saved on this device' ? 'Saved on device' : message}
          </span>
        </div>
        <GameModeSwitch
          mode={mode}
          disabled={!allowed || modeBusy}
          onChange={(next) => void changeMode(next)}
        />
        <button
          className="btn sim-menu"
          aria-label="Practice tools"
          aria-haspopup="dialog"
          onClick={() => {
            setPaused(true)
            setTools(true)
          }}
        >
          <InterfaceIcon name="settings" />
        </button>
      </header>
      {error && (
        <p role="alert" className="sim-mode-error">
          {error}
        </p>
      )}
      <section className="card trainer-table live-hand" aria-label="Live hand">
        <div className="range-card__head">
          <div className="range-card__title">
            <h2>
              {review
                ? 'Retry a saved decision'
                : active.heroFolded
                  ? 'You folded'
                  : active.preflopComplete
                    ? 'Preflop complete'
                    : active.street === 'complete'
                      ? 'Hand settled'
                      : `${order[deal.hero]} · ${displayed.street[0].toUpperCase() + displayed.street.slice(1)}`}
            </h2>
            <span>
              {review
                ? 'Live hand paused'
                : pending
                  ? 'Decision feedback'
                  : ended
                    ? 'Practice hand complete'
                    : displayed.toAct === deal.hero
                      ? 'Your move'
                      : 'Opponents are acting'}
            </span>
          </div>
          {!pending &&
            (!ended || review) &&
            displayed.toAct === deal.hero &&
            legal?.minRaiseTo != null && (
              <button
                className="btn sizing-trigger"
                onClick={() => {
                  setPaused(true)
                  setSizeError('')
                  setRaiseDraft(raise)
                  setSizing(true)
                }}
              >
                Bet sizing
              </button>
            )}
        </div>
        <SimulatorTable
          players={displayed.seats.length as PlayerCount}
          hero={order[deal.hero]}
          cards={hero.cards}
          board={displayed.board}
          bets={Object.fromEntries(
            displayed.seats.map((p, i) => [order[i], bb(p.streetBet)]),
          )}
          stacks={Object.fromEntries(
            displayed.seats.map((p, i) => [order[i], bb(p.stack)]),
          )}
          folded={
            new Set(
              displayed.seats.flatMap((p, i) => (p.folded ? [order[i]] : [])),
            )
          }
          pot={bb(displayed.pot)}
          acting={displayed.toAct === null ? undefined : order[displayed.toAct]}
        />
        {feedback ? (
          <LiveDecisionFeedback
            key={`${deal.seed}:${review?.index ?? lastRecord?.index}:${review ? 'review' : 'live'}`}
            reference={feedback}
            suspended={tools || sizing || modeBusy}
            action={actionLabel}
            retry={!!review}
            onRetry={retryCurrent}
            onContinue={continueDecision}
            continueLabel={
              review
                ? 'Return to live hand'
                : active.heroFolded ||
                    active.preflopComplete ||
                    (active.street === 'complete' && active.board.length === 0)
                  ? nextLabel
                  : active.street === 'complete'
                    ? 'View hand result'
                    : 'Continue hand'
            }
          />
        ) : !review && ended ? (
          <section
            className="hand-result live-result"
            aria-label={
              active.preflopComplete
                ? 'Preflop result'
                : active.heroFolded
                  ? 'Fold result'
                  : 'Hand summary'
            }
          >
            <h3>
              {active.heroFolded
                ? 'You folded. Your practice hand ends here.'
                : active.preflopComplete
                  ? 'Preflop complete — no future cards dealt.'
                  : active.board.length === 5
                    ? liveOutcomeTitle(active, deal.hero)
                    : `${liveOutcomeTitle(active, deal.hero)} · ${active.pots.reduce((n, p) => n + p.amount, 0) / 100} BB pot`}
            </h3>
            {active.street === 'complete' && active.board.length === 5 && (
              <button className="btn" onClick={() => setOutcome(true)}>
                Show result
              </button>
            )}
            <button
              className="btn btn--primary"
              aria-label={nextLabel}
              onClick={() => startHand(false)}
            >
              Next hand
            </button>
          </section>
        ) : displayed.toAct === deal.hero ? (
          <div
            className="actions live-actions"
            role="group"
            aria-label="Your move"
          >
            {legal?.minRaiseTo != null && (
              <button
                className="action-btn action-btn--raise"
                aria-label="Raise / bet"
                onClick={raiseEntered}
              >
                <InterfaceIcon name="raise" />
                <span>
                  {legal.check ? 'Bet' : 'Raise'} {raise} BB
                </span>
              </button>
            )}
            {legal?.check ? (
              <button
                className="action-btn action-btn--check"
                onClick={() => submit({ kind: 'check' })}
              >
                <InterfaceIcon name="check" />
                <span>Check</span>
              </button>
            ) : (
              !!legal?.call && (
                <button
                  className="action-btn action-btn--call"
                  onClick={() => submit({ kind: 'call' })}
                >
                  <InterfaceIcon name="call" />
                  <span>Call {bb(legal.call)} BB</span>
                </button>
              )
            )}
            <button
              className="action-btn action-btn--fold"
              onClick={() => submit({ kind: 'fold' })}
            >
              <InterfaceIcon name="fold" />
              <span>Fold</span>
            </button>
            {review && (
              <button
                className="btn live-return"
                onClick={() => {
                  setReview(null)
                  setPaused(true)
                }}
              >
                Return to live hand
              </button>
            )}
          </div>
        ) : (
          <div className="actions actions--waiting live-wait">
            <span>{order[displayed.toAct!]} is thinking…</span>
            {paused && (
              <button className="btn" onClick={() => setPaused(false)}>
                Continue hand
              </button>
            )}
          </div>
        )}
      </section>
      {sizing && legal?.minRaiseTo != null && (
        <LiveSheet
          title="Bet sizing"
          onClose={() => setSizing(false)}
          footer={
            <>
              <button
                className="btn"
                onClick={() => {
                  setSizing(false)
                  submit({ kind: 'raise', to: legal.maxRaiseTo! })
                }}
              >
                All-in {bb(legal.maxRaiseTo!)} BB
              </button>
              <button
                className="btn btn--primary"
                onClick={() => {
                  try {
                    const n = chipsFromBB(raiseDraft)
                    if (n < legal.minRaiseTo! || n > legal.maxRaiseTo!)
                      throw Error(
                        'Choose a size within the legal minimum and maximum.',
                      )
                    setSizeError('')
                    raiseEdit.current.edited = true
                    setRaise(raiseDraft)
                    setSizing(false)
                  } catch (e) {
                    setSizeError(
                      e instanceof Error ? e.message : 'Invalid size',
                    )
                  }
                }}
              >
                Apply size
              </button>
            </>
          }
        >
          {sizeError && <p role="alert">{sizeError}</p>}
          <label>
            Raise to (BB)
            <input
              aria-label="Raise to (BB)"
              type="number"
              step="0.01"
              min={bb(legal.minRaiseTo)}
              max={bb(legal.maxRaiseTo!)}
              value={raiseDraft}
              onChange={(e) => {
                setRaiseDraft(e.target.value)
              }}
            />
          </label>
          <p>
            Minimum {bb(legal.minRaiseTo)} BB; maximum {bb(legal.maxRaiseTo!)}{' '}
            BB. This is your total contribution for this street.
          </p>
          <p>
            Custom sizes remain legal but receive no chart grade unless the
            reference matches.
          </p>
        </LiveSheet>
      )}
      {outcome &&
        !tools &&
        !review &&
        !pending &&
        active.street === 'complete' &&
        !active.heroFolded && (
          <LiveOutcome
            state={active}
            hero={deal.hero}
            onClose={() => setOutcome(false)}
            onNext={() => startHand(false)}
          />
        )}
      {tools && (
        <LiveSheet title="Practice tools" onClose={() => setTools(false)}>
          <nav className="live-nav" aria-label="Practice pages">
            <a href="/ranges">Ranges</a>
            <a href="/learn">Lessons</a>
          </nav>
          <section className="card">
            <h2>Recent practice</h2>
            <p>
              Current hand, other mode’s parked hand and up to 20 recent hands:{' '}
              {completed} completed; {decisions.length} decisions;{' '}
              {decisions.filter((d) => d.reference.status === 'outside').length}{' '}
              outside-reference decisions;{' '}
              {
                decisions.filter((d) => d.reference.status === 'ungraded')
                  .length
              }{' '}
              ungraded. Outcomes are tracked separately from reference matching.
            </p>
            <details open={toolSection === 'review' ? true : undefined}>
              <summary>Review recent decisions ({decisions.length})</summary>
              <ul className="live-review">
                {decisions
                  .slice(-20)
                  .reverse()
                  .map((r, i) => (
                    <li key={`${r.deal.seed}-${r.index}-${i}`}>
                      Decision {r.index + 1}: {r.reference.status}{' '}
                      <button
                        className="btn"
                        onClick={() => {
                          setTools(false)
                          setPaused(true)
                          setReview({
                            deal: r.deal,
                            index: r.index,
                            reference: r.reference,
                          })
                          setError('')
                        }}
                      >
                        Retry decision
                      </button>
                    </li>
                  ))}
              </ul>
            </details>
          </section>
          <details
            className="card"
            open={toolSection === 'settings' ? true : undefined}
          >
            <summary>Live table settings</summary>
            <p>
              Starts a fresh practice hand. Existing hand moves to recent
              history. Blinds stay 0.5/1 BB; no rake. Each hand resets the
              configured stacks and fixed training positions.
            </p>
            <Segmented
              ariaLabel="Game mode"
              options={[
                { value: 'full-hands', label: 'Full hands' },
                { value: 'preflop', label: 'Preflop' },
              ]}
              value={mode}
              onChange={(next) => void changeMode(next)}
            />
            <p>
              Both modes use shuffled cards and your actual choices. Preflop
              stops after its betting round; each mode keeps its own saved hand.
            </p>
            <div className="live-settings">
              <label>
                Players
                <select
                  value={players}
                  onChange={(e) => {
                    const n = Number(e.target.value) as PlayerCount
                    setPlayers(n)
                    setStacks(Array(n).fill('100').join(', '))
                    setHeroSeat(0)
                  }}
                >
                  {[6, 8, 9].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </label>
              <label>
                Your position
                <select
                  value={heroSeat}
                  onChange={(e) => setHeroSeat(Number(e.target.value))}
                >
                  {positionsFor(players).map((p, i) => (
                    <option key={p} value={i}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Starting stacks (BB, seat order)
                <input
                  value={stacks}
                  onChange={(e) => setStacks(e.target.value)}
                />
              </label>
              <label>
                Ante convention
                <select
                  value={anteKind}
                  onChange={(e) =>
                    setAnteKind(e.target.value as typeof anteKind)
                  }
                >
                  <option value="none">No ante</option>
                  <option value="each">Each player ante (posted first)</option>
                  <option value="big-blind">
                    Big-blind ante (blind posted first)
                  </option>
                </select>
              </label>
              {anteKind !== 'none' && (
                <label>
                  Ante amount (BB)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={ante}
                    onChange={(e) => setAnte(e.target.value)}
                  />
                </label>
              )}
              <label>
                Opponent style
                <select
                  value={style}
                  onChange={(e) => setStyle(e.target.value as OpponentStyle)}
                >
                  {['tight', 'balanced', 'loose'].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
            </div>
            <button
              className="btn btn--primary"
              onClick={() => startHand(true)}
            >
              Start with these settings
            </button>
          </details>
          <details className="card">
            <summary>Save and source details</summary>
            <p>
              One tab owns the live save. Reload pauses opponents. Saves store
              the shuffled-deal seed, legal actions and original feedback.
              Browser storage holds hidden cards indirectly and is intended for
              solo study, not secure multiplayer.
            </p>
            <p>
              Imported PTO/GTO labels have not been independently verified. Only
              exact supported 100bb cash preflop situations receive
              imported-chart feedback. Other legal decisions remain ungraded;
              postflop play uses no verified GTO or EV-loss reference.
            </p>
            <p>
              Opponent policy uses hand ranks/suitedness preflop and current
              made-hand category postflop, with style thresholds and randomness.
              It receives only its own cards, the visible board, public pot/bet
              and legal actions. It does not model equity, blockers, draws or
              equilibrium strategy.
            </p>
            <button
              className="btn"
              onClick={() =>
                download(JSON.stringify({ ...session, version: 3 }), 'poker-live-practice.json')
              }
            >
              Export live practice
            </button>
            {invalidSave.current && (
              <button
                className="btn"
                onClick={() =>
                  download(
                    invalidSave.current!,
                    'poker-live-recovery-original.json',
                  )
                }
              >
                Export original recovery save
              </button>
            )}
          </details>
        </LiveSheet>
      )}
    </main>
  )
}
