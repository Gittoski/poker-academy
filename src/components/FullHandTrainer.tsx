'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  completionSummary,
  postAnswerPresentation,
} from '@/simulator/completion'
import { useJournal } from '@/learning/Journal'
import { LearningFeedback } from '@/learning/LearningFeedback'
import type { RangeEntry } from '@/data/types'
import {
  actionLabel,
  advancePostflop,
  boardShown,
  currentNode,
  currentStreet,
  dealForScript,
  foldHandFor,
  loadHandScript,
  mapHole,
  pickHand,
  positionOf,
  randomSuitMap,
  scriptedPreflopAction,
  shortActionLabel,
  startPostflop,
  STREET_LABELS,
  type ActionKind,
  type HandIndex,
  type HandScript,
  type PostflopPlay,
  type SuitMap,
} from '@/lib/fullHands'
import {
  act,
  decisionFor,
  heroSeat,
  seatToAct,
  startHand,
  type Decision,
  type HandState,
} from '@/lib/handSim'
import { POSITION_LABELS, type Position } from '@/lib/positions'
import { resolveActions } from '@/lib/range'
import { headline } from '@/lib/scenarios'
import {
  addResult,
  EMPTY_SCORE,
  gradeIndex,
  preflopPrompt,
  type Prompt,
  type TrainerSetup,
} from '@/lib/trainer'
import { BoardCards, CardFace, HoleCards } from './HoleCards'
import { RangeGrid } from './RangeGrid'
import { StrategyGrid } from './StrategyGrid'
import { TableDiagram } from './TableDiagram'
import { ActionPrompt } from './trainer/ActionPrompt'
import { ScoreBar } from './trainer/ScoreBar'
import { useAnswerKeys } from './trainer/useAnswerKeys'
import { VerdictView, type Verdict } from './trainer/VerdictView'

interface Props {
  entries: RangeEntry[]
  setup: TrainerSetup
  index: HandIndex
}

const NPC_DELAY_MS = 1000
/** Share of hands where the player is dealt a hand the chart folds preflop instead of the script's cards. */
const FOLD_HAND_RATE = 0.3
const FLOP_KEYS: Record<ActionKind, string> = {
  X: 'x',
  B: 'b',
  R: 'r',
  AI: 'a',
  C: 'c',
  F: 'f',
}

/** loading: fetching a script · npc: opponents act · hero: waiting for the player · verdict: feedback shown */
type Phase = 'loading' | 'npc' | 'hero' | 'verdict'

/** A prompt plus what is needed to show the chart or strategy behind it afterwards. */
interface HandPrompt extends Prompt {
  street: 'preflop' | 'flop' | 'turn' | 'river'
  decision?: Decision
  grid?: Record<string, number[]>
  kinds?: ActionKind[]
}

interface HandVerdict extends Verdict {
  prompt: HandPrompt
}

/**
 * A scripted hand in progress. `play` is null until the preflop is over. In a `foldHand` the player
 * holds a chart-fold hand instead of the script's cards, so the hand ends at their first decision.
 */
interface Live {
  script: HandScript
  suitMap: SuitMap
  hand: HandState
  play: PostflopPlay | null
  foldHand: boolean
}

/** Pre-generated hands played from the first preflop decision to the end; wrong moves are corrected and the line continues. */
export function FullHandTrainer({ entries, setup, index }: Props) {
  const { journal, paused } = useJournal()
  const restored = journal.restored
  const answered = useRef(false)
  const proceeding = useRef(false)
  const [resultShown, setResultShown] = useState(
    restored?.cursor.resultShown ?? false,
  )
  const [resultReady, setResultReady] = useState(false)
  const [decisionsThisHand, setDecisionsThisHand] = useState(
    restored?.cursor.decisions ?? 0,
  )
  const [live, setLive] = useState<Live | null>(() =>
    restored && restored.script
      ? {
          script: restored.script,
          suitMap: restored.hand.suitMap!,
          hand: journal.nativeHand(),
          play: restored.cursor.play,
          foldHand: restored.hand.foldHand,
        }
      : null,
  )
  const [phase, setPhase] = useState<Phase>(restored?.cursor.phase ?? 'loading')
  const [error, setError] = useState<string | null>(null)
  const [verdict, setVerdict] = useState<HandVerdict | null>(() => {
    const v = restored?.cursor.verdict
    if (!v) return null
    const p = journal.nativePrompt(
      v.prompt,
      restored.script,
      restored.attempt?.before.play ?? null,
    )
    return {
      prompt: p as HandPrompt,
      guess: v.guess,
      result: v.legacyGrade,
      learning: v.learning,
      reference: v.prompt.reference,
    }
  })
  const [score, setScore] = useState(restored?.cursor.score ?? EMPTY_SCORE)
  /** Bumped on every deal so a load that is superseded (strict-mode double effects, setup changes) is dropped. */
  const dealId = useRef(0)

  const dealing = useRef(false)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  const newHand = useCallback(async () => {
    if (paused || dealing.current) return
    dealing.current = true
    const id = ++dealId.current
    try {
      await journal.flush()
      const review = await journal.chooseReview()
      if (!mounted.current || dealId.current !== id) return
      if (review && review.script) {
        journal.adopt(review)
        setLive({
          script: review.script,
          suitMap: review.hand.suitMap!,
          hand: journal.nativeHand(),
          play: null,
          foldHand: review.hand.foldHand,
        })
        setVerdict(null)
        setResultShown(false)
        setDecisionsThisHand(0)
        setPhase('npc')
        return
      }
      const entry = pickHand(index, setup.seat)
      setVerdict(null)
      setResultShown(false)
      setLive(null)
      if (!entry) {
        setError(
          setup.seat
            ? `No generated hands with you in the ${POSITION_LABELS[setup.seat]} yet.`
            : 'No generated hands yet. Run scripts/generate-hands.mjs.',
        )
        setPhase('npc')
        return
      }
      setError(null)
      setPhase('loading')
      const script = await loadHandScript(entry.id)
      if (!mounted.current || dealId.current !== id) return
      const suitMap = randomSuitMap()
      const foldCards =
        Math.random() < FOLD_HAND_RATE
          ? foldHandFor(script, suitMap, setup, entries)
          : null
      const dealt = dealForScript(
        script,
        suitMap,
        setup,
        entries,
        Math.random,
        foldCards ?? undefined,
      )
      const hand = startHand(setup, Math.random, script.hero, dealt)
      journal.begin(hand, script, suitMap, foldCards !== null)
      setDecisionsThisHand(0)
      setLive({
        script,
        suitMap,
        hand,
        play: null,
        foldHand: foldCards !== null,
      })
      setPhase('npc')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e) {
      if (mounted.current) {
        setError(
          `Could not load the hand. ${e instanceof Error ? e.message : 'Try again.'}`,
        )
        setPhase('npc')
      }
    } finally {
      dealing.current = false
    }
  }, [index, setup, entries, journal, paused])

  useEffect(() => {
    if (!journal.active) void newHand().catch((e) => journal.failed(e))
  }, [newHand, journal])

  const handOverMessage = live
    ? completionSummary(live.script, live.hand, live.play)
    : null
  const handOver = handOverMessage !== null
  const foldedPreflop = live?.hand.ended?.kind === 'hero-folded'
  useEffect(() => {
    if (handOver && phase === 'npc' && !verdict) setResultShown(true)
  }, [handOver, phase, verdict])
  useEffect(() => {
    setResultReady(false)
    if (!resultShown) return
    const timer = setTimeout(() => setResultReady(true), 350)
    return () => clearTimeout(timer)
  }, [resultShown])
  useEffect(() => {
    proceeding.current = false
  }, [phase, live, resultShown])

  useEffect(() => {
    if (paused || !live || phase === 'loading') return
    journal.persist(
      {
        hand: live.hand,
        play: live.play,
        phase,
        score,
        decisions: decisionsThisHand,
        resultShown,
      },
      !!handOver && decisionsThisHand > 0,
    )
  }, [
    journal,
    paused,
    live,
    phase,
    score,
    decisionsThisHand,
    handOver,
    resultShown,
  ])
  useEffect(() => {
    if (phase === 'hero') answered.current = false
  }, [phase, live])

  // Drive the scripted line: opponents act after a pause, the player is prompted at their nodes.
  useEffect(() => {
    if (paused || phase !== 'npc' || !live || handOver) return
    const { script, hand, play } = live
    if (play) {
      const node = currentNode(script, play)
      if (!node) return
      if (node.p === script.heroPlayer) {
        setPhase('hero')
        return
      }
      const timer = setTimeout(
        () =>
          setLive((prev) =>
            prev?.play
              ? { ...prev, play: advancePostflop(prev.script, prev.play) }
              : prev,
          ),
        NPC_DELAY_MS,
      )
      return () => clearTimeout(timer)
    }
    if (hand.ended) {
      setLive((prev) => (prev ? { ...prev, play: startPostflop() } : prev))
      return
    }
    const seat = seatToAct(hand)
    if (!seat) return
    if (seat.position === hand.hero && decisionFor(hand, setup, entries)) {
      setPhase('hero')
      return
    }
    const timer = setTimeout(() => {
      setLive((prev) => {
        if (!prev || prev.play) return prev
        return {
          ...prev,
          hand: act(
            prev.hand,
            setup,
            scriptedPreflopAction(prev.hand, prev.script),
            decisionFor(prev.hand, setup, entries),
          ),
        }
      })
    }, NPC_DELAY_MS)
    return () => clearTimeout(timer)
  }, [phase, live, handOver, setup, entries, paused])

  const prompt = useMemo<HandPrompt | null>(() => {
    if (phase !== 'hero' || !live) return null
    const { script, hand, play } = live
    if (play) {
      const node = currentNode(script, play)
      if (!node?.probs) return null
      const street = currentStreet(script, play)!.street
      return {
        street,
        options: node.actions.map((a) => ({
          label: actionLabel(a, play.bets, node.p),
          key: FLOP_KEYS[a.a],
          kind: a.a,
        })),
        probs: node.probs,
        expected: node.chosen,
        title: `${POSITION_LABELS[script.hero]} vs ${POSITION_LABELS[script.villain]} · ${STREET_LABELS[street]}`,
        grid: node.grid,
        kinds: node.actions.map((a) => a.a),
      }
    }
    const decision = decisionFor(hand, setup, entries)
    if (!decision) return null
    const expected = live.foldHand
      ? undefined
      : scriptedPreflopAction(hand, script)
    return {
      ...preflopPrompt(decision, setup, expected),
      street: 'preflop',
      decision,
    }
  }, [phase, live, setup, entries])

  const answer = useCallback(
    (index: number) => {
      if (paused || answered.current || !prompt || !live) return
      answered.current = true
      const result = gradeIndex(prompt.probs, index)
      const next = live.play
        ? { ...live, play: advancePostflop(live.script, live.play) }
        : {
            ...live,
            hand: act(
              live.hand,
              setup,
              prompt.decision!.actions[prompt.expected],
              prompt.decision!,
            ),
          }
      const nextScore = addResult(score, result)
      journal.answer(
        {
          hand: live.hand,
          play: live.play,
          phase: 'hero',
          score,
          decisions: decisionsThisHand,
        },
        prompt,
        index,
        {
          hand: next.hand,
          play: next.play,
          phase: 'verdict',
          score: nextScore,
          decisions: decisionsThisHand + 1,
        },
      )
      setVerdict({
        prompt,
        guess: index,
        result,
        learning: journal.feedback?.learning,
        reference: journal.feedback?.prompt.reference,
      })
      setScore(nextScore)
      setDecisionsThisHand((n) => n + 1)
      setLive(next)
      setPhase('verdict')
    },
    [prompt, setup, live, score, decisionsThisHand, journal, paused],
  )

  const proceed = useCallback(() => {
    if (paused || proceeding.current) return
    if (handOver && resultShown && !resultReady) return
    proceeding.current = true
    if (handOver) {
      if (!resultShown) {
        setResultShown(true)
        return
      }
      void newHand().catch((e) => journal.failed(e))
    } else {
      setVerdict(null)
      setPhase('npc')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [paused, handOver, resultShown, resultReady, newHand, journal])

  useAnswerKeys({
    prompt: paused ? null : prompt,
    onAnswer: answer,
    canProceed:
      !paused &&
      ((!resultShown && phase === 'verdict') ||
        (handOver && resultShown && resultReady)),
    onProceed: proceed,
  })

  const presentationPlay = useMemo(() => {
    if (!live?.play) return null
    const before =
      verdict && !resultShown ? journal.feedback?.before.play : null
    return before ? postAnswerPresentation(live.script, before) : live.play
  }, [live, verdict, resultShown, journal])
  const hero = live ? heroSeat(live.hand) : null
  const actingPosition = useMemo<Position | null>(() => {
    if (!live || phase === 'verdict' || resultShown) return null
    if (!live.play) return seatToAct(live.hand)?.position ?? null
    const node = currentNode(live.script, live.play)
    return node ? positionOf(live.script, node.p) : null
  }, [live, phase, resultShown])

  const folded = useMemo(
    () =>
      new Set(
        live?.hand.seats.filter((s) => s.folded).map((s) => s.position) ?? [],
      ),
    [live],
  )

  const bets = useMemo(() => {
    const out: Partial<Record<Position, number>> = {}
    if (!live) return out
    if (live.play) {
      for (const p of ['ip', 'oop'] as const)
        if (presentationPlay!.bets[p] > 0)
          out[positionOf(live.script, p)] = presentationPlay!.bets[p]
    } else {
      for (const s of live.hand.seats)
        if (s.committed > 0) out[s.position] = s.committed
    }
    return out
  }, [live, presentationPlay])

  // Seat captions: preflop actions from the simulation, then each player's latest action on the current street.
  const labels = useMemo(() => {
    const out: Partial<Record<Position, string>> = {}
    if (!live) return out
    for (const s of live.hand.seats)
      if (s.lastAction) out[s.position] = s.lastAction
    if (live.play) {
      const street = currentStreet(live.script, presentationPlay!)!
      const played = presentationPlay!.done
        ? street.nodes
        : street.nodes.slice(0, presentationPlay!.nodeIndex)
      for (const p of ['ip', 'oop'] as const) {
        const last = played.filter((n) => n.p === p).pop()
        const position = positionOf(live.script, p)
        if (last) out[position] = shortActionLabel(last.actions[last.chosen])
        else delete out[position]
      }
    }
    return out
  }, [live, presentationPlay])

  const shown = resultShown ? null : (prompt ?? verdict?.prompt ?? null)
  const chartWeights = useMemo(
    () =>
      verdict?.prompt.decision
        ? resolveActions(verdict.prompt.decision.entry.range)
        : null,
    [verdict],
  )

  let title = 'Dealing…'
  let subtitle = ''
  if (error) {
    title = 'No hand'
    subtitle = error
  } else if (shown && live) {
    title = shown.title
    subtitle =
      phase === 'hero'
        ? 'Your move'
        : shown.decision
          ? headline(
              shown.decision.scenario,
              setup,
              live.hand.hero,
              shown.decision.villain,
            ).subtitle
          : ''
  } else if (handOverMessage && resultShown) {
    title = 'Hand complete'
    subtitle = handOverMessage
  } else if (live) {
    const { script, play } = live
    title = play
      ? `${POSITION_LABELS[script.hero]} vs ${POSITION_LABELS[script.villain]} · ${STREET_LABELS[currentStreet(script, play)!.street]}`
      : `You are ${POSITION_LABELS[script.hero]}`
    subtitle = actingPosition
      ? `${POSITION_LABELS[actingPosition]} to act…`
      : ''
  }

  return (
    <>
      <ScoreBar score={score} unit="decisions" />
      <p className="learning-score-note">
        Frequency drill · most-frequent action agreement
      </p>

      <section className="card">
        <div className="range-card__head">
          <div className="range-card__title">
            <h2>{title}</h2>
            <span>{subtitle}</span>
          </div>
          {live && (
            <span className="pill">
              {POSITION_LABELS[live.script.hero]} ·{' '}
              {live.script.kind === 'srp' ? 'Single-raised' : '3-bet pot'}
            </span>
          )}
        </div>

        {live && hero && (
          <>
            <TableDiagram
              players={setup.players}
              hero={live.script.hero}
              villain={live.script.villain}
              bets={bets}
              acting={handOver ? undefined : (actingPosition ?? undefined)}
              folded={folded}
              labels={labels}
              pot={
                live.play
                  ? resultShown
                    ? live.script.result.pot
                    : currentStreet(live.script, presentationPlay!)!.pot
                  : undefined
              }
            />
            {live.play && (
              <BoardCards
                cards={boardShown(live.script, presentationPlay, live.suitMap)}
              />
            )}
            {resultShown &&
              handOver &&
              !foldedPreflop &&
              live.script.result.kind === 'showdown' && (
                <div className="showdown">
                  <span className="showdown__label">Villain</span>
                  <div className="hole-cards hole-cards--small">
                    {mapHole(live.script.villainCards, live.suitMap).map(
                      (c) => (
                        <CardFace key={c.rank + c.suit} card={c} small />
                      ),
                    )}
                  </div>
                </div>
              )}
            <HoleCards cards={hero.cards} />
          </>
        )}

        {resultShown && handOverMessage ? (
          <section className="hand-result" aria-label="Hand result">
            <h3>Hand complete</h3>
            <p>{handOverMessage}</p>
            {journal.feedback &&
              journal.feedback.chosen !== journal.feedback.executed && (
                <p>
                  Your selection:{' '}
                  {
                    journal.feedback.prompt.options[journal.feedback.chosen]
                      .label
                  }
                  . Scripted action:{' '}
                  {
                    journal.feedback.prompt.options[journal.feedback.executed]
                      .label
                  }
                  . This result follows the scripted action.
                </p>
              )}
            <button
              type="button"
              className="btn btn--primary verdict__next"
              disabled={!resultReady}
              onClick={proceed}
            >
              Next hand
            </button>
          </section>
        ) : prompt ? (
          <ActionPrompt prompt={prompt} onAnswer={answer} />
        ) : verdict ? (
          <VerdictView
            verdict={verdict}
            source={verdict.prompt.street === 'preflop' ? 'chart' : 'solver'}
            continues
            handOver={
              handOver
                ? 'Betting is complete. View the hand result before dealing again.'
                : null
            }
            proceedLabel={handOver ? 'View hand result' : undefined}
            onProceed={proceed}
          >
            <LearningFeedback journal={journal} />
          </VerdictView>
        ) : handOverMessage ? (
          <div className="actions actions--waiting" role="status">
            Preparing hand result…
          </div>
        ) : error ? (
          <div className="empty">{error}</div>
        ) : (
          <div className="actions actions--waiting" aria-live="polite">
            {phase === 'loading'
              ? 'Dealing…'
              : actingPosition
                ? `${POSITION_LABELS[actingPosition]} is thinking…`
                : ''}
          </div>
        )}
      </section>

      {verdict && hero && chartWeights && (
        <section className="card">
          <div className="range-card__head">
            <div className="range-card__title">
              <h2>Chart</h2>
              <span>{verdict.prompt.title}</span>
            </div>
          </div>
          <RangeGrid weights={chartWeights} highlight={hero.hand.label} />
        </section>
      )}

      {verdict &&
        hero &&
        verdict.prompt.grid &&
        verdict.prompt.kinds &&
        verdict.prompt.street !== 'preflop' && (
          <section className="card">
            <div className="range-card__head">
              <div className="range-card__title">
                <h2>{STREET_LABELS[verdict.prompt.street]} strategy</h2>
                <span>{verdict.prompt.title}</span>
              </div>
            </div>
            <StrategyGrid
              kinds={verdict.prompt.kinds}
              labels={verdict.prompt.options.map((o) => o.label)}
              cells={verdict.prompt.grid}
              highlight={hero.hand.label}
            />
            <div className="notes">
              <p>
                Solver output for your whole range in this spot, averaged over
                suit combinations per hand. Your exact combo can differ.
              </p>
            </div>
          </section>
        )}
    </>
  )
}
