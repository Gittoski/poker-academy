const { test, expect } = require('@playwright/test')
const fs = require('node:fs')
async function cursor(page) {
  return page.evaluate(async () => {
    const db = await new Promise((resolve) => {
      const r = indexedDB.open('poker-learning-v1')
      r.onsuccess = () => resolve(r.result)
    })
    const value = await new Promise((resolve) => {
      const r = db.transaction('meta').objectStore('meta').get('state')
      r.onsuccess = () => resolve(r.result)
    })
    db.close()
    return value.cursor
  })
}
async function boot(page) {
  const index = JSON.parse(
    fs.readFileSync('public/full-hands/index.json', 'utf8'),
  )
  await page.route('**/full-hands/index.json', (r) =>
    r.fulfill({
      json: {
        ...index,
        hands: index.hands.filter((h) => h.id === '3bp-HJ-BB/8s6h3h-0'),
      },
    }),
  )
  await page.addInitScript(() => {
    Math.random = () => 0.99
    const native = setTimeout
    window.setTimeout = (fn, delay, ...args) =>
      native(fn, delay === 1000 ? 20 : delay, ...args)
  })
  await page.goto('/play')
  await expect(
    page.getByRole('group', { name: 'Your move', exact: true }),
  ).toBeVisible({ timeout: 15000 })
}
test('table labels match public contributions and green Call is not a correctness hint', async ({
  page,
}, info) => {
  await boot(page)
  const before = await cursor(page),
    pot = before.hand.seats.reduce((n, s) => n + s.committed, 0)
  await expect(page.locator('.navy-table > svg > text').last()).toHaveText(
    `${pot} BB`,
  )
  const captions = await page
    .locator('.navy-table .seat-caption')
    .allTextContents()
  expect(captions).toEqual(
    before.hand.seats.map((s) =>
      s.folded ? 'Folded' : `${100 - s.committed} BB`,
    ),
  )
  await expect(page.locator('.navy-table .playing-card')).toHaveCount(2)
  await expect(page.locator('.showdown')).toHaveCount(0)
  await page.screenshot({ path: info.outputPath('navy-preflop.png') })
  const call = page
    .getByRole('group', { name: 'Your move', exact: true })
    .getByRole('button', { name: 'Call', exact: true })
  expect(
    await call.evaluate((el) =>
      getComputedStyle(el).getPropertyValue('--move-start').trim(),
    ),
  ).toBe('#207b59')
  await call.click()
  await expect(
    page.getByRole('dialog', { name: 'Review this decision' }),
  ).toContainText('Outside this reference')
})
test('postflop pot includes current public bets and complete boards fit portrait seats', async ({
  page,
}, info) => {
  await boot(page)
  const move = page.getByRole('group', { name: 'Your move', exact: true }),
    view = page.getByRole('button', { name: 'View hand result', exact: true })
  await move.getByRole('button').first().click()
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(page.locator('.board .playing-card')).toHaveCount(3)
  await expect(move).toBeVisible()
  await move.getByRole('button').first().click()
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(move.getByRole('button', { name: /^Call/ })).toBeVisible()
  await expect.poll(async () => (await cursor(page)).play.nodeIndex).toBe(2)
  const current = await cursor(page)
  const script = JSON.parse(
    fs.readFileSync('public/full-hands/3bp-HJ-BB/8s6h3h-0.json', 'utf8'),
  )
  const expected =
    script.streets[current.play.streetIndex].pot +
    current.play.bets.ip +
    current.play.bets.oop
  await expect(page.locator('.navy-table > svg > text').last()).toHaveText(
    `${Math.round(expected * 100) / 100} BB`,
  )
  await page.screenshot({ path: info.outputPath('navy-flop.png') })
  for (let i = 0; i < 12; i++) {
    if (await view.isVisible()) break
    await expect(move).toBeVisible()
    await move.getByRole('button').first().click()
    if (await view.isVisible()) break
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
  }
  await view.click()
  await expect(page.locator('.board .playing-card')).toHaveCount(5)
  for (const [width, height] of [
    [320, 568],
    [390, 844],
    [430, 932],
    [844, 390],
  ]) {
    await page.setViewportSize({ width, height })
    const board = await page.locator('.board__cards').boundingBox()
    expect(board.x).toBeGreaterThanOrEqual(0)
    expect(board.x + board.width).toBeLessThanOrEqual(width)
    const overlaps = await page.locator('.seat-surface').evaluateAll(
      (nodes, b) =>
        nodes.filter((n) => {
          const r = n.getBoundingClientRect()
          return (
            Math.min(r.right, b.x + b.width) - Math.max(r.left, b.x) > 1 &&
            Math.min(r.bottom, b.y + b.height) - Math.max(r.top, b.y) > 1
          )
        }).length,
      board,
    )
    expect(overlaps, `${width}x${height}`).toBe(0)
    const next = await page
      .getByRole('button', { name: 'Next hand', exact: true })
      .boundingBox()
    expect(next.y + next.height).toBeLessThanOrEqual(height + 1)
    if (width === 844)
      await page.screenshot({ path: info.outputPath('navy-landscape.png') })
    if (width === 390)
      await page.screenshot({ path: info.outputPath('navy-showdown.png') })
  }
})
