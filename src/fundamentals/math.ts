function amount(n: number) {
  if (!Number.isFinite(n) || n < 0)
    throw new Error("Expected a finite nonnegative amount");
}
/** Pot includes the opponent bet, excludes our call. No future betting or rake. */
export function potOdds(pot: number, call: number) {
  amount(pot);
  amount(call);
  if (pot + call === 0) throw new Error("Empty pot");
  return call / (pot + call);
}
/** Pure bluff with zero showdown equity; opponent either folds or wins. */
export function bluffThreshold(pot: number, bet: number) {
  amount(pot);
  amount(bet);
  if (pot + bet === 0) throw new Error("Empty pot");
  return bet / (pot + bet);
}

/** Equity is expected pot share, including split pots. Terminal call, no future betting or rake. */
export function callEV(potAfterBet:number,cost:number,equity:number){
 amount(potAfterBet);amount(cost);probability(equity)
 return equity*potAfterBet-(1-equity)*cost
}
export function probability(p:number){if(!Number.isFinite(p)||p<0||p>1)throw Error('Expected a probability from 0 to 1')}
export function bluffEV(pot:number,bet:number,folds:number){amount(pot);amount(bet);probability(folds);return folds*pot-(1-folds)*bet}
export function nextCardProbability(outs:number,unseen=47){
 if(!Number.isInteger(outs)||!Number.isInteger(unseen)||outs<0||unseen<1||outs>unseen)throw Error('Invalid unseen-card model')
 return outs/unseen
}
export function byRiverProbability(outs:number,unseen=47){
 nextCardProbability(outs,unseen);if(unseen<2)throw Error('Two unseen cards required')
 return 1-(unseen-outs)/unseen*(unseen-outs-1)/(unseen-1)
}
