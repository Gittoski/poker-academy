const { chromium, options } = require("./browser.cjs");
(async () => {
  const b = await chromium.launch(options);
  try {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } });
    await p.goto(process.env.POKER_TEST_URL || "http://127.0.0.1:8765");
    await p
      .getByRole("button", {
        name: /Beginner.*Available.*1\. The best five cards/,
      })
      .click();
    await p
      .getByRole("button", { name: "Zero, one, or two", exact: true })
      .click();
    await p.getByText(/Correct. Lesson complete./).waitFor();
    await p.reload();
    await p
      .getByRole("button", {
        name: /Beginner.*Completed.*1\. The best five cards/,
      })
      .waitFor();
    await p
      .getByRole("button", { name: /Beginner.*Available.*2\. Six seats/ })
      .waitFor();
    console.log("PASS curriculum completion, prerequisites and reload");
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
