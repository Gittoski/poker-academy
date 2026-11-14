const { test, expect } = require('@playwright/test')
const fs = require('node:fs')
async function current(page) {
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
    return value?.cursor
  })
}
async function fixture(page, id) {
  const index = JSON.parse(
      fs.readFileSync('public/full-hands/index.json', 'utf8'),
    ),
    entry = index.hands.find((h) => h.id === id)
  await page.route('**/full-hands/index.json', (r) =>
    r.fulfill({ json: { ...index, hands: [entry] } }),
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
for (const [street, id, count] of [
  ['flop', '3bp-HJ-BB/8s6h3h-0', 3],
  ['turn', '3bp-HJ-BB/7s6h3d-3', 4],
]) {
  test(`all-in call on ${street} requires result view, reveals all five cards and resumes after reload`, async ({
    page,
  }, testInfo) => {
    await fixture(page, id)
    const initial = await current(page)
    const view = page.getByRole('button', {
        name: 'View hand result',
        exact: true,
      }),
      move = page.getByRole('group', { name: 'Your move', exact: true })
    for (let i = 0; i < 40; i++) {
      await expect
        .poll(async () => (await move.isVisible()) || (await view.isVisible()))
        .toBe(true)
      if (await view.isVisible()) break
      const call = move.getByRole('button', { name: /^Call/ })
      if (await call.count()) await call.first().click()
      else await move.getByRole('button').first().click()
      await expect(page.locator('.verdict')).toBeVisible()
      if (await view.isVisible()) break
      await page.getByRole('button', { name: 'Continue', exact: true }).click()
    }
    await expect(view).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Next hand', exact: true }),
    ).toHaveCount(0)
    await expect(page.locator('.board .playing-card')).toHaveCount(count)
    await expect(page.locator('.showdown')).toHaveCount(0)
    await view.evaluate((button) => {
      button.click()
      button.click()
    })
    const result = page.getByRole('region', {
      name: 'Hand result',
      exact: true,
    })
    await expect(result).toBeVisible()
    await expect(result).toContainText('remaining board was dealt for showdown')
    await expect(result).toContainText('Showdown:')
    await expect(page.locator('.board .playing-card')).toHaveCount(5)
    await expect(page.locator('.showdown')).toBeVisible()
    await expect.poll(async () => (await current(page)).resultShown).toBe(true)
    const next = page.getByRole('button', { name: 'Next hand', exact: true })
    await expect(next).toBeEnabled()
    await page.evaluate(() =>
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Enter',
          repeat: true,
          bubbles: true,
          cancelable: true,
        }),
      ),
    )
    expect((await current(page)).handId).toBe(initial.handId)
    await page.reload()
    await expect(result).toBeVisible()
    await expect(page.locator('.board .playing-card')).toHaveCount(5)
    expect((await current(page)).handId).toBe(initial.handId)
    await page.screenshot({
      path: testInfo.outputPath(`${street}-all-in-result.png`),
      fullPage: true,
    })
    await next.click()
    await expect(move).toBeVisible()
    await expect
      .poll(async () => (await current(page)).handId)
      .not.toBe(initial.handId)
  })
}
test('a villain fold ends on its real street and result stays until the next-hand click', async ({
  page,
}) => {
  await fixture(page, 'srp-CO-BB/KsJh4h-1')
  const initial = await current(page),
    move = page.getByRole('group', { name: 'Your move', exact: true }),
    result = page.getByRole('region', { name: 'Hand result', exact: true })
  for (let i = 0; i < 30; i++) {
    await expect
      .poll(async () => (await move.isVisible()) || (await result.isVisible()))
      .toBe(true)
    if (await result.isVisible()) break
    await move.getByRole('button').first().click()
    await expect(page.locator('.verdict')).toBeVisible()
    await page
      .getByRole('button', { name: /^(Continue|View hand result)$/ })
      .click()
  }
  await expect(result).toBeVisible()
  await expect(result).toContainText('fold on the flop')
  await expect(page.locator('.board .playing-card')).toHaveCount(3)
  await expect(page.locator('.showdown')).toHaveCount(0)
  await page.waitForTimeout(1200)
  expect((await current(page)).handId).toBe(initial.handId)
})

test('a selected Call corrected to scripted Fold has an explicit, truthful result', async ({
  page,
}) => {
  await fixture(page, 'srp-CO-BB/7s6h3d-3')
  const move = page.getByRole('group', { name: 'Your move', exact: true }),
    view = page.getByRole('button', { name: 'View hand result', exact: true })
  for (let i = 0; i < 30; i++) {
    await expect
      .poll(async () => (await move.isVisible()) || (await view.isVisible()))
      .toBe(true)
    if (await view.isVisible()) break
    const call = move.getByRole('button', { name: /^Call/ })
    if (await call.count()) await call.first().click()
    else await move.getByRole('button').first().click()
    await expect(page.locator('.verdict')).toBeVisible()
    if (await view.isVisible()) break
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
  }
  await expect(view).toBeVisible()
  await view.click()
  const result = page.getByRole('region', { name: 'Hand result', exact: true })
  await expect(result).toContainText('Your selection: Call')
  await expect(result).toContainText('Scripted action: Fold')
  await expect(result).toContainText('fold on the flop')
  await expect(page.locator('.board .playing-card')).toHaveCount(3)
})
