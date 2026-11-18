const { test, expect } = require('@playwright/test')
const { tools } = require('./support/live.cjs')
const key = 'poker-academy:live:v1'
const saved = (page) =>
  page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key)
async function seed(page, random = false) {
  await page.addInitScript(
    ({ key, random }) => {
      if (!localStorage.getItem(key))
        localStorage.setItem(
          key,
          JSON.stringify({
            version: random ? 5 : 3,
            current: {
              mode: 'full-hands',
              seed: 42,
              hero: 5,
              style: 'balanced',
              config: {
                stacks: Array(6).fill(10000),
                button: 3,
                smallBlind: 50,
                bigBlind: 100,
              },
              actions: Array(5).fill({ kind: 'call' }),
              feedback: [],
              ...(random ? { randomPosition: true } : {}),
            },
            archive: [],
          }),
        )
    },
    { key, random },
  )
  await page.clock.install()
}
async function settings(page) {
  await tools(page)
  const summary = page
    .locator('summary')
    .filter({ hasText: /^Live table settings$/ })
  if (!(await summary.evaluate((e) => e.parentElement.open)))
    await summary.click()
}
test('random positions survive real Next hand, reload and mode parking without changing the saved hand', async ({
  page,
}, info) => {
  await seed(page, true)
  await page.goto('/live')
  await page.getByRole('button', { name: 'Fold', exact: true }).click()
  await page
    .getByRole('button', { name: 'Deal next live hand', exact: true })
    .click()
  const next = (await saved(page)).current
  expect(next.hero).not.toBe(5)
  expect(next.randomPosition).toBe(true)
  expect((await saved(page)).version).toBe(5)
  await page.reload()
  expect((await saved(page)).current).toEqual(next)
  await settings(page)
  await expect(
    page.getByRole('combobox', { name: 'Your position', exact: true }),
  ).toHaveValue('-1')
  await expect(
    page.getByRole('combobox', { name: 'Your position', exact: true }),
  ).toContainText('Random each hand')
  await page
    .getByRole('combobox', { name: 'Your position', exact: true })
    .scrollIntoViewIfNeeded()
  await page.screenshot({
    path: info.outputPath('random-position-settings.png'),
  })
  await page.getByRole('button', { name: 'Back to hand', exact: true }).click()
  await page
    .locator('.live-header')
    .getByRole('switch', { name: 'Preflop mode' })
    .click()
  await expect
    .poll(async () => (await saved(page)).current.mode)
    .toBe('preflop')
  expect((await saved(page)).current.graded).toBeDefined()
  expect((await saved(page)).current.graded.seat).toBeUndefined()
  await page
    .locator('.live-header')
    .getByRole('switch', { name: 'Preflop mode' })
    .click()
  await expect.poll(async () => (await saved(page)).current).toEqual(next)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollHeight <= innerHeight + 1,
    ),
  ).toBe(true)
})

test('existing fixed saves stay fixed; settings enable random 6/8/9 seats and can restore fixed focus', async ({
  page,
}) => {
  await seed(page)
  await page.goto('/live')
  await settings(page)
  const position = page.getByRole('combobox', {
    name: 'Your position',
    exact: true,
  })
  await expect(position).toHaveValue('5')
  await position.selectOption('-1')
  for (const n of [6, 8, 9]) {
    if (n !== 6) await settings(page)
    await page
      .getByRole('combobox', { name: 'Players', exact: true })
      .selectOption(String(n))
    await expect(position).toHaveValue('-1')
    const previous = (await saved(page)).current.hero
    await page
      .getByRole('button', { name: 'Start with these settings', exact: true })
      .click()
    const hand = (await saved(page)).current
    expect(hand.config.stacks).toHaveLength(n)
    expect(hand.hero).toBeGreaterThanOrEqual(0)
    expect(hand.hero).toBeLessThan(n)
    expect(hand.hero).not.toBe(previous)
    expect(hand.randomPosition).toBe(true)
  }
  await settings(page)
  await position.selectOption('4')
  await page
    .getByRole('button', { name: 'Start with these settings', exact: true })
    .click()
  expect((await saved(page)).current.hero).toBe(4)
  expect((await saved(page)).current.randomPosition).toBeUndefined()
  await page.reload()
  await settings(page)
  await expect(position).toHaveValue('4')
})
