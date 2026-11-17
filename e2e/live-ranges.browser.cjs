const { test, expect } = require('@playwright/test')
const key = 'poker-academy:live:v1'
const ranks = 'AKQJT98765432'
const all = [...ranks].flatMap((a, i) => [...ranks].map((b, j) => i === j ? a + b : i < j ? a + b + 's' : b + a + 'o')).join(', ')
const chart = [{ id: 'test-open-LJ', scenario: 'open', hero: ['LJ'], formats: ['cash'], players: [6], stacks: [100], rangeTypes: ['pto'], range: { raise: all } }]
async function seed(page, theme = 'classic') {
  await page.addInitScript(({ key, theme }) => {
    localStorage.setItem('open-range-viewer:theme', theme)
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ version: 1, current: { seed: 42, hero: 0, style: 'balanced', actions: [], feedback: [], config: { stacks: Array(6).fill(10000), button: 3, smallBlind: 50, bigBlind: 100 } }, archive: [] }))
  }, { key, theme })
}
const saved = page => page.evaluate(k => JSON.parse(localStorage.getItem(k)), key)

test('actual choice shows a 169-hand grid and highlighted hand; original chart survives reload, source loss and retry', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message))
  await seed(page)
  await page.route('**/ranges/Cash_100_PTO.json', r => r.fulfill({ json: chart }))
  await page.goto('/live')
  await expect(page.getByRole('grid', { name: 'Hand range' })).toHaveCount(0)
  await expect(page.getByLabel('Raise to (BB)', { exact: true })).toHaveValue('2.5')
  await page.getByRole('button', { name: 'Raise / bet', exact: true }).click()
  const feedback = page.getByRole('region', { name: 'Decision feedback' })
  await expect(feedback.getByRole('heading', { name: 'In range', exact: true })).toBeVisible()
  await expect(feedback.getByRole('gridcell')).toHaveCount(169)
  await expect.poll(async () => (await saved(page)).current.actions.length).toBe(1)
  const original = await saved(page), hand = original.current.feedback[0].reference.chart.hand
  await expect(feedback.locator('.cell--highlight')).toHaveText(hand)
  expect(original.current.actions[0]).toEqual({ kind: 'raise', to: 250 })
  await expect(page.getByRole('button', { name: 'Continue hand', exact: true })).toHaveCount(1)
  await page.unroute('**/ranges/Cash_100_PTO.json')
  await page.route('**/ranges/Cash_100_PTO.json', r => r.fulfill({ status: 503, body: 'No current chart' }))
  await page.reload()
  await expect(feedback.getByRole('gridcell')).toHaveCount(169)
  await expect(feedback.locator('.cell--highlight')).toHaveText(hand)
  expect(await saved(page)).toEqual(original)
  await feedback.getByRole('button', { name: 'Practice tools', exact: true }).click()
  await page.getByText(/Review recent decisions/).click()
  await page.getByRole('button', { name: 'Retry decision', exact: true }).first().click()
  await expect(page.getByRole('grid', { name: 'Hand range' })).toHaveCount(0)
  await page.getByRole('group', { name: 'Your live move', exact: true }).getByRole('button', { name: 'Fold', exact: true }).click()
  await expect(feedback.getByRole('heading', { name: 'Retry: Outside range', exact: true })).toBeVisible()
  await expect(feedback.locator('.cell--highlight')).toHaveText(hand)
  expect(await saved(page)).toEqual(original)
  await expect(page.locator('.live-showdown')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('no chart for a different size; user-entered sizes are preserved while source data loads', async ({ page }) => {
  await seed(page)
  let release
  const gate = new Promise(resolve => { release = resolve })
  await page.route('**/ranges/Cash_100_PTO.json', async r => { await gate; await r.fulfill({ json: chart }) })
  await page.goto('/live')
  const amount = page.getByLabel('Raise to (BB)', { exact: true })
  await expect(amount).toBeVisible()
  await amount.fill('3')
  release()
  await page.waitForTimeout(300)
  await expect(amount).toHaveValue('3')
  await page.getByRole('button', { name: 'Raise / bet', exact: true }).click()
  const feedback = page.getByRole('region', { name: 'Decision feedback' })
  await expect(feedback.getByRole('heading', { name: 'No matching range', exact: true })).toBeVisible()
  await expect(feedback.getByRole('grid')).toHaveCount(0)
  expect((await saved(page)).current.actions[0]).toEqual({ kind: 'raise', to: 300 })
  await page.getByRole('button', { name: 'Continue hand', exact: true }).click()
})

for (const theme of ['classic', 'cool']) {
  test(`${theme}: range colors match the original viewer and stay readable from phone to desktop`, async ({ page }) => {
    await seed(page, theme)
    await page.route('**/ranges/Cash_100_PTO.json', r => r.fulfill({ json: chart }))
    await page.goto('/live')
    await expect(page.getByLabel('Raise to (BB)', { exact: true })).toHaveValue('2.5')
    await page.getByRole('group', { name: 'Your live move', exact: true }).getByRole('button', { name: 'Fold', exact: true }).click()
    const feedback = page.getByRole('region', { name: 'Decision feedback' })
    await expect(feedback.getByRole('heading', { name: 'Outside range', exact: true })).toBeVisible()
    const color = await feedback.getByRole('gridcell', { name: /^AA:/ }).evaluate(e => getComputedStyle(e).backgroundImage === 'none' ? getComputedStyle(e).backgroundColor : getComputedStyle(e).backgroundImage)
    for (const width of [320, 390, 430, 768, 1365]) {
      await page.setViewportSize({ width, height: width < 500 ? 844 : 950 })
      await expect(feedback.locator('.cell--highlight')).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
      const clipped = await feedback.getByRole('gridcell').evaluateAll(cells => cells.some(c => c.scrollWidth > c.clientWidth + 1))
      expect(clipped).toBe(false)
    }
    await page.goto('/ranges?format=cash&rangeType=pto&players=6&stack=100&scenario=open&hero=LJ')
    await expect(page.getByRole('gridcell', { name: /^AA:/ })).toBeVisible()
    expect(await page.getByRole('gridcell', { name: /^AA:/ }).evaluate(e => getComputedStyle(e).backgroundColor)).toBe(color)
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(theme)
  })
}
