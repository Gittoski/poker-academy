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
