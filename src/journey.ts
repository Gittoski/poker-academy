import { lessons, unlocked } from "./curriculum";
export const stages = [
  {
    name: "Basics",
    subtitle: "Understand the game before risking a decision.",
    goal: "Read hands, recognize position, and understand the price of a call.",
    from: 0,
    to: 4,
    icon: "01",
  },
  {
    name: "Deeper strategy",
    subtitle: "Turn the fundamentals into a plan.",
    goal: "Build a preflop baseline, find value, price draws, and understand bluffs.",
    from: 4,
    to: 8,
    icon: "02",
  },
  {
    name: "Mastery practice",
    subtitle: "Adapt, question your reads, and review.",
    goal: "Combine ranges, player evidence, stack depth, and disciplined review. Finishing is a foundation for continued practice, not proof of expert play.",
    from: 8,
    to: 12,
    icon: "03",
  },
];
export function nextLesson(completed: string[]) {
  return lessons.findIndex((l) => !completed.includes(l.id));
}
export function stageFor(index: number) {
  return stages[Math.min(2, Math.max(0, Math.floor(index / 4)))];
}
export function stageAvailable(index: number, completed: string[]) {
  return (
    index >= 0 &&
    index < stages.length &&
    unlocked(stages[index].from, completed)
  );
}
export type Bridge = {
  connection: string;
  example: string;
  question: string;
  choices: string[];
  answer: number;
  explanation: string;
};
export const bridges: Record<string, Bridge> = {
  rules: {
    connection:
      "Start here. Every later decision depends on knowing what can win at showdown.",
    example:
      "The board is A♠ K♠ Q♠ J♠ T♠. Your 2♣ 3♦ do not improve it. Your best hand is the five-card royal flush on the board. An opponent with 8♥ 8♦ has that same best hand.",
    question: "In this example, who wins at showdown?",
    choices: [
      "You win with low cards",
      "The opponent wins with a pair",
      "The pot is split",
    ],
    answer: 2,
    explanation:
      "Both players use the same five community cards. Neither hole-card pair can improve the board.",
  },
  position: {
    connection:
      "You know how hands win. Now learn when decisions happen and why later action gives information.",
    example:
      "All six seats reach the flop. SB acts, then BB, UTG, HJ, CO, and BTN. If the button folds, the cutoff is the last active seat in that order.",
    question:
      "If the button folded preflop and all others remain, who acts last on the flop?",
    choices: ["Cutoff", "Small blind", "Big blind"],
    answer: 0,
    explanation:
      "Postflop order starts left of the button and skips folded seats. The cutoff is the last remaining seat in this example.",
  },
  ranking: {
    connection:
      "Position tells you when to act. Comparing the best five cards tells you what your hand actually beats.",
    example:
      "One player has A-A-K-K-Q as their best five. Another has A-A-K-K-J. The pairs match, so compare the fifth card: queen beats jack.",
    question:
      "Two players have the same ace-high straight as their best five cards. One also holds an unused pair. What happens?",
    choices: [
      "The pair breaks the tie",
      "The pot is split",
      "The player with a spade wins",
    ],
    answer: 1,
    explanation:
      "Only the best five cards matter. Unused cards and suits do not break ties.",
  },
  odds: {
    connection:
      "You can compare hands. Add the price before deciding whether a call can be profitable.",
    example:
      "The pot is 80 after an opponent bets. Calling costs 20. The final pot would be 100, so break-even equity is 20/100 = 20%. This assumes no rake and no future betting.",
    question:
      "Pot 75 after the bet; call 25. With the same assumptions, what equity breaks even?",
    choices: ["25%", "33.3%", "50%"],
    answer: 0,
    explanation:
      "25/(75+25) = 25%. This is a price, not an estimate of your actual equity.",
  },
  preflop: {
    connection:
      "You understand position and price. Use them to understand the scope of a first-in plan.",
    example:
      "From the cutoff at 100 BB with no ante, everyone folds to you. Our first-in chart applies. If UTG instead raises and HJ calls, the same hand now faces different ranges and a different price.",
    question:
      "You hold A5s in the cutoff, facing a raise and a call. Does our first-in CO chart settle the decision?",
    choices: [
      "Yes, the hand is listed",
      "No, it is not an unopened pot",
      "Yes, suited aces always raise",
    ],
    answer: 1,
    explanation:
      "Our chart is an authored first-in heuristic. Facing action needs a separate assessment; no answer is invented for this unsupported spot.",
  },
  value: {
    connection:
      "A preflop plan gets you to the flop. A value plan asks which worse hands actually continue.",
    example:
      "On a safe river you hold top pair. A particular opponent repeatedly calls small bets with weaker pairs but folds those hands to very large bets. A small value bet may target more worse calls; its exact best size is not established.",
    question:
      "The opponent begins folding all weaker pairs and only calling with better hands. Should you keep relying on that same value-bet read?",
    choices: [
      "Yes, top pair always bets",
      "Yes, ignore the new evidence",
      "No, reassess the continuing range",
    ],
    answer: 2,
    explanation:
      "Value depends on what calls. The stated change removes the original rationale. This is a conditional heuristic, not a solved sizing result.",
  },
  draws: {
    connection:
      "Value concerns made hands. Draws add uncertainty: count the event, then compare it with the price.",
    example:
      "On the turn with only your two cards and four board cards known, 46 cards are unseen. If exactly 9 of them are clean winning outs, chance to win on the river is 9/46, about 19.6%. That clean-out assumption must be supplied, not guessed.",
    question:
      "If you need 33.3% equity to call and have exactly 9 clean winning outs in 46 cards, lose otherwise, no ties or future bets, what does the calculation favor?",
    choices: [
      "Call because a flush is possible",
      "Fold under these assumptions",
      "Either action is guaranteed profitable",
    ],
    answer: 1,
    explanation:
      "9/46 ≈ 19.6%, below 33.3%. The supplied clean-out model makes calling negative EV; it is not a range estimate.",
  },
  bluffs: {
    connection:
      "Draws can win by improving. A pure bluff in this model wins only when the opponent folds.",
    example:
      "Risk 30 into 60 with zero showdown equity. Break-even folds = 30/(60+30) = 1/3. If a hypothetical opponent folds exactly half the time, EV = .5×60 − .5×30 = +15. Their actual folding rate remains unknown.",
    question:
      "You risk 20 into 80 as a zero-equity bluff. What fold rate breaks even?",
    choices: ["50%", "25%", "20%"],
    answer: 2,
    explanation:
      "20/(80+20) = 20%, assuming the hand ends with a fold or a call that always beats you and no rake.",
  },
  profiles: {
    connection:
      "You know the bluff threshold. Now separate that known price from uncertain evidence about a player.",
    example:
      "A player opens many hands preflop. That is evidence of loose participation. It does not measure how often they fold to a river bet. To reason about river bluffs, observe comparable river spots.",
    question: "Which observation is most relevant to a river-bluff hypothesis?",
    choices: [
      "Comparable river calls/folds and sizes over repeated observations",
      "The player once limped preflop",
      "Their age or appearance",
    ],
    answer: 0,
    explanation:
      "Use context-specific behavior. Even repeated observations are uncertain and can be biased; no exact fold probability follows automatically.",
  },
  exploit: {
    connection:
      "Profiles summarize evidence. Exploits turn a specific hypothesis into an adjustment you can later revise.",
    example:
      "Repeated showdowns suggest an opponent calls half-pot river bets with weak pairs. Value-betting more against those worse calls is a conditional adjustment. If they start folding them, the same adjustment may stop earning value.",
    question:
      "After several contradictory showdowns, what should you do with the original read?",
    choices: [
      "Treat it as permanent",
      "Reduce confidence and reassess the adjustment",
      "Increase every bet without a reason",
    ],
    answer: 1,
    explanation:
      "A read is a revisable hypothesis. New evidence can change the continuing range and the value of the adjustment.",
  },
  spr: {
    connection:
      "An exploit still depends on the chips available. Add effective stacks before planning commitment.",
    example:
      "You have 180 behind and your opponent 60 behind, with 30 in the pot. Effective remaining stack is 60, so SPR is 60/30 = 2. Your extra 120 cannot be won from this opponent in the hand.",
    question:
      "You have 200 behind, villain 80, pot 40. What is SPR at this point?",
    choices: ["5", "7", "2"],
    answer: 2,
    explanation:
      "Use the smaller remaining stack: 80/40 = 2. SPR alone does not make a hand an automatic stack-off.",
  },
  review: {
    connection:
      "Combine hand rules, position, price, ranges, evidence and stacks. Review reasoning rather than a single result.",
    example:
      "A call costs 20 into a 60 pot after the bet. You assumed 30% equity, no rake, and no future bets. The threshold is 25%, so the call is positive EV if that equity assumption is accurate. Losing this one time does not invalidate it.",
    question: "What is the most useful next review task after that loss?",
    choices: [
      "Assume every losing call is wrong",
      "Check whether the assumed 30% equity was justified by the range",
      "Ignore the pot and price",
    ],
    answer: 1,
    explanation:
      "The arithmetic can be right while the equity assumption is wrong. Review the evidence behind the range. Continued application and feedback are needed to develop skill.",
  },
};
