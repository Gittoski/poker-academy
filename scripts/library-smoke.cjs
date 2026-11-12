const { chromium, options } = require("./browser.cjs");
const AxeBuilder = require("@axe-core/playwright").default;
const { require: load } = require("tsx/cjs/api");
const { newSession } = load("../src/simulatorSession.ts", __filename);
const { firstIn } = load("../src/preflop.ts", __filename);
const { heroPosition, handClass } = load("../src/baselineCoach.ts", __filename);
(async () => {
  const b = await chromium.launch(options);
  try {
    const context = await b.newContext({
      viewport: { width: 390, height: 844 },
      reducedMotion: "reduce",
    });
    const p = await context.newPage();
    await p.goto(process.env.POKER_TEST_URL || "http://127.0.0.1:8765");
    await p.getByRole("button", { name: "Table", exact: true }).click();
    await p.getByRole("button", { name: "Coached hands", exact: true }).click();
    await p.getByRole("button", { name: "Call 2", exact: true }).click();
    await p
      .getByRole("button", { name: "Retry this decision", exact: true })
      .click();
    const s = newSession("coached");
    const expected = firstIn(
      heroPosition(s.table.button),
      handClass(s.table.players[0].hole),
    );
    if (expected === "Fold")
      await p.getByRole("button", { name: "Fold", exact: true }).click();
    else {
      await p.getByLabel("Raise total in chips").fill("5");
      await p
        .getByRole("button", { name: "Raise to amount", exact: true })
        .click();
    }
    for (let i = 0; i < 40; i++) {
      if (await p.getByText("Hand complete", { exact: true }).count()) break;
      const c = p.getByRole("button", { name: /^Call \d+$/ });
      if (await c.count()) await c.click();
      else await p.getByRole("button", { name: "Check", exact: true }).click();
    }
    await p.getByRole("button", { name: "Next hand", exact: true }).click();
    await p.getByText("YOUR POSITION · HJ", { exact: true }).waitFor();
    const original = await p.evaluate(() => {
      const s = JSON.parse(localStorage.getItem("poker-academy.table.v1"));
      return JSON.stringify([s.seed, s.button, s.stacks, s.actions, s.hand]);
    });
    await p
      .getByRole("button", { name: "Saved hands & practice", exact: true })
      .click();
    await p.getByText("Your simulator notebook", { exact: true }).waitFor();
    await p.getByText("MATCHED ON LATEST ATTEMPT", { exact: true }).waitFor();
    await p.getByText(/Retained first tries: 0\/1 matched/).waitFor();
    const scan = await new AxeBuilder({ page: p })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    if (scan.violations.length)
      throw Error(JSON.stringify(scan.violations.map((v) => v.id)));
    await p
      .getByRole("button", { name: /^Practice saved spot / })
      .first()
      .click();
    await p.getByRole("button", { name: "Call 2", exact: true }).click();
    await p
      .getByRole("button", { name: "Return to live table", exact: true })
      .click();
    await p.getByText("YOUR POSITION · HJ", { exact: true }).waitFor();
    const restored = await p.evaluate(() => {
      const s = JSON.parse(localStorage.getItem("poker-academy.table.v1"));
      return JSON.stringify([s.seed, s.button, s.stacks, s.actions, s.hand]);
    });
    if (original !== restored) throw Error("Practice altered live table");
    await p
      .getByRole("button", { name: "Saved hands & practice", exact: true })
      .click();
    await p.getByRole("button", { name: "Saved hands", exact: true }).click();
    await p
      .getByRole("button", { name: /^Review hand 1/ })
      .first()
      .click();
    await p.getByText("Your decision at this point", { exact: true }).waitFor();
    await p.getByText("Not dealt yet", { exact: true }).waitFor();
    await p
      .getByRole("button", { name: "Show review chart", exact: true })
      .click();
    await p.getByText("Chart for this decision", { exact: true }).waitFor();
    await p
      .getByRole("button", {
        name: "Practice this saved decision",
        exact: true,
      })
      .click();
    await p
      .getByRole("button", { name: "Return to live table", exact: true })
      .click();
    await p.reload();
    await p.getByRole("button", { name: "Table", exact: true }).click();
    await p
      .getByRole("button", { name: "Saved hands & practice", exact: true })
      .click();
    await p.getByRole("button", { name: "Saved hands", exact: true }).click();
    await p
      .getByRole("button", { name: /^Review hand 1/ })
      .first()
      .waitFor();
    await p.screenshot({
      path: "/tmp/poker-saved-hand-library.png",
      fullPage: true,
    });
    console.log(
      "PASS saved hand review, troublesome tracking, separate retry statistics, exact saved-spot practice and live-table restoration",
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
