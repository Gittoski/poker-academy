const { test, expect } = require('@playwright/test')
const AxeBuilder = require('@axe-core/playwright').default
async function boot(page, mode = 'full-hands', seat = 'LJ') {
  await page.addInitScript(() => {
    let seed = 42
    Math.random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
      return seed / 4294967296
    }
    const native = window.setTimeout
    window.setTimeout = (fn, delay, ...args) =>
      native(fn, delay === 1000 || delay === 1200 ? 20 : delay, ...args)
  })
  await page.goto(`/play?mode=${mode}&seat=${seat}`)
  await expect(
    page.getByRole('group', { name: 'Your move', exact: true }),
  ).toBeVisible({ timeout: 20000 })
}
async function state(page) {
  return page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const r = indexedDB.open('poker-learning-v1')
      r.onsuccess = () => resolve(r.result)
      r.onerror = () => reject(r.error)
    })
    const tx = db.transaction(
      ['meta', 'hands', 'decisions', 'problems', 'sessions'],
      'readonly',
    )
    const get = (r) =>
      new Promise((resolve) => (r.onsuccess = () => resolve(r.result)))
    const [meta, hands, decisions, problems, sessions] = await Promise.all([
      get(tx.objectStore('meta').get('state')),
      get(tx.objectStore('hands').getAll()),
      get(tx.objectStore('decisions').getAll()),
      get(tx.objectStore('problems').getAll()),
      get(tx.objectStore('sessions').getAll()),
    ])
    db.close()
    return { meta, hands, decisions, problems, sessions }
  })
}
async function wrong(page) {
  const before = await state(page)
  const c = before.meta.cursor
  const h = before.hands.find((h) => h.id === c.handId)
  let probs
  if (!c.play) {
    // Read original chart data through an answered fixture: select a zero displayed weight, then verify the persisted raw classification.
    const buttons = page
      .getByRole('group', { name: 'Your move', exact: true })
      .getByRole('button')
    // LJ fixture seed deals a strong scripted opening. Fold is unsupported in this spot.
    await buttons.last().click()
  } else {
    probs = []
    await page
      .getByRole('group', { name: 'Your move', exact: true })
      .getByRole('button')
      .last()
      .click()
  }
  await expect(page.locator('.verdict')).toBeVisible()
  await expect
    .poll(async () => (await state(page)).decisions.length)
    .toBeGreaterThan(0)
  return (await state(page)).decisions.at(-1)
}
for (const mode of ['preflop', 'full-hands'])
  test(`${mode}: automatic capture, verdict reload and paused exact practice`, async ({
    page,
  }) => {
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    await boot(page, mode)
    const cards = await page.locator('.hole-cards').last().innerText()
    const a = await wrong(page)
    await expect(page.getByRole('status').first()).toContainText('Saved')
    const saved = await state(page)
    expect(saved.decisions).toHaveLength(1)
    await page.reload()
    await expect(page.locator('.verdict')).toBeVisible({ timeout: 15000 })
    expect(await page.locator('.hole-cards').last().innerText()).toBe(cards)
    expect((await state(page)).decisions).toHaveLength(1)
    await page.getByRole('button', { name: 'Review mistakes' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Sessions', exact: true }).click()
    await dialog.locator('.learning-list button').first().click()
    await dialog
      .getByRole('button', { name: / · (First exposure|Repeated context)$/ })
      .click()
    await expect(
      dialog.getByText('The trainer executed', { exact: false }),
    ).toBeVisible()
    const snapshot = await state(page)
    await page.keyboard.press('r')
    await page.waitForTimeout(100)
    expect((await state(page)).decisions.length).toBe(snapshot.decisions.length)
    await dialog
      .getByRole('button', { name: 'Retry this decision', exact: true })
      .click()
    await expect(dialog).toBeHidden()
    const move = page.getByRole('group', { name: 'Your move', exact: true })
    await expect(move).toBeVisible()
    await move.getByRole('button').nth(a.prompt.expected).click()
    await expect(page.locator('.verdict:visible')).toBeVisible()
    await expect
      .poll(
        async () =>
          (await state(page)).decisions.filter((d) => d.origin === 'manual')
            .length,
      )
      .toBe(1)
    await page.getByRole('button', { name: 'Return to live hand' }).click()
    await expect(page.locator('.verdict:visible')).toBeVisible()
    expect((await state(page)).meta.cursor.handId).toBe(
      saved.meta.cursor.handId,
    )
    expect(errors).toEqual([])
  })
test('review controls, mobile dialog, focus, accessibility and another tab', async ({
  page,
  context,
}, testInfo) => {
  await boot(page)
  await wrong(page)
  await page.getByText('Practice settings', { exact: true }).click()
  await page.getByLabel('Mix in my mistakes').uncheck()
  await page.getByLabel('About 1 review hand in every 10 hands').fill('2')
  await expect
    .poll(async () => (await state(page)).meta.nextScheduler?.interval)
    .toBe(2)
  await page.getByRole('button', { name: 'Review mistakes' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  for (const width of [320, 390, 768, 1365]) {
    await page.setViewportSize({ width, height: 844 })
    expect(
      await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    ).toBe(true)
  }
  await page.setViewportSize({ width: 390, height: 844 })
  const scan = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()
  expect(
    scan.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([])
  await page.screenshot({
    path: testInfo.outputPath('session-review-phone.png'),
    fullPage: true,
  })
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(
    page.getByRole('button', { name: 'Review mistakes' }),
  ).toBeFocused()
  const other = await context.newPage()
  await other.goto('/play')
  await expect(
    other.getByText('Another tab is playing.', { exact: false }),
  ).toBeVisible({ timeout: 15000 })
  await other.close()
})

test('adaptive mistake returns as a whole hand and is revealed only after its target answer', async ({
  page,
}, testInfo) => {
  await boot(page)
  const original = await wrong(page)
  expect(original.learning.kind).toBe('outside')
  const fs = require('node:fs')
  const records = await state(page)
  const sourceSizes = await page.evaluate(async () => {
    const db = await new Promise((resolve) => {
      const r = indexedDB.open('poker-learning-v1')
      r.onsuccess = () => resolve(r.result)
    })
    const rows = await new Promise((resolve) => {
      const r = db.transaction('sources').objectStore('sources').getAll()
      r.onsuccess = () => resolve(r.result)
    })
    db.close()
    return rows.map((s) => ({
      kind: s.kind,
      payloadBytes: s.bytes,
      recordBytes: new TextEncoder().encode(JSON.stringify(s)).length,
    }))
  })
  const measured = {
    decisionBytes: Buffer.byteLength(JSON.stringify(original)),
    handBytes: Buffer.byteLength(
      JSON.stringify(records.hands.find((h) => h.id === original.handId)),
    ),
    sourceSizes,
  }
  fs.writeFileSync(
    testInfo.outputPath('storage-measurements.json'),
    JSON.stringify(measured, null, 2),
  )

  await page.screenshot({
    path: testInfo.outputPath('saved-mistake.png'),
    fullPage: true,
  })
  for (let i = 0; i < 25; i++) {
    const result = page.getByRole('button', {
      name: 'View hand result',
      exact: true,
    })
    if (await result.isVisible()) await result.click()
    const next = page.getByRole('button', { name: 'Next hand', exact: true })
    if (await next.isVisible()) break
    const proceed = page.getByRole('button', { name: 'Continue', exact: true })
    if (await proceed.isVisible()) await proceed.click()
    const move = page.getByRole('group', { name: 'Your move', exact: true })
    await expect
      .poll(async () => (await move.isVisible()) || (await next.isVisible()))
      .toBe(true)
    if (await move.isVisible()) {
      await move.getByRole('button').first().click()
      await expect(page.locator('.verdict')).toBeVisible()
    }
  }
  await expect(
    page.getByRole('button', { name: 'Next hand', exact: true }),
  ).toBeVisible()
  await expect(page.getByRole('status').first()).toContainText('Saved')
  await page.evaluate(async (id) => {
    const db = await new Promise((resolve) => {
      const r = indexedDB.open('poker-learning-v1')
      r.onsuccess = () => resolve(r.result)
    })
    const tx = db.transaction(['meta', 'problems'], 'readwrite'),
      metaStore = tx.objectStore('meta'),
      problemStore = tx.objectStore('problems')
    const m = metaStore.get('state')
    m.onsuccess = () => {
      const meta = m.result
      meta.scheduler = {
        ...meta.scheduler,
        enabled: true,
        index: 0,
        slot: 0,
        slotUsed: false,
      }
      delete meta.nextScheduler
      metaStore.put(meta)
    }
    const p = problemStore.get(id)
    p.onsuccess = () => problemStore.put({ ...p.result, dueAt: 0 })
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve
      tx.onabort = reject
    })
    db.close()
  }, original.problemId)
  await page.getByRole('button', { name: 'Next hand', exact: true }).click()
  const move = page.getByRole('group', { name: 'Your move', exact: true })
  await expect(move).toBeVisible()
  const replay = await state(page),
    hand = replay.hands.find((h) => h.id === replay.meta.cursor.handId)
  expect(hand.origin).toBe('adaptive')
  expect(replay.meta.cursor.play).toBeNull()
  expect(hand.initial).toEqual(
    (await state(page)).hands.find((h) => h.id === original.handId).initial,
  )
  await expect(
    page.getByText('Review from an earlier session.', { exact: false }),
  ).toBeHidden()
  await move.getByRole('button').nth(original.prompt.expected).click()
  await expect(
    page.getByText('Review from an earlier session.', { exact: false }),
  ).toBeVisible()
  await expect
    .poll(
      async () =>
        (await state(page)).problems.find((p) => p.id === original.problemId)
          ?.reviews,
    )
    .toBe(1)
  await page.screenshot({
    path: testInfo.outputPath('adaptive-return.png'),
    fullPage: true,
  })
  await page.getByRole('button', { name: 'Review mistakes' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.locator('.learning-list button').first().click()
  await expect(
    dialog.getByRole('button', { name: 'Retry this decision' }),
  ).toBeVisible()
  await page.screenshot({
    path: testInfo.outputPath('mistake-review.png'),
    fullPage: true,
  })
})

test('8/9-seat preflop and same-frame duplicate input preserve one durable attempt', async ({
  page,
}) => {
  for (const players of [8, 9]) {
    await page.goto(`/play?mode=preflop&players=${players}&seat=UTG`)
    const move = page.getByRole('group', { name: 'Your move', exact: true })
    await expect(move).toBeVisible({ timeout: 15000 })
    const initial = (await state(page)).decisions.length
    await move
      .getByRole('button')
      .last()
      .evaluate((button) => {
        button.click()
        button.click()
      })
    await expect(page.locator('.verdict')).toBeVisible()
    await expect
      .poll(async () => (await state(page)).decisions.length)
      .toBe(initial + 1)
    expect(
      (await state(page)).decisions.find((d) => d.config.players === players)
        ?.config.players,
    ).toBe(players)
  }
})

test('storage denial gives an honest unsaved mode with export instead of breaking play', async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, 'indexedDB', {
      get() {
        throw new DOMException('Storage denied', 'SecurityError')
      },
    }),
  )
  await page.goto('/play?mode=preflop&seat=LJ')
  await expect(
    page.getByRole('heading', { name: 'Saved play needs attention' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Play without saving' }).click()
  const move = page.getByRole('group', { name: 'Your move', exact: true })
  await expect(move).toBeVisible()
  await move.getByRole('button').last().click()
  await expect(page.locator('.verdict')).toBeVisible()
  await expect(page.getByRole('status').first()).toContainText('Not saved')
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export pending work' }).click()
  const file = await download
  const fs = require('node:fs')
  const recovery = JSON.parse(fs.readFileSync(await file.path(), 'utf8'))
  expect(recovery.kind).toBe('pending-recovery')
  expect(recovery.events.some((e) => e.decision)).toBe(true)
})

test('postflop retry restores the exact visible board and reference without future cards', async ({
  page,
}, testInfo) => {
  const fs = require('node:fs'),
    index = JSON.parse(fs.readFileSync('public/full-hands/index.json', 'utf8')),
    fixture = index.hands.find((h) => h.id === '3bp-BTN-BB/7s6h3d-5')
  await page.route('**/full-hands/index.json', (r) =>
    r.fulfill({ json: { ...index, hands: [fixture] } }),
  )
  await boot(page, 'full-hands', 'BTN')
  let saved = null
  for (let i = 0; i < 20; i++) {
    const move = page.getByRole('group', { name: 'Your move', exact: true }),
      next = page.getByRole('button', { name: 'Next hand', exact: true })
    await expect
      .poll(async () => (await move.isVisible()) || (await next.isVisible()))
      .toBe(true)
    if (await next.isVisible()) {
      await next.click()
      continue
    }
    const postflop = (await page.locator('.board').count()) > 0
    if (postflop) {
      const hole = await page.locator('.hole-cards').last().innerText(),
        board = await page.locator('.board').innerText()
      await move.getByRole('button').last().click()
      await expect(page.locator('.verdict')).toBeVisible()
      await expect(page.getByRole('status').first()).toContainText('Saved')
      saved = (await state(page)).decisions.sort(
        (a, b) => b.createdAt - a.createdAt,
      )[0]
      await page.getByRole('button', { name: 'Review mistakes' }).click()
      const dialog = page.getByRole('dialog')
      await dialog
        .getByRole('button', { name: 'Sessions', exact: true })
        .click()
      await dialog.locator('.learning-list button').first().click()
      await dialog
        .getByRole('button', {
          name: new RegExp(
            `${saved.prompt.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
          ),
        })
        .first()
        .click()
      await expect(
        dialog.getByRole('button', { name: 'Retry this decision' }),
      ).toBeEnabled()
      await page.screenshot({
        path: testInfo.outputPath('postflop-review.png'),
        fullPage: true,
      })
      await dialog.getByRole('button', { name: 'Retry this decision' }).click()
      await expect(move).toBeVisible()
      expect(await page.locator('.board:visible').innerText()).toBe(board)
      expect(await page.locator('.hole-cards:visible').last().innerText()).toBe(
        hole,
      )
      await expect(page.locator('.showdown:visible')).toHaveCount(0)
      await page.screenshot({
        path: testInfo.outputPath('exact-retry.png'),
        fullPage: true,
      })
      break
    }
    await move.getByRole('button').first().click()
    await expect(page.locator('.verdict')).toBeVisible()
    await page
      .getByRole('button', { name: /^(Continue|View hand result|Next hand)$/ })
      .click()
  }
  expect(saved?.prompt.street).toBe('flop')
})

test('reload before answering keeps the hand; NPC progression pauses throughout review', async ({
  page,
  context,
}) => {
  await boot(page)
  await expect(page.getByRole('status').first()).toContainText('Saved')
  const original = await state(page)
  await page.reload()
  await expect(
    page.getByRole('group', { name: 'Your move', exact: true }),
  ).toBeVisible()
  const restored = await state(page)
  expect(restored.meta.cursor.handId).toBe(original.meta.cursor.handId)
  expect(restored.meta.cursor.hand.seats.map((s) => s.cards)).toEqual(
    original.meta.cursor.hand.seats.map((s) => s.cards),
  )
  expect(restored.decisions).toHaveLength(0)
  await page.close()
  const npc = await context.newPage()
  await npc.goto('/play?seat=BB')
  await expect
    .poll(async () => {
      try {
        return (await state(npc)).meta?.cursor?.hand.hero
      } catch {
        return null
      }
    })
    .toBe('BB')
  const before = await state(npc)
  await npc.reload()
  await expect
    .poll(async () => {
      try {
        return (await state(npc)).meta?.cursor?.handId
      } catch {
        return null
      }
    })
    .toBe(before.meta.cursor.handId)
  await npc.getByRole('button', { name: 'Review mistakes' }).click()
  await expect(npc.getByRole('dialog')).toBeVisible()
  const paused = await state(npc)
  await npc.waitForTimeout(1200)
  const after = await state(npc)
  expect(after.meta.cursor.handId).toBe(paused.meta.cursor.handId)
  expect(after.meta.cursor.hand.toAct).toBe(paused.meta.cursor.hand.toAct)
  expect(after.meta.cursor.play).toEqual(paused.meta.cursor.play)
  await npc.keyboard.press('Escape')
  await expect(npc.getByRole('dialog')).toBeHidden()
  await npc.close()
})

test('LAN fallback coordinates duplicate tabs and resumes the original tab', async ({
  page,
  context,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, 'locks', {
      value: undefined,
      configurable: true,
    }),
  )
  await boot(page, 'preflop')
  const before = await state(page),
    owner = await page.evaluate(() =>
      sessionStorage.getItem('poker-learning-tab'),
    )
  const duplicate = await context.newPage()
  await duplicate.addInitScript((owner) => {
    Object.defineProperty(navigator, 'locks', {
      value: undefined,
      configurable: true,
    })
    sessionStorage.setItem('poker-learning-tab', owner)
  }, owner)
  await duplicate.goto('/play?mode=preflop')
  await expect(
    duplicate.getByText('Another tab is playing.', { exact: false }),
  ).toBeVisible()
  await duplicate.close()
  await page.reload()
  await expect(
    page.getByRole('group', { name: 'Your move', exact: true }),
  ).toBeVisible()
  expect((await state(page)).meta.cursor.handId).toBe(before.meta.cursor.handId)
})
test('missing original reference leaves saved context read-only instead of substituting a chart', async ({
  page,
}) => {
  await boot(page)
  const attempt = await wrong(page)
  await page.evaluate(async (id) => {
    const db = await new Promise((resolve) => {
      const r = indexedDB.open('poker-learning-v1')
      r.onsuccess = () => resolve(r.result)
    })
    const tx = db.transaction('sources', 'readwrite')
    tx.objectStore('sources').delete(id)
    await new Promise((resolve) => (tx.oncomplete = resolve))
    db.close()
  }, attempt.config.rangesId)
  await page.getByRole('button', { name: 'Review mistakes' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.locator('.learning-list button').first().click()
  await expect(
    dialog.getByText('Original reference content is unavailable.', {
      exact: false,
    }),
  ).toBeVisible()
  await expect(
    dialog.getByRole('button', { name: 'Retry this decision' }),
  ).toBeDisabled()
  await expect(
    dialog.getByText('The trainer executed', { exact: false }),
  ).toBeVisible()
})
