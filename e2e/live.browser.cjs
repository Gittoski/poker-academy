const { test, expect } = require('@playwright/test')
const key = 'poker-academy:live:v1'
test.use({ viewport: { width: 1365, height: 950 } })
async function seed(page, options = {}) {
  await page.addInitScript(({ key, options }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ version: 1, current: {
      seed: options.seed ?? 42, hero: options.hero ?? 0, style: 'balanced', actions: [], feedback: [],
      config: { stacks: options.stacks ?? Array(6).fill(10000), button: 3, smallBlind: 50, bigBlind: 100 },
    }, archive: [] }))
  }, { key, options })
}
const saved = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key)
async function move(page) {
  const group = page.getByRole('group', { name: 'Your live move', exact: true })
  if (await group.isVisible()) {
    const check = group.getByRole('button', { name: 'Check', exact: true })
    const call = group.getByRole('button', { name: /^Call / })
    if (await check.isVisible()) await check.click()
    else if (await call.isVisible()) await call.click()
    else await group.getByRole('button', { name: 'Fold', exact: true }).click()
    return
  }
  const resume = page.getByRole('button', { name: 'Continue hand', exact: true })
  if (await resume.isVisible()) await resume.click()
}

test('live choices persist exactly, reload pauses, retries cannot consume or reveal the live hand', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message))
  await seed(page)
  await page.goto('/live')
  const group = page.getByRole('group', { name: 'Your live move', exact: true })
  await expect(group).toBeVisible()
  await group.getByRole('button', { name: /^Call / }).click()
  await expect.poll(async () => (await saved(page)).current.actions.length).toBe(1)
  expect((await saved(page)).current.actions[0]).toEqual({ kind: 'call' })
  await expect(page.getByRole('region', { name: 'Decision feedback' })).toBeVisible()
  const pack = await saved(page)
  await page.reload()
  await expect(page.getByRole('button', { name: 'Continue hand', exact: true })).toBeVisible()
  await page.waitForTimeout(1000)
  expect(await saved(page)).toEqual(pack)
  await page.getByRole('button', { name: 'Practice tools', exact: true }).click()
  await page.getByText(/Review recent decisions/).click()
  await page.getByRole('button', { name: 'Retry decision', exact: true }).first().click()
  await expect(page.getByRole('heading', { name: 'Retry a saved decision' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Decision feedback' })).toHaveCount(0)
  await group.getByRole('button', { name: 'Fold', exact: true }).click()
  await page.getByText('Range details', { exact: true }).click()
  await expect(page.getByText('Compared with the original saved reference frequencies;', { exact: false })).toBeVisible()
  expect(await saved(page)).toEqual(pack)
  await expect(page.locator('.live-showdown')).toHaveCount(0)
  await page.getByRole('button', { name: 'Return to live hand' }).click()
  expect(errors).toEqual([])
})

test('play continues without reference data and can settle a real randomized runout', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message))
  await seed(page)
  await page.route('**/ranges/Cash_100_PTO.json', route => route.fulfill({ status: 503, body: 'Unavailable' }))
  await page.clock.install()
  await page.goto('/live')
  await expect(page.getByRole('group', { name: 'Your live move', exact: true })).toBeVisible()
  for (let i = 0; i < 150; i++) {
    if (await page.getByRole('heading', { name: 'Hand settled', exact: true }).isVisible()) break
    await move(page)
    await page.clock.runFor(900)
    await page.waitForTimeout(10)
  }
  await expect(page.getByRole('heading', { name: 'Hand settled', exact: true })).toBeVisible()
  const pack = await saved(page)
  expect(pack.current.feedback.length).toBeGreaterThan(0)
  expect(pack.current.feedback.every(f => f.reference.status === 'ungraded')).toBe(true)
  expect(pack.current.actions.length).toBeGreaterThan(5)
  await expect(page.locator('.table-board .playing-card')).toHaveCount(5)
  await expect(page.getByRole('button', { name: 'Deal next live hand' })).toBeVisible()
  expect(errors).toEqual([])
})

test('only one tab owns the live hand; the second cannot advance it', async ({ page, context }) => {
  await seed(page); await page.goto('/live')
  await expect(page.getByRole('group', { name: 'Your live move', exact: true })).toBeVisible()
  const other = await context.newPage()
  await other.goto('/live')
  await expect(other.getByText(/Live practice is open in another tab/)).toBeVisible()
  await expect(other.getByRole('group', { name: 'Your live move', exact: true })).toHaveCount(0)
  const before = await saved(page)
  await page.close()
  await other.getByRole('button', { name: 'Retry ownership' }).click()
  await expect(other.getByRole('group', { name: 'Your live move', exact: true })).toBeVisible()
  expect(await saved(other)).toEqual(before)
})

test('unequal stacks, antes and 9-max settings remain playable on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await seed(page); await page.goto('/live')
  await expect(page.getByRole('group', { name: 'Your live move', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Practice tools', exact: true }).click()
  await page.getByText('Live table settings', { exact: true }).click()
  await page.getByRole('combobox', { name: 'Players', exact: true }).selectOption('9')
  await page.getByLabel('Starting stacks (BB, seat order)', { exact: true }).fill('5, 10, 20, 40, 100, 100, 100, 100, 100')
  await page.getByRole('combobox', { name: 'Ante convention', exact: true }).selectOption('big-blind')
  await page.getByLabel('Ante amount (BB)', { exact: true }).fill('1')
  await page.getByRole('button', { name: 'Start with these settings', exact: true }).click()
  await expect.poll(async () => (await saved(page)).current.config.stacks.length).toBe(9)
  expect((await saved(page)).current.config.ante).toEqual({ kind: 'big-blind', amount: 100 })
  expect((await saved(page)).archive).toHaveLength(1)
  await expect(page.getByRole('group', { name: 'Table with 9 players, hero UTG' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
  await page.screenshot({ path: require('node:path').join(require('node:os').tmpdir(), 'poker-live-phone.png'), fullPage: true })
})

test('storage failure keeps legal practice available with an honest unsaved warning', async ({ page }) => {
  await page.addInitScript(key => { const set = Storage.prototype.setItem; Storage.prototype.setItem = function(k, v) { if (k === key) throw new DOMException('Quota exceeded', 'QuotaExceededError'); return set.call(this, k, v) } }, key)
  await page.goto('/live')
  await expect(page.getByText(/Saving failed/)).toBeVisible()
  await expect(page.getByRole('group', { name: 'Your live move', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Practice tools', exact: true }).click()
  await page.getByText('Save and source details', { exact: true }).click()
  await expect(page.getByRole('button', { name: 'Export live practice' })).toBeEnabled()
})

test('live and scripted study keep separate saved hands when switching through Home', async ({ page }) => {
  await seed(page); await page.goto('/live')
  const group = page.getByRole('group', { name: 'Your live move', exact: true })
  await expect(group).toBeVisible()
  await group.getByRole('button', { name: /^Call / }).click()
  await expect.poll(async () => (await saved(page)).current.actions.length).toBe(1)
  const before = await saved(page)
  await page.goto('/archive/play')
  await expect(page.getByRole('switch', { name: 'Preflop mode', exact: true })).toBeVisible()
  await page.goto('/')
  await page.getByRole('link', { name: 'Resume hand', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Poker simulator', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continue hand', exact: true })).toBeVisible()
  expect(await saved(page)).toEqual(before)
})

test('an invalid old save is preserved while a new unsaved hand remains playable', async ({ page }) => {
  await page.addInitScript(key => localStorage.setItem(key, '{"version":999,"keep":"original"}'), key)
  await page.goto('/live')
  await expect(page.getByText(/Saved live hand could not be validated/)).toBeVisible()
  await expect(page.getByRole('group', { name: 'Your live move', exact: true })).toBeVisible()
  const original = await page.evaluate(key => localStorage.getItem(key), key)
  await page.getByRole('group', { name: 'Your live move', exact: true }).getByRole('button', { name: /^Call / }).click()
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(original)
  await page.getByRole('button', { name: 'Practice tools', exact: true }).click()
  await page.getByText('Save and source details', { exact: true }).click()
  await expect(page.getByRole('button', { name: 'Export original recovery save', exact: true })).toBeVisible()
})
