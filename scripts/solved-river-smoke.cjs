const { chromium, options } = require("./browser.cjs");
const AxeBuilder = require("@axe-core/playwright").default;
(async () => {
  const b = await chromium.launch(options);
  try {
    const context = await b.newContext({
      viewport: { width: 390, height: 844 },
      reducedMotion: "reduce",
    });
    const p = await context.newPage();
    const errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(process.env.POKER_TEST_URL || "http://127.0.0.1:8765");
    await p.getByRole("button", { name: "Solved river", exact: true }).click();
    await p
      .getByRole("button", { name: "Show live strategy chart", exact: true })
      .click();
    const live = p.getByTestId("solved-decision-chart");
    await live.getByText("BTN vs BB · node 0 · K2s", { exact: true }).waitFor();
    await live
      .getByText("Check: 100.0% · loss 0.000 BB", { exact: true })
      .waitFor();
    await live
      .getByRole("button", { name: "Solve details & assumptions", exact: true })
      .click();
    await live.getByText(/23100 DCFR iterations/).waitFor();
    await p
      .getByRole("button", { name: "Bet / raise options", exact: true })
      .click();
    await p.getByRole("button", { name: "Bet 11 chips", exact: true }).click();
    await p.getByText("Lower value in this solve", { exact: true }).waitFor();
    await p
      .getByText(/Calculated loss versus the best available action/)
      .waitFor();
    await p
      .getByRole("button", { name: "Show decision chart", exact: true })
      .click();
    await p
      .getByTestId("simulator-coach-feedback")
      .getByText("BTN vs BB · node 0 · K2s", { exact: true })
      .waitFor();
    await p
      .getByRole("button", { name: "Retry this decision", exact: true })
      .click();
    await p.getByText("Retrying the same decision", { exact: true }).waitFor();
    await p.reload();
    await p.getByText("Retrying the same decision", { exact: true }).waitFor();
    await p.getByRole("button", { name: "Check", exact: true }).click();
    await p.getByText("Within solved tolerance", { exact: true }).waitFor();
    await p.getByRole("button", { name: "Next hand", exact: true }).click();
    await p
      .getByRole("button", { name: "Show live strategy chart", exact: true })
      .click();
    await p
      .getByTestId("solved-decision-chart")
      .getByText(/BTN vs BB · node 1 ·/)
      .waitFor();
    await p
      .getByRole("button", { name: "Bet / raise options", exact: true })
      .click();
    await p
      .getByRole("button", { name: "Raise to 15 chips", exact: true })
      .waitFor();
    await p.getByLabel("Raise total in chips").fill("16");
    await p
      .getByRole("button", { name: "Raise to amount", exact: true })
      .click();
    await p.getByText("Size outside solved tree", { exact: true }).waitFor();
    await p
      .getByRole("button", { name: "Saved hands & practice", exact: true })
      .click();
    await p.getByText("MATCHED ON LATEST ATTEMPT", { exact: true }).waitFor();
    await p
      .getByRole("button", { name: /^Practice saved spot/ })
      .first()
      .click();
    await p
      .getByRole("button", { name: "Return to live table", exact: true })
      .waitFor();
    await p.getByRole("button", { name: "Check", exact: true }).click();
    await p
      .getByRole("button", { name: "Return to live hand", exact: true })
      .click();
    await p
      .getByRole("button", { name: "Saved hands & practice", exact: true })
      .click();
    await p.getByRole("button", { name: "Saved hands", exact: true }).click();
    await p
      .getByRole("button", { name: /^Review hand/ })
      .first()
      .click();
    for (let i = 0; i < 11; i++)
      await p.getByRole("button", { name: "Next action", exact: true }).click();
    await p
      .getByRole("button", { name: "Show review chart", exact: true })
      .click();
    await p.getByTestId("solved-decision-chart").waitFor();
    for (const width of [320, 390, 768]) {
      await p.setViewportSize({ width, height: 844 });
      const overflow = await p.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      );
      if (overflow) throw Error(`Solved chart overflows at ${width}px`);
    }
    const scan = await new AxeBuilder({ page: p })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    if (scan.violations.length)
      throw Error(
        JSON.stringify(
          scan.violations.map((v) => ({
            id: v.id,
            targets: v.nodes.map((n) => n.target),
          })),
        ),
      );
    if (errors.length) throw Error(errors.join("\n"));
    await p.screenshot({ path: "/tmp/poker-solved-river.png", fullPage: true });
    console.log(
      "PASS calculated river charts, node changes, deviations, exact retry/reload, off-tree sizes, notebook, saved review and responsive/accessibility checks",
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
