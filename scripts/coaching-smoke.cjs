const { chromium, options } = require("./browser.cjs");
const AxeBuilder = require("@axe-core/playwright").default;
const { require: load } = require("tsx/cjs/api");
const { newSession } = load("../src/simulatorSession.ts", __filename);
const { firstIn } = load("../src/preflop.ts", __filename);
const { handClass, heroPosition } = load("../src/baselineCoach.ts", __filename);
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
    await p.getByText("YOUR POSITION · LJ (UTG)", { exact: true }).waitFor();
    await p.getByRole("button", { name: "Call 2", exact: true }).click();
    await p.getByText("Outside teaching baseline", { exact: true }).waitFor();
    await p
      .getByRole("button", { name: "Hide coaching explanation", exact: true })
      .waitFor();
    await p.getByText(/not a GTO error or an EV-loss calculation/).waitFor();
    await p.reload();
    await p.getByRole("button", { name: "Table", exact: true }).click();
    await p.getByText("Outside teaching baseline", { exact: true }).waitFor();
    for (let i = 0; i < 40; i++) {
      if (await p.getByText("Hand complete", { exact: true }).count()) break;
      const call = p.getByRole("button", { name: /^Call \d+$/ });
      if (await call.count()) await call.click();
      else await p.getByRole("button", { name: "Check", exact: true }).click();
    }
    await p.getByRole("button", { name: "Next hand", exact: true }).click();
    await p.getByText("YOUR POSITION · HJ", { exact: true }).waitFor();
    await p.getByRole("button", { name: "Free table", exact: true }).click();
    await p.getByRole("button", { name: "Coached hands", exact: true }).click();
    const s = newSession("coached");
    const expected = firstIn(
      heroPosition(s.table.button),
      handClass(s.table.players[0].hole),
    );
    if (expected === "Fold")
      await p.getByRole("button", { name: "Fold", exact: true }).click();
    else {
      await p
        .getByRole("button", { name: "Bet / raise options", exact: true })
        .click();
      await p.getByLabel("Raise total in chips").fill("5");
      await p
        .getByRole("button", { name: "Raise to amount", exact: true })
        .click();
    }
    await p.getByText("Matches teaching baseline", { exact: true }).waitFor();
    await p
      .getByRole("button", { name: "Table details & history", exact: true })
      .click();
    await p.getByText("Decision review", { exact: true }).waitFor();
    const scan = await new AxeBuilder({ page: p })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    if (scan.violations.length)
      throw Error(JSON.stringify(scan.violations.map((v) => v.id)));
    await p.screenshot({
      path: "/tmp/poker-coached-session.png",
      fullPage: true,
    });
    console.log(
      "PASS coached baseline deviation/match, nonblocking play, scoped explanation, persisted feedback and rotating next hand",
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
