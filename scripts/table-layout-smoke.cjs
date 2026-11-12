const { chromium, options } = require("./browser.cjs");
(async () => {
  const b = await chromium.launch(options);
  try {
    const context = await b.newContext({
      viewport: { width: 390, height: 844 },
      reducedMotion: "reduce",
    });
    const p = await context.newPage();
    await p.goto(process.env.POKER_TEST_URL || "http://127.0.0.1:8765");
    await p.getByText("Simulator", { exact: true }).waitFor();
    if (
      await p
        .getByRole("button", { name: "Start lesson 1 →", exact: true })
        .count()
    )
      throw Error("Simulator is not the landing screen");
    await p.getByRole("button", { name: "Coached hands", exact: true }).click();
    await p.getByLabel(/^You, LJ,/).waitFor();
    for (const width of [320, 390, 768]) {
      await p.setViewportSize({ width, height: 900 });
      const boxes = [];
      for (let i = 0; i < 6; i++) {
        const node = p.getByTestId(`table-seat-${i}`);
        const box = await node.boundingBox();
        if (!box) throw Error("Seat is missing");
        boxes.push(box);
      }
      for (let i = 0; i < 6; i++)
        for (let j = i + 1; j < 6; j++) {
          const a = boxes[i],
            c = boxes[j];
          if (
            a.x < c.x + c.width &&
            a.x + a.width > c.x &&
            a.y < c.y + c.height &&
            a.y + a.height > c.y
          )
            throw Error(`Seat overlap ${i}/${j} at ${width}`);
        }
      if (
        await p.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        )
      )
        throw Error("Table horizontal overflow");
    }
    await p.setViewportSize({ width: 390, height: 844 });
    await p.screenshot({ path: "/tmp/poker-table-first.png", fullPage: true });
    await p
      .getByRole("button", { name: "Bet / raise options", exact: true })
      .click();
    await p.getByLabel("Raise total in chips").waitFor();
    await p.getByRole("button", { name: "Learn", exact: true }).click();
    await p
      .getByRole("button", { name: "Start lesson 1 →", exact: true })
      .waitFor();
    console.log(
      "PASS simulator-first launch, six nonoverlapping rotating-position seats, responsive table and retained lesson access",
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
