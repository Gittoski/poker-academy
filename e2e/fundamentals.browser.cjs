const { home, openReviews } = require('./support/navigation.cjs')
const { test, expect } = require('@playwright/test')
const AxeBuilder = require('@axe-core/playwright').default
async function learning(page) {
  return page.evaluate(async () => {
    const db = await new Promise((resolve) => {
      const r = indexedDB.open('poker-fundamentals-v1')
      r.onsuccess = () => resolve(r.result)
    })
    const tx = db.transaction(['active', 'skills', 'attempts']),
      get = (r) =>
        new Promise((resolve) => (r.onsuccess = () => resolve(r.result)))
    const [active, skills, attempts] = await Promise.all([
      get(tx.objectStore('active').getAll()),
      get(tx.objectStore('skills').getAll()),
      get(tx.objectStore('attempts').getAll()),
    ])
    db.close()
    return { active, skills, attempts }
  })
}
async function answerPot(page) {
  await expect(
    page
      .getByRole('group', { name: 'Practice answers' })
      .getByRole('button')
      .first(),
  ).toBeEnabled()
  const text = await page.locator('#question-heading').innerText(),
    n = text.match(/\d+(?:\.\d+)?/g).map(Number)
  let expected
  if (text.includes('What equity breaks even'))
    expected = `${((n[1] / (n[0] + n[1])) * 100).toFixed(1)}%`
  else {
    const ev = (n[2] / 100) * (n[0] + n[1]) - n[1]
    expected = Math.abs(ev) < 1e-9 ? 'Break-even' : ev > 0 ? 'Call' : 'Fold'
  }
  await page
    .getByRole('group', { name: 'Practice answers' })
    .getByRole('button', { name: expected, exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Correct', exact: true }),
  ).toBeVisible()
  await expect(page.getByRole('status').first()).toContainText(
    'saved on this device',
  )
}
async function lesson(page, topic) {
  await page.goto(`/learn?topic=${topic}`)
  await expect(
    page.getByRole('heading', { name: 'Worked example' }),
  ).toBeVisible()
  await page
    .getByRole('button', { name: 'I understand — start untimed practice' })
    .click()
  await expect(page.locator('#question-heading')).toBeVisible()
}
test('guided topics, exact feedback, fresh questions, saved errors and restore', async ({
  page,
}) => {
  await lesson(page, 'pot-odds')
  const first = await learning(page)
  await answerPot(page)
  expect((await learning(page)).attempts).toHaveLength(1)
  await page.reload()
  await expect(
    page.getByRole('heading', { name: 'Correct', exact: true }),
  ).toBeVisible()
  expect((await learning(page)).active[0].attemptId).toBe(
    first.active[0].attemptId,
  )
  await page.getByRole('button', { name: 'Next example', exact: true }).click()
  await expect(
    page
      .getByRole('group', { name: 'Practice answers' })
      .getByRole('button')
      .first(),
  ).toBeEnabled()
  const second = await learning(page)
  expect(second.active[0].attemptId).not.toBe(first.active[0].attemptId)
  await answerPot(page)
  expect((await learning(page)).skills[0].untimed.fresh).toBe(2)
  for (const topic of ['draws', 'equity', 'ev', 'fold-equity']) {
    await lesson(page, topic)
    await page
      .getByRole('group', { name: 'Practice answers' })
      .getByRole('button')
      .first()
      .click()
    await expect(page.locator('.fundamentals-explanation')).toBeVisible()
    await expect(page.locator('.fundamentals-explanation')).toContainText(
      'Basis:',
    )
    await expect(page.getByRole('status').first()).toContainText(
      'saved on this device',
    )
  }
  await page
    .getByRole('button', { name: 'Learning progress', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Your learning progress' }),
  ).toBeVisible()
  expect((await learning(page)).attempts).toHaveLength(6)
  await page.getByText('Learning backups', { exact: true }).click()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export learning progress' }).click(),
  ])
  const backup = require('node:fs').readFileSync(await download.path())
  page.once('dialog', (dialog) => dialog.accept())
  await page
    .locator('input[type=file]')
    .setInputFiles({
      name: 'invalid.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{"version":999}'),
    })
  await expect(page.getByRole('alert').filter({hasText:'Import failed'})).toContainText(
    'Import failed; existing progress retained',
  )
  expect((await learning(page)).attempts).toHaveLength(6)
  page.once('dialog', (dialog) => dialog.accept())
  await page
    .locator('input[type=file]')
    .setInputFiles({
      name: 'backup.json',
      mimeType: 'application/json',
      buffer: backup,
    })
  await expect(page.locator('#question-heading')).toBeVisible()
  expect((await learning(page)).attempts).toHaveLength(6)
})
test('optional timing is gated and timeout does not fabricate a wrong answer', async ({
  page,
}) => {
  await page.clock.install()
  await lesson(page, 'pot-odds')
  await page.getByText('Optional timing', { exact: true }).click()
  const timed = page.getByRole('button', { name: 'Start 45-second practice' })
  await expect(timed).toBeDisabled()
  for (let i = 0; i < 16; i++) {
    await answerPot(page)
    const s = (await learning(page)).skills[0]
    if (s.untimed.freshCorrect >= 3 && s.families.length >= 2) break
    await page
      .getByRole('button', { name: 'Next example', exact: true })
      .click()
  }
  await expect(timed).toBeEnabled()
  await timed.click()
  await expect
    .poll(
      async () =>
        (await learning(page)).active.find((a) => a.topic === 'pot-odds')?.mode,
    )
    .toBe('timed')
  await page.clock.fastForward(46000)
  await expect(page.getByRole('timer')).toContainText('Time elapsed')
  await answerPot(page)
  const saved = (await learning(page)).attempts.find((a) => a.mode === 'timed')
  expect(saved.correct).toBe(true)
  expect(saved.withinTime).toBe(false)
})
test('learning layouts, focus and accessibility remain usable on phones', async ({
  page,
}, testInfo) => {
  await lesson(page, 'pot-odds')
  for (const width of [320, 390, 768, 1365]) {
    await page.setViewportSize({ width, height: 844 })
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true)
  }
  const axe = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()
  expect(
    axe.violations.map((v) => ({
      id: v.id,
      targets: v.nodes.map((n) => n.target),
    })),
  ).toEqual([])
  await page.setViewportSize({ width: 390, height: 844 })
  await answerPot(page)
  await page.screenshot({
    path: testInfo.outputPath('pot-odds-practice.png'),
    fullPage: true,
  })
})
test('a complete offline pack supports cold-start fundamentals and supplied simulator hands', async ({
  page,
  context,
}) => {
  test.setTimeout(180000)
  await page.goto('/learn')
  await page.getByText('Use offline on this device', { exact: true }).click()
  const download = page.getByRole('button', {
    name: 'Download offline pack',
    exact: true,
  })
  await expect(download).toBeEnabled()
  await download.click()
  await expect(page.getByTestId('offline-status')).toContainText(
    'Available offline',
    { timeout: 120000 },
  )
  await context.setOffline(true)
  await lesson(page, 'pot-odds')
  await answerPot(page)
  await page.reload()
  await expect(
    page.getByRole('heading', { name: 'Correct', exact: true }),
  ).toBeVisible()
  await page.goto('/archive/play?seat=LJ')
  await expect(
    page.getByRole('group', { name: 'Your move', exact: true }),
  ).toBeVisible({ timeout: 20000 })
  await page
    .getByRole('group', { name: 'Your move', exact: true })
    .getByRole('button')
    .first()
    .click()
  await expect(page.locator('.verdict:visible')).toBeVisible()
  await page.goto('/learn')
  await page.getByText('Use offline on this device', { exact: true }).click()
  await expect(page.getByTestId('offline-status')).toContainText(
    'Available offline',
  )
  await page.getByRole('button', { name: 'Update offline pack' }).click()
  await expect(page.getByTestId('offline-status')).toContainText(
    'Download failed',
  )
  await page.reload()
  await page.getByText('Use offline on this device', { exact: true }).click()
  await expect(page.getByTestId('offline-status')).toContainText(
    'Available offline',
  )
  const saved = await learning(page)
  await context.setOffline(false)
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Remove downloaded pack' }).click()
  await expect(page.getByTestId('offline-status')).toContainText(
    'Downloaded pack removed',
  )
  await page.getByRole('button', { name: 'Reload online' }).click()
  await expect(
    page.getByRole('heading', { name: 'Learn one step at a time' }),
  ).toBeVisible()
  expect((await learning(page)).attempts).toEqual(saved.attempts)
})
test('simulator errors open related fresh practice and preserve the paused hand', async ({
  page,
}) => {
  await page.setViewportSize({width:1365,height:950})
  const fs = require('node:fs'),
    index = JSON.parse(fs.readFileSync('public/full-hands/index.json', 'utf8')),
    fixture = index.hands.find((h) => h.id === '3bp-BTN-BB/7s6h3d-5')
  await page.route('**/full-hands/index.json', (r) =>
    r.fulfill({ json: { ...index, hands: [fixture] } }),
  )
  await page.addInitScript(() => {
    Math.random = () => 0.99
    const native = setTimeout
    window.setTimeout = (fn, delay, ...args) =>
      native(fn, delay === 1000 ? 20 : delay, ...args)
  })
  await page.goto('/archive/play?seat=BTN')
  const move = page.getByRole('group', { name: 'Your move', exact: true })
  for (let i = 0; i < 10; i++) {
    await expect(move).toBeVisible()
    if (await page.locator('.board').count()) {
      await move.getByRole('button').last().click()
      break
    }
    await move.getByRole('button').first().click()
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
  }
  await expect(page.locator('.verdict:visible')).toBeVisible()
  await expect(page.getByRole('status').first()).toContainText('Saved')
  const handId = await page.evaluate(async () => {
    const db = await new Promise((resolve) => {
      const r = indexedDB.open('poker-learning-v1')
      r.onsuccess = () => resolve(r.result)
    })
    const value = await new Promise((resolve) => {
      const r = db.transaction('meta').objectStore('meta').get('state')
      r.onsuccess = () => resolve(r.result)
    })
    db.close()
    return value.cursor.handId
  })
  await openReviews(page)
  const dialog = page.getByRole('dialog')
  await dialog.locator('.learning-list button').first().click()
  await expect(dialog).toContainText('not an equity estimate')
  await dialog
    .getByRole('link', { name: 'Practice this skill: Pot odds', exact: true })
    .click()
  await expect(page).toHaveURL(/\/learn\?topic=pot-odds/)
  await expect(
    page.getByText('Opened from a saved simulator decision.', { exact: false }),
  ).toBeVisible()
  await page
    .getByRole('button', { name: 'I understand — start untimed practice' })
    .click()
  await answerPot(page)
  await page
    .getByRole('link', { name: 'Back to simulator', exact: true })
    .click()
  await expect(page.locator('.verdict:visible')).toBeVisible()
  const restored = await page.evaluate(async () => {
    const db = await new Promise((resolve) => {
      const r = indexedDB.open('poker-learning-v1')
      r.onsuccess = () => resolve(r.result)
    })
    const value = await new Promise((resolve) => {
      const r = db.transaction('meta').objectStore('meta').get('state')
      r.onsuccess = () => resolve(r.result)
    })
    db.close()
    return value.cursor.handId
  })
  expect(restored).toBe(handId)
})
