const { test, expect } = require('@playwright/test')
const AxeBuilder = require('@axe-core/playwright').default

async function seededPlay(page) {
  await page.addInitScript(() => {
    let state = 42
    Math.random = () => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0
      return state / 4294967296
    }
  })
  await page.goto('/play')
  await expect(
    page.getByRole('group', { name: 'Your move', exact: true }),
  ).toBeVisible({ timeout: 15000 })
}
async function scan(page) {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()
  expect(
    result.violations.map((v) => ({
      id: v.id,
      targets: v.nodes.map((n) => n.target),
    })),
  ).toEqual([])
}

test('navy presentation preserves both chart palettes and saved chart theme', async ({
  page,
}) => {
  for (const theme of ['classic', 'cool']) {
    await page.addInitScript(
      (value) => localStorage.setItem('open-range-viewer:theme', value),
      theme,
    )
    await page.goto('/')
    await expect(page.getByRole('gridcell')).toHaveCount(169)
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
    const colors = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement)
      return ['--raise', '--call', '--fold', '--check', '--raise-strong'].map(
        (v) => style.getPropertyValue(v).trim(),
      )
    })
    expect(colors).toEqual(
      theme === 'classic'
        ? ['#ef6f6f', '#4fd06a', '#d8d8d8', '#6f9fe0', '#b83a3a']
        : ['#a6c8f7', '#f7f2a4', '#d8d8d8', '#c9b6f2', '#5f8fd6'],
    )
    await scan(page)
  }
})

test('navy controls fit phone/tablet/desktop, retain neutral choices and safe action sizes', async ({
  page,
}, testInfo) => {
  await seededPlay(page)
  const buttons = page
    .getByRole('group', { name: 'Your move', exact: true })
    .getByRole('button')
  const labels = await buttons.allTextContents()
  for (const width of [320, 390, 430, 768, 1365]) {
    await page.setViewportSize({ width, height: 950 })
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      `overflow at ${width}`,
    ).toBe(true)
    const appearance = await buttons.evaluateAll((nodes) =>
      nodes.map((n) => ({
        height: n.getBoundingClientRect().height,
        width: n.getBoundingClientRect().width,
        background: getComputedStyle(n).backgroundImage,
        color: getComputedStyle(n).color,
      })),
    )
    for (const button of appearance) {
      expect(button.height).toBeGreaterThanOrEqual(44)
      expect(button.width).toBeGreaterThanOrEqual(44)
      expect(button.background).toBe(appearance[0].background)
      expect(button.color).toBe(appearance[0].color)
    }
    expect(await buttons.allTextContents()).toEqual(labels)
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.locator('.keyboard-hints')).toBeHidden()
  await scan(page)
  await page.screenshot({
    path: testInfo.outputPath('navy-phone.png'),
    fullPage: true,
  })
  await page.setViewportSize({ width: 1365, height: 950 })
  await expect(page.locator('.keyboard-hints')).toBeVisible()
  await scan(page)
  await page.screenshot({
    path: testInfo.outputPath('navy-desktop.png'),
    fullPage: true,
  })
})

test('card and feedback motion honors reduced motion without blocking keyboard play', async ({
  page,
}) => {
  await seededPlay(page)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  const animated = await page
    .locator('.playing-card')
    .first()
    .evaluate((n) => ({
      name: getComputedStyle(n).animationName,
      duration: getComputedStyle(n).animationDuration,
    }))
  expect(animated.name).toBe('interface-card-in')
  expect(animated.duration).toBe('0.24s')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const names = await page
    .locator('.playing-card, .seat-pulse')
    .evaluateAll((nodes) => nodes.map((n) => getComputedStyle(n).animationName))
  expect(names.every((name) => name === 'none')).toBe(true)
  expect(
    await page
      .locator('.playing-card')
      .first()
      .evaluate((n) => getComputedStyle(n).opacity),
  ).toBe('1')
  await page.keyboard.press('r')
  await expect(page.locator('.verdict')).toBeVisible()
  expect(
    await page
      .locator('.verdict')
      .evaluate((n) => getComputedStyle(n).animationName),
  ).toBe('none')
  await expect(
    page.getByRole('heading', { name: 'Chart', exact: true }),
  ).toBeVisible()
  await page.keyboard.press('Enter')
  await expect(page.locator('.verdict')).toBeHidden()
})

test('6/8/9-seat range inspection and full-hand board overlay remain usable', async ({
  page,
}, testInfo) => {
  for (const players of [6, 8, 9]) {
    await page.goto(`/?players=${players}`)
    await expect(page.getByRole('gridcell')).toHaveCount(169)
    await expect(
      page.getByRole('img', {
        name: new RegExp(`^Table with ${players} players`),
      }),
    ).toBeVisible()
    expect(await page.locator('.seat-surface').count()).toBe(players)
  }
  await seededPlay(page)
  let sawBoard = false
  for (let i = 0; i < 15; i++) {
    const move = page.getByRole('group', { name: 'Your move', exact: true })
    const next = page.getByRole('button', { name: 'Next hand', exact: true })
    await expect
      .poll(async () => (await move.isVisible()) || (await next.isVisible()), {
        timeout: 20000,
      })
      .toBe(true)
    if (await next.isVisible()) {
      await next.click()
      continue
    }
    await move.getByRole('button').first().click()
    await expect(page.locator('.verdict')).toBeVisible()
    const board = page.locator('.board')
    if (await board.count()) {
      const tableBox = await page.locator('.table-wrap').boundingBox()
      const boardBox = await board.boundingBox()
      expect(boardBox.x).toBeGreaterThanOrEqual(tableBox.x)
      expect(boardBox.x + boardBox.width).toBeLessThanOrEqual(
        tableBox.x + tableBox.width,
      )
      expect(boardBox.y).toBeGreaterThan(tableBox.y)
      expect(boardBox.y + boardBox.height).toBeLessThan(
        tableBox.y + tableBox.height,
      )
      await scan(page)
      await page.screenshot({
        path: testInfo.outputPath('navy-postflop-review.png'),
        fullPage: true,
      })
      sawBoard = true
      break
    }
    await page.getByRole('button', { name: /^(Continue|Next hand)$/ }).click()
  }
  expect(sawBoard).toBe(true)
})

test('complete five-card runout stays inside the table and clear of seats on a narrow phone', async ({ page }, testInfo) => {
  const fs = require('node:fs')
  const index = JSON.parse(fs.readFileSync('public/full-hands/index.json', 'utf8'))
  const fixture = index.hands.find(h => h.id === '3bp-BTN-BB/7s6h3d-5')
  await page.route('**/full-hands/index.json', route => route.fulfill({ json: { ...index, hands: [fixture] } }))
  await page.setViewportSize({ width: 320, height: 844 })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await seededPlay(page)
  const counts = new Set()
  for (let i = 0; i < 20; i++) {
    const move = page.getByRole('group', { name: 'Your move', exact: true })
    const next = page.getByRole('button', { name: 'Next hand', exact: true })
    await expect.poll(async () => await move.isVisible() || await next.isVisible(), { timeout: 20000 }).toBe(true)
    if (await next.isVisible()) { await next.click(); continue }
    const board = page.locator('.board')
    if (await board.count()) {
      const cards = board.locator('.playing-card')
      counts.add(await cards.count())
      for (const card of await cards.all()) await expect(card).toHaveCSS('opacity', '1')
      const box = await board.boundingBox()
      const overlaps = await page.locator('.seat-surface').evaluateAll((nodes, b) => nodes.filter(n => {
        const r = n.getBoundingClientRect()
        return Math.min(r.right, b.x+b.width)-Math.max(r.left,b.x)>1 && Math.min(r.bottom,b.y+b.height)-Math.max(r.top,b.y)>1
      }).length, box)
      expect(overlaps).toBe(0)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
      if (counts.has(5)) {
        await page.screenshot({ path: testInfo.outputPath('navy-river-320.png'), fullPage: true })
        break
      }
    }
    await move.getByRole('button').first().click()
    await page.locator('.verdict').waitFor()
    await page.getByRole('button', { name: /^(Continue|Next hand)$/ }).click()
  }
  expect([...counts].sort()).toEqual([3,4,5])
})
