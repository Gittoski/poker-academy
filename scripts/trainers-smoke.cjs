const { chromium, options } = require("./browser.cjs");
(async () => {
  const b = await chromium.launch(options);
  try {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    p.on("pageerror", (e) => errors.push(e));
    await p.goto(process.env.POKER_TEST_URL || "http://127.0.0.1:8765");
    await p.getByRole("button", { name: "Practice", exact: true }).click();
    await p.getByRole("button", { name: "Preflop", exact: true }).click();
    await p.getByRole("button", { name: "Raise", exact: true }).click();
    await p
      .getByText("Matches this exercise · +10 XP", { exact: true })
      .waitFor();
    await p
      .getByRole("button", { name: "Next scenario →", exact: true })
      .click();
    await p.getByText(/HJ · AA/).waitFor();
    await p.getByRole("button", { name: "Postflop", exact: true }).click();
    await p.getByRole("button", { name: "25%", exact: true }).click();
    await p
      .getByText("Matches this exercise · +10 XP", { exact: true })
      .waitFor();
    await p.getByRole("button", { name: "Exploits", exact: true }).click();
    await p
      .getByRole("button", {
        name: "Only their preflop participation is loose",
        exact: true,
      })
      .click();
    await p
      .getByText("Matches this exercise · +10 XP", { exact: true })
      .waitFor();
    if (errors.length) throw Error(errors.join("\n"));
    console.log("PASS preflop choices and scenario advance");
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
