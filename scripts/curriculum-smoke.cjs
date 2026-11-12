const { chromium, options } = require("./browser.cjs");
const { require: load } = require("tsx/cjs/api");
const { lessons } = load("../src/curriculum.ts", __filename);
const { bridges } = load("../src/journey.ts", __filename);
(async () => {
  const b = await chromium.launch(options);
  try {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } });
    await p.goto(process.env.POKER_TEST_URL || "http://127.0.0.1:8765");
    await p.getByRole("button", { name: "Learn", exact: true }).click();
    await p
      .getByRole("button", { name: "Start lesson 1 →", exact: true })
      .click();
    for (let i = 0; i < lessons.length; i++) {
      const l = lessons[i];
      const bridge = bridges[l.id];
      await p.getByText("One idea to learn", { exact: true }).waitFor();
      await p
        .getByRole("button", { name: "See a worked example →", exact: true })
        .click();
      await p.getByText(bridge.example, { exact: true }).waitFor();
      await p
        .getByRole("button", { name: "Check my understanding →", exact: true })
        .click();
      if (i === 0) {
        await p
          .getByRole("button", { name: "Exactly two", exact: true })
          .click();
        await p.getByText(/Not quite/).waitFor();
        await p
          .getByRole("button", { name: "Try this check again", exact: true })
          .click();
      }
      await p
        .getByRole("button", { name: l.choices[l.answer], exact: true })
        .click();
      await p
        .getByRole("button", { name: "Apply this concept →", exact: true })
        .click();
      await p.getByText(bridge.question, { exact: true }).waitFor();
      if (i === 0) {
        await p
          .getByRole("button", {
            name: "The opponent wins with a pair",
            exact: true,
          })
          .click();
        await p
          .getByRole("button", { name: "Try this check again", exact: true })
          .click();
      }
      await p
        .getByRole("button", {
          name: bridge.choices[bridge.answer],
          exact: true,
        })
        .click();
      await p.getByText("✓ Correct", { exact: true }).waitFor();
      await p
        .getByRole("button", { name: "Finish lesson →", exact: true })
        .click();
      await p
        .getByText("Lesson complete. Keep building.", { exact: true })
        .waitFor();
      if (i < lessons.length - 1) {
        await p
          .getByRole("button", {
            name: `Continue to lesson ${i + 2} →`,
            exact: true,
          })
          .click();
      }
    }
    await p.reload();
    await p.getByRole("button", { name: "Learn", exact: true }).click();
    await p.getByText("PATH COMPLETE", { exact: true }).waitFor();
    await p.getByText("Level 3 · 240 XP", { exact: true }).waitFor();
    console.log(
      "PASS all 12 guided lessons, wrong-answer retries, two required checks, cross-stage continuation and persisted completion",
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
