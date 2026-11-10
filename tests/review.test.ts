import { test } from "node:test";
import assert from "node:assert/strict";
import { reviewQueue } from "../src/review";
import { freshProgress, record } from "../src/progress";
test("weakest-topic queue targets actual matching exercises and falls back safely", () => {
  let p = freshProgress();
  assert.equal(reviewQueue(p)[0].topic, "Pot odds");
  p = record(record(p, "Pot odds", true), "Draws", false);
  assert.ok(reviewQueue(p).every((d) => d.topic === "Draws"));
  p = record(freshProgress(), "Unknown imported topic", false);
  assert.ok(reviewQueue(p).length > 0);
});
