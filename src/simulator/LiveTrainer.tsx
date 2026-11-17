'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { loadTheme } from '@/lib/theme'
import { AppLogo } from '@/components/AppLogo'
import { chipsFromBB } from './liveAmounts'
import { LiveSheet } from './LiveSheet'
import { LiveRangeFeedback } from './LiveRangeFeedback'
import { SimulatorTable } from '@/components/SimulatorTable'
import { CardFace } from '@/components/HoleCards'
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
import { evaluateHand } from '../../scripts/lib/handEval.mjs'

const bb = (n: number) => Number((n / 100).toFixed(2))
function fresh(
  config?: LiveConfig,
  hero = 0,
  style: OpponentStyle = 'balanced',
): LiveDeal {
  const seed =
    globalThis.crypto?.getRandomValues(new Uint32Array(1))[0] ??
    Math.floor(Math.random() * 4294967296)
  return {
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
  const [mobile, setMobile] = useState(false)
  const [feedbackClosed, setFeedbackClosed] = useState(false)
  useEffect(() => {
    const media = matchMedia(
      '(max-width: 768px), (max-width: 1024px) and (max-height: 600px)',
    )
    const sync = () => setMobile(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])
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
      const next = saved ?? {
        version: 1 as const,
        current: fresh(),
        archive: [],
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
  const active = useMemo(
    () => (current ? replayLiveDeal(current) : null),
    [current],
  )
  const displayed = useMemo(
    () => (review ? replayLiveDeal(review.deal, review.index) : active),
    [review, active],
  )
  const deal = review?.deal ?? current
  const allowed = owner === 'owner' || owner === 'unsaved'
  const commit = useCallback(
    (action: LiveAction, human: boolean) => {
      if (!current || !active || !allowed || review) return
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
          setFeedbackClosed(false)
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
  }, [active, current, commit, paused, tools, review, allowed])
  const legal = displayed ? legalLiveActions(displayed) : null
  const lastRecord = current?.feedback?.at(-1)
  const feedback = useMemo(() => {
    const reference = review ? review.answer : lastRecord?.reference
    if (!reference || !deal) return null
    const index = review?.index ?? lastRecord!.index
    const chart = recoverLiveChart(reference, deal, index, entries)
    return chart ? { ...reference, chart } : reference
  }, [review, lastRecord, deal, entries])
  const awaitingRangeCheck =
    !!feedback &&
    !feedbackClosed &&
    !review &&
    paused &&
    current!.actions.length === lastRecord!.index + 1
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
        setFeedbackClosed(false)
        setReview({
          ...review,
          answer: retryLiveReference(review.reference, action),
        })
      } catch (e) {
        setError(String(e))
      }
    } else commit(action, true)
  }
  function startHand(applySettings: boolean) {
    if (!session || !allowed) return
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
      const next = fresh(config, hero, nextStyle)
      replayLiveDeal(next)
      setSession({
        ...session,
        current: next,
        archive: [...session.archive, session.current].slice(-20),
      })
      setTools(false)
      setFeedbackClosed(false)
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
  const records = [...session.archive, current]
  const decisions = records.flatMap((d) =>
    (d.feedback ?? []).map((f) => ({ ...f, deal: d })),
  )
  const completed = records.filter(
    (d) => replayLiveDeal(d).street === 'complete',
  ).length
  const callOdds =
    legal && legal.call > 0
      ? (() => {
          const cap = hero.committed + legal.call
          const eligibleFinal =
            displayed.deadMoney +
            displayed.seats.reduce(
              (sum, p, i) =>
                sum + Math.min(i === deal.hero ? cap : p.committed, cap),
              0,
            )
          return eligibleFinal ? (legal.call / eligibleFinal) * 100 : 0
        })()
      : null
  const made =
    displayed.board.length >= 3
      ? evaluateHand(
          [...hero.cards, ...displayed.board].map((c) => c.rank + c.suit),
        ).name
      : null
  const feedbackView =
    feedback && !tools && !feedbackClosed && (review || awaitingRangeCheck) ? (
      <LiveRangeFeedback
        key={`${deal.seed}-${review?.index ?? lastRecord?.index}-${review ? 'retry' : 'live'}`}
        reference={feedback}
        retry={!!review}
        onContinue={
          awaitingRangeCheck
            ? () => {
                setFeedbackClosed(true)
                setPaused(false)
              }
            : review
              ? () => setFeedbackClosed(true)
              : undefined
        }
        onTools={
          mobile
            ? () => {
                setFeedbackClosed(true)
                setTools(true)
              }
            : undefined
        }
        continueLabel={
          review
            ? 'Back to retry'
            : active.street === 'complete'
              ? 'See hand result'
              : 'Continue hand'
        }
      />
    ) : null
  return (
    <main className="page live-page">
      <header className="live-header">
        <a className="sim-back" href="/" aria-label="Leave simulator">
          ‹
        </a>
        <div className="live-title">
          <AppLogo className="app-logo--nav" />
          <div>
            <h1>Poker simulator</h1>
            <p role="status">{message}</p>
          </div>
        </div>
        <button
          className="btn"
          aria-haspopup="dialog"
          onClick={() => {
            setPaused(true)
            setTools(true)
          }}
        >
          Practice tools
        </button>
      </header>
      {error && <p role="alert">{error}</p>}
      <section className="card live-hand" aria-label="Live hand">
        <h2>
          {review
            ? 'Retry a saved decision'
            : displayed.street === 'complete'
              ? 'Hand settled'
              : `${displayed.street[0].toUpperCase()}${displayed.street.slice(1)}`}
        </h2>
        {review && (
          <p>
            Live play is paused. Future cards and opponents’ hole cards remain
            hidden. This retry does not change your live hand.
          </p>
        )}
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
        {displayed.street === 'complete' ? (
          <div aria-label="Live result">
            <p>
              Your net result:{' '}
              <strong>
                {bb(hero.stack - displayed.config.stacks[deal.hero])} BB
              </strong>
              . Payouts include returned invested chips; results do not measure
              decision quality.
            </p>
            <ul>
              {displayed.pots.map((p, i) => (
                <li key={i}>
                  {i === 0 ? 'Main pot' : `Side pot ${i}`}: {bb(p.amount)} BB to{' '}
                  {p.winners.map((w) => order[w]).join(', ')}
                </li>
              ))}
            </ul>
            {displayed.refunds.length > 0 && (
              <p>
                Uncalled refunds:{' '}
                {displayed.refunds
                  .map((r) => `${order[r.seat]} ${bb(r.amount)} BB`)
                  .join('; ')}
                .
              </p>
            )}
            {displayed.board.length === 5 &&
              displayed.seats.filter((p) => !p.folded).length > 1 && (
                <div className="live-showdown" aria-label="Showdown">
                  {displayed.seats.map(
                    (p, i) =>
                      !p.folded && (
                        <div key={i}>
                          <strong>{order[i]}</strong>
                          <div className="hole-cards">
                            {p.cards.map((c) => (
                              <CardFace key={c.rank + c.suit} card={c} small />
                            ))}
                          </div>
                        </div>
                      ),
                  )}
                </div>
              )}
            {!awaitingRangeCheck && (
              <button
                className="btn btn--primary"
                onClick={() => startHand(false)}
              >
                Deal next live hand
              </button>
            )}
          </div>
        ) : displayed.toAct === deal.hero ? (
          <div>
            <p className="live-hand-description">
              You are {order[deal.hero]}.{' '}
              {made && (
                <>Current made hand: {made}. This is not an equity estimate.</>
              )}
            </p>
            {callOdds !== null && (
              <p className="live-price">
                Calling costs {bb(legal!.call)} BB. Break-even terminal equity:{' '}
                {callOdds.toFixed(1)}% against the currently contestable pot,
                before rake or future betting.
              </p>
            )}
            <div
              className="actions live-actions"
              role="group"
              aria-label="Your live move"
            >
              {legal?.check && (
                <button
                  className="action-btn live-action-call"
                  onClick={() => submit({ kind: 'check' })}
                >
                  Check
                </button>
              )}
              {!!legal?.call && (
                <button
                  className="action-btn live-action-call"
                  onClick={() => submit({ kind: 'call' })}
                >
                  Call {bb(legal.call)} BB
                </button>
              )}
              <button
                className="action-btn live-action-fold"
                onClick={() => submit({ kind: 'fold' })}
              >
                Fold
              </button>
            </div>
            {legal?.minRaiseTo !== null && legal?.minRaiseTo !== undefined && (
              <div className="live-raise">
                <label>
                  Raise to (BB)
                  <input
                    aria-label="Raise to (BB)"
                    type="number"
                    step="0.01"
                    min={bb(legal.minRaiseTo)}
                    max={bb(legal.maxRaiseTo!)}
                    value={raise}
                    onChange={(e) => {
                      raiseEdit.current.edited = true
                      setRaise(e.target.value)
                    }}
                  />
                </label>
                <button
                  className="btn live-action-raise"
                  onClick={raiseEntered}
                >
                  Raise / bet
                </button>
                <button
                  className="btn live-action-raise"
                  onClick={() =>
                    submit({ kind: 'raise', to: legal.maxRaiseTo! })
                  }
                >
                  All-in {bb(legal.maxRaiseTo!)} BB
                </button>
                <small>
                  Minimum {bb(legal.minRaiseTo)} BB; maximum{' '}
                  {bb(legal.maxRaiseTo!)} BB. Amount is your total for this
                  street.
                </small>
              </div>
            )}
          </div>
        ) : (
          <p>
            {hero.folded
              ? 'You folded. Opponents will finish the hand.'
              : `${order[displayed.toAct!]} to act.`}
          </p>
        )}
        {!review && !awaitingRangeCheck && displayed.street !== 'complete' && (
          <button className="btn" onClick={() => setPaused((p) => !p)}>
            {paused ? 'Continue hand' : 'Pause opponents'}
          </button>
        )}
        {review && (
          <button
            className="btn btn--primary"
            onClick={() => {
              setReview(null)
              setError('')
            }}
          >
            Return to live hand
          </button>
        )}
      </section>
      {feedbackView &&
        (mobile ? (
          <LiveSheet
            title="Decision feedback"
            onClose={() => {
              setFeedbackClosed(true)
            }}
          >
            {feedbackView}
          </LiveSheet>
        ) : (
          feedbackView
        ))}
      {tools && (
        <LiveSheet title="Practice tools" onClose={() => setTools(false)}>
          <nav className="live-nav" aria-label="Practice pages">
            <a href="/ranges">Ranges</a>
            <a href="/learn">Lessons</a>
          </nav>
          <section className="card">
            <h2>Recent practice</h2>
            <p>
              Current hand plus up to 20 recent hands: {completed} completed;{' '}
              {decisions.length} decisions;{' '}
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
                          setFeedbackClosed(false)
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
                download(JSON.stringify(session), 'poker-live-practice.json')
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
