import { test } from "node:test";
import assert from "node:assert/strict";
import {
  riverPack,
  riverRoot,
  riverDeal,
  riverTrainingTable,
  solvedSpot,
  comboCards,
  solvedClasses,
  gradeSolved,
  SOLVED_EV_TOLERANCE,
  sameAction,
  toRiverHero,
} from "../src/solvedStrategy";
import { act, legal, Table } from "../src/table";
import { best, compare } from "../src/poker";
import { evaluateBaseline } from "../src/baselineCoach";
import {
  newSession,
  sessionAction,
  continueSession,
  encodeSession,
  decodeSession,
  retryDecision,
  practiceDecision,
  returnToLive,
  troublesomeSpots,
  practiceReviewedDecision,
} from "../src/simulatorSession";
function at(path: number[]) {
  let t = riverRoot();
  for (let i = 0; i < path.length; i++) {
    const n = riverPack.nodes.find(
      (n) => JSON.stringify(n.path) === JSON.stringify(path.slice(0, i)),
    )!;
    t = act(t, n.actions[path[i]]);
  }
  return t;
}
function close(actual: number, expected: number, tolerance = 0.0001) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${actual} != ${expected}`,
  );
}
test("generated river pack has converged metadata, legal transitions and finite normalized policies", () => {
  assert.equal(riverPack.nodes.length, 22);
  assert.equal(
    riverPack.source.revision,
    "9d1509fe5077d019825f833eed04b16d342dfda1",
  );
  assert.ok(
    riverPack.source.exploitabilityChips <= riverPack.source.targetChips,
  );
  for (const node of riverPack.nodes) {
    const t = at(node.path);
    assert.equal(t.stage, 3);
    assert.equal(t.actor, node.player === 0 ? 2 : 0);
    assert.equal(
      t.players.reduce((v, p) => v + p.stack + p.total, 0),
      1200,
    );
    assert.equal(solvedSpot(t)?.node, node);
    const seen = new Set<string>();
    for (const c of node.combos) {
      assert.equal(seen.has(c.cards), false);
      seen.add(c.cards);
      const cards = comboCards(c.cards);
      assert.equal(new Set([...cards, ...t.board]).size, 7);
      assert.ok(c.weight > 0 && c.rawWeight > 0);
      assert.equal(c.frequencies.length, node.actions.length);
      assert.equal(c.ev.length, node.actions.length);
      assert.ok(
        c.frequencies.every((p) => Number.isFinite(p) && p >= 0 && p <= 1),
      );
      assert.ok(c.ev.every(Number.isFinite));
      close(
        c.frequencies.reduce((n, p) => n + p, 0),
        1,
        0.000001,
      );
    }
    for (const a of node.actions) {
      const next = act(t, a);
      if (!next.done)
        assert.ok(
          solvedSpot(next),
          "Every nonterminal action must have a matching node",
        );
    }
  }
});
test("independent reach conditioning, blocker weighting and showdown call EVs agree with solver output", () => {
  const initial = [[], [0]].map(
    (path) =>
      new Map(
        riverPack.nodes
          .find((n) => JSON.stringify(n.path) === JSON.stringify(path))!
          .combos.map((c) => [c.cards, c.rawWeight]),
      ),
  );
  const score = new Map<string, number[]>();
  function rank(cards: string) {
    let r = score.get(cards);
    if (!r) {
      r = best([...comboCards(cards), ...riverRoot().board]);
      score.set(cards, r);
    }
    return r;
  }
  for (const node of riverPack.nodes) {
    const ranges = initial.map((r) => new Map(r));
    for (let i = 0; i < node.path.length; i++) {
      const parent = riverPack.nodes.find(
        (n) => JSON.stringify(n.path) === JSON.stringify(node.path.slice(0, i)),
      )!;
      const frequencies = new Map(
        parent.combos.map((c) => [c.cards, c.frequencies[node.path[i]]]),
      );
      for (const [cards, w] of ranges[parent.player])
        ranges[parent.player].set(cards, w * (frequencies.get(cards) ?? 0));
    }
    const t = at(node.path);
    const call = node.actions.findIndex((a) => a.type === "call");
    const examples = [
      node.combos[0],
      node.combos[Math.floor(node.combos.length / 2)],
      node.combos.at(-1)!,
    ];
    for (const c of examples) {
      close(c.rawWeight, ranges[node.player].get(c.cards)!);
      const hero = comboCards(c.cards);
      let total = 0,
        win = 0;
      for (const [cards, w] of ranges[node.player ^ 1]) {
        if (w <= 0 || comboCards(cards).some((c) => hero.includes(c))) continue;
        const outcome = compare(rank(c.cards), rank(cards));
        total += w;
        win += w * (outcome > 0 ? 1 : outcome === 0 ? 0.5 : 0);
      }
      close(c.weight, c.rawWeight * total, Math.max(1, c.weight) * 0.00002);
      if (call >= 0) {
        const cost = legal(t).call;
        const pot = t.players.reduce((n, p) => n + p.total, 0);
        close(c.ev[call], (win / total) * (pot + cost) - cost, 0.001);
        close(c.ev[node.actions.findIndex((a) => a.type === "fold")], 0);
      }
    }
  }
});
test("chart nodes depend on exact public history and sizing, never hidden information", () => {
  const t = riverTrainingTable();
  assert.deepEqual(solvedSpot(t)?.node.path, [0]);
  assert.deepEqual(solvedSpot(riverTrainingTable(1))?.node.path, [1]);
  assert.deepEqual(solvedSpot(riverTrainingTable(2))?.node.path, [2]);
  const original = evaluateBaseline(t, { type: "check" });
  const hidden = structuredClone(t);
  hidden.pack.reverse();
  hidden.seed = 123;
  hidden.players.slice(1).forEach((p) => {
    p.hole = [];
  });
  assert.deepEqual(evaluateBaseline(hidden, { type: "check" }), original);
  for (const mutate of [
    (v: Table) => {
      v.board[0] = 0;
    },
    (v: Table) => {
      v.button = 1;
    },
    (v: Table) => {
      v.players[2].stack--;
    },
    (v: Table) => {
      v.initial[3] = 199;
    },
    (v: Table) => {
      v.actions[3] = { type: "raise", to: 6 };
    },
  ]) {
    const changed = structuredClone(t);
    mutate(changed);
    assert.equal(solvedSpot(changed), undefined);
  }
  assert.equal(gradeSolved(t, { type: "raise", to: 7 })?.status, "ungraded");
  assert.equal(solvedSpot(act(t, { type: "raise", to: 7 })), undefined);
  const missing = structuredClone(t);
  missing.players[0].hole = comboCards("4c3d");
  assert.equal(gradeSolved(missing, { type: "check" })?.status, "ungraded");
});
test("feedback uses exact combo EV tolerance and accepts both valuable mixed actions", () => {
  const checked = riverTrainingTable();
  assert.equal(evaluateBaseline(checked, { type: "check" }).status, "match");
  const bad = evaluateBaseline(checked, { type: "raise", to: 11 });
  assert.equal(bad.reference, "solver");
  assert.equal(bad.status, "deviation");
  assert.match(bad.explanation, /Calculated loss/);
  const facing = act(riverRoot(), { type: "raise", to: 6 });
  const spot = solvedSpot(facing)!;
  assert.ok(spot.combo!.frequencies.filter((p) => p > 0.05).length >= 2);
  for (let i = 0; i < spot.node.actions.length; i++) {
    const loss = Math.max(...spot.combo!.ev) - spot.combo!.ev[i];
    assert.equal(
      evaluateBaseline(facing, spot.node.actions[i]).status,
      loss <= SOLVED_EV_TOLERANCE ? "match" : "deviation",
    );
  }
  assert.equal(evaluateBaseline(facing, { type: "call" }).status, "match");
  assert.equal(
    evaluateBaseline(facing, { type: "raise", to: 15 }).status,
    "match",
  );
  assert.equal(evaluateBaseline(facing, { type: "fold" }).status, "deviation");
  const classes = solvedClasses(spot.node);
  for (const [name, c] of classes) {
    close(
      c.frequencies.reduce((n, p) => n + p, 0),
      1,
      0.000001,
    );
    assert.ok(c.combinations > 0, name);
  }
  assert.equal(classes.has("43o"), false);
  const a = toRiverHero(act(checked, { type: "raise", to: 6 }));
  const changed = structuredClone(checked);
  changed.players[0].hole = comboCards("AcAd");
  changed.pack.reverse();
  const b = toRiverHero(act(changed, { type: "raise", to: 6 }));
  assert.deepEqual(
    a.actions,
    b.actions,
    "Opponent must not read hero cards or future pack",
  );
});
test("river practice persists exact retries, skips preset grades, rotates roots and keeps review branches", () => {
  let s = newSession("river");
  assert.equal(s.coaching.length, 0);
  assert.equal(s.attempts.length, 0);
  const original = structuredClone(s.table);
  s = sessionAction(s, { type: "raise", to: 11 });
  assert.equal(s.attempts[0].feedback.status, "deviation");
  assert.equal(s.coaching.length, 1);
  s = decodeSession(encodeSession(s));
  assert.equal(s.coaching.length, 1);
  s = retryDecision(s, s.attempts[0].id);
  assert.deepEqual(s.table, original);
  s = sessionAction(s, { type: "check" });
  assert.ok(s.table.done);
  assert.equal(s.attempts.at(-1)!.practice, true);
  s = continueSession(s);
  assert.deepEqual(solvedSpot(s.table)?.node.path, [1]);
  assert.equal(s.coaching.length, 0);
  s = decodeSession(encodeSession(s));
  const live = structuredClone(s.table);
  s = practiceDecision(s, s.attempts[0].id);
  s = sessionAction(s, { type: "check" });
  s = returnToLive(decodeSession(encodeSession(s)));
  assert.deepEqual(s.table, live);
  s = sessionAction(s, { type: "call" });
  s = continueSession(s);
  assert.deepEqual(solvedSpot(s.table)?.node.path, [2]);
  assert.ok(
    troublesomeSpots(s).length >= 2,
    "Different solved nodes must not merge into one weakness",
  );
  const reviewed = s.archive.find((h) => h.record.mode === "river")!;
  assert.throws(
    () => practiceReviewedDecision(s, reviewed.id, 3),
    /river practice setup/,
  );
  const p = practiceReviewedDecision(s, reviewed.id, 11);
  assert.equal(p.table.actor, 0);
  const forged = JSON.parse(encodeSession(s));
  forged.seed++;
  assert.throws(
    () => decodeSession(JSON.stringify(forged)),
    /river practice setup/,
  );
});

test("varied river deals retain a unique deck, the solved public state and deterministic reviews", () => {
  const seen = new Set<string>();
  for (let i = 0; i < 100; i++) {
    const deal = riverDeal(i);
    const cards = [...deal.pack, ...deal.players.flatMap((p) => p.hole)];
    assert.equal(cards.length, 52);
    assert.equal(new Set(cards).size, 52);
    const table = riverTrainingTable(i);
    assert.deepEqual(table.board, riverRoot().board);
    assert.ok(solvedSpot(table)?.combo);
    seen.add([...table.players[0].hole].sort().join(","));
    let s = { ...newSession("river"), hand: i + 1, table };
    assert.deepEqual(decodeSession(encodeSession(s)).table, table);
    s = sessionAction(s, { type: legal(table).call ? "fold" : "check" });
    assert.equal(s.coaching.length, 1);
    assert.deepEqual(decodeSession(encodeSession(s)).table, s.table);
  }
  assert.ok(seen.size > 60);
});

test("locally unconverged rare combinations remain ungraded despite aggregate convergence", () => {
  const node = riverPack.nodes.find((n) => n.path.join(",") === "2,2,2")!;
  const combo = node.combos.find(
    (c) =>
      Math.max(...c.ev) -
        c.ev.reduce((n, v, i) => n + v * c.frequencies[i], 0) >
      SOLVED_EV_TOLERANCE,
  )!;
  assert.ok(combo);
  const t = at(node.path);
  t.players[0].hole = comboCards(combo.cards);
  const feedback = evaluateBaseline(t, node.actions[0]);
  assert.equal(feedback.status, "ungraded");
  assert.equal(feedback.title, "Low-confidence solver branch");
});

test("reference opponent samples its policy over hands and repeats exactly on retry", () => {
  const t = at([0, 1]);
  const spot = solvedSpot(t)!;
  const combo = spot.node.combos.find(
    (c) =>
      c.frequencies.filter((p) => p > 0.15).length >= 2 &&
      comboCards(c.cards).every((card) => !t.players[0].hole.includes(card)),
  )!;
  assert.ok(combo);
  t.players[2].hole = comboCards(combo.cards);
  const counts = spot.node.actions.map(() => 0);
  for (let i = 0; i < 2000; i++) {
    const next = toRiverHero(t, i);
    const a = next.actions[t.actions.length];
    counts[spot.node.actions.findIndex((v) => sameAction(v, a))]++;
    if (i < 10) assert.deepEqual(toRiverHero(t, i), next);
  }
  counts.forEach((v, i) => close(v / 2000, combo.frequencies[i], 0.01));
});
