export const TOPICS = [
  'pot-odds',
  'draws',
  'equity',
  'ev',
  'fold-equity',
] as const
export type CoreTopic = (typeof TOPICS)[number]
export type Topic = CoreTopic | 'hand-ranking'
export const isTopic = (s: string | null): s is Topic =>
  [...TOPICS, 'hand-ranking'].includes(s ?? '')
export interface Lesson {
  title: string
  term: string
  body: string[]
  example: string
  steps: string[]
  limits: string
}
export const LESSONS: Record<Topic, Lesson> = {
  'pot-odds': {
    title: 'Pot odds',
    term: 'Pot odds are the price of calling compared with the final pot.',
    body: [
      'Equity is your expected share of the pot at showdown, including half of a heads-up tie. Pot odds set a break-even equity threshold; they do not estimate your actual equity.',
      'Let P be the pot AFTER the opponent’s bet, and C the additional cost to call. The final pot after calling is P + C. Required equity = C / (P + C). Chips already committed are sunk costs.',
      'Start on the river or facing an all-in with no future betting. With later bets, draws may not realize their equity and this price alone cannot recommend a call.',
    ],
    example:
      'River: the pot is 60 BB after an opponent bets. Calling costs 20 BB.',
    steps: [
      'Final pot = 60 + 20 = 80 BB.',
      'Required equity = 20 / 80 = 25%.',
      'With exactly 25% pot-share equity, calling breaks even relative to folding; above it is positive EV under this model.',
    ],
    limits:
      'Heads-up, no rake, no further betting, adequate effective stack. Actual equity still needs a justified hand/range model.',
  },
  draws: {
    title: 'Outs and draw probabilities',
    term: 'An out is an unseen card that completes a specified draw. A clean winning out must also leave you winning.',
    body: [
      'With your two cards and the flop known, 47 cards are unseen. With your two cards and the turn known, 46 are unseen. Revealed opponent cards would change those counts.',
      'One card to come: probability = outs / unseen. With two cards to come and a fixed set of outs, probability of at least one hit = 1 − (unseen − outs)/unseen × (unseen − outs − 1)/(unseen − 1).',
      'Nine hearts can complete a flush draw, but some completions can still lose to a higher flush or full house. Improvement probability is NOT equity against a range. The fixed-out formula does not model redraws, runner-runner effects or future betting.',
    ],
    example: 'Flop: A♥ Q♥ on 9♥ 6♥ 2♣. Only these five cards are known.',
    steps: [
      'Four hearts are known; 13 − 4 = 9 unseen hearts.',
      'Turn is a heart: 9/47 ≈ 19.1%.',
      'At least one heart by the river: 1 − (38/47 × 37/46) ≈ 35.0%.',
      'These are draw-completion events, not a claim that the hand wins 35% of the time.',
    ],
    limits:
      'Out counts and cleanliness must be stated, not guessed from an opponent label. One-card and two-card questions have different denominators and events.',
  },
  equity: {
    title: 'Equity against hands and ranges',
    term: 'Equity is expected pot share: wins plus your share of ties.',
    body: [
      'Against an explicitly known hand, compare the best five cards and enumerate all legal runouts. In a real game, an unknown opponent’s actual cards must not enter the recommendation.',
      'A range is a set of possible hands. Here every entry is one explicit two-card combination with a weight. Remove combinations blocked by your cards or the public board, then normalize the remaining weights.',
      'Range equity is a weighted average of equity against each legal combination. A hand-class label is not one combination: suits and blockers affect how many combinations exist. Our exercises provide the hypothetical range before you answer; it is not an observed population or player range.',
    ],
    example:
      'River: A♣ A♦ on 2♣ 3♦ 7♥ 9♠ K♣. Hypothetical range: K♥ K♦ weight 1, Q♥ Q♦ weight 3.',
    steps: [
      'AA loses to the KK set and beats QQ. No future cards remain.',
      'Equity = (1 × 0 + 3 × 1)/(1 + 3) = 75%.',
      'If both hands play the same five-card board, each receives half: equity = 50%, even with zero outright wins.',
    ],
    limits:
      'Exact enumeration is exact only for the supplied cards, combinations, weights and uniform legal runouts. The range assumption can be wrong. Known-hand benchmarks explicitly reveal that hand before the question.',
  },
  ev: {
    title: 'Expected value',
    term: 'Expected value (EV) is the probability-weighted average gain or loss over repeated trials.',
    body: [
      'Use a decision point as the baseline: folding now has EV 0. Money put in earlier is already committed; do not subtract it a second time.',
      'For a terminal call, with pot P after the bet, cost C and pot-share equity e: call EV = e × P − (1 − e) × C = e × (P + C) − C.',
      'A positive result in one hand does not prove the decision was good. A calculated model EV is not a solver’s action EV or a measured loss for a simulator mistake.',
    ],
    example:
      'River: P = 60 BB, call C = 20 BB. Assume a justified 30% pot-share equity, with no future betting.',
    steps: [
      'Call EV = 0.30 × 60 − 0.70 × 20.',
      '= 18 − 14 = +4 BB relative to folding.',
      'At 25% equity, EV = 15 − 15 = 0.',
      'Calling is favored only if that equity assumption and the terminal model are appropriate.',
    ],
    limits:
      'No rake, no future betting and full equity realization. Model inputs are supplied assumptions, not inferred from actual hidden cards, the later winner or a player-type stereotype.',
  },
  'fold-equity': {
    title: 'Bluff break-even and fold equity',
    term: 'Fold frequency is the chance an opponent folds. Fold equity is the value gained from those folds.',
    body: [
      'For a heads-up pure bluff with zero showdown equity, risk B into current pot P. Assume the opponent either folds or calls and wins; no raises or further betting.',
      'Break-even fold frequency = B/(P + B). At a SUPPLIED fold probability f, bluff EV = f × P − (1 − f) × B. The formula gives a required threshold, not a prediction of the opponent’s behavior.',
      'A population tendency is about a defined group and needs an identified dataset or an assumption label. A specific-player read requires observations of that player, sample context and uncertainty. “Recreational” or “calling station” supplies no precise fold percentage.',
    ],
    example: 'Risk 50 BB to win a pot of 100 BB, with zero showdown equity.',
    steps: [
      'Break-even folds = 50/(100 + 50) = 33.3%.',
      'At a hypothetical 40% fold rate, EV = .40 × 100 − .60 × 50 = +10 BB.',
      'That arithmetic does not establish that a real opponent folds 40% or that bluffing them is profitable.',
    ],
    limits:
      'Heads-up terminal zero-equity model. Multiway pots, raises, equity when called, rake and future bets require a different model.',
  },
  'hand-ranking': {
    title: 'Hand-ranking refresher',
    term: 'Hold’em compares the best five-card hand, using zero, one or two hole cards.',
    body: [
      'Weakest to strongest: high card, pair, two pair, three of a kind, straight, flush, full house, four of a kind, straight flush.',
      'Compare category first, then the relevant ranks and kickers. Aces are low only in A-2-3-4-5 straights. Suits never break ties.',
    ],
    example:
      'Both players have aces and kings as two pair. One has a queen kicker, the other a jack.',
    steps: [
      'The pairs tie. Compare the fifth card.',
      'The queen kicker wins, assuming these are the actual best five-card hands after including the board.',
    ],
    limits:
      'Reused from the earlier academy. This is an optional refresher, not a prerequisite gate for free simulator play.',
  },
}

export const GLOSSARY: [string, string][] = [
  ['Pot', 'The chips already committed that players are competing to win.'],
  [
    'BB (big blind)',
    'One unit equal to the larger forced preflop blind. Six-max means a table with up to six seats.',
  ],
  [
    'Heads-up',
    'Two players remain in the pot. These calculations start with heads-up cases, not multiway side pots.',
  ],
  [
    'Call / fold',
    'Call pays the additional amount needed to match the current bet. Fold gives up your claim to the pot.',
  ],
  [
    'River / all-in',
    'The river is the fifth and last community card. All-in commits a player’s remaining chips; our terminal examples allow no further betting.',
  ],
  [
    'Effective stack',
    'The smaller amount the involved players can still put at risk against each other.',
  ],
  [
    'Rake',
    'A fee removed from the pot by the game operator. The initial calculation exercises assume none.',
  ],
  [
    'EV',
    'Expected value: the average gain or loss from the decision over repeated trials under the stated probabilities.',
  ],
  [
    'Realizing equity',
    'Reaching showdown and receiving your expected share; future betting or folding can prevent that.',
  ],
  [
    'Blocker / normalized weights',
    'A known card removes combinations that contain it. Divide each remaining combination weight by their total to get probabilities.',
  ],
  [
    'Card notation',
    'A = ace, K = king, Q = queen, J = jack, T = ten; ♣ clubs, ♦ diamonds, ♥ hearts, ♠ spades.',
  ],
  [
    'Kicker',
    'An unmatched card used to break ties between otherwise equal hand categories.',
  ],
]
