const { test, expect } = require('@playwright/test')
const AxeBuilder = require('@axe-core/playwright').default
const { home, openReviews, openArchivedSettings } = require('./support/navigation.cjs')
async function snapshot(page) {
  return page.evaluate(async () => {
    const db = await new Promise((resolve) => {
      const r = indexedDB.open('poker-learning-v1')
      r.onsuccess = () => resolve(r.result)
    })
    const tx = db.transaction(['meta', 'decisions']),
      get = (r) =>
        new Promise((resolve) => {
          r.onsuccess = () => resolve(r.result)
        })
    const result = {
      meta: await get(tx.objectStore('meta').get('state')),
      decisions: await get(tx.objectStore('decisions').getAll()),
    }
    db.close()
    return result
  })
}
test('Home has only the approved sections, responsive material styling and accessible settings', async ({
  page,
}, info) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await home(page)
  await expect(
    page.getByRole('heading', { name: 'Poker Trainer', exact: true }),
  ).toBeVisible()
  await expect(page.locator('.home-panel')).toHaveCount(3)
  await expect(page.locator('.home-nav a')).toHaveText([
    'Ranges',
    'Play',
    'Learn',
  ])
  await expect(page.locator('button[data-day]')).toHaveCount(84)
  await expect(page.locator('.activity-footer')).toContainText(
    '0 answered today',
  )
  for (const [width, height] of [
    [320, 568],
    [390, 844],
    [430, 932],
    [768, 1024],
    [1365, 950],
    [844, 390],
  ]) {
    await page.setViewportSize({ width, height })
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
    await expect(
      page.getByRole('link', { name: 'Start training', exact: true }),
    ).toBeVisible()
    if (width === 390)
      await page.screenshot({
        path: info.outputPath('home-phone.png'),
        fullPage: true,
      })
  }
  await page.setViewportSize({ width: 390, height: 844 })
  let scan = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()
  expect(
    scan.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([])
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  const settings = page.getByRole('dialog', { name: 'Settings', exact: true })
  await expect(settings).toBeVisible()
  await settings.getByRole('radio', { name: 'Cool', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'cool')
  scan = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()
  expect(
    scan.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([])
  await settings
    .locator('.sim-sheet__scroll')
    .evaluate((el) => (el.scrollTop = el.scrollHeight))
  const done = settings.getByRole('button', { name: 'Done', exact: true })
  const box = await done.boundingBox()
  expect(box.y + box.height).toBeLessThanOrEqual(844)
  await page.screenshot({ path: info.outputPath('home-settings-phone.png') })
  await page.keyboard.press('Escape')
  await expect(settings).not.toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Settings', exact: true }),
  ).toBeFocused()
  await page.getByRole('link', { name: 'Ranges', exact: true }).click()
  await expect(page.getByRole('gridcell')).toHaveCount(169)
  await page.getByRole('link', { name: 'Home', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Poker Trainer', exact: true }),
  ).toBeVisible()
  expect(errors).toEqual([])
})
test('Home resumes the same decision, counts answered decisions exactly once and opens saved review', async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    let s = 42
    Math.random = () => {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0
      return s / 4294967296
    }
  })
  await page.goto('/archive/play?seat=LJ')
  const move = page.getByRole('group', { name: 'Your move', exact: true })
  await expect(move).toBeVisible({ timeout: 20000 })
  await move.getByRole('button').last().click()
  await expect(page.locator('.verdict:visible')).toBeVisible()
  await expect.poll(async () => (await snapshot(page)).decisions.length).toBe(1)
  const saved = await snapshot(page)
  await home(page)
  await expect(page.locator('.activity-footer')).toContainText(
    '1 answered today',
  )
  await page.getByText('Earlier exercise history', { exact: true }).click()
  await expect(page.getByRole('link', { name: 'Saved exercise reviews', exact: true })).toHaveAttribute('href', /mode=full-hands.*seat=LJ/)
  await page.reload()
  await expect(page.locator('.activity-footer')).toContainText(
    '1 answered today',
  )
  await page.screenshot({
    path: info.outputPath('home-saved-progress.png'),
    fullPage: true,
  })
  await openReviews(page)
  await page.getByRole('button', { name: 'Back to simulator', exact: true }).click()
  await expect(page.locator('.verdict:visible')).toBeVisible()
  expect((await snapshot(page)).meta.cursor).toEqual(saved.meta.cursor)
  await openReviews(page)
  const review = page.getByRole('dialog', { name: 'Review your play' })
  await expect(review.locator('.learning-list button').first()).toBeVisible()
  await review.getByRole('button', { name: 'Back to simulator' }).click()
  expect((await snapshot(page)).meta.cursor).toEqual(saved.meta.cursor)
  await expect(
    page.getByRole('button', { name: 'Settings & review' }),
  ).toHaveCount(0)
  await expect(
    page.getByRole('link', { name: 'Leave simulator' }),
  ).toBeVisible()
})
test('Home includes fundamentals answers and preserves activity offline across cold navigation', async ({
  page,
  context,
}) => {
  await home(page)
  // Use the real practice store through the public lesson flow.
  await page.getByRole('link', { name: 'Learn', exact: true }).click()
  await page
    .getByRole('link', { name: 'Start this topic', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'I understand — start untimed practice' })
    .click()
  await page.locator('.fundamentals-answers button').first().click()
  await expect(page.getByRole('status').first()).toContainText('saved')
  await home(page)
  await expect(page.locator('.activity-footer')).toContainText(
    '1 answered today',
  )
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await page.getByText('Use offline on this device', { exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Download offline pack', exact: true }),
  ).toBeEnabled()
  await page
    .getByRole('button', { name: 'Download offline pack', exact: true })
    .click()
  await expect(page.getByTestId('offline-status')).toContainText(
    'Available offline',
    { timeout: 90000 },
  )
  await page.getByRole('button', { name: 'Done', exact: true }).click()
  await context.setOffline(true)
  await page.reload()
  await expect
    .poll(() =>
      page
        .locator('img.app-logo')
        .evaluate((img) => img.complete && img.naturalWidth === 144),
    )
    .toBe(true)
  await expect(page.locator('.activity-footer')).toContainText(
    '1 answered today',
  )
  await page.getByRole('link', { name: 'Ranges', exact: true }).click()
  await expect(page.getByRole('gridcell')).toHaveCount(169)
  await page.getByRole('link', { name: 'Home', exact: true }).click()
  await page.getByRole('link', { name: 'Start training', exact: true }).click()
  await expect(page.getByRole('group', { name: 'Your live move', exact: true })).toBeVisible()
  await home(page)
  await openReviews(page)
  await page.getByRole('button', { name: 'Back to simulator', exact: true }).click()
  await expect(page.getByRole('group', { name: 'Your move', exact: true })).toBeVisible({ timeout: 20000 })
  const modeSwitch = page.getByRole('switch', { name: 'Preflop mode' })
  await expect(modeSwitch).toBeEnabled()
  await modeSwitch.click()
  await expect(modeSwitch).toBeChecked()
  await expect(modeSwitch).toBeEnabled()
  await modeSwitch.click()
  await expect(modeSwitch).not.toBeChecked()
  await expect(modeSwitch).toBeEnabled()
  await context.setOffline(false)
})
test('Home settings persist while Resume keeps the existing configuration and scheduled reviews', async ({
  page,
}) => {
  await page.goto('/archive/play?mode=preflop&seat=LJ')
  await expect(
    page.getByRole('group', { name: 'Your move', exact: true }),
  ).toBeVisible({ timeout: 20000 })
  const before = await snapshot(page)
  await home(page)
  await page.getByRole('link', { name: 'Learn', exact: true }).click()
  await page
    .getByRole('link', { name: 'Back to simulator', exact: true })
    .click()
  await expect(page.getByRole('group', { name: 'Your live move', exact: true })).toBeVisible()
  expect((await snapshot(page)).meta.cursor.handId).toBe(before.meta.cursor.handId)
  await openArchivedSettings(page)
  const settings = page.getByRole('dialog', { name: 'Archived exercise settings', exact: true })
  await settings.getByRole('radio', { name: 'Preflop', exact: true }).click()
  await settings
    .getByRole('button', { name: 'Game setup', exact: true })
    .click()
  await settings.getByRole('radio', { name: 'CO', exact: true }).click()
  await settings.getByLabel('Mix in my mistakes').uncheck()
  await expect
    .poll(async () => (await snapshot(page)).meta.nextScheduler?.enabled)
    .toBe(false)
  await page.locator('#home-review-rate').focus()
  await page.keyboard.press('End')
  await expect
    .poll(async () => (await snapshot(page)).meta.nextScheduler?.interval)
    .toBe(20)
  await settings.getByRole('button', { name: 'Done', exact: true }).click()
  await page.reload()
  await page.getByText('Earlier exercise history', { exact: true }).click()
  await expect(
    page.getByRole('link', { name: 'Saved exercise reviews', exact: true }),
  ).toHaveAttribute('href', /seat=LJ/)
  expect((await snapshot(page)).meta.cursor.handId).toBe(
    before.meta.cursor.handId,
  )
  await openArchivedSettings(page)
  await page.getByRole('button', { name: 'Game setup', exact: true }).click()
  await expect(
    settings.getByRole('radio', { name: 'CO', exact: true }),
  ).toHaveAttribute('aria-checked', 'true')
  await expect(settings.getByLabel('Mix in my mistakes')).not.toBeChecked()
  await expect(page.locator('#home-review-rate')).toHaveValue('20')
  await settings.getByRole('link', { name: /Practice with these settings/ }).click()
  await expect(
    page.getByRole('group', { name: 'Your move', exact: true }),
  ).toBeVisible({ timeout: 20000 })
  expect((await snapshot(page)).meta.cursor.hand.hero).toBe('CO')
})
test('Home shows unavailable activity rather than invented zero progress when local storage fails', async ({
  page,
}) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.addInitScript(() => {
    IDBFactory.prototype.open = () => {
      throw Error('Test storage unavailable')
    }
  })
  await page.goto('/')
  await expect(page.locator('.home-save')).toContainText(
    'Local storage is unavailable',
  )
  await expect(page.locator('.activity-footer')).toContainText(
    'Activity unavailable',
  )
  await expect(
    page.getByRole('link', { name: 'Start training', exact: true }),
  ).toBeVisible()
  await expect(page.locator('.home-nav a')).toHaveCount(3)
  expect(errors).toEqual([])
})
test('preflop opponent range inspection remains reachable after moving settings', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1365, height: 950 })
  await page.addInitScript(() => {
    let s = 42
    Math.random = () => {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0
      return s / 4294967296
    }
    const native = setTimeout
    window.setTimeout = (fn, delay, ...args) =>
      native(fn, delay === 1000 || delay === 1200 ? 20 : delay, ...args)
  })
  await page.goto('/archive/play?mode=preflop&seat=BB')
  const seat = page.locator('.trainer-table .seat--clickable').first()
  await expect(seat).toBeVisible({ timeout: 20000 })
  await seat.click()
  const details = page.getByRole('dialog', { name: 'Hand details & recovery' })
  await expect(details).toBeVisible()
  await expect(details.getByRole('heading', { name: / range$/ })).toBeVisible()
  await expect(details.getByRole('gridcell')).toHaveCount(169)
  await details
    .getByRole('button', { name: 'Back to hand', exact: true })
    .click()
  await expect(details).not.toBeVisible()
})
