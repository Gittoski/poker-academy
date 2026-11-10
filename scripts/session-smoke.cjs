const { chromium, options } = require("./browser.cjs");
(async () => {
  const b = await chromium.launch(options);
  try {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } });
    await p.goto(process.env.POKER_TEST_URL || "http://127.0.0.1:8765");
    await p.getByRole("button", { name: "Table", exact: true }).click();
    for (let h = 0; h < 3; h++) {
      for (let i = 0; i < 40; i++) {
        if (await p.getByText("Hand complete", { exact: true }).count()) break;
        const call = p.getByRole("button", { name: /^Call \d+$/ });
        if (await call.count()) await call.click();
        else
          await p.getByRole("button", { name: "Check", exact: true }).click();
      }
      await p.getByText("Hand complete", { exact: true }).waitFor();
      await p.getByRole("button", { name: "Next hand", exact: true }).click();
    }
    await p
      .getByText("HAND 4 · BLINDS 1/2 · VIRTUAL CHIPS", { exact: true })
      .waitFor();
    const stored = await p.evaluate(() =>
      localStorage.getItem("poker-academy.table.v1"),
    );
    if (!stored || JSON.parse(stored).hand !== 4)
      throw Error("Table not saved");
    await p.getByRole("button", { name: "Learn", exact: true }).click();
    await p.getByRole("button", { name: "Table", exact: true }).click();
    await p
      .getByText("HAND 4 · BLINDS 1/2 · VIRTUAL CHIPS", { exact: true })
      .waitFor();
    await p.reload();
    await p.getByRole("button", { name: "Table", exact: true }).click();
    await p
      .getByText("HAND 4 · BLINDS 1/2 · VIRTUAL CHIPS", { exact: true })
      .waitFor();
    const restored = await p.evaluate(() =>
      localStorage.getItem("poker-academy.table.v1"),
    );
    if (stored !== restored) throw Error("Table changed on restore");
    await p
      .getByRole("button", { name: "Table details & history", exact: true })
      .click();
    await p.getByText("Action history", { exact: true }).waitFor();
    console.log(
      "PASS continuous hands, saved table across tabs and reload, optional history",
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
