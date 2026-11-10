const { chromium, options } = require("./browser.cjs");
const AxeBuilder = require("@axe-core/playwright").default;
(async () => {
  const b = await chromium.launch(options);
  try {
    const context = await b.newContext({
      viewport: { width: 390, height: 844 },
    });
    const p = await context.newPage();
    await p.goto(process.env.POKER_TEST_URL || "http://127.0.0.1:8765");
    await p.evaluate(() => navigator.serviceWorker.ready);
    await p.reload();
    await p.waitForFunction(() => !!navigator.serviceWorker.controller);
    await p.getByRole("button", { name: "Practice", exact: true }).click();
    await p.getByRole("button", { name: "25%", exact: true }).click();
    await context.setOffline(true);
    await p.reload();
    await p.getByText("Level 1 · 10 XP", { exact: true }).waitFor();
    await p.getByRole("button", { name: "Practice", exact: true }).click();
    await p.getByRole("button", { name: "Preflop", exact: true }).click();
    await p.getByRole("button", { name: "Raise", exact: true }).click();
    await p
      .getByText("Matches this exercise · +10 XP", { exact: true })
      .waitFor();
    await p.reload();
    await p.getByText("Level 1 · 20 XP", { exact: true }).waitFor();
    await context.setOffline(false);
    for (const width of [320, 390, 768]) {
      await p.setViewportSize({ width, height: 900 });
      for (const tab of ["Learn", "Practice", "Table", "Progress"]) {
        await p.getByRole("button", { name: tab, exact: true }).click();
        // Scan the resting screen, after its 220 ms entrance transition.
        await p.waitForTimeout(350);
        const overflow = await p.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth,
        );
        if (overflow) throw Error(`${tab} overflows at ${width}px`);
        const a = await new AxeBuilder({ page: p })
          .withTags(["wcag2a", "wcag2aa"])
          .analyze();
        if (a.violations.length)
          throw Error(
            `${tab}/${width} accessibility: ${JSON.stringify(a.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })))}`,
          );
      }
    }
    await p.screenshot({ path: "/tmp/poker-release.png", fullPage: true });
    console.log(
      "PASS offline reload, persisted scoring offline, 320/390/768px layouts and WCAG A/AA automated scans",
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
