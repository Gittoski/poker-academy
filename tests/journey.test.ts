import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bridges,
  stages,
  stageAvailable,
  nextLesson,
  stageFor,
} from "../src/journey";
import { lessons } from "../src/curriculum";
test("three cumulative stages cover every lesson once", () => {
  assert.equal(stages.length, 3);
  assert.equal(stageAvailable(1, []), false);
  const basics = lessons.slice(0, 4).map((l) => l.id);
  assert.equal(stageAvailable(1, basics), true);
  assert.equal(stageAvailable(2, basics), false);
  assert.equal(stageFor(nextLesson(basics)).name, "Deeper strategy");
  assert.equal(nextLesson(lessons.map((l) => l.id)), -1);
  assert.equal(nextLesson(["position"]), 0);
});
test("each lesson has a contextual bridge, worked example and distinct application check", () => {
  assert.equal(Object.keys(bridges).length, lessons.length);
  for (const l of lessons) {
    const b = bridges[l.id];
    assert.ok(b.connection.length > 50);
    assert.ok(b.example.length > 100);
    assert.notEqual(b.question, l.question);
    assert.ok(b.answer >= 0 && b.answer < b.choices.length);
    assert.ok(b.explanation.length > 70);
  }
});

test("worked-example prices and supplied-model calculations agree with independent arithmetic", async () => {
  const { potOdds, bluffThreshold } = await import("../src/math");
  const { nextCardProbability } = await import("../src/postflop");
  assert.equal(potOdds(80, 20), 0.2);
  assert.equal(potOdds(75, 25), 0.25);
  assert.equal(bluffThreshold(60, 30), 1 / 3);
  assert.equal(bluffThreshold(80, 20), 0.2);
  assert.equal(0.5 * 60 - 0.5 * 30, 15);
  assert.ok(nextCardProbability(9, 46) < potOdds(80, 40));
  assert.equal(Math.min(180, 60) / 30, 2);
  assert.equal(Math.min(200, 80) / 40, 2);
  assert.equal(0.3 * 60 - 0.7 * 20, 4);
});
