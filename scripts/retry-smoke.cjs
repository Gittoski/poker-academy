const { chromium, options } = require("./browser.cjs");
(async () => {
  const b = await chromium.launch(options);
  try {
    const p = await b.newPage({
      viewport: { width: 390, height: 844 },
      reducedMotion: "reduce",
    });
    await p.goto(process.env.POKER_TEST_URL || "http://127.0.0.1:8765");
    await p.getByRole("button", { name: "Table", exact: true }).click();
    await p.getByRole("button", { name: "Coached hands", exact: true }).click();
    await p.getByRole("button", { name: "Call 2", exact: true }).click();
    await p
      .getByRole("button", { name: "Show decision chart", exact: true })
      .click();
    await p.getByText("Chart for this decision", { exact: true }).waitFor();
    await p
      .getByRole("button", { name: "Retry this decision", exact: true })
      .click();
    await p.getByText("Retrying the same decision", { exact: true }).waitFor();
    await p.getByRole("button", { name: "Call 2", exact: true }).waitFor();
    await p.reload();
    await p.getByRole("button", { name: "Table", exact: true }).click();
    await p.getByText("Retrying the same decision", { exact: true }).waitFor();
    await p.getByRole("button", { name: "Call 2", exact: true }).click();
    await p.getByText("Outside teaching baseline", { exact: true }).waitFor();
    await p
      .getByRole("button", { name: "Mark troublesome", exact: true })
      .click();
    await p
      .getByRole("button", { name: "Unmark troublesome", exact: true })
      .waitFor();
    console.log(
      "PASS decision chart, exact retry through reload, and manual troublesome marking",
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
