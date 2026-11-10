function amount(n: number) { if (!Number.isFinite(n) || n < 0) throw new Error('Expected a finite nonnegative amount'); }
/** Pot includes the opponent bet, excludes our call. No future betting or rake. */
export function potOdds(pot: number, call: number) { amount(pot); amount(call); if (pot + call === 0) throw new Error('Empty pot'); return call / (pot + call); }
/** Pure bluff with zero showdown equity; opponent either folds or wins. */
export function bluffThreshold(pot: number, bet: number) { amount(pot); amount(bet); if (pot + bet === 0) throw new Error('Empty pot'); return bet / (pot + bet); }
export type Drill = { id: string; topic: string; question: string; choices: string[]; answer: number; explanation: string };
export const drills: Drill[] = [
 {id:'odds-1',topic:'Pot odds',question:'The pot is 60 after your opponent bets. Calling costs 20. What equity breaks even?',choices:['25%','33.3%','50%'],answer:0,explanation:`Verified calculation: 20 / (60 + 20) = ${potOdds(60,20)*100}%. Assumes no rake, no future bets, and full equity realization. This is not a recommendation to call with every draw.`},
 {id:'bluff-1',topic:'Bluff mathematics',question:'You bluff 50 into 100 with zero showdown equity. How often must your opponent fold to break even?',choices:['25%','33.3%','50%'],answer:1,explanation:'Verified calculation: 50 / (100 + 50) = 33.33…%. EV = fold frequency × 100 − call frequency × 50. Assumes the hand ends here and no rake.'},
 {id:'rank-1',topic:'Hand rankings',question:'At showdown, which category beats a flush?',choices:['Straight','Three of a kind','Full house'],answer:2,explanation:'Standard Hold’em ranking: a full house beats a flush; a flush beats a straight and three of a kind. Suits never break ties.'},
 {id:'rank-2',topic:'Hand rankings',question:'Both players have two pair: aces and kings. One has a queen kicker; the other a jack. Who wins?',choices:['Queen kicker','Split pot','Jack kicker'],answer:0,explanation:'Compare the best five cards: with identical pairs, the higher fifth card wins. This assumes those are the actual best five-card hands, including the board.'},
];
