import { Action, Table, act, createTable, replay } from "./table";
import { toHero } from "./bots";
export type SimulatorSession = {
  version: 1;
  hand: number;
  refills: number;
  table: Table;
};
export function newSession(): SimulatorSession {
  return { version: 1, hand: 1, refills: 0, table: toHero(createTable(42)) };
}
export function sessionAction(
  s: SimulatorSession,
  a: Action,
): SimulatorSession {
  return { ...s, table: toHero(act(s.table, a)) };
}
export function continueSession(s: SimulatorSession): SimulatorSession {
  if (!s.table.done) throw new Error("Finish this hand first");
  const refill = s.table.players.filter((p) => p.stack <= 2).length;
  const stacks = s.table.players.map((p) => (p.stack <= 2 ? 200 : p.stack));
  if (
    !Number.isSafeInteger(s.hand + 1) ||
    !Number.isSafeInteger(s.refills + refill)
  )
    throw new Error("Session counter limit");
  return {
    ...s,
    hand: s.hand + 1,
    refills: s.refills + refill,
    table: toHero(
      createTable((s.table.seed + 1) >>> 0, stacks, (s.table.button + 1) % 6),
    ),
  };
}
export function encodeSession(s: SimulatorSession): string {
  return JSON.stringify({
    version: 1,
    hand: s.hand,
    refills: s.refills,
    seed: s.table.seed,
    button: s.table.button,
    stacks: s.table.initial,
    actions: s.table.actions,
  });
}
/** Restore by validating and replaying legal actions, never by trusting serialized deck/player state. */
export function decodeSession(raw: string | null): SimulatorSession {
  if (raw === null) return newSession();
  if (raw.length > 200000) throw new Error("Session backup too large");
  const p = JSON.parse(raw);
  if (
    !p ||
    p.version !== 1 ||
    !Number.isSafeInteger(p.hand) ||
    p.hand < 1 ||
    !Number.isSafeInteger(p.refills) ||
    p.refills < 0 ||
    !Number.isSafeInteger(p.seed) ||
    p.seed < 0 ||
    p.seed > 0xffffffff ||
    !Number.isInteger(p.button) ||
    p.button < 0 ||
    p.button > 5 ||
    !Array.isArray(p.stacks) ||
    p.stacks.length !== 6 ||
    p.stacks.some(
      (n: unknown) =>
        typeof n !== "number" || !Number.isSafeInteger(n) || n < 0,
    ) ||
    !Number.isSafeInteger(
      p.stacks.reduce((sum: number, n: number) => sum + n, 0),
    ) ||
    !Array.isArray(p.actions) ||
    p.actions.length > 2048
  )
    throw new Error("Unsupported or damaged table session");
  const actions: Action[] = p.actions.map((a: unknown) => {
    if (!a || typeof a !== "object" || !("type" in a))
      throw new Error("Invalid action");
    const v = a as { type: string; to?: number };
    if (v.type === "fold" || v.type === "check" || v.type === "call")
      return { type: v.type };
    if (v.type === "raise" && Number.isSafeInteger(v.to))
      return { type: "raise", to: v.to! };
    throw new Error("Invalid action");
  });
  const table = replay(p.seed, p.stacks, p.button, actions);
  if (!table.done && table.actor !== 0)
    throw new Error("Session is not at a player decision");
  return { version: 1, hand: p.hand, refills: p.refills, table };
}
