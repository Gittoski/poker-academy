import { test } from "node:test";
import assert from "node:assert/strict";
import {
  hands,
  positions,
  ranges,
  firstIn,
  preflopDrill,
} from "../src/preflop";
test("169 distinct canonical hands cover 1326 combinations", () => {
  assert.equal(new Set(hands).size, 169);
  assert.equal(
    hands.reduce(
      (n, h) => n + (h.length === 2 ? 6 : h.endsWith("s") ? 4 : 12),
      0,
    ),
    1326,
  );
});
test("ranges are explicit, legal, nested and position-sensitive", () => {
  positions.forEach((p, i) => {
    for (const h of ranges[p]) assert.ok(hands.includes(h));
    assert.equal(firstIn(p, "AA"), "Raise");
    assert.equal(firstIn(p, "72o"), "Fold");
    if (i)
      for (const h of ranges[positions[i - 1]]) assert.ok(ranges[p].has(h));
  });
  assert.equal(firstIn("UTG", "A5s"), "Fold");
  assert.equal(firstIn("CO", "A5s"), "Raise");
  assert.throws(() => firstIn("BB" as any, "AA"));
});
test("every scenario encodes its documented authored range", () => {
  for (let i = 0; i < 845; i++) {
    const d = preflopDrill(i);
    assert.equal(
      d.answer,
      firstIn(positions[i % 5], hands[Math.floor(i / 5)]) === "Raise" ? 0 : 1,
    );
    assert.match(d.explanation, /heuristic/);
  }
});
