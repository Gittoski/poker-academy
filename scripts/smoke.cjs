const { chromium, options } = require("./browser.cjs");
(async () => {
  const browser = await chromium.launch(options);
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(process.env.POKER_TEST_URL || "http://127.0.0.1:8765");
  await page.getByRole("button", { name: "Practice", exact: true }).click();
  await page.getByRole("button", { name: "25%", exact: true }).click();
  await page.getByText("Correct · +10 XP", { exact: true }).waitFor();
  await page.reload();
  await page.getByRole("button", { name: "Learn", exact: true }).click();
  await page.getByText("Level 1 · 10 XP", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Progress", exact: true }).click();
  await page.getByText(/^Pot odds: 1\/1 correct/).waitFor();
  if (errors.length) throw Error(errors.join("\n"));
  await page.screenshot({
    path: "/tmp/poker-academy-smoke.png",
    fullPage: true,
  });
  await browser.close();
  console.log(
    "PASS: mobile web drill, feedback, persisted XP, accuracy after reload; no page errors.",
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
