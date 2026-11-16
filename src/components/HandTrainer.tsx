'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useJournal } from '@/learning/Journal'
import { LearningFeedback } from '@/learning/LearningFeedback'
import type { RangeEntry } from '@/data/types'
import {
  act,
  decisionFor,
  heroSeat,
  sampleAction,
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
  type TrainerSetup,
} from '@/lib/trainer'
import { RangeGrid } from './RangeGrid'
import { SimulatorTable } from './SimulatorTable'
import { ActionPrompt } from './trainer/ActionPrompt'
import {
  TrainerSurface,
  PlayOptions,
  MobileCharts,
  usePlayUI,
} from './trainer/PlayFrame'
import { ScoreBar } from './trainer/ScoreBar'
import { useAnswerKeys } from './trainer/useAnswerKeys'
import { VerdictView, type Verdict } from './trainer/VerdictView'

interface Props {
  entries: RangeEntry[]
  setup: TrainerSetup
}

const NPC_DELAY_MS = 1000
const AUTO_NEXT_MS = 1200
const COLD_3BET_NOTE =
  'The charts only cover the previous raiser facing a re-raise, so a cold 3-bet is an automatic fold.'

/** npc: opponents are acting · hero: waiting for the player · verdict: showing feedback on the player's move */
type Phase = 'npc' | 'hero' | 'verdict'

interface PreflopVerdict extends Verdict {
  decision: Decision
}

/** Preflop only: opponents play their cards from the charts and every decision of the player is graded. */
export function HandTrainer({ entries, setup }: Props) {
  const { journal, paused } = useJournal()
  const playUI = usePlayUI()
  const restored = journal.restored
  const answered = useRef(false)
  const dealing = useRef(false)
  const [hand, setHand] = useState<HandState>(() =>
    restored ? journal.nativeHand() : startHand(setup, Math.random, setup.seat),
  )
  const [forcedFold, setForcedFold] = useState(
    restored?.cursor.forcedFold ?? false,
  )
  const [phase, setPhase] = useState<Phase>(restored?.cursor.phase ?? 'npc')
  const [verdict, setVerdict] = useState<PreflopVerdict | null>(() => {
    const v = restored?.cursor.verdict
    if (!v) return null
    const p = journal.nativePrompt(v.prompt, null, null)
    return {
      prompt: p,
      guess: v.guess,
      result: v.legacyGrade,
      learning: v.learning,
      reference: v.prompt.reference,
      decision: p.decision!,
    }
  })
  const [decisionsThisHand, setDecisionsThisHand] = useState(
    restored?.cursor.decisions ?? 0,
  )
  const [inspected, setInspected] = useState<Position | null>(null)
  const [score, setScore] = useState(restored?.cursor.score ?? EMPTY_SCORE)

  const decision = useMemo(
    () => (phase === 'hero' ? decisionFor(hand, setup, entries) : null),
    [phase, hand, setup, entries],
  )
  const prompt = useMemo(
    () => (decision ? preflopPrompt(decision, setup) : null),
    [decision, setup],
  )

  const newHand = useCallback(async () => {
    if (dealing.current || paused) return
    dealing.current = true
    try {
      const review = await journal.chooseReview()
      if (review) {
        journal.adopt(review)
        setHand(journal.nativeHand())
        setForcedFold(review.cursor.forcedFold)
        setPhase(review.cursor.phase)
        setVerdict(null)
        setDecisionsThisHand(0)
        setInspected(null)
        return
      }
      const next = startHand(setup, Math.random, setup.seat)
      journal.begin(next)
      setHand(next)
      setForcedFold(false)
      setPhase('npc')
      setVerdict(null)
      setDecisionsThisHand(0)
      setInspected(null)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e) {
      journal.failed(e)
    } finally {
      dealing.current = false
    }
  }, [setup, journal, paused])

  useEffect(() => {
    if (paused) return
    if (!journal.active) journal.begin(hand)
    journal.persist(
      { hand, phase, score, decisions: decisionsThisHand, forcedFold },
      !!hand.ended && decisionsThisHand > 0,
    )
  }, [journal, paused, hand, phase, score, decisionsThisHand, forcedFold])
  useEffect(() => {
    if (phase === 'hero') answered.current = false
  }, [phase, hand])

  // Drive opponents, hand the turn to the player, and deal again after hands with no decision
  // unless the player is looking at an opponent's range.
  useEffect(() => {
    if (paused || phase !== 'npc') return
    if (hand.ended) {
      if (decisionsThisHand > 0 || inspected) return
      const timer = setTimeout(newHand, AUTO_NEXT_MS)
      return () => clearTimeout(timer)
    }
    const seat = seatToAct(hand)
    if (!seat) return
    const current = decisionFor(hand, setup, entries)
    if (seat.position === hand.hero && current) {
      setPhase('hero')
      return
    }
    if (seat.position === hand.hero) setForcedFold(true)
    const timer = setTimeout(() => {
      const action = current ? sampleAction(current, journal.random) : 'fold'
      setHand(act(hand, setup, action, current))
    }, NPC_DELAY_MS)
    return () => clearTimeout(timer)
  }, [
    phase,
    hand,
    setup,
    entries,
    decisionsThisHand,
    inspected,
    newHand,
    paused,
    journal,
  ])

  const answer = useCallback(
    (index: number) => {
      if (paused || answered.current || !decision || !prompt) return
      answered.current = true
      const result = gradeIndex(prompt.probs, index)
      const next = act(hand, setup, decision.actions[index], decision)
      const nextScore = addResult(score, result)
      journal.answer(
        {
          hand,
          phase: 'hero',
          score,
          decisions: decisionsThisHand,
          forcedFold,
        },
        { ...prompt, decision },
        index,
        {
          hand: next,
          phase: 'verdict',
          score: nextScore,
          decisions: decisionsThisHand + 1,
          forcedFold,
        },
      )
      setVerdict({
        prompt,
        guess: index,
        result,
        learning: journal.feedback?.learning,
        reference: journal.feedback?.prompt.reference,
        decision,
      })
      setScore(nextScore)
      setDecisionsThisHand((n) => n + 1)
      setHand(next)
      setPhase('verdict')
    },
    [
      decision,
      prompt,
      setup,
      hand,
      score,
      decisionsThisHand,
      forcedFold,
      journal,
      paused,
    ],
  )

  const proceed = useCallback(() => {
    if (paused) return
    if (hand.ended) void newHand()
    else {
      setVerdict(null)
      setPhase('npc')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [hand.ended, newHand, paused])

  useAnswerKeys({
    prompt: paused ? null : prompt,
    onAnswer: answer,
    canProceed:
      !paused && (phase === 'verdict' || (phase === 'npc' && !!hand.ended)),
    onProceed: proceed,
  })

  const hero = heroSeat(hand)
  const acting = seatToAct(hand)
  const folded = useMemo(
    () => new Set(hand.seats.filter((s) => s.folded).map((s) => s.position)),
    [hand],
  )
  const bets = useMemo(
    () =>
      Object.fromEntries(
        hand.seats
          .filter((s) => s.committed > 0)
          .map((s) => [s.position, s.committed]),
      ) as Partial<Record<Position, number>>,
    [hand],
  )
  const labels = useMemo(() => {
    const out: Partial<Record<Position, string>> = {}
    const reveal =
      hand.ended && !['hero-folded', 'walk'].includes(hand.ended.kind)
    for (const s of hand.seats) {
      if (reveal && !s.folded && s.position !== hand.hero)
        out[s.position] = [s.lastAction, s.hand.label]
          .filter(Boolean)
          .join(' · ')
      else if (s.lastAction) out[s.position] = s.lastAction
    }
    return out
  }, [hand])

  const inspectable = useMemo(
    () =>
      new Set(
        hand.seats
          .filter((s) => s.lastDecision && s.position !== hand.hero)
          .map((s) => s.position),
      ),
    [hand],
  )
  const inspectedSeat = inspected
    ? hand.seats.find((s) => s.position === inspected && s.lastDecision)
    : undefined
  const inspectedWeights = useMemo(
    () =>
      inspectedSeat?.lastDecision
        ? resolveActions(inspectedSeat.lastDecision.entry.range)
        : null,
    [inspectedSeat?.lastDecision],
  )
  const toggleInspected = useCallback(
    (position: Position) =>
      setInspected((prev) => (prev === position ? null : position)),
    [],
  )

  const shown = prompt ?? verdict?.prompt ?? null
  const shownDecision = decision ?? verdict?.decision ?? null
  const handOver = hand.ended
    ? `${hand.ended.message}${forcedFold ? ` ${COLD_3BET_NOTE}` : ''}`
    : null
  const chartWeights = useMemo(
    () =>
      verdict && shownDecision
        ? resolveActions(shownDecision.entry.range)
        : null,
    [verdict, shownDecision],
  )

  let title: string
  let subtitle: string
  if (shown) {
    title = shown.title
    subtitle =
      phase === 'hero'
        ? 'Your move'
        : shownDecision
          ? headline(
              shownDecision.scenario,
              setup,
              hand.hero,
              shownDecision.villain,
            ).subtitle
          : ''
  } else if (handOver) {
    title = hand.ended?.kind === 'flop' ? 'Preflop round complete' : 'Hand over'
    subtitle = handOver
  } else {
    title = `You are ${POSITION_LABELS[hand.hero]}`
    subtitle = acting ? `${POSITION_LABELS[acting.position]} to act…` : ''
  }

  return (
    <TrainerSurface>
      <PlayOptions>
        <ScoreBar score={score} unit="answered" />
        <p className="learning-score-note">
          Frequency drill · most-frequent action agreement
        </p>
      </PlayOptions>
      <section className="card trainer-table">
        <div className="range-card__head">
          <div className="range-card__title">
            <h2>{title}</h2>
            <span>{subtitle}</span>
          </div>
          <span className="pill">
            {POSITION_LABELS[hand.hero]} · {setup.players}-max
          </span>
        </div>

        <SimulatorTable
          cards={hero.cards}
          stacks={Object.fromEntries(
            hand.seats.map((s) => [s.position, setup.stack - s.committed]),
          )}
          pot={hand.seats.reduce((sum, s) => sum + s.committed, 0)}
          players={setup.players}
          hero={hand.hero}
          villain={shownDecision?.villain}
          bets={bets}
          acting={acting?.position}
          folded={folded}
          labels={labels}
          clickable={inspectable}
          selected={inspectedSeat?.position}
          onSeatClick={(position) => {
            toggleInspected(position)
            playUI?.openSettings()
          }}
        />

        {hand.ended?.kind === 'flop' && (
          <p className="training-scope-note">
            Preflop practice ends here. Choose Full hands above to play through
            the flop, turn and river.
          </p>
        )}
        {prompt ? (
          <ActionPrompt prompt={prompt} onAnswer={answer} />
        ) : verdict ? (
          <VerdictView
            verdict={verdict}
            source="chart"
            continues={false}
            handOver={handOver}
            onProceed={proceed}
          >
            <LearningFeedback journal={journal} />
          </VerdictView>
        ) : handOver ? (
          <div className="verdict" aria-live="polite">
            <strong>{handOver}</strong>
            {decisionsThisHand > 0 || inspected ? (
              <button
                type="button"
                className="btn btn--primary verdict__next"
                onClick={newHand}
                autoFocus
              >
                Next hand
              </button>
            ) : (
              <span className="verdict__muted">Dealing the next hand…</span>
            )}
          </div>
        ) : (
          <div className="actions actions--waiting" aria-live="polite">
            {acting?.position === hand.hero
              ? 'No chart for this spot, you fold…'
              : acting
                ? `${POSITION_LABELS[acting.position]} is thinking…`
                : ''}
          </div>
        )}
      </section>

      <PlayOptions>
        {inspectedSeat?.lastDecision && inspectedWeights && (
          <section className="card">
            <div className="range-card__head">
              <div className="range-card__title">
                <h2>{POSITION_LABELS[inspectedSeat.position]} range</h2>
                <span>
                  {
                    headline(
                      inspectedSeat.lastDecision.scenario,
                      setup,
                      inspectedSeat.position,
                      inspectedSeat.lastDecision.villain,
                    ).title
                  }
                  {inspectedSeat.lastAction
                    ? ` · played ${inspectedSeat.lastAction}`
                    : ''}
                </span>
              </div>
              <button
                type="button"
                className="btn"
                onClick={() => setInspected(null)}
              >
                Close
              </button>
            </div>
            <RangeGrid
              weights={inspectedWeights}
              highlight={
                hand.ended &&
                !['hero-folded', 'walk'].includes(hand.ended.kind) &&
                !inspectedSeat.folded
                  ? inspectedSeat.hand.label
                  : undefined
              }
            />
          </section>
        )}
      </PlayOptions>
      <MobileCharts>
        {verdict && chartWeights && (
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
      </MobileCharts>
    </TrainerSurface>
  )
}
