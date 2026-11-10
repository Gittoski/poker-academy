import { test } from "node:test";
import assert from "node:assert/strict";
import {
  newSession,
  sessionAction,
  continueSession,
  encodeSession,
  decodeSession,
} from "../src/simulatorSession";
import { legal, createTable } from "../src/table";
test("table sessions replay exactly across storage and reject corrupt actions", () => {
  const s = newSession();
  assert.deepEqual(decodeSession(encodeSession(s)), s);
  const next = sessionAction(
    s,
    legal(s.table).call ? { type: "call" } : { type: "check" },
  );
  assert.deepEqual(decodeSession(encodeSession(next)), next);
  assert.throws(() => decodeSession("{bad"));
  const missing = JSON.parse(encodeSession(s));
  delete missing.stacks;
  assert.throws(() => decodeSession(JSON.stringify(missing)));
  const bad = JSON.parse(encodeSession(s));
  bad.actions = [{ type: "win" }];
  assert.throws(() => decodeSession(JSON.stringify(bad)));
  bad.actions = Array(2049).fill({ type: "call" });
  assert.throws(() => decodeSession(JSON.stringify(bad)));
});
test("continuous practice refills busted seats without losing accounting", () => {
  let table = createTable(1, [1, 1, 0, 0, 0, 0]);
  assert.ok(table.done);
  const s = { version: 1 as const, hand: 7, refills: 0, table };
  const busted = table.players.filter((p) => p.stack <= 2).length;
  const next = continueSession(s);
  assert.equal(next.hand, 8);
  assert.equal(next.refills, busted);
  assert.equal(
    next.table.players.reduce((n, p) => n + p.stack + p.total, 0),
    2 +
      table.players.reduce((n, p) => n + (p.stack <= 2 ? 200 - p.stack : 0), 0),
  );
  assert.deepEqual(decodeSession(encodeSession(next)), next);
});
test("100 consecutive practice hands keep hero funded and restore correctly", () => {
  let s = newSession();
  for (let h = 0; h < 100; h++) {
    let actions = 0;
    while (!s.table.done && actions++ < 300) {
      const l = legal(s.table);
      s = sessionAction(s, l.call ? { type: "call" } : { type: "check" });
    }
    assert.ok(s.table.done);
    s = continueSession(s);
    assert.equal(s.hand, h + 2);
    assert.ok(s.table.players[0].stack + s.table.players[0].total > 0);
    assert.deepEqual(decodeSession(encodeSession(s)), s);
  }
  assert.throws(() => continueSession(newSession()));
});
