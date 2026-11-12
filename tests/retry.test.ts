import { test } from "node:test";
import assert from "node:assert/strict";
import {
  newSession,
  sessionAction,
  retryDecision,
  currentDecision,
  encodeSession,
  decodeSession,
  continueSession,
  practiceDecision,
  returnToLive,
  reviewStates,
  MAX_ATTEMPTS,
  MAX_HANDS,
} from "../src/simulatorSession";
import { legal } from "../src/table";
test("retry restores exact hidden/public state and repeating an action gives the same runout", () => {
  const original = newSession("coached");
  const played = sessionAction(original, { type: "call" });
  const id = played.attempts.at(-1)!.id;
  const retry = retryDecision(played, id);
  assert.deepEqual(retry.table, original.table);
  assert.equal(retry.practice, true);
  assert.equal(currentDecision(retry), undefined);
  assert.deepEqual(decodeSession(encodeSession(retry)), retry);
  const repeated = sessionAction(retry, { type: "call" });
  assert.deepEqual(repeated.table, played.table);
  assert.equal(repeated.attempts.at(-1)!.retryOf, id);
  assert.equal(repeated.attempts.at(-1)!.practice, true);
  assert.equal(repeated.attempts[0].practice, false);
});
test("archived branches remain reviewable and retries do not overwrite the original result", () => {
  const original = newSession("coached");
  let s = sessionAction(original, { type: "fold" });
  assert.equal(s.archive.length, 1);
  const states = reviewStates(s.archive[0]);
  assert.ok(states.at(-1)!.done);
  s = retryDecision(s, s.attempts[0].id);
  s = sessionAction(s, { type: "call" });
  while (!s.table.done)
    s = sessionAction(
      s,
      legal(s.table).call ? { type: "call" } : { type: "check" },
    );
  assert.equal(s.archive.length, 2);
  assert.equal(s.archive[0].practice, false);
  assert.equal(s.archive[1].practice, true);
  assert.deepEqual(decodeSession(encodeSession(s)), s);
});
test("saved-spot practice leaves the live cursor intact and survives reload", () => {
  let s = sessionAction(newSession("coached"), { type: "fold" });
  const target = s.attempts[0].id;
  s = continueSession(s);
  const live = s.table;
  const liveHand = s.hand;
  let p = practiceDecision(s, target);
  p = sessionAction(p, { type: "call" });
  p = decodeSession(encodeSession(p));
  const restored = returnToLive(p);
  assert.deepEqual(restored.table, live);
  assert.equal(restored.hand, liveHand);
  assert.ok(restored.attempts.length > s.attempts.length);
  assert.equal(restored.resume, null);
});
test("resets preserve retained learning evidence and review limits hold", () => {
  let s = newSession("coached");
  for (let i = 0; i < 230; i++) {
    s = sessionAction(s, { type: "fold" });
    s = continueSession(s);
  }
  assert.equal(s.attempts.length, MAX_ATTEMPTS);
  assert.equal(s.archive.length, MAX_HANDS);
  const reset = newSession("free", s);
  assert.deepEqual(reset.attempts, s.attempts);
  assert.deepEqual(reset.archive, s.archive);
  assert.deepEqual(decodeSession(encodeSession(reset)), reset);
});
test("v3 library rejects invalid checkpoints, forged archives and duplicate identifiers", () => {
  const s = sessionAction(newSession("coached"), { type: "fold" });
  let p = JSON.parse(encodeSession(s));
  p.attempts[0].before.actions = [{ type: "raise", to: -1 }];
  assert.throws(() => decodeSession(JSON.stringify(p)));
  p = JSON.parse(encodeSession(s));
  p.archive[0].record.actions = [];
  assert.throws(() => decodeSession(JSON.stringify(p)));
  p = JSON.parse(encodeSession(s));
  p.archive[0].id = p.attempts[0].id;
  assert.throws(() => decodeSession(JSON.stringify(p)));
});

test("troublesome spots survive correct practice without inflating first-try matches", async () => {
  const { troublesomeSpots, markDecision } =
    await import("../src/simulatorSession");
  let s = sessionAction(newSession("coached"), { type: "call" });
  const id = s.attempts[0].id;
  let groups = troublesomeSpots(s);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].firstTries, 1);
  assert.equal(groups[0].firstMatches, 0);
  s = retryDecision(s, id);
  const { firstIn } = await import("../src/preflop");
  const { heroPosition, handClass } = await import("../src/baselineCoach");
  const expected = firstIn(
    heroPosition(s.table.button) as any,
    handClass(s.table.players[0].hole),
  );
  s = sessionAction(
    s,
    expected === "Fold" ? { type: "fold" } : { type: "raise", to: 5 },
  );
  groups = troublesomeSpots(decodeSession(encodeSession(s)));
  assert.equal(groups.length, 1);
  assert.equal(groups[0].firstTries, 1);
  assert.equal(groups[0].firstMatches, 0);
  assert.equal(groups[0].retries, 1);
  assert.equal(groups[0].latest.feedback.status, "match");
  const free = sessionAction(newSession(), { type: "call" });
  assert.equal(free.attempts[0].feedback.status, "ungraded");
  assert.equal(troublesomeSpots(free).length, 0);
  assert.equal(
    troublesomeSpots(markDecision(free, free.attempts[0].id)).length,
    1,
  );
});
test("archived decision practice restores the original moment and then returns to live play", async () => {
  const { practiceReviewedDecision } = await import("../src/simulatorSession");
  const initial = newSession("coached");
  let s = sessionAction(initial, { type: "fold" });
  const archiveId = s.archive[0].id;
  s = continueSession(s);
  const live = s.table;
  s = practiceReviewedDecision(s, archiveId, initial.table.actions.length);
  assert.deepEqual(s.table, initial.table);
  assert.equal(s.practice, true);
  assert.ok(s.resume);
  assert.deepEqual(returnToLive(decodeSession(encodeSession(s))).table, live);
  assert.throws(() => practiceReviewedDecision(s, archiveId, -1));
});
