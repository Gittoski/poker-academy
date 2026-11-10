import { test } from "node:test";
import assert from "node:assert/strict";
import { profiles, exploits } from "../src/opponents";
test("all five profiles separate evidence, advice and counter-risk", () => {
  assert.deepEqual(
    profiles.map((p) => p.id),
    ["loose", "tight", "passive", "aggressive", "station"],
  );
  for (const p of profiles)
    for (const v of [p.observation, p.adjustment, p.risk])
      assert.ok(v.length > 65);
});
test("each exploit exposes a hypothesis rather than invented solver frequencies", () => {
  assert.equal(new Set(exploits.map((d) => d.id)).size, exploits.length);
  for (const d of exploits) {
    assert.ok(d.answer >= 0 && d.answer < d.choices.length);
    assert.match(d.explanation, /heuristic|inference/);
    assert.match(d.question, /Assumed observation|ONE fold/);
  }
});
