import data from "./data/academy-river-v1.json";
import { Action, Table, act, createTable, legal } from "./table";
import type { BaselineFeedback } from "./baselineCoach";
import { handClass } from "./handClass";
import { botAction } from "./bots";
export type SolvedCombo = {
  cards: string;
  weight: number;
  rawWeight: number;
  frequencies: number[];
  ev: number[];
};
export type SolvedNode = {
  path: number[];
  player: number;
  actions: Action[];
  combos: SolvedCombo[];
};
export const riverPack = data as unknown as {
  id: string;
  source: typeof data.source;
  nodes: SolvedNode[];
};
export const SOLVED_EV_TOLERANCE = 0.02; // chips = 0.01 BB; training tolerance, not solver accuracy
/** Preset public history; its earlier choices are not lessons or a solved six-max strategy. */
export const riverPrelude: Action[] = [
  { type: "fold" },
  { type: "fold" },
  { type: "fold" },
  { type: "raise", to: 5 },
  { type: "fold" },
  { type: "call" },
  { type: "check" },
  { type: "check" },
  { type: "check" },
  { type: "check" },
];
export const RIVER_PRESET_ACTIONS = riverPrelude.length + 1;
/** Deterministic range-combination practice deal; no solver runs on the device. */
export function riverDeal(index = 0): Table {
  if (!Number.isSafeInteger(index) || index < 0)
    throw new Error("Invalid river practice index");
  const table = createTable(42);
  if (index === 0) return table;
  const heroRows = riverPack.nodes.find(
    (n) => n.path.length === 1 && n.path[0] === index % 3,
  )!.combos;
  const hero = comboCards(
    heroRows[((index % heroRows.length) * 53) % heroRows.length].cards,
  );
  const opponents = riverPack.nodes[0].combos.filter(
    (c) =>
      c.frequencies[index % 3] > 0.0001 &&
      comboCards(c.cards).every((card) => !hero.includes(card)),
  );
  if (!opponents.length) throw new Error("No compatible strategy opponent");
  const opponent = comboCards(
    opponents[((index % opponents.length) * 29) % opponents.length].cards,
  );
  // Swap before the preset streets: all 52 cards remain unique and the board is unchanged.
  const slots = [...table.players.map((p) => p.hole), table.pack];
  for (const [seat, cards] of [
    [0, hero],
    [2, opponent],
  ] as const) {
    cards.forEach((card, offset) => {
      const from = slots.find((row) => row.includes(card))!;
      const position = from.indexOf(card);
      [from[position], table.players[seat].hole[offset]] = [
        table.players[seat].hole[offset],
        card,
      ];
    });
  }
  return table;
}
export function riverRoot(index = 0): Table {
  return riverPrelude.reduce((t, a) => act(t, a), riverDeal(index));
}
export function riverTrainingTable(index = 0): Table {
  const actions: Action[] = [
    { type: "check" },
    { type: "raise", to: 6 },
    { type: "raise", to: 11 },
  ];
  return act(riverRoot(index), actions[index % actions.length]);
}
export function cardId(s: string): number {
  if (!/^[2-9TJQKA][cdhs]$/.test(s)) throw new Error("Invalid strategy card");
  return "23456789TJQKA".indexOf(s[0]) * 4 + "cdhs".indexOf(s[1]);
}
export function comboCards(s: string): number[] {
  return [cardId(s.slice(0, 2)), cardId(s.slice(2, 4))];
}
function comboKey(cards: number[]) {
  return [...cards].sort((a, b) => a - b).join(",");
}
export function sameAction(a: Action, b: Action): boolean {
  return (
    a.type === b.type &&
    (a.type !== "raise" || (b.type === "raise" && a.to === b.to))
  );
}
export function actionLabel(a: Action, table?: Table): string {
  return a.type === "raise"
    ? `${table && table.bet > 0 ? "Raise to" : "Bet"} ${a.to} chips`
    : a.type[0].toUpperCase() + a.type.slice(1);
}
/** Only public state is indexed. Never match using opponents' cards, seed or future deck. */
function publicKey(t: Table): string {
  return JSON.stringify([
    t.button,
    t.initial,
    t.stage,
    t.board,
    t.actor,
    t.bet,
    t.minRaise,
    t.pending,
    t.actedAt,
    t.done,
    t.players.map((p) => [p.stack, p.street, p.total, p.folded]),
    t.actions.map((a) => [a.type, a.type === "raise" ? a.to : 0]),
  ]);
}
const nodes = new Map<
  string,
  { node: SolvedNode; combos: Map<string, SolvedCombo> }
>();
for (const node of riverPack.nodes) {
  let table = riverRoot();
  for (let i = 0; i < node.path.length; i++) {
    const parent = riverPack.nodes.find(
      (n) => JSON.stringify(n.path) === JSON.stringify(node.path.slice(0, i)),
    );
    if (!parent) throw new Error("Strategy path missing");
    table = act(table, parent.actions[node.path[i]]);
  }
  if (table.actor !== (node.player === 0 ? 2 : 0))
    throw new Error("Strategy actor mismatch");
  nodes.set(publicKey(table), {
    node,
    combos: new Map(node.combos.map((c) => [comboKey(comboCards(c.cards)), c])),
  });
}
export function solvedSpot(table: Table) {
  const found = nodes.get(publicKey(table));
  if (!found) return undefined;
  return {
    node: found.node,
    combo: found.combos.get(comboKey(table.players[table.actor].hole)),
  };
}
export function gradeSolved(
  table: Table,
  action: Action,
): BaselineFeedback | undefined {
  const spot = solvedSpot(table);
  if (!spot || table.actor !== 0) return undefined;
  const context = `${riverPack.id} · node ${spot.node.path.join("/") || "root"} · BTN vs BB · river · assumed ranges · no rake`;
  const base = {
    context,
    reference: "solver" as const,
    strategyKey: `${riverPack.id}:${spot.node.path.join("/")}`,
  };
  if (!spot.combo)
    return {
      ...base,
      status: "ungraded",
      title: "Hand outside supplied range",
      explanation:
        "This exact combination has no positive reach weight in the supplied ranges at this node. No verdict is assigned.",
    };
  const policyValue = spot.combo.ev.reduce(
    (v, ev, i) => v + ev * spot.combo!.frequencies[i],
    0,
  );
  if (Math.max(...spot.combo.ev) - policyValue > SOLVED_EV_TOLERANCE)
    return {
      ...base,
      status: "ungraded",
      title: "Low-confidence solver branch",
      explanation:
        "This exact combination's local policy gap exceeds our training tolerance. The chart is informational; no correct/incorrect verdict is assigned. Aggregate solver exploitability does not certify every rare combination.",
    };
  const index = spot.node.actions.findIndex((a) => sameAction(a, action));
  if (index < 0)
    return {
      ...base,
      status: "ungraded",
      title: "Size outside solved tree",
      explanation:
        "This action or exact size was not solved. No rounding, nearest-size substitution or EV-loss estimate is applied. You can continue playing or retry a covered size.",
    };
  const best = Math.max(...spot.combo.ev);
  const loss = Math.max(0, best - spot.combo.ev[index]);
  const bestIndex = spot.combo.ev.indexOf(best);
  const match = loss <= SOLVED_EV_TOLERANCE;
  const callIndex = spot.node.actions.findIndex((a) => a.type === "call");
  const cost = legal(table).call;
  const pot = table.players.reduce((n, p) => n + p.total, 0);
  const math =
    callIndex >= 0 && cost > 0
      ? ` Calling costs ${cost} chips to contest ${pot + cost}: pot-odds threshold ${((cost / (pot + cost)) * 100).toFixed(1)}%. Calculated showdown equity against this node's conditional range is ${(((spot.combo.ev[callIndex] + cost) / (pot + cost)) * 100).toFixed(1)}%; call EV is ${(spot.combo.ev[callIndex] / 2).toFixed(3)} BB relative to folding.`
      : ` Checking reaches showdown in this river spot. Bet values include the modeled opponent responses.`;

  return {
    ...base,
    status: match ? "match" : "deviation",
    title: match ? "Within solved tolerance" : "Lower value in this solve",
    explanation: `${actionLabel(action, table)} has ${(spot.combo.frequencies[index] * 100).toFixed(1)}% reference frequency for your exact cards. Calculated loss versus the best available action: ${(loss / 2).toFixed(3)} BB. Best action: ${actionLabel(spot.node.actions[bestIndex], table)}.${math} Training tolerance: ${SOLVED_EV_TOLERANCE / 2} BB. This conditional two-player river solve assumes the displayed ranges and betting tree; it does not prove a full six-max strategy or an exploit against a recreational player. One choice cannot measure your long-run mixing frequency.`,
  };
}
/** Opponent follows its own exact-combo policy in covered practice nodes; off-tree play uses the existing toy bot. */
export function toRiverHero(state: Table, handIndex = 0): Table {
  let table = state;
  for (let count = 0; !table.done && table.actor !== 0; count++) {
    if (count >= 100) throw new Error("Strategy opponent action limit");
    const spot = solvedSpot(table);
    let action: Action;
    if (spot?.combo) {
      const sample =
        ((Math.imul(table.seed, 1664525) +
          Math.imul(table.actions.length, 1013904223) +
          Math.imul(handIndex, 2246822519)) >>>
          0) /
        4294967296;
      let cumulative = 0;
      let index = spot.combo.frequencies.findIndex((p) => {
        cumulative += p;
        return sample < cumulative;
      });
      if (index < 0)
        spot.combo.frequencies.forEach((p, i) => {
          if (p > 0) index = i;
        });
      action = spot.node.actions[index];
    } else action = botAction(table);
    table = act(table, action);
  }
  return table;
}

/** Reach/card-removal weighted class display. Exact-combo feedback remains separate. */
export function solvedClasses(node: SolvedNode) {
  const result = new Map<
    string,
    { weight: number; frequencies: number[]; combinations: number }
  >();
  for (const combo of node.combos) {
    const key = handClass(comboCards(combo.cards));
    const row = result.get(key) ?? {
      weight: 0,
      frequencies: node.actions.map(() => 0),
      combinations: 0,
    };
    row.weight += combo.weight;
    row.combinations++;
    combo.frequencies.forEach((p, i) => {
      row.frequencies[i] += p * combo.weight;
    });
    result.set(key, row);
  }
  for (const row of result.values())
    row.frequencies = row.frequencies.map((p) => p / row.weight);
  return result;
}
