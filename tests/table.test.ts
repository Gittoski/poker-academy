import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createTable,
  act,
  legal,
  settle,
  shuffled,
  replay,
  Player,
} from "../src/table";
const c = (s: string) =>
  s
    .split(" ")
    .map((c) => "23456789TJQKA".indexOf(c[0]) * 4 + "cdhs".indexOf(c[1]));
const p = (total: number, h: string, folded = false): Player => ({
  total,
  hole: c(h),
  folded,
  stack: 0,
  street: 0,
});
test("six-seat order, blinds, immutable actions and legal raises", () => {
  const s = createTable();
  assert.equal(s.actor, 3);
  assert.deepEqual(
    s.players.map((p) => p.street),
    [0, 1, 2, 0, 0, 0],
  );
  assert.equal(legal(s).minTo, 4);
  assert.throws(() => act(s, { type: "check" }));
  assert.throws(() => act(s, { type: "raise", to: 3 }));
  const n = act(s, { type: "raise", to: 6 });
  assert.equal(n.actor, 4);
  assert.equal(n.minRaise, 4);
  assert.equal(s.players[3].stack, 200);
});
test("big blind option and flop order", () => {
  let s = createTable();
  for (let i = 0; i < 5; i++) s = act(s, { type: "call" });
  assert.equal(s.actor, 2);
  s = act(s, { type: "check" });
  assert.equal(s.stage, 1);
  assert.equal(s.actor, 1);
  assert.equal(s.board.length, 3);
});
test("side pots, uncalled excess, folded contributions and odd ties", () => {
  const board = c("2c 3d 7h 8s 9c");
  assert.deepEqual(
    settle([p(50, "Ac Ad"), p(100, "Kc Kd"), p(150, "Qc Qd")], board, 0),
    [150, 100, 50],
  );
  assert.deepEqual(
    settle([p(5, "Ac Ad"), p(5, "Ah As"), p(5, "Kc Kd", true)], board, 0),
    [7, 8, 0],
  );
});
test("short all-in does not reopen action; cumulative short raises can", () => {
  let s = createTable(1, [200, 200, 200, 200, 7, 200]);
  s = act(s, { type: "raise", to: 6 });
  s = act(s, { type: "raise", to: 7 });
  for (let i = 0; i < 4; i++) s = act(s, { type: "call" });
  assert.equal(s.actor, 3);
  assert.equal(legal(s).canRaise, false);
  assert.throws(() => act(s, { type: "raise", to: 11 }));
  s = act(s, { type: "call" });
  assert.equal(s.stage, 1);
});
test("seeded deck is reproducible, full and unique", () => {
  assert.deepEqual(shuffled(42), shuffled(42));
  assert.equal(new Set(shuffled(42)).size, 52);
  assert.notDeepEqual(shuffled(42), shuffled(43));
});
test("100 seeded games conserve chips, terminate and replay exactly", () => {
  for (let seed = 1; seed <= 100; seed++) {
    let s = createTable(seed, [40, 30, 20, 10, 60, 80]);
    let step = 0;
    while (!s.done && step < 500) {
      const l = legal(s);
      const choice = (seed + step) % 7;
      const a =
        choice === 0 && l.canRaise
          ? { type: "raise" as const, to: l.maxTo }
          : l.call
            ? choice === 1
              ? { type: "fold" as const }
              : { type: "call" as const }
            : { type: "check" as const };
      s = act(s, a);
      assert.equal(
        s.players.reduce((n, p) => n + p.stack + p.total, 0),
        240,
      );
      assert.ok(s.players.every((p) => p.stack >= 0 && p.total >= 0));
      step++;
    }
    assert.ok(s.done, `seed ${seed}`);
    assert.deepEqual(replay(seed, [40, 30, 20, 10, 60, 80], 0, s.actions), s);
    const cards = [...s.board, ...s.players.flatMap((p) => p.hole)];
    assert.equal(new Set(cards).size, cards.length);
  }
});
test("cumulative short all-ins reopen full raise rights", () => {
  let s = createTable(1, [200, 200, 200, 200, 7, 10]);
  s = act(s, { type: "raise", to: 6 });
  s = act(s, { type: "raise", to: 7 });
  s = act(s, { type: "raise", to: 10 });
  for (let i = 0; i < 3; i++) s = act(s, { type: "call" });
  assert.equal(s.actor, 3);
  assert.equal(legal(s).canRaise, true);
  s = act(s, { type: "raise", to: 14 });
  assert.equal(s.minRaise, 4);
});
test("heads-up button is small blind and acts first preflop", () => {
  let s = createTable(7, [200, 0, 0, 200, 0, 0], 0);
  assert.equal(s.players[0].street, 1);
  assert.equal(s.players[3].street, 2);
  assert.equal(s.actor, 0);
  s = act(s, { type: "call" });
  s = act(s, { type: "check" });
  assert.equal(s.actor, 3);
  assert.equal(s.stage, 1);
});
test("all-in blinds run out safely with no decisions", () => {
  const s = createTable(1, [1, 1, 0, 0, 0, 0]);
  assert.ok(s.done);
  assert.equal(s.board.length, 5);
  assert.equal(
    s.players.reduce((n, p) => n + p.stack, 0),
    2,
  );
});
