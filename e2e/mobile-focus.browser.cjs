const { home, openReviews, openArchivedSettings } = require('./support/navigation.cjs')
const { test, expect } = require('@playwright/test')
const AxeBuilder = require('@axe-core/playwright').default
const fs = require('node:fs')
test.setTimeout(30000)
async function state(page) {
  return page.evaluate(async () => {
    const db = await new Promise((resolve) => {
      const r = indexedDB.open('poker-learning-v1')
      r.onsuccess = () => resolve(r.result)
    })
    const tx = db.transaction(['meta', 'decisions', 'hands'])
    const get = (r) =>
      new Promise((resolve) => (r.onsuccess = () => resolve(r.result)))
    const [meta, decisions, hands] = await Promise.all([
      get(tx.objectStore('meta').get('state')),
      get(tx.objectStore('decisions').getAll()),
      get(tx.objectStore('hands').getAll()),
    ])
    db.close()
    return { meta, decisions, hands }
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
  await page.goto('/archive/play')
  await expect(
    page.getByRole('group', { name: 'Your move', exact: true }),
  ).toBeVisible({ timeout: 20000 })
}
async function fits(page, locator) {
  await expect(locator).toBeVisible()
  const b = await locator.boundingBox(),
    v = page.viewportSize()
  expect(b.y).toBeGreaterThanOrEqual(0)
  expect(b.y + b.height).toBeLessThanOrEqual(v.height + 1)
  expect(b.x).toBeGreaterThanOrEqual(0)
  expect(b.x + b.width).toBeLessThanOrEqual(v.width + 1)
}
for (const [width, height] of [
  [320, 568],
  [375, 667],
  [390, 844],
  [430, 932],
  [768, 1024],
  [844, 390],
])
  test(`focus layout stays within ${width}x${height}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height })
    await boot(page)
    await expect(page.locator('body')).toHaveClass(/simulator-focus/)
    await expect(page.locator('.trainer-table')).toHaveCSS(
      'border-top-width',
      '0px',
    )
    await expect(page.locator('.trainer-table')).toHaveCSS(
      'border-radius',
      '0px',
    )
    await fits(page, page.getByRole('link', { name: 'Leave simulator' }))
    await fits(page, page.getByRole('switch', { name: 'Preflop mode' }))
    await expect(
      page.getByRole('button', { name: 'Settings & review' }),
    ).toHaveCount(0)
    await fits(
      page,
      page.getByRole('group', { name: 'Your move', exact: true }),
    )
    await fits(
      page,
      page.locator('.trainer-table .table-hero-hand .hole-cards'),
    )
    expect(
      await page.evaluate(() => ({
        x: scrollX,
        y: scrollY,
        height: document.documentElement.scrollHeight <= innerHeight + 1,
      })),
    ).toEqual({ x: 0, y: 0, height: true })
    if (width === 390)
      await page.screenshot({ path: info.outputPath('phone-decision.png') })
    await page.mouse.wheel(0, 600)
    expect(await page.evaluate(() => scrollY)).toBe(0)
  })
test('errors open explanation, chart scrolls internally, close preserves decision and retry preserves live hand', async ({
  page,
}, info) => {
  await boot(page)
  const move = page.getByRole('group', { name: 'Your move', exact: true })
  await move.getByRole('button').last().click()
  const sheet = page.getByRole('dialog', { name: 'Review this decision' })
  await expect(sheet).toBeVisible()
  const before = await state(page)
  expect(before.decisions.at(-1).learning.kind).toBe('outside')
  await sheet.getByRole('button', { name: 'Explanation', exact: true }).focus()
  await page.keyboard.press('Enter')
  expect((await state(page)).meta.cursor).toEqual(before.meta.cursor)
  const scan = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()
  expect(scan.violations.map((v) => v.id)).toEqual([])
  await fits(page, sheet.getByRole('button', { name: 'Retry', exact: true }))
  await fits(page, sheet.getByRole('button', { name: 'Continue', exact: true }))
  await page.screenshot({ path: info.outputPath('automatic-error.png') })
  await sheet.getByRole('button', { name: 'Chart', exact: true }).click()
  await expect(
    sheet.getByRole('heading', { name: 'Chart', exact: true }),
  ).toBeVisible()
  await sheet
    .locator('.sim-sheet__scroll')
    .evaluate((el) => (el.scrollTop = el.scrollHeight))
  await fits(page, sheet.getByRole('button', { name: 'Retry', exact: true }))
  expect(await page.evaluate(() => scrollY)).toBe(0)
  await sheet.getByRole('button', { name: 'Close explanation' }).click()
  await expect(sheet).not.toBeVisible()
  expect((await state(page)).meta.cursor).toEqual(before.meta.cursor)
  await page.getByRole('button', { name: 'Explanation & chart' }).click()
  await sheet.getByRole('button', { name: 'Retry', exact: true }).click()
  await expect(move).toBeVisible()
  expect((await state(page)).meta.resume.handId).toBe(before.meta.cursor.handId)
  await move.getByRole('button').first().click()
  await expect(page.locator('.verdict:visible')).toBeVisible()
  await page.getByRole('button', { name: 'Return to live hand' }).click()
  await expect(
    page.getByRole('dialog', { name: 'Review this decision' }),
  ).toBeVisible()
  expect((await state(page)).meta.cursor.handId).toBe(before.meta.cursor.handId)
  await page.reload()
  await expect(
    page.getByRole('dialog', { name: 'Review this decision' }),
  ).toBeVisible()
  await fits(
    page,
    page
      .getByRole('dialog', { name: 'Review this decision' })
      .getByRole('button', { name: 'Continue', exact: true }),
  )
})
test('correct feedback is compact and mobile controls remain accessible', async ({
  page,
}, info) => {
  await boot(page)
  await page
    .getByRole('group', { name: 'Your move', exact: true })
    .getByRole('button')
    .first()
    .click()
  await expect(page.locator('.sim-compact')).toBeVisible()
  await expect(
    page.getByRole('dialog', { name: 'Review this decision' }),
  ).not.toBeVisible()
  await fits(page, page.getByRole('button', { name: 'Continue', exact: true }))
  await page.screenshot({ path: info.outputPath('compact-correct.png') })
  const scan = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()
  expect(
    scan.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([])
  await openReviews(page)
  await page
    .getByRole('dialog', { name: 'Review your play' })
    .getByRole('button', { name: 'Back to simulator' })
    .click()
  await expect(page.locator('.sim-compact')).toBeVisible()
  const live = (await state(page)).meta.cursor.handId
  await page.getByRole('button', { name: 'Explanation & chart' }).click()
  await page
    .getByRole('dialog', { name: 'Review this decision' })
    .getByRole('button', { name: 'Retry', exact: true })
    .click()
  const move = page.getByRole('group', { name: 'Your move', exact: true })
  await expect(move).toBeVisible()
  await move.getByRole('button').first().click()
  await expect
    .poll(
      async () =>
        (await state(page)).hands.filter((h) => h.origin === 'manual').length,
    )
    .toBeGreaterThan(0)
  expect(
    (await state(page)).hands.find((h) => h.origin === 'manual').target,
  ).toBeNull()
  expect((await state(page)).meta.resume.handId).toBe(live)
})
test('archived settings keep earlier preflop controls reachable', async ({
  page,
}) => {
  await boot(page)
  const original = (await state(page)).meta.cursor.handId
  await openArchivedSettings(page)
  const settings = page.getByRole('dialog', { name: 'Archived exercise settings', exact: true })
  await expect(settings).toBeVisible()
  expect((await state(page)).meta.cursor.handId).toBe(original)
  await settings.getByRole('radio', { name: 'Preflop', exact: true }).click()
  await settings.getByRole('button', { name: 'Game setup' }).click()
  await settings.getByRole('radio', { name: 'LJ', exact: true }).click()
  await settings.getByRole('link', { name: /Practice with these settings/ }).click()
  const move = page.getByRole('group', { name: 'Your move', exact: true })
  await expect(move).toBeVisible({ timeout: 20000 })
  await fits(page, move)
  await move.getByRole('button').first().click()
  await expect(page.locator('.verdict:visible')).toBeVisible()
  await fits(
    page,
    page.getByRole('button', { name: /^(Continue|Next hand)$/, exact: true }),
  )
  expect(await page.evaluate(() => scrollY)).toBe(0)
})
test('postflop Retry restores the same board and decision without consuming the live hand', async ({
  page,
}) => {
  await boot(page)
  const move = page.getByRole('group', { name: 'Your move', exact: true })
  await move.getByRole('button').first().click()
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(page.locator('.board .playing-card')).toHaveCount(3)
  await expect(move).toBeVisible()
  const cards = await page
    .locator('.board .playing-card')
    .evaluateAll((nodes) => nodes.map((n) => n.getAttribute('aria-label')))
  await move.getByRole('button').last().click()
  const sheet = page.getByRole('dialog', { name: 'Review this decision' })
  await expect(sheet).toBeVisible()
  const before = await state(page)
  await sheet.getByRole('button', { name: 'Retry', exact: true }).click()
  await expect(move).toBeVisible()
  expect(
    await page
      .locator('.trainer-surface:visible .board .playing-card')
      .evaluateAll((nodes) => nodes.map((n) => n.getAttribute('aria-label'))),
  ).toEqual(cards)
  expect((await state(page)).meta.resume.handId).toBe(before.meta.cursor.handId)
  await fits(page, move)
})
test('small-phone hand completion keeps Next hand reachable without page scrolling', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await boot(page)
  const initial = (await state(page)).meta.cursor.handId,
    move = page.getByRole('group', { name: 'Your move', exact: true }),
    view = page.getByRole('button', { name: 'View hand result', exact: true })
  for (let i = 0; i < 16; i++) {
    await expect
      .poll(async () => (await move.isVisible()) || (await view.isVisible()))
      .toBe(true)
    if (await view.isVisible()) break
    await move.getByRole('button').first().click()
    await expect(page.locator('.verdict:visible')).toBeVisible()
    if (await view.isVisible()) break
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
  }
  await fits(page, view)
  await view.click()
  const next = page.getByRole('button', { name: 'Next hand', exact: true })
  await expect(next).toBeEnabled()
  await fits(page, next)
  expect(await page.evaluate(() => scrollY)).toBe(0)
  await page.screenshot({ path: info.outputPath('small-phone-result.png') })
  const outcome = page.getByRole('dialog', { name: 'You win', exact: true })
  await expect(outcome).toBeVisible()
  await expect(outcome).toContainText('Pair, Queens')
  await expect(outcome).toContainText('Pair, Sevens')
  await expect(page.locator('.board .playing-card')).toHaveCount(5)
  await outcome.getByRole('button', { name: 'Back to table' }).click()
  await expect(outcome).not.toBeVisible()
  await fits(page, next)
  await page.getByRole('button', { name: 'Show result', exact: true }).click()
  await expect(outcome).toBeVisible()
  await page.reload()
  await expect(outcome).toBeVisible()
  await expect(next).toBeEnabled()
  await fits(page, next)
  expect((await state(page)).meta.cursor.handId).toBe(initial)
  await next.focus()
  expect(
    await next.evaluate((el) =>
      el.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Enter',
          repeat: true,
          bubbles: true,
          cancelable: true,
        }),
      ),
    ),
  ).toBe(false)
  expect((await state(page)).meta.cursor.handId).toBe(initial)
  await next.click()
  await expect
    .poll(async () => (await state(page)).meta.cursor.handId)
    .not.toBe(initial)
})
