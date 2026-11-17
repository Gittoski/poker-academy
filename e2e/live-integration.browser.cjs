const { test, expect } = require('@playwright/test')
const key = 'poker-academy:live:v1'
async function seed(page) {
  await page.addInitScript(key => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ version: 1, current: {
      seed: 42, hero: 0, style: 'balanced', actions: [], feedback: [],
      config: { stacks: Array(6).fill(10000), button: 3, smallBlind: 50, bigBlind: 100 },
    }, archive: [] }))
  }, key)
}
const saved = page => page.evaluate(key => localStorage.getItem(key), key)
test('Home and shared Play navigation lead only to live play while exercise resumes stay separate', async ({ page }) => {
  await page.goto('/play?mode=preflop&seat=CO')
  await expect(page.getByRole('switch', { name: 'Preflop mode' })).toBeEnabled()
  const before = await page.evaluate(async () => {
    const db = await new Promise(resolve => { const r = indexedDB.open('poker-learning-v1'); r.onsuccess = () => resolve(r.result) })
    const result = await new Promise(resolve => { const r = db.transaction('meta').objectStore('meta').get('state'); r.onsuccess = () => resolve(r.result) })
    db.close(); return result.cursor
  })
  await page.getByRole('link', { name: 'Leave simulator' }).click()
  await expect(page.locator('.home-panel')).toHaveCount(3)
  await expect(page.locator('.home-nav').getByRole('link', { name: 'Play', exact: true })).toHaveAttribute('href', '/live')
  await expect(page.getByRole('link', { name: 'Start training', exact: true })).toHaveAttribute('href', '/live')
  await page.getByText('Earlier exercise history', { exact: true }).click()
  const exercise = page.getByRole('link', { name: 'Saved exercise reviews', exact: true })
  await expect(exercise).toHaveAttribute('href', /\/play\?.*mode=preflop.*seat=CO/)
  await page.getByRole('link', { name: 'Start training', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Poker simulator' })).toBeVisible()
  const live = await saved(page)
  await page.getByRole('link', { name: 'Leave simulator' }).click()
  await expect(page.getByRole('link', { name: 'Resume hand', exact: true })).toHaveAttribute('href', '/live')
  await page.getByText('Earlier exercise history', { exact: true }).click()
  await exercise.click()
  await page.getByRole('button', { name: 'Back to simulator', exact: true }).click()
  await expect(page.getByRole('switch', { name: 'Preflop mode' })).toBeChecked()
  const after = await page.evaluate(async () => {
    const db = await new Promise(resolve => { const r = indexedDB.open('poker-learning-v1'); r.onsuccess = () => resolve(r.result) })
    const value = await new Promise(resolve => { const r = db.transaction('meta').objectStore('meta').get('state'); r.onsuccess = () => resolve(r.result) })
    db.close(); return value.cursor
  })
  expect(after).toEqual(before)
  expect(await saved(page)).toBe(live)
  await page.goto('/ranges?seat=CO')
  await expect(page.getByRole('link', { name: 'Play', exact: true })).toHaveAttribute('href', '/live')
  await page.getByRole('link', { name: 'Play', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Poker simulator' })).toBeVisible()
  await page.goto('/learn')
  await expect(page.getByRole('link', { name: 'Back to simulator', exact: true })).toHaveAttribute('href', '/live')
})

test('phone play stays in the viewport and feedback scrolls inside its overlay', async ({ page }, info) => {
  await seed(page)
  await page.goto('/live')
  const moves = page.getByRole('group', { name: 'Your live move', exact: true })
  await expect(moves).toBeVisible()
  await expect(page.getByLabel('Raise to (BB)', { exact: true })).toHaveValue('2.5')
  for (const [width, height] of [[320, 568], [390, 664], [390, 844], [430, 932], [844, 390]]) {
    await page.setViewportSize({ width, height })
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1 && document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
    for (const button of await moves.getByRole('button').all()) {
      const b = await button.boundingBox()
      expect(b.y).toBeGreaterThanOrEqual(0)
      expect(b.y + b.height).toBeLessThanOrEqual(height)
    }
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: info.outputPath('integrated-live-phone.png') })
  await moves.getByRole('button', { name: 'Fold', exact: true }).click()
  const overlay = page.getByRole('dialog', { name: 'Decision feedback', exact: true })
  await expect(overlay).toBeVisible()
  await expect(overlay.getByRole('gridcell')).toHaveCount(169)
  expect(await page.evaluate(() => scrollY)).toBe(0)
  await page.screenshot({ path: info.outputPath('integrated-feedback-phone.png') })
  await overlay.locator('.sim-sheet__scroll').evaluate(el => { el.scrollTop = el.scrollHeight })
  const beforeDismiss = await saved(page)
  await overlay.getByRole('button', { name: 'Back to hand', exact: true }).click()
  await expect(overlay).toHaveCount(0)
  await page.waitForTimeout(900)
  expect(await saved(page)).toBe(beforeDismiss)
  await page.getByRole('button', { name: 'Continue hand', exact: true }).click()
  expect(await page.evaluate(() => scrollY)).toBe(0)
})

test('decimal raises retain exact chips and an all-in hand exposes settlement before the next deal', async ({ page }) => {
  await seed(page)
  await page.clock.install()
  await page.setViewportSize({ width: 1365, height: 950 })
  await page.goto('/live')
  await expect(page.getByLabel('Raise to (BB)', { exact: true })).toHaveValue('2.5')
  await page.getByLabel('Raise to (BB)', { exact: true }).fill('2.51')
  await page.getByRole('button', { name: 'Raise / bet', exact: true }).click()
  await expect.poll(async () => JSON.parse(await saved(page)).current.actions[0]).toEqual({ kind: 'raise', to: 251 })
  await page.getByRole('button', { name: 'Practice tools', exact: true }).click()
  await page.getByText('Live table settings', { exact: true }).click()
  await page.getByRole('button', { name: 'Start with these settings', exact: true }).click()
  await page.getByRole('button', { name: 'All-in 100 BB', exact: true }).click()
  for (let i = 0; i < 100; i++) {
    for (const label of ['Continue hand', 'See hand result']) {
      const button = page.getByRole('button', { name: label, exact: true })
      if (await button.isVisible()) await button.click()
    }
    if (await page.getByRole('button', { name: 'Deal next live hand', exact: true }).isVisible()) break
    await page.clock.runFor(900)
    await page.waitForTimeout(10)
  }
  await expect(page.getByLabel('Live result', { exact: true })).toContainText('Main pot')
  expect(JSON.parse(await saved(page)).current.actions[0]).toEqual({ kind: 'raise', to: 10000 })
  await page.getByRole('button', { name: 'Deal next live hand', exact: true }).click()
  expect(JSON.parse(await saved(page)).archive).toHaveLength(2)
})
