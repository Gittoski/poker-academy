const { readyRaise, setRaise, feedback: openFeedback, closeFeedback: closeLiveFeedback, tools: openLiveTools } = require('./support/live.cjs')
const { test, expect } = require('@playwright/test')
const AxeBuilder = require('@axe-core/playwright').default
const key = 'poker-academy:live:v1'
const read = page => page.evaluate(k => localStorage.getItem(k), key)
async function seed(page, hero = 0) {
  await page.addInitScript(({ key, hero }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ version: 1, current: {
      seed: 42, hero, style: 'balanced', actions: [], feedback: [],
      config: { stacks: Array(6).fill(10000), button: 3, smallBlind: 50, bigBlind: 100 },
    }, archive: [] }))
  }, { key, hero })
}
test('main settings control live play; entering settings pauses opponents without touching the hand', async ({ page }) => {
  await seed(page, 5)
  await page.goto('/')
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  const settings = page.getByRole('dialog', { name: 'Settings', exact: true })
  await expect(settings.getByRole('radio', { name: 'Preflop', exact: true })).toHaveCount(0)
  await expect(settings.getByText('Recurring reference mistakes', { exact: true })).toHaveCount(0)
  await settings.getByRole('link', { name: 'Table settings', exact: true }).click()
  const tools = page.getByRole('dialog', { name: 'Practice tools', exact: true })
  await expect(tools).toBeVisible()
  await expect(tools.getByRole('combobox', { name: 'Your position', exact: true })).toHaveValue('5')
  await expect(tools.getByRole('link', { name: /Reference exercises/ })).toHaveCount(0)
  const before = await read(page)
  await page.waitForTimeout(1100)
  expect(await read(page)).toBe(before)
  const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(scan.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }))).toEqual([])
  await tools.getByRole('combobox', { name: 'Your position', exact: true }).selectOption('3')
  await tools.getByRole('button', { name: 'Start with these settings', exact: true }).click()
  await expect(tools).toHaveCount(0)
  await expect.poll(async () => JSON.parse(await read(page)).current.hero).toBe(3)
})
test('Home live reviews open the saved decision list with one overlay and preserve the current hand', async ({ page }) => {
  await seed(page)
  await page.goto('/live')
  await readyRaise(page)
  await page.getByRole('group', { name: 'Your move', exact: true }).getByRole('button', { name: 'Fold', exact: true }).click()
  await expect(page.locator('.live-decision')).toBeVisible()
  const before = await read(page)
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'All reviews', exact: true })).toHaveAttribute('href', '/live?tools=review')
  await expect(page.locator('.home-practice-link')).toContainText('1 recent decision')
  await page.getByRole('link', { name: 'All reviews', exact: true }).click()
  const tools = page.getByRole('dialog', { name: 'Practice tools', exact: true })
  await expect(tools).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(1)
  await expect(tools.getByRole('button', { name: 'Retry decision', exact: true })).toBeVisible()
  expect(await read(page)).toBe(before)
  await tools.getByRole('button', { name: 'Retry decision', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Retry a saved decision' })).toBeVisible()
  await expect(page.getByRole('grid')).toHaveCount(0)
  expect(await read(page)).toBe(before)
})
test('actual mobile play keeps primary text and controls unclipped across viewport sizes', async ({ page }, info) => {
  await seed(page)
  await page.goto('/live')
  await expect(page.getByRole('group', { name: 'Your move', exact: true })).toBeVisible()
  for (const [width, height] of [[320, 568], [390, 664], [390, 844], [430, 932], [768, 1024], [844, 390], [1365, 950]]) {
    await page.setViewportSize({ width, height })
    for (const selector of ['.live-header h1', '.sim-save-status', '.live-actions button', '.range-card__title h2']) {
      const clipped = await page.locator(selector).evaluateAll(nodes => nodes.filter(n => n.clientWidth && (n.scrollWidth > n.clientWidth + 1 || n.scrollHeight > n.clientHeight + 1)).map(n => n.textContent))
      expect(clipped, `${width}x${height}: ${selector}`).toEqual([])
    }
    if (width < 769) expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1)).toBe(true)
    if (width === 390 && height === 844) await page.screenshot({ path: info.outputPath('released-live-phone.png') })
  }
})

test('a completed normal pot includes folded chips without inventing side pots', async ({ page }) => {
  await page.addInitScript(key => localStorage.setItem(key, JSON.stringify({ version: 1, current: {
    seed: 42, hero: 1, style: 'balanced', feedback: [],
    config: { stacks: Array(6).fill(10000), button: 3, smallBlind: 50, bigBlind: 100 },
    actions: [
      { kind: 'raise', to: 250 }, { kind: 'call' }, { kind: 'call' },
      { kind: 'fold' }, { kind: 'fold' }, { kind: 'fold' },
      { kind: 'check' }, { kind: 'raise', to: 100 }, { kind: 'call' }, { kind: 'fold' },
      { kind: 'check' }, { kind: 'check' }, { kind: 'check' }, { kind: 'check' },
    ],
  }, archive: [] })), key)
  await page.goto('/live')
  await expect(page.getByRole('heading', { name: 'Hand settled', exact: true })).toBeVisible()
  const result = page.getByLabel('Live result', { exact: true })
  await expect(result).toContainText('Main pot: 11 BB')
  await expect(result).not.toContainText('Side pot')
  await expect(page.getByRole('dialog',{name:'Showdown result',exact:true}).getByRole('button',{name:'Next hand',exact:true})).toBeVisible()
})
