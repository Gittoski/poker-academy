import { test } from "node:test";
import assert from "node:assert/strict";
import { seatPosition } from "../src/positions";
test("all six physical seats rotate through LJ/HJ/CO/BTN/SB/BB correctly", () => {
  for (let b = 0; b < 6; b++) {
    const names = Array.from({ length: 6 }, (_, i) => seatPosition(b, i));
    assert.equal(new Set(names).size, 6);
    assert.equal(names[b], "BTN");
    assert.equal(names[(b + 1) % 6], "SB");
    assert.equal(names[(b + 2) % 6], "BB");
    assert.equal(names[(b + 3) % 6], "LJ");
    assert.equal(names[(b + 4) % 6], "HJ");
    assert.equal(names[(b + 5) % 6], "CO");
  }
  assert.throws(() => seatPosition(-1, 0));
  assert.throws(() => seatPosition(0, 6));
});
