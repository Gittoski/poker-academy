const { test, expect } = require('@playwright/test')
const { tools, feedback, watchSetup } = require('./support/live.cjs')
const key = 'poker-academy:live:v1'
const saved = (page) =>
  page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key)
async function seed(page, full = false) {
  await page.addInitScript(
    ({ key, full }) => {
      if (!localStorage.getItem(key))
        localStorage.setItem(
          key,
          JSON.stringify({
            version: full ? 3 : 4,
            current: {
              mode: full ? 'full-hands' : 'preflop',
              seed: 42,
              hero: 3,
              style: 'balanced',
              config: {
                stacks: Array(6).fill(10000),
                button: 3,
                smallBlind: 50,
                bigBlind: 100,
              },
              actions: full ? [] : Array(3).fill({ kind: 'fold' }),
              feedback: [],
              ...(!full
                ? { graded: { version: 1, context: 'open:BTN', seat: 3 } }
                : {}),
            },
            archive: [],
          }),
        )
    },
    { key, full },
  )
  const time = new Date('2026-11-18T12:00:00Z')
  await page.clock.install({ time })
  await page.clock.pauseAt(new Date(time.getTime() + 1000))
  await page.goto('/live')
}
async function newSetup(page) {
  await seed(page)
  await tools(page)
  await page.getByText('Live table settings', { exact: true }).click()
  await page
    .getByRole('button', { name: 'Start with these settings', exact: true })
    .click()
  await expect(
    page.getByRole('status', { name: 'Watching setup', exact: true }),
  ).toBeVisible()
  return (await saved(page)).current
}

test('new supplied setups show blinds, thinking and individual actions before accepting a graded answer', async ({
  page,
}, info) => {
  const original = await newSetup(page)
  const status = page.getByRole('status', {
    name: 'Watching setup',
    exact: true,
  })
  await expect(status).toContainText('Blinds posted')
  await expect(status).toContainText('LJ is thinking')
  await expect(
    page.locator('.seat-caption').filter({ hasText: 'Folded' }),
  ).toHaveCount(0)
  await expect(
    page.getByRole('group', { name: 'Your move', exact: true }),
  ).toHaveCount(0)
  await page.clock.runFor(649)
  await expect(status).toContainText('Blinds posted')
  await page.clock.runFor(1)
  const first = original.actions[0]
  await expect(status).toContainText(
    first.kind === 'fold' ? 'LJ folds' : `LJ raises to ${first.to / 100} BB`,
  )
  expect((await saved(page)).current).toEqual(original)
  await page.screenshot({ path: info.outputPath('setup-in-progress.png') })
  await watchSetup(page)
  await expect(status).toHaveCount(0)
  await expect(
    page.getByRole('group', { name: 'Your move', exact: true }),
  ).toBeVisible()
  expect((await saved(page)).current).toEqual(original)
  await page.getByRole('button', { name: 'Fold', exact: true }).click()
  const answered = (await saved(page)).current
  expect(answered.actions.slice(0, -1)).toEqual(original.actions)
  expect(answered.feedback).toHaveLength(1)
  expect(answered.feedback[0].index).toBe(original.actions.length)
  expect(answered.feedback[0].reference.status).not.toBe('ungraded')
  await feedback(page, 'Explanation')
  await page
    .getByRole('dialog', { name: 'Review this decision', exact: true })
    .getByRole('button', { name: 'Retry', exact: true })
    .click()
  await expect(
    page.getByRole('group', { name: 'Your move', exact: true }),
  ).toBeVisible()
  await expect(status).toHaveCount(0)
  expect((await saved(page)).current.actions).toEqual(original.actions)
  expect((await saved(page)).current.seed).toBe(original.seed)
})

test('settings pause setup playback and reload preserves the exact supplied decision without extra actions', async ({
  page,
}) => {
  const original = await newSetup(page)
  await page.clock.runFor(650)
  await tools(page)
  await page.clock.runFor(20000)
  expect((await saved(page)).current).toEqual(original)
  await page.getByRole('button', { name: 'Back to hand', exact: true }).click()
  await expect(
    page.getByRole('status', { name: 'Watching setup', exact: true }),
  ).toBeVisible()
  await page.clock.runFor(20000)
  await expect(
    page.getByRole('status', { name: 'Watching setup', exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Continue hand', exact: true }).click()
  await watchSetup(page)
  await expect(
    page.getByRole('group', { name: 'Your move', exact: true }),
  ).toBeVisible()
  expect((await saved(page)).current).toEqual(original)
  await page.reload()
  await expect(
    page.getByRole('group', { name: 'Your move', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('status', { name: 'Watching setup', exact: true }),
  ).toHaveCount(0)
  expect((await saved(page)).current).toEqual(original)
})

test('setup playback cancels on mode switches, keeps the navy layout in the viewport and respects reduced motion', async ({
  page,
}, info) => {
  const original = await newSetup(page)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  expect(
    await page
      .locator('.live-thinking-dots i')
      .first()
      .evaluate((e) => getComputedStyle(e).animationName),
  ).toBe('live-thinking')
  for (const [width, height] of [
    [320, 568],
    [390, 844],
    [844, 390],
    [1365, 950],
  ]) {
    await page.setViewportSize({ width, height })
    if (width < 1024)
      expect(
        await page.evaluate(
          () => document.documentElement.scrollHeight <= innerHeight + 1,
        ),
      ).toBe(true)
    const box = await page
      .getByRole('status', { name: 'Watching setup', exact: true })
      .boundingBox()
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(width + 1)
    expect(box.y + box.height).toBeLessThanOrEqual(height + 1)
  }
  await page.emulateMedia({ reducedMotion: 'reduce' })
  expect(
    await page
      .locator('.live-thinking-dots i')
      .first()
      .evaluate((e) => getComputedStyle(e).animationName),
  ).toBe('none')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: info.outputPath('setup-phone.png') })
  await page
    .locator('.live-header')
    .getByRole('switch', { name: 'Preflop mode' })
    .click()
  await page.clock.runFor(50)
  await expect
    .poll(async () => (await saved(page)).current.mode)
    .toBe('full-hands')
  const full = (await saved(page)).current
  await page.clock.runFor(20000)
  expect((await saved(page)).current).toEqual(full)
  expect((await saved(page)).parked.preflop).toEqual(original)
  await expect(
    page.getByRole('status', { name: 'Watching setup', exact: true }),
  ).toHaveCount(0)
  await page
    .locator('.live-header')
    .getByRole('switch', { name: 'Preflop mode' })
    .click()
  await page.clock.runFor(50)
  await expect.poll(async () => (await saved(page)).current).toEqual(original)
  await expect(
    page.getByRole('group', { name: 'Your move', exact: true }),
  ).toBeVisible()
})

test('Full hands keeps its real opponent timing and displays each public action while the next player thinks', async ({
  page,
}) => {
  await seed(page, true)
  await page.getByRole('button', { name: 'Continue hand', exact: true }).click()
  await expect(page.locator('.live-wait')).toContainText('LJ is thinking')
  await page.clock.runFor(649)
  expect((await saved(page)).current.actions).toHaveLength(0)
  await page.clock.runFor(1)
  const after = (await saved(page)).current
  expect(after.actions).toHaveLength(1)
  await expect(page.locator('.live-action-feed strong')).toContainText('LJ')
  await expect(page.locator('.live-wait')).toContainText('HJ is thinking')
  await expect(
    page.getByRole('group', { name: 'Your move', exact: true }),
  ).toHaveCount(0)
  for (let n = 2; n <= 3; n++) {
    await page.clock.runFor(700)
    await expect
      .poll(async () => (await saved(page)).current.actions.length)
      .toBe(n)
  }
  await expect(
    page.getByRole('group', { name: 'Your move', exact: true }),
  ).toBeVisible()
  expect((await saved(page)).current.actions).toHaveLength(3)
})
