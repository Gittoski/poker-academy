import { test } from "node:test";
import assert from "node:assert/strict";
import {
  nextCardProbability,
  byRiverProbability,
  postflop,
} from "../src/postflop";
import { potOdds } from "../src/math";
test("draw probabilities are events rather than equity estimates", () => {
  assert.equal(nextCardProbability(9), 9 / 47);
  assert.ok(
    Math.abs(byRiverProbability(9) - (1 - (38 * 37) / (47 * 46))) < 1e-12,
  );
  assert.equal(byRiverProbability(0), 0);
  assert.equal(byRiverProbability(47), 1);
  assert.throws(() => nextCardProbability(48));
  assert.throws(() => nextCardProbability(-1));
  assert.throws(() => byRiverProbability(1, 1));
});
test("postflop arithmetic independently agrees with hand-calculated cases", () => {
  assert.equal(potOdds(60, 20), 0.25);
  assert.ok(9 / 46 < potOdds(80, 40));
  assert.equal(0.4 * 80 - 0.6 * 40, 8);
  assert.equal((3 / 12) * 60 - (9 / 12) * 20, 0);
});
test("scenarios have stack/street context, distinct IDs, valid answers and explanations", () => {
  assert.equal(new Set(postflop.map((d) => d.id)).size, 8);
  for (const d of postflop) {
    assert.match(d.question, /Flop|Turn|River/);
    assert.ok(d.answer >= 0 && d.answer < d.choices.length);
    assert.ok(d.explanation.length > 100);
  }
});
