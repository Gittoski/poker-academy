/** V1 replay contract: change formulas, semantic inputs or choice generation only with a new version; never silently regrade stored attempts. */
import { contentHash } from '@/learning/identity'
import {
  potOdds,
  bluffThreshold,
  nextCardProbability,
  byRiverProbability,
  callEV,
  bluffEV,
} from './math'
import { cards, cardText, exactEquity } from './equity'
import { best, compare, deck } from './evaluator'
import type { Topic } from './content'
export interface Question {
  version: 1
  id: string
  seed: number
  topic: Topic
  family: string
  prompt: string
  choices: string[]
  answer: number
  steps: string[]
  basis:
    | 'Exact calculation'
    | 'Exact under supplied assumptions'
    | 'Poker rules'
    | 'Evidence limits'
  assumptions: string[]
}
const prettyCard = (id: number) =>
  cardText(id).replace(
    /[cdhs]$/,
    (s) => ({ c: '♣', d: '♦', h: '♥', s: '♠' })[s]!,
  )
const describe = (score: number[]) =>
  [
    'High card',
    'Pair',
    'Two pair',
    'Three of a kind',
    'Straight',
    'Flush',
    'Full house',
    'Four of a kind',
    'Straight flush',
  ][score[0]] +
  '; comparison ranks ' +
  score
    .slice(1)
    .map((r) =>
      r === 14
        ? 'Ace'
        : r === 13
          ? 'King'
          : r === 12
            ? 'Queen'
            : r === 11
              ? 'Jack'
              : String(r),
    )
    .join(', ')
const pct = (x: number) => `${(100 * x).toFixed(1)}%`
const bb = (x: number) => {
  const value = Math.abs(x) < 1e-9 ? 0 : x
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)} BB`
}
export function question(topic: Topic, seed: number): Question {
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff)
    throw Error('Invalid question seed')
  let state = seed >>> 0
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 4294967296
  }
  const n = (a: number, b: number) => a + Math.floor(random() * (b - a + 1))
  const variant = seed % 3,
    pot = n(3, 40) * 5,
    cost = n(1, 20) * 5
  let family = '',
    prompt = '',
    steps: string[] = [],
    assumptions = [
      'Heads-up six-max cash training spot; amounts are BB. No rake.',
    ],
    basis: Question['basis'] = 'Exact calculation',
    inputs: unknown
  let answerText = '',
    choices: string[] = []
  const options = (
    value: number,
    format: (v: number) => string,
    offset: number,
  ) => {
    answerText = format(value)
    choices = [answerText]
    for (const d of [-offset, offset, offset * 2, -offset * 2, offset * 3]) {
      if (format === pct && (value + d < 0 || value + d > 1)) continue
      const text = format(value + d)
      if (!choices.includes(text)) choices.push(text)
      if (choices.length === 4) break
    }
  }
  if (topic === 'pot-odds') {
    family = variant === 0 ? 'terminal-call-price' : 'terminal-call-decision'
    inputs =
      variant === 0
        ? { family, pot, cost }
        : { family, pot, cost, equity: ((seed % 9) + 1) / 10 }
    assumptions.push(
      'River or all-in: no further betting; pot is AFTER the opponent bet.',
    )
    const required = potOdds(pot, cost)
    if (variant === 0) {
      prompt = `River: the pot is ${pot} BB AFTER the opponent’s bet. Calling costs ${cost} BB. What equity breaks even?`
      options(required, pct, 0.075)
      steps = [
        `Final pot = ${pot} + ${cost} = ${pot + cost} BB.`,
        `Required equity = ${cost}/(${pot}+${cost}) = ${pct(required)}.`,
      ]
    } else {
      const e = ((seed % 9) + 1) / 10,
        ev = callEV(pot, cost, e)
      basis = 'Exact under supplied assumptions'
      prompt = `River: pot after the bet ${pot} BB; call ${cost} BB. SUPPLIED pot-share equity ${pct(e)}. No more betting. Which action does this model favor?`
      answerText = Math.abs(ev) < 1e-9 ? 'Break-even' : ev > 0 ? 'Call' : 'Fold'
      choices = ['Call', 'Fold', 'Break-even']
      steps = [
        `Required equity = ${cost}/${pot + cost} = ${pct(required)}.`,
        `Supplied equity ${pct(e)} gives call EV ${bb(ev)} relative to folding.`,
        `This favors ${answerText.toLowerCase()} only under the stated equity model.`,
      ]
    }
  } else if (topic === 'draws') {
    const outs = n(1, 15),
      two = variant === 2,
      unseen = variant === 1 ? 46 : 47
    family = two ? 'two-card-completion' : 'one-card-completion'
    inputs = { outs, unseen, two }
    assumptions = [
      'Only your cards and the public board are known.',
      `Exactly ${outs} fixed outs complete the specified draw; no changing-out/runner-runner model.`,
      `Completion does not imply winning. This question does not estimate range equity.`,
    ]
    prompt = `${unseen === 47 ? 'Flop' : 'Turn'}: ${unseen} unseen cards and exactly ${outs} fixed draw-completion outs. What is the chance of ${two ? 'at least one hit across BOTH remaining cards' : 'a hit on the NEXT card'}?`
    const p = two
      ? byRiverProbability(outs, unseen)
      : nextCardProbability(outs, unseen)
    options(p, pct, 0.08)
    steps = two
      ? [
          `Probability of missing both = ${unseen - outs}/${unseen} × ${unseen - outs - 1}/${unseen - 1}.`,
          `At least one hit = 1 − misses = ${pct(p)}.`,
          `This is a two-card completion probability, not showdown equity.`,
        ]
      : [
          `${outs}/${unseen} = ${pct(p)}.`,
          `There is only one card in the event asked. Do not double this into a two-card or winning-equity claim.`,
        ]
  } else if (topic === 'equity') {
    const weightA = n(1, 8),
      weightB = n(1, 8),
      turn = variant === 1,
      tie = variant === 2
    const hero = cards(tie ? '2d 3d' : 'Ac Ad') as [number, number],
      board = cards(
        tie ? 'Ac Kc Qc Jc Tc' : turn ? '2c 3d 7h 9s' : '2c 3d 7h 9s Kc',
      )
    const range = tie
      ? [{ cards: cards('4h 5h') as [number, number], weight: 1 }]
      : turn
        ? [{ cards: cards('Kh Kd') as [number, number], weight: 1 }]
        : [
            { cards: cards('Kh Kd') as [number, number], weight: weightA },
            { cards: cards('Qh Qd') as [number, number], weight: weightB },
          ]
    family = tie
      ? 'board-plays-tie'
      : turn
        ? 'turn-known-hand'
        : 'river-weighted-range'
    inputs = { hero, board, range }
    basis = 'Exact under supplied assumptions'
    const result = exactEquity(hero, board, range)
    prompt = `${turn ? 'All-in turn' : 'River'} benchmark: your hand ${hero.map(prettyCard).join(' ')}, board ${board.map(prettyCard).join(' ')}. ${turn || tie ? 'Opponent hand explicitly revealed BEFORE you answer' : 'Hypothetical per-combination range'}: ${range.map((c) => `${c.cards.map(prettyCard).join(' ')} (weight ${c.weight})`).join('; ')}. What is your pot-share equity?`
    options(result.equity, pct, 0.1)
    steps = turn
      ? [
          `Enumerate all ${result.runouts} legal rivers, excluding both revealed hands and the turn board.`,
          `${result.wins} winning, ${result.ties} tying and ${result.losses} losing runouts.`,
          `Equity = (wins + half ties)/${result.runouts} = ${pct(result.equity)}.`,
        ]
      : tie
        ? [
            'Both players play the royal-flush board.',
            'Zero outright wins but half the shared pot: equity = 50.0%.',
          ]
        : [
            `AA loses against KK on the K-high board and beats QQ.`,
            `Weighted pot share = ${weightB}/(${weightA}+${weightB}) = ${pct(result.equity)}.`,
          ]
    assumptions = [
      'The stated range/hand is an explicit training input, not an actual hidden opponent hand or player read.',
      'Positive weights are per exact combination; blockers are removed before normalization.',
      'Exact enumeration for these supplied inputs; uniform legal runouts, no future betting.',
    ]
  } else if (topic === 'ev') {
    const equity = n(1, 9) / 10
    family = variant === 2 ? 'assumed-bluff-ev' : 'terminal-call-ev'
    inputs = { family, pot, cost, equity }
    basis = 'Exact under supplied assumptions'
    assumptions.push(
      'All probabilities are hypothetical supplied model inputs, not measured opponent frequencies.',
      'Terminal river/all-in model, no further betting or raises. Folding now has EV 0.',
    )
    if (variant === 2) {
      prompt = `River pure-bluff model: pot ${pot} BB, risk ${cost} BB, zero showdown equity. ASSUME the opponent folds ${pct(equity)} and otherwise calls and wins. What is bluff EV?`
      const value = bluffEV(pot, cost, equity)
      options(value, bb, 5)
      steps = [
        `EV = ${equity} × ${pot} − ${(1 - equity).toFixed(1)} × ${cost}.`,
        `EV = ${bb(value)} under that assumed fold rate.`,
        `This is not a solver result or a prediction of a real player.`,
      ]
    } else {
      prompt = `River call: pot AFTER the bet ${pot} BB, call ${cost} BB. ASSUME ${pct(equity)} pot-share equity. What is call EV relative to folding?`
      const value = callEV(pot, cost, equity)
      options(value, bb, 5)
      steps = [
        `EV = ${equity} × ${pot} − ${(1 - equity).toFixed(1)} × ${cost}.`,
        `Equivalently: ${equity} × ${pot + cost} − ${cost} = ${bb(value)}.`,
        `Earlier contributions are sunk costs. This is model EV, not a measured simulator EV loss.`,
      ]
    }
  } else if (topic === 'fold-equity') {
    family = variant === 2 ? 'evidence-limits' : 'zero-equity-break-even'
    inputs = variant === 2 ? { family } : { pot, cost }
    if (variant === 2) {
      prompt =
        'A player described as recreational folded two of three observed rivers. Can we treat 66.7% as their exact future fold probability, or apply it to every recreational player?'
      answerText = 'No: observations are limited and context-specific'
      choices = [
        answerText,
        'Yes: all recreational players share this rate',
        'Yes: three observations establish the exact rate',
      ]
      steps = [
        'Two folds out of three is a sample observation, not an exact future probability.',
        'Population claims need an identified dataset and group definition. A specific-player read needs that player’s observations and uncertainty.',
      ]
      basis = 'Evidence limits'
      assumptions = [
        'No calibrated population dataset or reliable individual fold model is supplied.',
        'This is a reasoning check about evidence, not a numerical player-strength score.',
      ]
    } else {
      prompt = `Heads-up river: a pure bluff risks ${cost} BB into ${pot} BB. Zero showdown equity; an opponent who calls always wins. What fold frequency breaks even?`
      options(bluffThreshold(pot, cost), pct, 0.08)
      steps = [
        `Break-even folds = ${cost}/(${pot}+${cost}) = ${pct(bluffThreshold(pot, cost))}.`,
        `At that rate, folds × ${pot} equals calls × ${cost}.`,
        `This threshold does not estimate how often an opponent actually folds.`,
      ]
      assumptions.push(
        'Opponent only folds or calls; no raises/future betting; zero equity when called.',
      )
    }
  } else {
    basis = 'Poker rules'
    assumptions = [
      'Compare the actual best five cards including the board. Suits do not break ties.',
    ]
    if (variant === 0) {
      family = 'rank-category'
      inputs = { family }
      prompt = 'Which category beats a flush?'
      choices = ['Straight', 'Three of a kind', 'Full house']
      answerText = 'Full house'
      steps = [
        'Reused academy refresher: full house ranks above flush; straight and three of a kind rank below it.',
      ]
    } else if (variant === 1) {
      family = 'rank-kicker'
      inputs = { family }
      prompt =
        'Both best hands are aces and kings as two pair. One has a queen kicker and one a jack. Who wins?'
      choices = ['Queen kicker', 'Split pot', 'Jack kicker']
      answerText = 'Queen kicker'
      steps = [
        'Reused academy refresher: identical pairs are compared by the fifth card. Queen beats jack.',
      ]
    } else if (seed % 6 === 2) {
      family = 'rank-board'
      inputs = { family }
      const a = best(cards('Ac Kc Qc Jc Tc 2d 3d')),
        b = best(cards('Ac Kc Qc Jc Tc 4h 5h'))
      prompt =
        'Board A♣ K♣ Q♣ J♣ T♣. Player A has 2♦ 3♦, player B 4♥ 5♥. Who wins?'
      choices = ['Player A', 'Player B', 'Split pot']
      answerText = compare(a, b) === 0 ? 'Split pot' : 'Player A'
      steps = [
        'Both play the five-card royal-flush board. Hole cards cannot improve it; split pot.',
      ]
    } else {
      family = 'rank-showdown'
      const shuffled = deck()
      for (let i = 51; i > 0; i--) {
        const j = Math.floor(random() * (i + 1))
        ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
      }
      const shown = shuffled.slice(0, 9),
        board = shown.slice(0, 5),
        a = shown.slice(5, 7),
        b = shown.slice(7, 9),
        result = compare(best([...board, ...a]), best([...board, ...b]))
      inputs = { board, a, b }
      prompt = `Showdown: board ${board.map(prettyCard).join(' ')}. Player A: ${a.map(prettyCard).join(' ')}. Player B: ${b.map(prettyCard).join(' ')}. Who wins?`
      choices = ['Player A', 'Player B', 'Split pot']
      answerText =
        result > 0 ? 'Player A' : result < 0 ? 'Player B' : 'Split pot'
      steps = [
        `Player A: ${describe(best([...board, ...a]))}. Player B: ${describe(best([...board, ...b]))}.`,
        `Categories: 0 high card, 1 pair, 2 two pair, 3 trips, 4 straight, 5 flush, 6 full house, 7 quads, 8 straight flush. Compare remaining ranks in order.`,
        `Result: ${answerText}. All showdown cards are explicitly visible before answering.`,
      ]
    }
  }
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[choices[i], choices[j]] = [choices[j], choices[i]]
  }
  return {
    version: 1,
    id: contentHash({ version: 1, topic, family, inputs }),
    seed,
    topic,
    family,
    prompt,
    choices,
    answer: choices.indexOf(answerText),
    steps,
    basis,
    assumptions,
  }
}
