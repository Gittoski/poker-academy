import { Drill } from "./math";
export function nextCardProbability(outs: number, unseen: number = 47) {
  if (
    !Number.isInteger(outs) ||
    !Number.isInteger(unseen) ||
    outs < 0 ||
    unseen <= 0 ||
    outs > unseen
  )
    throw new Error("Invalid unseen-card model");
  return outs / unseen;
}
export function byRiverProbability(outs: number, unseen: number = 47) {
  if (unseen < 2) throw new Error("Two cards required");
  nextCardProbability(outs, unseen);
  return 1 - ((unseen - outs) / unseen) * ((unseen - outs - 1) / (unseen - 1));
}
export const postflop: Drill[] = [
  {
    id: "pf-price",
    topic: "Postflop pricing",
    question:
      "River · BTN vs BB · 60 BB effective before the bet. Pot 40 BB, villain bets 20 BB. You hold a bluff-catcher. What is the break-even equity for calling?",
    choices: ["25%", "33.3%", "50%"],
    answer: 0,
    explanation:
      "Verified calculation: pot after bet is 60; call 20 / final pot 80 = 25%. This only sets a price; it does not estimate equity against the betting range.",
  },
  {
    id: "pf-flush",
    topic: "Draws",
    question:
      "Flop · heads-up · 100 BB. You hold A♥ Q♥ on 9♥ 6♥ 2♣. With only these five cards known, what is the chance the TURN is a heart?",
    choices: ["About 19.1%", "About 35%", "Exactly 25%"],
    answer: 0,
    explanation:
      "Verified next-card probability: 9 hearts / 47 unseen cards = 19.15%. By-river chance is different. A heart arriving is not identical to winning.",
  },
  {
    id: "pf-draw-price",
    topic: "Draws",
    question:
      "Turn · heads-up. You have exactly 9 clean winning outs among 46 unseen cards, lose otherwise, no ties. Opponent shoves 40 BB into 40 BB; you cover. Call or fold on these assumptions?",
    choices: ["Call", "Fold"],
    answer: 1,
    explanation:
      "Verified calculation under the supplied clean-out model: equity 9/46 = 19.57%; required equity 40/(40+40+40) = 33.33%. Calling EV = (9/46)×80 − (37/46)×40 ≈ −16.52 BB. These outs are assumed, not inferred from an opponent range.",
  },
  {
    id: "pf-value",
    topic: "Value betting",
    question:
      "River · 100 BB effective · BTN holds A♣ K♦ on A♥ 9♠ 6♣ 2♦ 3♠. BB checks, pot 20 BB. Repeated showdowns indicate BB calls half-pot bets with weaker aces and pairs, rarely check-raises. Which plan follows this specific read?",
    choices: [
      "Bet 10 BB for value",
      "Always shove 100 BB",
      "Never bet one pair",
    ],
    answer: 0,
    explanation:
      "Educational heuristic: a half-pot value bet targets the supplied weaker calling range. The read does not establish that a shove is called by worse, nor prove this sizing optimal. Reconsider if big bets induce only stronger calls.",
  },
  {
    id: "pf-texture",
    topic: "Board texture",
    question:
      "Flop · six-max pot, three players remain · 100 BB. You hold A♣ K♦. Which board most clearly creates immediate straight and flush possibilities for opponents?",
    choices: ["K♣ 7♦ 2♠", "9♥ 8♥ 7♣", "A♦ 6♣ 2♠"],
    answer: 1,
    explanation:
      "Board structure: 9♥ 8♥ 7♣ has connected ranks and two hearts. T6 and JT already make straights; many hands have draws. Texture alone does not supply a betting frequency or equity.",
  },
  {
    id: "pf-multiway",
    topic: "Multiway discipline",
    question:
      "Flop · three opponents · 100 BB. You miss with K♣ Q♦ on A♥ 8♠ 4♣. Two observed calling stations continue very widely. Which is the safer educational default when checked to?",
    choices: [
      "Bluff because the board has an ace",
      "Check and reassess",
      "Pot-sized bet guarantees folds",
    ],
    answer: 1,
    explanation:
      "Conditional heuristic: with several sticky opponents and little immediate value, check rather than assume enough folds. This is not proof that every bluff is bad. Position, ranges, backdoors and prices may justify exceptions.",
  },
  {
    id: "pf-sizing",
    topic: "Bet sizing",
    question:
      "River · heads-up · pot 80 BB. A zero-equity bluff risks 40 BB. No raises or rake. At a SUPPLIED 40% fold rate, what is its EV?",
    choices: ["−8 BB", "0 BB", "+8 BB"],
    answer: 2,
    explanation:
      "Verified supplied-model EV: 0.4×80 − 0.6×40 = +8 BB. The 40% fold rate is a hypothetical input; it is not estimated from an opponent label.",
  },
  {
    id: "pf-catcher",
    topic: "Bluff catching",
    question:
      "River · heads-up · pot 60 BB after villain bets; call 20 BB. Your hand beats all bluffs and loses to all value. A hypothetical range contains 3 equally weighted bluffs and 9 value combinations. Ignoring rake, what is the call EV?",
    choices: ["Exactly 0 BB", "+20 BB", "−20 BB"],
    answer: 0,
    explanation:
      "Verified model: equity = 3/12 = 25%; call EV = .25×60 − .75×20 = 0. Real combinations may have different weights and blockers. No actual opponent range is claimed.",
  },
];
