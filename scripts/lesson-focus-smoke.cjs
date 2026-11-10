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
    await p.goto(process.env.POKER_TEST_URL || "http://127.0.0.1:8765");
    await p
      .getByRole("button", { name: "Start lesson 1 →", exact: true })
      .click();
    if (await p.getByText("YOUR JOURNEY", { exact: true }).count())
      throw Error("Dashboard distracts from active lesson");
    if (await p.getByRole("button", { name: "Table", exact: true }).count())
      throw Error("Unrelated navigation remains in active lesson");
    await p.getByText("Step 1 of 4 · Learn", { exact: true }).waitFor();
    await p
      .getByRole("button", { name: "See a worked example →", exact: true })
      .click();
    await p
      .getByRole("button", { name: "Check my understanding →", exact: true })
      .click();
    await p.getByRole("button", { name: "Exactly two", exact: true }).click();
    let wrong = p.getByRole("button", { name: "✕ Exactly two", exact: true });
    if (
      (await wrong.evaluate((el) => getComputedStyle(el).backgroundColor)) !==
      "rgb(82, 44, 54)"
    )
      throw Error("Incorrect selection is not red");
    await p.getByText("✕ Not quite", { exact: true }).waitFor();
    let a = await new AxeBuilder({ page: p })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    if (a.violations.length)
      throw Error(JSON.stringify(a.violations.map((v) => v.id)));
    await p.screenshot({ path: "/tmp/poker-focused-wrong.png" });
    await p
      .getByRole("button", { name: "Try this check again", exact: true })
      .click();
    await p
      .getByRole("button", { name: "Zero, one, or two", exact: true })
      .click();
    const correct = p.getByRole("button", {
      name: "✓ Zero, one, or two",
      exact: true,
    });
    if (
      (await correct.evaluate((el) => getComputedStyle(el).backgroundColor)) !==
      "rgb(23, 68, 47)"
    )
      throw Error("Correct selection is not green");
    await p.getByText("✓ Correct", { exact: true }).waitFor();
    await p.screenshot({ path: "/tmp/poker-focused-correct.png" });
    await p
      .getByRole("button", { name: "Apply this concept →", exact: true })
      .click();
    await p
      .getByRole("button", { name: "The pot is split", exact: true })
      .click();
    await p
      .getByRole("button", { name: "Finish lesson →", exact: true })
      .waitFor();
    if (
      await p
        .getByText("Lesson complete. Keep building.", { exact: true })
        .count()
    )
      throw Error("Final answer feedback skipped");
    await p
      .getByRole("button", { name: "Finish lesson →", exact: true })
      .click();
    await p
      .getByRole("button", { name: "← Learning path", exact: true })
      .click();
    await p.getByRole("button", { name: "Table", exact: true }).waitFor();
    await p.reload();
    await p.getByText("Level 1 · 20 XP", { exact: true }).waitFor();
    console.log(
      "PASS focused lesson, red/green feedback with text/icons, accessible error state, explicit finish, navigation restoration and saved XP",
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
