const { test, expect } = require('@playwright/test')
async function snapshot(page) {
  return page.evaluate(async () => {
    const db = await new Promise((resolve) => {
      const r = indexedDB.open('poker-learning-v1')
      r.onsuccess = () => resolve(r.result)
    })
    const tx = db.transaction(['meta', 'hands', 'decisions']),
      get = (r) =>
        new Promise((resolve) => (r.onsuccess = () => resolve(r.result)))
    const data = {
      meta: await get(tx.objectStore('meta').get('state')),
      hands: await get(tx.objectStore('hands').getAll()),
      decisions: await get(tx.objectStore('decisions').getAll()),
    }
    db.close()
    return data
  })
}
async function boot(page, mode = 'full-hands') {
  await page.addInitScript(() => {
    let seed = 42
    Math.random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
      return seed / 4294967296
    }
  })
  await page.goto(`/archive/play?mode=${mode}&seat=LJ`)
  await expect(
    page.getByRole('group', { name: 'Your move', exact: true }),
  ).toBeVisible({ timeout: 20000 })
  await expect(page.getByRole('switch', { name: 'Preflop mode' })).toBeEnabled()
}
test('header switch animates, preserves both modes through reload and does not record decisions on toggling', async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await boot(page)
  const toggle = page.getByRole('switch', { name: 'Preflop mode' }),
    before = await snapshot(page)
  await expect(toggle).not.toBeChecked()
  const track = page.locator('.sim-mode__track'),
    thumb = page.locator('.sim-mode__thumb')
  const offTrack = await track.boundingBox(),
    offThumb = await thumb.boundingBox()
  expect(offThumb.width).toBeGreaterThan(offThumb.height * 1.25)
  expect(
    Math.abs(
      offThumb.y + offThumb.height / 2 - (offTrack.y + offTrack.height / 2),
    ),
  ).toBeLessThan(1)
  expect(offThumb.x + offThumb.width / 2).toBeLessThan(
    offTrack.x + offTrack.width / 2,
  )
  await page.screenshot({ path: info.outputPath('full-hands-switch.png') })
  await toggle.evaluate((el) => {
    el.click()
    el.click()
  })
  await expect(toggle).toBeChecked()
  await expect(toggle).toBeEnabled()
  await expect(
    page.getByRole('group', { name: 'Your move', exact: true }),
  ).toBeVisible()
  await thumb.evaluate(async (el) => {
    await Promise.all(el.getAnimations().map((animation) => animation.finished))
  })
  const onTrack = await track.boundingBox(),
    onThumb = await thumb.boundingBox()
  expect(onThumb.x + onThumb.width / 2).toBeGreaterThan(
    onTrack.x + onTrack.width / 2,
  )
  expect(onThumb.x).toBeGreaterThan(onTrack.x)
  expect(onThumb.x + onThumb.width).toBeLessThan(onTrack.x + onTrack.width)
  expect(
    Math.abs(onThumb.y + onThumb.height / 2 - (onTrack.y + onTrack.height / 2)),
  ).toBeLessThan(1)
  expect(
    await page
      .locator('.sim-mode__thumb')
      .evaluate((el) => getComputedStyle(el).transitionDuration),
  ).toContain('0.28s')
  const preflop = await snapshot(page)
  expect(
    preflop.hands.find((h) => h.id === preflop.meta.cursor.handId).config.mode,
  ).toBe('preflop')
  expect(preflop.meta.modeCursors['full-hands']).toEqual(before.meta.cursor)
  expect(preflop.decisions).toHaveLength(0)
  await page.screenshot({ path: info.outputPath('preflop-switch.png') })
  await page.reload()
  await expect(toggle).toBeChecked()
  await expect(toggle).toBeEnabled()
  expect((await snapshot(page)).meta.cursor).toEqual(preflop.meta.cursor)
  await toggle.focus()
  await page.keyboard.press('Space')
  await expect(toggle).not.toBeChecked()
  await expect(toggle).toBeEnabled()
  expect((await snapshot(page)).meta.cursor).toEqual(before.meta.cursor)
  expect((await snapshot(page)).decisions).toHaveLength(0)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(page.locator('.sim-mode__thumb')).toHaveCSS(
    'transition-duration',
    '0s',
  )
})
test('switching out of a manual retry returns to the preserved live hand when switching back', async ({
  page,
}) => {
  await boot(page)
  await page
    .getByRole('group', { name: 'Your move', exact: true })
    .getByRole('button')
    .last()
    .click()
  const feedback = page.getByRole('dialog', { name: 'Review this decision' })
  await expect(feedback).toBeVisible()
  const live = (await snapshot(page)).meta.cursor
  await feedback.getByRole('button', { name: 'Retry', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Return to live hand' }),
  ).toBeVisible()
  await page
    .getByRole('group', { name: 'Your move', exact: true })
    .getByRole('button')
    .first()
    .click()
  await expect(page.locator('.sim-compact:visible')).toBeVisible()
  const toggle = page.getByRole('switch', { name: 'Preflop mode' })
  await expect(toggle).toBeEnabled()
  await toggle.click()
  await expect(toggle).toBeChecked()
  await expect(toggle).toBeEnabled()
  await toggle.click()
  await expect(toggle).not.toBeChecked()
  await expect(feedback).toBeVisible()
  const after = await snapshot(page)
  expect(after.meta.cursor).toEqual(live)
  expect(after.meta.resume).toBeNull()
  expect(after.decisions.filter((d) => d.origin === 'manual')).toHaveLength(1)
})
test('unavailable full-hand assets keep the current preflop mode and hand intact', async ({
  page,
}) => {
  await page.route('**/full-hands/index.json', (r) => r.abort())
  await boot(page, 'preflop')
  const before = await snapshot(page),
    toggle = page.getByRole('switch', { name: 'Preflop mode' })
  await toggle.click()
  await expect(
    page.getByRole('alert').filter({ hasText: 'Full hands are unavailable' }),
  ).toContainText('Full hands are unavailable')
  await expect(toggle).toBeChecked()
  expect((await snapshot(page)).meta.cursor).toEqual(before.meta.cursor)
  await expect(
    page.getByRole('group', { name: 'Your move', exact: true }),
  ).toBeVisible()
})
test('an ownership failure leaves the mode and saved checkpoint unchanged', async ({
  page,
}) => {
  await boot(page)
  const before = await snapshot(page)
  await page.evaluate(async () => {
    const db = await new Promise((resolve) => {
      const r = indexedDB.open('poker-learning-v1')
      r.onsuccess = () => resolve(r.result)
    })
    const tx = db.transaction('meta', 'readwrite')
    tx.objectStore('meta').put({
      id: 'lease',
      owner: 'other-tab',
      until: Date.now() + 60000,
    })
    await new Promise((resolve) => (tx.oncomplete = resolve))
    db.close()
  })
  await page.getByRole('switch', { name: 'Preflop mode' }).click()
  await expect(
    page.getByRole('alert').filter({ hasText: 'Another tab owns' }),
  ).toContainText('Another tab owns')
  await expect(
    page.getByRole('switch', { name: 'Preflop mode' }),
  ).not.toBeChecked()
  expect((await snapshot(page)).meta.cursor).toEqual(before.meta.cursor)
})

test('switch restores a nine-seat mixed preflop setup after visiting the fixed six-max full-hands mode', async ({
  page,
}) => {
  await page.goto('/archive/play?mode=preflop&players=9&rangeType=gto&open=3&seat=UTG')
  await expect(
    page.getByRole('group', { name: 'Your move', exact: true }),
  ).toBeVisible({ timeout: 20000 })
  const toggle = page.getByRole('switch', { name: 'Preflop mode' })
  await expect(toggle).toBeEnabled()
  const original = await snapshot(page)
  await toggle.click()
  await expect(toggle).not.toBeChecked()
  await expect
    .poll(
      async () => {
        const data = await snapshot(page)
        return data.hands.find((h) => h.id === data.meta.cursor?.handId)?.config
          .players
      },
      { timeout: 20000 },
    )
    .toBe(6)
  await expect(toggle).toBeEnabled()
  await toggle.click()
  await expect(toggle).toBeChecked()
  await expect(
    page.getByRole('group', { name: 'Your move', exact: true }),
  ).toBeVisible()
  const restored = await snapshot(page),
    config = restored.hands.find(
      (h) => h.id === restored.meta.cursor.handId,
    ).config
  expect(config).toMatchObject({
    players: 9,
    rangeType: 'gto',
    openSize: 3,
    seat: 'UTG',
  })
  expect(restored.meta.cursor).toEqual(original.meta.cursor)
  expect(new URL(page.url()).searchParams.get('players')).toBe('9')
  expect(new URL(page.url()).searchParams.get('open')).toBe('3')
})
