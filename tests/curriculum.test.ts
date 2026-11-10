import { test } from "node:test";
import assert from "node:assert/strict";
import { lessons, unlocked } from "../src/curriculum";
import { freshProgress, completeLesson, decodeProgress } from "../src/progress";
test("curriculum contains unique, complete beginner-to-advanced lessons", () => {
  assert.equal(new Set(lessons.map((l) => l.id)).size, 12);
  assert.deepEqual(
    new Set(lessons.map((l) => l.stage)),
    new Set(["Beginner", "Intermediate", "Advanced"]),
  );
  for (const l of lessons) {
    assert.ok(l.body.length > 200);
    assert.ok(l.answer >= 0 && l.answer < l.choices.length);
    assert.ok(l.explanation && l.basis);
  }
});
test("prerequisites, one-time XP and completion survive reload", () => {
  const p = freshProgress();
  assert.ok(unlocked(0, []));
  assert.equal(unlocked(1, []), false);
  const next = completeLesson(p, "rules");
  assert.ok(unlocked(1, next.completed!));
  assert.equal(next.xp, 20);
  assert.equal(completeLesson(next, "rules"), next);
  assert.deepEqual(decodeProgress(JSON.stringify(next)), next);
  assert.deepEqual(p.completed, []);
});
test("every prior prerequisite is required, including imported gaps", () => {
  assert.equal(unlocked(2, ["position"]), false);
  assert.equal(unlocked(-1, []), false);
  assert.equal(
    unlocked(
      12,
      lessons.map((l) => l.id),
    ),
    false,
  );
});
