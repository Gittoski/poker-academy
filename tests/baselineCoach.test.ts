import { test } from "node:test";
import assert from "node:assert/strict";
import {
  evaluateBaseline,
  trainingTable,
  heroPosition,
  handClass,
} from "../src/baselineCoach";
import { act, createTable } from "../src/table";
import {
  newSession,
  sessionAction,
  continueSession,
  encodeSession,
  decodeSession,
} from "../src/simulatorSession";
test("coached setups rotate all five supported positions with legal unopened hero decisions", () => {
  for (let i = 0; i < 25; i++) {
    const s = trainingTable(42 + i, i);
    assert.equal(s.actor, 0);
    assert.equal(s.stage, 0);
    assert.equal(
      heroPosition(s.button),
      ["UTG", "HJ", "CO", "BTN", "SB"][i % 5],
    );
    assert.ok(s.actions.every((a) => a.type === "fold"));
    assert.ok(s.initial.every((n) => n === 200));
    assert.equal(s.bet, 2);
  }
});
test("canonical hands and first-in action/sizing verdicts use only the named baseline", () => {
  assert.equal(handClass([48, 51]), "AA");
  assert.equal(handClass([48, 44]), "AKs");
  assert.equal(handClass([48, 45]), "AKo");
  assert.throws(() => handClass([0, 0]));
  const s = trainingTable(42, 0);
  s.players[0].hole = [48, 51];
  assert.equal(evaluateBaseline(s, { type: "raise", to: 5 }).status, "match");
  assert.equal(
    evaluateBaseline(s, { type: "raise", to: 8 }).title,
    "Different baseline size",
  );
  assert.equal(evaluateBaseline(s, { type: "fold" }).status, "deviation");
  assert.match(
    evaluateBaseline(s, { type: "call" }).explanation,
    /not a GTO error/,
  );
  const sb = trainingTable(42, 4);
  sb.players[0].hole = [48, 51];
  assert.equal(evaluateBaseline(sb, { type: "raise", to: 6 }).status, "match");
  s.players[0].hole = [20, 1];
  assert.equal(handClass(s.players[0].hole), "72o");
  assert.equal(evaluateBaseline(s, { type: "fold" }).status, "match");
});
test("unsupported stacks, prior action and streets receive no fake right/wrong grade", () => {
  let s = createTable(42, Array(6).fill(200), 2);
  s = act(s, { type: "call" });
  assert.equal(s.actor, 0);
  assert.match(evaluateBaseline(s, { type: "call" }).explanation, /limp/);
  assert.equal(evaluateBaseline(s, { type: "call" }).status, "ungraded");
  s = trainingTable(42, 0);
  s.initial[1] = 100;
  assert.equal(evaluateBaseline(s, { type: "fold" }).status, "ungraded");
  s = trainingTable(42, 0);
  s.stage = 1;
  assert.equal(evaluateBaseline(s, { type: "check" }).status, "ungraded");
  const bb = createTable(1, Array(6).fill(200), 4);
  bb.actor = 0;
  assert.equal(evaluateBaseline(bb, { type: "check" }).status, "ungraded");
});
test("feedback is independent of hidden opponent cards and future runout", () => {
  const s = trainingTable(42, 2);
  const before = evaluateBaseline(s, { type: "call" });
  s.pack.reverse();
  s.players.slice(1).forEach((p) => (p.hole = [0, 1]));
  assert.deepEqual(evaluateBaseline(s, { type: "call" }), before);
});
test("coached feedback restores by recomputation and legacy free sessions migrate", () => {
  const s = sessionAction(newSession("coached"), { type: "call" });
  assert.equal(s.coaching[0].status, "deviation");
  assert.deepEqual(decodeSession(encodeSession(s)), s);
  const legacy = JSON.parse(encodeSession(newSession()));
  legacy.version = 1;
  delete legacy.mode;
  assert.equal(decodeSession(JSON.stringify(legacy)).mode, "free");
  const bad = JSON.parse(encodeSession(newSession("coached")));
  bad.hand = 2;
  assert.throws(() => decodeSession(JSON.stringify(bad)));
});
test("coached practice repeats indefinitely without a bankroll stop and resets coverage", () => {
  let s = newSession("coached");
  for (let i = 0; i < 25; i++) {
    s = sessionAction(s, { type: "fold" });
    assert.ok(s.table.done);
    s = continueSession(s);
    assert.equal(s.hand, i + 2);
    assert.ok(s.table.initial.every((n) => n === 200));
    assert.equal(s.coaching.length, 0);
    assert.deepEqual(decodeSession(encodeSession(s)), s);
  }
});
