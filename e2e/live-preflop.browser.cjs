const { readyRaise, setRaise, feedback: openFeedback, closeFeedback: closeLiveFeedback, tools: openLiveTools } = require('./support/live.cjs')
const { test, expect } = require('@playwright/test')
const AxeBuilder = require('@axe-core/playwright').default
const key = 'poker-academy:live:v1'
async function seed(page, { mode, hero = 0, actions = [] } = {}) {
  await page.addInitScript(({ key, mode, hero, actions }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ version: 1, current: {
      ...(mode ? { mode } : {}), seed: 42, hero, style: 'balanced', actions, feedback: [],
      config: { stacks: Array(6).fill(10000), button: 3, smallBlind: 50, bigBlind: 100 },
    }, archive: [] }))
  }, { key, mode, hero, actions })
}
const read = page => page.evaluate(k => JSON.parse(localStorage.getItem(k)), key)
const modeSwitch = page => page.locator('.live-header').getByRole('switch', { name: 'Preflop mode' })
async function dismiss(page) {
  const overlay = page.getByRole('dialog', { name: 'Review this decision', exact: true })
  if (await overlay.isVisible()) await overlay.getByRole('button', { name: 'Close explanation', exact: true }).click()
}
test('live toggle parks both exact hands, reloads, settings and retries without changing reference data', async ({ page }) => {
  await seed(page); await page.goto('/live')
  await expect(modeSwitch(page)).toBeEnabled()
  await page.getByRole('group', { name: 'Your move', exact: true }).getByRole('button', { name: /^Call / }).click()
  await dismiss(page)
  const full = (await read(page)).current
  await modeSwitch(page).click()
  await expect(modeSwitch(page)).toBeChecked()
  expect((await read(page)).parked['full-hands']).toEqual(full)
  await expect(page.getByRole('group',{name:'Your move',exact:true})).toBeVisible()
  const beforePre = (await read(page)).current
  const hasRaise = await page.getByRole('button',{name:'Raise / bet',exact:true}).isVisible()
  if(hasRaise) await page.getByRole('button',{name:'Raise / bet',exact:true}).click()
  else await page.getByRole('button',{name:/^Call /}).click()
  await openFeedback(page)
      const panel = page.getByRole('region', { name: 'Decision feedback' })
  await expect(panel.getByRole('gridcell')).toHaveCount(169)
  const pre = (await read(page)).current
  expect(pre.graded).toBeDefined()
  expect(pre.actions).toHaveLength(beforePre.actions.length+1)
  expect(pre.actions.at(-1).kind).toBe(hasRaise?'raise':'call')
  expect(pre.feedback.at(-1).reference.status).not.toBe('ungraded')
  await dismiss(page)
  await modeSwitch(page).click()
  await expect(modeSwitch(page)).not.toBeChecked()
  expect((await read(page)).current).toEqual(full)
  await page.reload()
  await expect(modeSwitch(page)).not.toBeChecked()
  await dismiss(page)
  await openLiveTools(page)
  await page.getByText('Live table settings', { exact: true }).click()
  await page.getByRole('radio', { name: 'Preflop', exact: true }).click()
  await expect(page.getByRole('radio', { name: 'Preflop', exact: true })).toHaveAttribute('aria-checked', 'true')
  expect((await read(page)).current).toEqual(pre)
  await page.getByText(/Review recent decisions/).click()
  await page.getByRole('button', { name: 'Retry decision', exact: true }).first().click()
  await expect(page.getByRole('heading', { name: 'Retry a saved decision' })).toBeVisible()
  await expect(page.getByRole('grid')).toHaveCount(0)
  await modeSwitch(page).click()
  await expect(modeSwitch(page)).not.toBeChecked()
  await dismiss(page)
  await modeSwitch(page).click()
  await expect(modeSwitch(page)).toBeChecked()
  expect((await read(page)).current).toEqual(pre)
  expect((await read(page)).parked['full-hands']).toEqual(full)
})
for (const allIn of [false, true]) test(`preflop ${allIn ? 'all-in' : 'BB check'} finishes without future cards, payouts or an invented winner`, async ({ page }, info) => {
  const actions = allIn ? [{ kind: 'raise', to: 10000 }, ...Array(4).fill({ kind: 'call' })] : Array(5).fill({ kind: 'call' })
  await seed(page, { mode: 'preflop', hero: 5, actions }); await page.goto('/live')
  await expect(modeSwitch(page)).toBeChecked()
  const moves = page.getByRole('group', { name: 'Your move', exact: true })
  await moves.getByRole('button', { name: allIn ? /^Call / : 'Check', exact: !allIn }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('heading', { name:'Preflop complete',exact:true })).toBeVisible()
  await expect(page.locator('.live-decision')).toContainText('No matching range')
  await expect(page.locator('.table-board .playing-card')).toHaveCount(0)
  await expect(page.locator('.live-showdown')).toHaveCount(0)
  expect((await read(page)).current.actions).toHaveLength(6)
  expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1)).toBe(true)
  await page.screenshot({path:info.outputPath(allIn?'preflop-all-in-phone.png':'preflop-complete-phone.png')})
  await page.reload();await expect(modeSwitch(page)).toBeChecked()
  await page.getByRole('button',{name:'Deal next preflop hand',exact:true}).click()
  const saved = await read(page)
  expect(saved.current.mode).toBe('preflop')
  expect(saved.archive.at(-1).actions).toHaveLength(6)
})
test('old Play links and main Settings reach the new modes while history stays archived', async ({ page }) => {
  await page.goto('/play?mode=preflop&players=9&seat=UTG&stack=50')
  await expect(page).toHaveURL(/\/live\?mode=preflop/)
  await expect(modeSwitch(page)).toBeChecked()
  expect((await read(page)).current.config.stacks).toEqual(Array(9).fill(5000))
  await page.getByRole('link', { name: 'Leave simulator', exact: true }).click()
  await expect(page.locator('.home-game')).toContainText('9-max cash · Preflop only')
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await page.getByRole('navigation', { name: 'Simulator modes', exact: true }).getByRole('link', { name: 'Full hands', exact: true }).click()
  await expect(modeSwitch(page)).not.toBeChecked()
  await page.goto('/play?mode=preflop&review=1')
  await expect(page).toHaveURL(/\/archive\/play/)
  await expect(page.getByRole('dialog', { name: 'Review your play' })).toBeVisible()
})
test('failed switch preserves the original hand and save; another tab cannot replace it', async ({ page, context }) => {
  await seed(page)
  await page.addInitScript(key => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function(k, v) {
      if (k === key && JSON.parse(v).current.mode === 'preflop') throw new DOMException('Full', 'QuotaExceededError')
      return original.call(this, k, v)
    }
  }, key)
  await page.goto('/live'); await readyRaise(page); await expect(modeSwitch(page)).toBeEnabled()
  const before = await read(page)
  await modeSwitch(page).click()
  await expect(page.locator('.live-page').getByRole('alert')).toContainText('Could not save the mode change')
  await expect(modeSwitch(page)).not.toBeChecked()
  expect(await read(page)).toEqual(before)
  const other = await context.newPage(); await other.goto('/live?mode=preflop')
  await expect(other.getByText(/Live practice is open in another tab/)).toBeVisible()
  expect(await read(page)).toEqual(before)
  await other.close()
})
test('new switch fits small screens, keeps its oval style and is accessible', async ({ page }, info) => {
  await seed(page); await page.goto('/live?mode=preflop'); await expect(modeSwitch(page)).toBeChecked()
  for (const [width,height] of [[320,568],[390,664],[390,844],[430,932],[768,1024],[844,390]]) {
    await page.setViewportSize({ width,height })
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1 && document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
    const clipped = await page.locator('.live-header h1,.live-header p,.sim-mode__label,.live-actions button,.live-raise button').evaluateAll(nodes => nodes.filter(n => n.scrollWidth > n.clientWidth + 1 || n.scrollHeight > n.clientHeight + 1).map(n => n.textContent))
    expect(clipped).toEqual([])
  }
  await page.setViewportSize({ width:390,height:844 })
  const thumb = await page.locator('.live-header .sim-mode__thumb').boundingBox()
  expect(thumb.width).toBeGreaterThan(thumb.height)
  const scan = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa']).analyze()
  expect(scan.violations.map(v => ({ id:v.id, nodes:v.nodes.map(n=>n.target) }))).toEqual([])
  await page.screenshot({ path: info.outputPath('live-preflop-switch-phone.png') })
})
test('offline cold starts support the updated preflop link and retained archive', async ({ page, context }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await page.getByText('Use offline on this device', { exact: true }).click()
  await page.getByRole('button', { name: 'Download offline pack', exact: true }).click()
  await expect(page.getByTestId('offline-status')).toContainText('Available offline', { timeout:90000 })
  await context.setOffline(true)
  await page.goto('/play?mode=preflop')
  await expect(modeSwitch(page)).toBeChecked()
  await expect(page.getByRole('group',{name:'Your move',exact:true})).toBeVisible()
  if(await page.getByRole('button',{name:'Raise / bet',exact:true}).isVisible())await page.getByRole('button',{name:'Raise / bet',exact:true}).click()
  else await page.getByRole('button',{name:/^Call /}).click()
  await openFeedback(page)
  await expect(page.getByRole('region', { name: 'Decision feedback' }).getByRole('gridcell')).toHaveCount(169)
  await page.goto('/play?mode=preflop&review=1')
  await expect(page.getByRole('dialog', { name: 'Review your play' })).toBeVisible()
  await context.setOffline(false)
})
for (const device of ['phone', 'desktop']) test(`${device}: play five shuffled preflop rounds through the actual controls`, async ({ page }, info) => {
  test.setTimeout(90000)
  const errors = []; page.on('pageerror', e => errors.push(e.message))
  await page.setViewportSize(device === 'phone' ? { width:390,height:844 } : { width:1365,height:950 })
  await page.clock.install(); await page.goto('/live?mode=preflop')
  await expect(modeSwitch(page)).toBeChecked()
  let completed = 0, decisions = 0
  for (let step = 0; step < 350 && completed < 5; step++) {
    const phase=await page.locator('.live-hand h2').first().innerText()
    if(['You folded','Preflop complete','Hand settled','Reference boundary'].includes(phase)) {
      await expect(page.locator('.table-board .playing-card')).toHaveCount(0)
      completed++
      if(completed<5) await page.getByRole('button',{name:'Deal next preflop hand',exact:true}).click()
      continue
    }
    const acknowledgment=page.getByRole('button',{name:'Continue hand',exact:true})
    if(await acknowledgment.isVisible()) await acknowledgment.click()
    const moves = page.getByRole('group', { name:'Your move',exact:true })
    if (await moves.isVisible()) {
      if (!decisions) {
        if(await page.getByRole('button',{name:'Raise / bet',exact:true}).isVisible())await page.getByRole('button',{name:'Raise / bet',exact:true}).click()
        else await moves.getByRole('button',{name:/^Call /}).click()
        await openFeedback(page)
        await expect(page.getByRole('region', { name:'Decision feedback' }).getByRole('gridcell')).toHaveCount(169)
      } else if (completed === 2) await moves.getByRole('button', { name:'Fold',exact:true }).click()
      else if (await moves.getByRole('button', { name:'Check',exact:true }).isVisible()) await moves.getByRole('button', { name:'Check',exact:true }).click()
      else await moves.getByRole('button', { name:/^Call / }).click()
      decisions++
    }
    await page.clock.runFor(900); await page.waitForTimeout(10)
  }
  expect(completed).toBe(5); expect(decisions).toBeGreaterThanOrEqual(5); expect(errors).toEqual([])
  require('node:fs').writeFileSync(info.outputPath('preflop-playthrough.json'),JSON.stringify({ device,completed,decisions,errors },null,2))
})
