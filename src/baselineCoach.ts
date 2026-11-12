import { gradeSolved } from "./solvedStrategy";
import { handClass } from "./handClass";
export { handClass } from "./handClass";
import { Action, Table, act, createTable } from "./table";
import { Position, firstIn } from "./preflop";
export type BaselineFeedback = {
  status: "match" | "deviation" | "ungraded";
  title: string;
  explanation: string;
  context: string;
  reference?: "solver";
  strategyKey?: string;
};
export const baselineName = "Academy first-in baseline v1";
const buttons = [3, 2, 1, 0, 5];
export function trainingTable(seed: number, index: number): Table {
  if (!Number.isSafeInteger(index) || index < 0)
    throw new Error("Invalid coaching index");
  let s = createTable(
    seed,
    Array(6).fill(200),
    buttons[index % buttons.length],
  );
  while (!s.done && s.actor !== 0) s = act(s, { type: "fold" });
  return s;
}
export function heroPosition(button: number): Position | "BB" {
  const names = ["BTN", "SB", "BB", "UTG", "HJ", "CO"] as const;
  return names[(6 - button) % 6];
}
/** Grades a covered conditional solve or named authored exercise. Never reads opponents' hole cards or the future deck. */
export function evaluateBaseline(s: Table, action: Action): BaselineFeedback {
  const solved = gradeSolved(s, action);
  if (solved) return solved;
  const ungraded = (reason: string): BaselineFeedback => ({
    status: "ungraded",
    title: "Not graded",
    explanation: reason + " No right/wrong or solver verdict is assigned.",
    context: baselineName,
  });
  if (s.done || s.actor !== 0)
    return ungraded("There is no current hero decision.");
  if (s.stage !== 0)
    return ungraded(
      "This baseline covers preflop first-in decisions only. Postflop strategy is not covered.",
    );
  if (s.initial.length !== 6 || s.initial.some((n) => n !== 200))
    return ungraded(
      "This baseline requires six seats starting with exactly 100 BB each (200 chips at 1/2 blinds).",
    );
  if (s.actions.some((a) => a.type !== "fold") || s.bet !== 2)
    return ungraded(
      "A limp, raise, or earlier voluntary action changes the spot. This first-in chart does not apply.",
    );
  const position = heroPosition(s.button);
  if (position === "BB")
    return ungraded(
      "The big blind gets a walk when everyone folds; it has no first-in raise-or-fold chart here.",
    );
  const hand = handClass(s.players[0].hole);
  const expected = firstIn(position, hand);
  const size = position === "SB" ? 6 : 5;
  const context = `${baselineName} · ${position} · ${hand} · 100 BB · unopened · no ante/rake`;
  const matchesAction =
    expected === "Raise" ? action.type === "raise" : action.type === "fold";
  const matchesSize =
    expected !== "Raise" || (action.type === "raise" && action.to === size);
  const recommendation =
    expected === "Raise" ? `raise to ${size} chips (${size / 2} BB)` : "fold";
  if (matchesAction && matchesSize)
    return {
      status: "match",
      title: "Matches teaching baseline",
      context,
      explanation: `This exercise chooses ${recommendation} with ${hand} from ${position}. It matches our authored training convention, not a verified GTO solution or proof of optimal play.`,
    };
  return {
    status: "deviation",
    title: matchesAction
      ? "Different baseline size"
      : "Outside teaching baseline",
    context,
    explanation: `The exercise baseline chooses ${recommendation} with ${hand} from ${position}. Your ${action.type === "raise" ? "raise to " + action.to + " chips" : action.type} differs. This is an authored heuristic, not a GTO error or an EV-loss calculation. A deliberate exploit may differ; review opponent evidence before changing your plan.`,
  };
}
