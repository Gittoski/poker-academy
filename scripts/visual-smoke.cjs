const { chromium, options } = require("./browser.cjs");
const AxeBuilder = require("@axe-core/playwright").default;
(async () => {
  const b = await chromium.launch(options);
  try {
    const context = await b.newContext({
      viewport: { width: 390, height: 844 },
    });
    const p = await context.newPage();
    const errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.emulateMedia({ reducedMotion: "no-preference" });
    await p.goto(process.env.POKER_TEST_URL || "http://127.0.0.1:8765");
    await p.waitForTimeout(350);
    await p.screenshot({ path: "/tmp/poker-guided-home.png" });
    async function measure(tab) {
      return p.evaluate(async (name) => {
        const opacities = [];
        let running = true;
        function sample() {
          const node = document.querySelector(
            '[data-testid="screen-transition"]',
          );
          if (node) opacities.push(Number(getComputedStyle(node).opacity));
          if (running) requestAnimationFrame(sample);
        }
        requestAnimationFrame(sample);
        document.querySelector(`[aria-label="${name}"]`).click();
        await new Promise((r) => setTimeout(r, 450));
        running = false;
        return Math.min(...opacities);
      }, tab);
    }
    const moving = await measure("Practice");
    if (!(moving < 0.99)) throw Error("Screen transition did not animate");
    await p.emulateMedia({ reducedMotion: "reduce" });
    await p.waitForTimeout(100);
    const reduced = await measure("Learn");
    if (reduced !== 1)
      throw Error("Reduced-motion preference did not suppress the fade");
    await p
      .getByRole("button", { name: "Start lesson 1 →", exact: true })
      .click();
    await p
      .getByRole("button", { name: "See a worked example →", exact: true })
      .click();
    await p.getByRole("img", { name: "Ace of spades", exact: true }).waitFor();
    await p.screenshot({ path: "/tmp/poker-guided-example.png" });
    const scan = await new AxeBuilder({ page: p })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    if (scan.violations.length)
      throw Error(
        JSON.stringify(
          scan.violations.map((v) => ({
            id: v.id,
            nodes: v.nodes.map((n) => n.target),
          })),
        ),
      );
    await p
      .getByRole("button", { name: "← Learning path", exact: true })
      .click();
    await p.getByRole("button", { name: "Table", exact: true }).click();
    if (
      (await p
        .getByRole("img", { name: "Face-down card", exact: true })
        .count()) < 1
    )
      throw Error("Hidden cards were exposed");
    await p.screenshot({ path: "/tmp/poker-refined-table.png" });
    await p.setViewportSize({ width: 320, height: 700 });
    const nav = p.getByRole("button", { name: "Learn", exact: true });
    const rect = await nav.boundingBox();
    if (!rect || rect.y < 0 || rect.y + rect.height > 700)
      throw Error("Bottom navigation is not persistent");
    await nav.click();
    await p.screenshot({ path: "/tmp/poker-guided-small.png" });
    if (errors.length) throw Error(errors.join("\n"));
    console.log(
      `PASS guided visuals, accessible cards, persistent navigation, live reduced-motion preference and screen animation (minimum opacity ${moving.toFixed(2)} vs ${reduced})`,
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
