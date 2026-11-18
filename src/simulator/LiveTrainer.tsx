'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { GameModeSwitch } from '@/components/trainer/GameModeSwitch'
import { Segmented } from '@/components/Segmented'
import { isGameMode, type GameMode } from '@/lib/gameModes'
import { modeOf, allLiveDeals, switchLiveMode } from './liveModes'
import { loadTheme } from '@/lib/theme'
import { chipsFromBB } from './liveAmounts'
import { newPositionedDeal, positionChoice } from './livePositions'
import {
  SETUP_BEAT_MS,
  startSetupPlayback,
  publicActionLabel,
  type LiveSetupPlayback,
} from './liveSetupPlayback'
import {
  appendLearnerAction,
  pendingLiveFeedback,
  requiresDecisionFeedback,
} from './liveFeedbackFlow'
import { LiveSheet } from './LiveSheet'
import { LiveDecisionFeedback } from './LiveDecisionFeedback'
import { LiveOutcome, liveOutcomeTitle } from './LiveOutcome'
import { InterfaceIcon } from '@/components/InterfaceIcon'
import { SimulatorTable } from '@/components/SimulatorTable'
import { positionsFor, type PlayerCount } from '@/lib/positions'
import { loadLiveCharts } from './liveCharts'
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
  liveSessionVersion,
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
import { auditPreflopCharts } from './preflopCatalog'
import {
  newGradedPreflop,
  gradedPreflopStatus,
  chooseGradedOpponent,
  upgradePreflop,
  switchGradedMode,
  retryGradedPreflop,
} from './gradedPreflop'

const bb = (n: number) => Number((n / 100).toFixed(2))
function fresh(
  config?: LiveConfig,
  hero = 0,
  style: OpponentStyle = 'balanced',
  mode: GameMode = 'full-hands',
  previousHero?: number,
): LiveDeal {
  return {
    ...newPositionedDeal(
      config ?? {
        stacks: Array(6).fill(10000),
        button: 3,
        smallBlind: 50,
        bigBlind: 100,
      },
      hero < 0 ? 'random' : hero,
      style,
      mode,
      previousHero,
    ),
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
  const initializePreflop = useRef(false)
  const [preflopDetails, setPreflopDetails] = useState(false)
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
  const [setupPlayback, setSetupPlayback] = useState<LiveSetupPlayback | null>(
    null,
  )
  const [owner, setOwner] = useState<'pending' | 'owner' | 'other' | 'unsaved'>(
    'pending',
  )
  const [message, setMessage] = useState('Loading live practice…')
  const [error, setError] = useState('')
  const [paused, setPaused] = useState(true)
  const [entries, setEntries] = useState<RangeEntry[] | null>(null)
  const [referenceState, setReferenceState] = useState<
    'loading' | 'ready' | 'error'
  >('loading')
  const [referenceAttempt, setReferenceAttempt] = useState(0)
  const [allowUngraded, setAllowUngraded] = useState(false)
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
    setReferenceState('loading')
    loadLiveCharts()
      .then((e) => {
        if (!gone) {
          if (!e.length) throw Error('Empty grading charts')
          setEntries(e)
          setReferenceState('ready')
        }
      })
      .catch(() => {
        if (!gone) setReferenceState('error')
      })
    return () => {
      gone = true
    }
  }, [referenceAttempt])
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
        initializePreflop.current =
          requested === 'preflop' &&
          !hadTarget &&
          !['players', 'seat', 'stack'].some((k) => params.has(k))
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
      setHeroSeat(positionChoice(next.current))
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
  const preflopAuditError = useMemo(() => {
    if (!entries) return ''
    try {
      auditPreflopCharts(entries)
      return ''
    } catch (e) {
      return e instanceof Error ? e.message : 'Invalid preflop charts'
    }
  }, [entries])
  const gradedState = useMemo(
    () =>
      current && (current.graded || initializePreflop.current)
        ? preflopAuditError
          ? { kind: 'problem' as const, message: preflopAuditError }
          : gradedPreflopStatus(current, entries)
        : null,
    [current, entries, preflopAuditError],
  )
  useEffect(() => {
    if (
      !session ||
      !initializePreflop.current ||
      !entries ||
      !['owner', 'unsaved'].includes(owner)
    )
      return
    if (preflopAuditError) {
      setError(preflopAuditError)
      return
    }
    try {
      const d = newGradedPreflop(entries, { recent: session.archive })
      initializePreflop.current = false
      setSession({ ...session, version: 4, current: d })
      setSetupPlayback(startSetupPlayback(d))
      setPlayers(6)
      setStacks(Array(6).fill('100').join(', '))
      setHeroSeat(-1)
      setAnteKind('none')
      setStyle('balanced')
      setPaused(false)
      setError('')
    } catch (e) {
      setError(String(e))
    }
  }, [session, entries, owner, preflopAuditError])
  const pending = pendingLiveFeedback(current)
  const playingSetup =
    !review && !!setupPlayback && setupPlayback.deal === current
  const displayed = useMemo(
    () =>
      review
        ? practiceLiveDeal(review.deal, review.index)
        : playingSetup && current && setupPlayback
          ? practiceLiveDeal(current, setupPlayback.shown)
          : pending && current && lastRecord && !active?.heroFolded
            ? practiceLiveDeal(current, lastRecord.index)
            : active,
    [review, current, lastRecord, pending, active, playingSetup, setupPlayback],
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
  useEffect(() => {
    if (
      !playingSetup ||
      !setupPlayback ||
      !allowed ||
      paused ||
      tools ||
      review ||
      modeBusy ||
      !entries ||
      preflopAuditError
    )
      return
    const timer = setTimeout(() => {
      setSetupPlayback((previous) =>
        previous !== setupPlayback
          ? previous
          : previous.shown >= previous.deal.actions.length
            ? null
            : { ...previous, shown: previous.shown + 1 },
      )
    }, SETUP_BEAT_MS)
    return () => clearTimeout(timer)
  }, [
    playingSetup,
    setupPlayback,
    allowed,
    paused,
    tools,
    review,
    modeBusy,
    entries,
    preflopAuditError,
  ])
  const commit = useCallback(
    (action: LiveAction, human: boolean) => {
      if (!current || !active || !allowed || review || switching.current) return
      if (playingSetup) return
      if (initializePreflop.current) return
      if (!entries && !allowUngraded) return
      const index = current.actions.length,
        seed = current.seed
      const reference = human
        ? liveReference(current, active, action, entries)
        : undefined
      try {
        if (current.graded && human && reference?.status === 'ungraded')
          throw Error(
            'This decision has no applicable reference. Your action was not recorded; reload the charts.',
          )
        const next = human
          ? appendLearnerAction(current, action, index, reference!)
          : appendLiveAction(current, action, index)
        setSession((prev) =>
          !prev ||
          prev.current.seed !== seed ||
          prev.current.actions.length !== index
            ? prev
            : { ...prev, current: next },
        )
        setError('')
        if (human) {
          setPaused(requiresDecisionFeedback(current, reference!))
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'The action was rejected.')
      }
    },
    [current, active, allowed, review, entries, allowUngraded, playingSetup],
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
      playingSetup ||
      paused ||
      tools ||
      review ||
      !allowed ||
      (!entries && !allowUngraded) ||
      initializePreflop.current ||
      (current.graded && gradedState?.kind !== 'decision')
    )
      return
    const timer = setTimeout(() => {
      try {
        commit(
          current.graded
            ? chooseGradedOpponent(current, entries!)
            : chooseLiveOpponent(
                observeLivePlayer(active),
                current.style,
                seededLiveRandom(
                  (current.seed ^
                    Math.imul(current.actions.length + 1, 0x9e3779b9)) >>>
                    0,
                ),
                liveReference(current, active, { kind: 'fold' }, entries)
                  .raiseTo,
              ),
          false,
        )
      } catch (e) {
        setPaused(true)
        setError(e instanceof Error ? e.message : 'Could not progress the hand')
      }
    }, 650)
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
    entries,
    allowUngraded,
    gradedState,
    playingSetup,
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
  const coverage = useMemo(
    () =>
      deal && displayed
        ? liveReference(deal, displayed, { kind: 'fold' }, entries)
        : null,
    [deal, displayed, entries],
  )
  useEffect(() => {
    const turn = `${current?.seed}:${current?.actions.length}:${review?.index ?? 'live'}`
    if (raiseEdit.current.turn !== turn)
      raiseEdit.current = { turn, edited: false }
    if (!raiseEdit.current.edited) setRaise(String(bb(suggestedRaise)))
  }, [suggestedRaise, current?.seed, current?.actions.length, review?.index])
  function raiseEntered() {
    try {
      submit({
        kind: 'raise',
        to: deal?.graded ? suggestedRaise : chipsFromBB(raise),
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid raise amount')
    }
  }
  function submit(action: LiveAction) {
    if (playingSetup) return
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
    if (
      nextMode === 'preflop' &&
      !session.parked?.preflop &&
      (!entries || preflopAuditError)
    ) {
      setError(
        preflopAuditError ||
          'Load the grading charts before opening Preflop practice.',
      )
      return
    }
    switching.current = true
    setModeBusy(true)
    setPaused(true)
    try {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      )
      if (nextMode === 'preflop' && !session.parked?.preflop && !entries)
        throw Error('Load the grading charts before opening Preflop practice.')
      const next = entries
        ? switchGradedMode(session, nextMode, entries)
        : switchLiveMode(session, nextMode)
      const encoded = encodeLiveSession(next)
      if (owner === 'owner') localStorage.setItem(LIVE_SAVE_KEY, encoded)
      setSession(next)
      const newSetup =
        nextMode === 'preflop' && !session.parked?.preflop
          ? startSetupPlayback(next.current)
          : null
      setSetupPlayback(newSetup)
      if (newSetup) setPaused(false)
      setReview(null)
      setError('')
      const d = next.current
      setPlayers(d.config.stacks.length as PlayerCount)
      setStacks(d.config.stacks.map(bb).join(', '))
      setHeroSeat(positionChoice(d))
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
      setSetupPlayback(null)
      setSession(
        current?.graded
          ? retryGradedPreflop(session)
          : retryLiveDecision(session),
      )
      setPreflopDetails(false)
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
      gradedState?.kind === 'boundary' ||
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
        hero = current!.randomPosition ? -1 : current!.hero,
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
      const next = current?.graded
        ? newGradedPreflop(entries ?? [], {
            recent: [...session.archive, session.current],
            seat: applySettings
              ? heroSeat < 0
                ? undefined
                : heroSeat
              : current.graded.seat,
          })
        : fresh(config, hero, nextStyle, mode, current!.hero)
      replayLiveDeal(next)
      setSession({
        ...session,
        current: next,
        archive: [...session.archive, session.current].slice(-20),
      })
      setSetupPlayback(startSetupPlayback(next))
      setTools(false)
      setSizing(false)
      setOutcome(false)
      setReview(null)
      setPreflopDetails(false)
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
      (s.street === 'complete' ||
        s.preflopComplete ||
        s.heroFolded ||
        (d.graded && gradedPreflopStatus(d, entries)?.kind === 'boundary'))
    )
  }).length
  const ended =
    !!active.heroFolded ||
    !!active.preflopComplete ||
    active.street === 'complete' ||
    gradedState?.kind === 'boundary'
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
          disabled={
            !allowed ||
            modeBusy ||
            (mode === 'full-hands' &&
              !session.parked?.preflop &&
              (!entries || !!preflopAuditError))
          }
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
                    : gradedState?.kind === 'boundary'
                      ? 'Reference boundary'
                      : active.street === 'complete'
                        ? 'Hand settled'
                        : `${order[deal.hero]} · ${displayed.street[0].toUpperCase() + displayed.street.slice(1)}`}
            </h2>
            <span>
              {review
                ? 'Live hand paused'
                : playingSetup
                  ? 'Watching supplied setup'
                  : pending
                    ? 'Decision feedback'
                    : ended
                      ? 'Practice hand complete'
                      : current.graded
                        ? 'Graded · Supplied setup'
                        : mode === 'preflop'
                          ? 'Unrestricted preflop · Upgrade in tools'
                          : displayed.toAct === deal.hero
                            ? review || coverage?.status !== 'ungraded'
                              ? 'Your move · Chart available'
                              : !entries
                                ? referenceState === 'loading'
                                  ? 'Loading grading charts…'
                                  : 'Grading charts unavailable'
                                : displayed.street !== 'preflop'
                                  ? 'Your move · Postflop ungraded'
                                  : 'Your move · No matching chart'
                            : 'Opponents are acting'}
            </span>
          </div>
          {!pending &&
            !deal.graded &&
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
        {playingSetup && setupPlayback && entries && !preflopAuditError ? (
          <div
            className="actions actions--waiting live-wait"
            role="status"
            aria-label="Watching setup"
          >
            <div className="live-action-feed">
              <strong key={setupPlayback.shown}>
                {publicActionLabel(current, setupPlayback.shown) ??
                  'Blinds posted · Supplied setup'}
              </strong>
              <span className="live-thinking">
                {setupPlayback.shown < current.actions.length
                  ? `${order[displayed.toAct!]} is thinking`
                  : 'Your turn next'}
                <span className="live-thinking-dots" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
              </span>
            </div>
            {paused && (
              <button className="btn" onClick={() => setPaused(false)}>
                Continue hand
              </button>
            )}
          </div>
        ) : feedback ? (
          <LiveDecisionFeedback
            key={`${deal.seed}:${review?.index ?? lastRecord?.index}:${review ? 'review' : 'live'}`}
            reference={feedback}
            boundary={
              !review && gradedState?.kind === 'boundary'
                ? gradedState.message
                : undefined
            }
            suspended={tools || sizing || modeBusy || preflopDetails}
            action={actionLabel}
            retry={!!review}
            onRetry={retryCurrent}
            onContinue={continueDecision}
            continueLabel={
              review
                ? 'Return to live hand'
                : active.heroFolded ||
                    active.preflopComplete ||
                    gradedState?.kind === 'boundary' ||
                    (active.street === 'complete' && active.board.length === 0)
                  ? nextLabel
                  : active.street === 'complete'
                    ? 'View hand result'
                    : 'Continue hand'
            }
          />
        ) : !review && gradedState?.kind === 'problem' ? (
          <section
            className="hand-result live-result"
            aria-label="Preflop reference problem"
          >
            <h3>Grading reference needs recovery.</h3>
            <button className="btn" onClick={() => setPreflopDetails(true)}>
              Details
            </button>
            <button
              className="btn btn--primary"
              onClick={() => {
                setEntries(null)
                setReferenceAttempt((n) => n + 1)
              }}
            >
              Reload charts
            </button>
          </section>
        ) : !review && gradedState?.kind === 'boundary' ? (
          <section
            className="hand-result live-result"
            aria-label="Reference boundary"
          >
            <h3>Reference practice stops here.</h3>
            <button className="btn" onClick={() => setPreflopDetails(true)}>
              Why practice stopped
            </button>
            <button
              className="btn btn--primary"
              aria-label={nextLabel}
              onClick={() => startHand(false)}
            >
              Next hand
            </button>
          </section>
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
        ) : !review &&
          ((!entries && (!allowUngraded || !!current.graded)) ||
            initializePreflop.current) ? (
          <section
            className="verdict sim-compact live-reference-status"
            aria-label="Grading charts"
            aria-live="polite"
          >
            <strong>
              {referenceState === 'loading'
                ? 'Loading grading charts…'
                : 'Grading charts could not load.'}
            </strong>
            <span>
              {referenceState === 'loading'
                ? 'Wait for charts before answering. Your hand is kept.'
                : 'Reconnect, then retry. Your hand is kept.'}
            </span>
            {referenceState === 'error' && (
              <>
                <button
                  className="btn btn--primary"
                  onClick={() => setReferenceAttempt((n) => n + 1)}
                >
                  Retry charts
                </button>
                {!current.graded && !initializePreflop.current && (
                  <button
                    className="btn"
                    onClick={() => setAllowUngraded(true)}
                  >
                    Play ungraded
                  </button>
                )}
              </>
            )}
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
                  {legal.check ? 'Bet' : 'Raise'}{' '}
                  {deal.graded ? bb(suggestedRaise) : raise} BB
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
            <div className="live-action-feed" role="status">
              {publicActionLabel(current) && (
                <strong key={current.actions.length}>
                  {publicActionLabel(current)}
                </strong>
              )}
              <span className="live-thinking">
                {order[displayed.toAct!]} is thinking
                <span className="live-thinking-dots" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
              </span>
            </div>
            {paused && (
              <button className="btn" onClick={() => setPaused(false)}>
                Continue hand
              </button>
            )}
          </div>
        )}
      </section>
      {preflopDetails && (
        <LiveSheet
          title={
            gradedState?.kind === 'boundary'
              ? 'Reference boundary'
              : 'Preflop reference'
          }
          onClose={() => setPreflopDetails(false)}
          footer={
            gradedState?.kind === 'boundary' ? (
              <>
                {lastRecord && (
                  <button className="btn" onClick={retryCurrent}>
                    Retry my decision
                  </button>
                )}
                <button
                  className="btn btn--primary"
                  onClick={() => startHand(false)}
                >
                  Next hand
                </button>
              </>
            ) : undefined
          }
        >
          <p>
            {gradedState?.kind === 'boundary' || gradedState?.kind === 'problem'
              ? gradedState.message
              : 'This practice uses the imported 100 BB six-max preflop charts and their documented sizing.'}
          </p>
          <p>
            Your actual actions remain saved. No unplayed actions or hand result
            are invented. Retry restores your last decision with the same cards
            and source.
          </p>
        </LiveSheet>
      )}
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
          {mode === 'preflop' && (
            <section className="card">
              <h2>Graded preflop practice</h2>
              <p>
                Balanced study mix: about 60% of new hands support a call or
                raise, and 40% are fold-only in the reference. Opening and
                facing one raise are favored. This is a learning target, not
                normal live-game frequencies; your actual answer is graded
                against the unchanged chart.
              </p>
              <p>
                Six-max · 100 BB · no antes · standard reference sizes. Fresh
                cards and supplied setup actions vary the situations. Your
                choices remain your own; calls or cold responses outside the
                charts end reference practice without assigning a result.
              </p>
              <p>
                {current.graded
                  ? 'Earlier setup actions are supplied for this exercise; only your answers are scored. Use Any position to practice all 65 standard contexts.'
                  : 'This hand uses the earlier unrestricted preflop setup. Starting graded practice keeps it in recent history and preserves the other mode’s hand.'}
              </p>
              {!current.graded && (
                <button
                  className="btn btn--primary"
                  disabled={!entries || !!preflopAuditError}
                  onClick={() => {
                    try {
                      const next = upgradePreflop(session, entries ?? [])
                      if (owner === 'owner')
                        localStorage.setItem(
                          LIVE_SAVE_KEY,
                          encodeLiveSession(next),
                        )
                      setSession(next)
                      setSetupPlayback(startSetupPlayback(next.current))
                      setPlayers(6)
                      setStacks(Array(6).fill('100').join(', '))
                      setHeroSeat(-1)
                      setAnteKind('none')
                      setStyle('balanced')
                      setTools(false)
                      setPaused(false)
                      setError('')
                      setReview(null)
                    } catch (e) {
                      setError(
                        e instanceof Error
                          ? e.message
                          : 'Could not start graded practice',
                      )
                    }
                  }}
                >
                  Start graded practice
                </button>
              )}
              {current.graded && (
                <p>
                  Practice coverage:{' '}
                  {records.filter((d) => d.graded && !d.attempt).length}{' '}
                  retained hands;{' '}
                  {
                    records.filter(
                      (d) =>
                        d.graded &&
                        !d.attempt &&
                        gradedPreflopStatus(d, [])?.kind === 'boundary',
                    ).length
                  }{' '}
                  reference-boundary endings;{' '}
                  {
                    new Set(
                      records.flatMap((d) =>
                        d.graded ? [d.graded.context] : [],
                      ),
                    ).size
                  }{' '}
                  of 65 setup contexts;{' '}
                  {decisions.filter((d) => d.deal.graded).length} graded
                  answers. History is bounded; this is not a lifetime mastery
                  score.
                </p>
              )}
            </section>
          )}
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
                      Decision{' '}
                      {r.deal.graded
                        ? (r.deal.feedback ?? []).findIndex(
                            (f) => f.index === r.index,
                          ) + 1
                        : r.index + 1}
                      : {r.reference.status}{' '}
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
              configured stacks; your position follows the choice below.
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
              Both modes use shuffled cards and your actual choices. Covered
              Preflop uses chart-backed situations and standard sizes; Full
              hands keeps unrestricted live play. Each mode keeps its own saved
              hand.
            </p>
            {!current.graded && (
              <p>
                Choose Random each hand to vary your position on new deals
                without repeating the previous position. Current hands and
                retries keep their exact seat.
              </p>
            )}
            <div className="live-settings">
              <label>
                Players
                <select
                  value={players}
                  disabled={!!current.graded}
                  onChange={(e) => {
                    const n = Number(e.target.value) as PlayerCount
                    setPlayers(n)
                    setStacks(Array(n).fill('100').join(', '))
                    setHeroSeat((previous) => (previous < 0 ? -1 : 0))
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
                  <option value={-1}>
                    {current.graded ? 'Any position' : 'Random each hand'}
                  </option>
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
                  disabled={!!current.graded}
                  onChange={(e) => setStacks(e.target.value)}
                />
              </label>
              <label>
                Ante convention
                <select
                  value={anteKind}
                  disabled={!!current.graded}
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
                {current.graded ? 'Opponent policy' : 'Opponent style'}
                <select
                  value={style}
                  disabled={!!current.graded}
                  onChange={(e) => setStyle(e.target.value as OpponentStyle)}
                >
                  {current.graded ? (
                    <option value="balanced">Imported reference charts</option>
                  ) : (
                    ['tight', 'balanced', 'loose'].map((s) => (
                      <option key={s}>{s}</option>
                    ))
                  )}
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
            <p role="status">
              Grading charts:{' '}
              {referenceState === 'ready'
                ? 'loaded'
                : referenceState === 'loading'
                  ? 'loading'
                  : 'unavailable'}
              .
            </p>
            {(referenceState === 'error' || preflopAuditError) && (
              <button
                className="btn"
                onClick={() => {
                  setEntries(null)
                  setReferenceAttempt((n) => n + 1)
                }}
              >
                Retry charts
              </button>
            )}
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
              Graded Preflop opponents follow the applicable imported chart
              frequencies and documented sizes using their own cards and public
              history. Supplied setups and reference boundaries constrain this
              practice; it does not model the frequency of situations in live
              games or a calibrated recreational player population.
            </p>
            <p>
              Unrestricted play uses hand ranks/suitedness preflop and current
              made-hand category postflop, with style thresholds and randomness.
              Where a matching preflop chart exists, raises use its documented
              size so later covered decisions can still be graded. This does not
              make opponents' action choices solver recommendations. It receives
              only its own cards, the visible board, public pot/bet and legal
              actions. It does not model equity, blockers, draws or equilibrium
              strategy.
            </p>
            <button
              className="btn"
              onClick={() =>
                download(
                  JSON.stringify({
                    ...session,
                    version: liveSessionVersion(session),
                  }),
                  'poker-live-practice.json',
                )
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
