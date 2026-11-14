const { test, expect } = require('@playwright/test')
const path = require('node:path')
const fs = require('node:fs')

function watchErrors(page) {
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('response', response => {
    if (response.status() >= 400 && new URL(response.url()).origin === 'http://127.0.0.1:3100') errors.push(`${response.status()}: ${response.url()}`)
  })
  return errors
}
async function seed(page, initial = 20261113) {
  await page.addInitScript(value => {
    let state = value >>> 0
    Math.random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296 }
  }, initial)
}

test('range viewer loads supplied charts and preserves scenario/position in the URL', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('/')
  await expect(page.getByRole('gridcell')).toHaveCount(169)
  await page.getByRole('radiogroup', { name: 'Hero position' }).getByRole('radio', { name: 'BTN', exact: true }).click()
  await expect(page).toHaveURL(/hero=BTN/)
  await page.reload()
  await expect(page.getByRole('radiogroup', { name: 'Hero position' }).getByRole('radio', { name: 'BTN', exact: true })).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByRole('gridcell')).toHaveCount(169)
  await page.getByRole('button', { name: 'Customize setup' }).click()
  await expect(page.getByRole('radiogroup', { name: 'Range source' })).toBeVisible()
  expect(errors).toEqual([])
})

test('preflop trainer accepts an answer, shows feedback and continues', async ({ page }) => {
  const errors = watchErrors(page)
  await seed(page)
  await page.goto('/play?mode=preflop')
  const move = page.getByRole('group', { name: 'Your move', exact: true })
  await expect(move).toBeVisible({ timeout: 15000 })
  await move.getByRole('button').last().click()
  await expect(page.locator('.verdict')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Chart', exact: true })).toBeVisible()
  await page.getByRole('button', { name: /^(Continue|Next hand)$/ }).click()
  await expect(move).toBeVisible({ timeout: 20000 })
  expect(errors).toEqual([])
})

test('full-hand scripts load and play through postflop with strategy feedback', async ({ page }) => {
  const errors = watchErrors(page)
  await seed(page, 42)
  await page.goto('/play')
  let postflop = false
  let completed = false
  for (let step = 0; step < 36; step++) {
    const move = page.getByRole('group', { name: 'Your move', exact: true })
    const finish = page.getByRole('button', { name: 'Next hand', exact: true })
    await expect.poll(async () => await move.isVisible() || await finish.isVisible(), { timeout: 20000 }).toBe(true)
    if (await finish.isVisible()) {
      completed = true
      await finish.click()
      if (postflop) break
      continue
    }
    await move.getByRole('button').first().click()
    await expect(page.locator('.verdict')).toBeVisible()
    if (await page.getByRole('heading', { name: /^(Flop|Turn|River) strategy$/ }).count()) postflop = true
    const next = page.getByRole('button', { name: 'Next hand', exact: true })
    if (await next.count()) {
      completed = true
      await next.click()
      if (postflop) break
    } else await page.getByRole('button', { name: 'Continue', exact: true }).click()
  }
  expect(postflop).toBe(true)
  expect(completed).toBe(true)
  expect(errors).toEqual([])
})

test('baseline phone and desktop layouts render; save actual-app and concept previews', async ({ page }, testInfo) => {
  await seed(page, 42)
  await page.goto('/')
  await expect(page.getByRole('gridcell')).toHaveCount(169)
  for (const width of [320, 390, 768, 1365]) {
    await page.setViewportSize({ width, height: 844 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `range viewer overflow at ${width}`).toBe(true)
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/play')
  await expect(page.getByRole('group', { name: 'Your move', exact: true })).toBeVisible({ timeout: 15000 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
  const directory = path.resolve('docs/design')
  fs.mkdirSync(directory, { recursive: true })
  await page.screenshot({ path: process.env.UPDATE_DESIGN_PREVIEWS ? path.join(directory, 'upstream-phone-baseline.png') : testInfo.outputPath('upstream-phone-baseline.png'), fullPage: true })
  await page.setContent(fs.readFileSync(path.join(directory, 'index.html'), 'utf8'))
  await page.setViewportSize({ width: 1240, height: 1050 })
  await page.screenshot({ path: process.env.UPDATE_DESIGN_PREVIEWS ? path.join(directory, 'visual-directions.png') : testInfo.outputPath('visual-directions.png'), fullPage: true })
  await expect(page.getByRole('heading', { name: /Emerald/ })).toBeVisible()
})
