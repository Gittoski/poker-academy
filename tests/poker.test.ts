import { test } from "node:test";
import assert from "node:assert/strict";
import { five, best, compare, deck } from "../src/poker";
const cards = (s: string) =>
  s
    .split(" ")
    .map((c) => "23456789TJQKA".indexOf(c[0]) * 4 + "cdhs".indexOf(c[1]));
test("wheel, kickers, board plays and two triplets", () => {
  assert.deepEqual(five(cards("Ac 2c 3c 4c 5c")), [8, 5]);
  assert.deepEqual(best(cards("Ac Ad Ah Kc Kd Kh 2s")), [6, 14, 13]);
  assert.ok(
    compare(
      best(cards("Ac Ad Kc Kd Qs 2s 3s")),
      best(cards("Ah As Kh Ks Jc 2h 3h")),
    ) > 0,
  );
  assert.equal(
    compare(
      best(cards("Ac Kc Qc Jc Tc 2d 3d")),
      best(cards("Ac Kc Qc Jc Tc 4h 5h")),
    ),
    0,
  );
  assert.deepEqual(best(cards("Ac Kc Qc Jc 9c Tc 2d")), [8, 14]);
});
test("duplicate and malformed cards rejected", () => {
  assert.throws(() => best([0, 0, 1, 2, 3]));
  assert.throws(() => five([0, 1, 2, 3, 52]));
  assert.throws(() => best([0, 1, 2, 3]));
  assert.equal(new Set(deck()).size, 52);
});
test("all 2,598,960 five-card combinations match standard category frequencies", () => {
  const counts = Array(9).fill(0);
  for (let a = 0; a < 48; a++)
    for (let b = a + 1; b < 49; b++)
      for (let c = b + 1; c < 50; c++)
        for (let d = c + 1; d < 51; d++)
          for (let e = d + 1; e < 52; e++) counts[five([a, b, c, d, e])[0]]++;
  assert.deepEqual(
    counts,
    [1302540, 1098240, 123552, 54912, 10200, 5108, 3744, 624, 40],
  );
});
