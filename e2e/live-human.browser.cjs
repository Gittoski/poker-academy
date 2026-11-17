const { readyRaise, setRaise, feedback: openFeedback, closeFeedback: closeLiveFeedback, tools: openLiveTools } = require('./support/live.cjs')
const { test, expect } = require('@playwright/test')
const AxeBuilder = require('@axe-core/playwright').default
const fs = require('node:fs')
const key = 'poker-academy:live:v1'
test.use({ viewport: { width: 1365, height: 950 } })
for (const device of ['desktop', 'phone']) test(`${device}: play five complete real-data hands, inspect range support and verify phone text and accessibility`, async ({ page }, testInfo) => {
  test.setTimeout(120000)
  const errors = [], turns = []
  page.on('pageerror', e => errors.push(e.message))
  const viewport = device === 'phone' ? { width: 390, height: 844 } : { width: 1365, height: 950 }
  await page.setViewportSize(viewport)
  await page.clock.install()
  await page.goto('/live')
  await expect(page.getByRole('group', { name: 'Your move', exact: true })).toBeVisible()
  await readyRaise(page)
  let heroDecisions = 0, completed = 0, captured = false
  for (let step = 0; step < 450 && completed < 5; step++) {
    const phase=await page.locator('.live-hand h2').first().innerText()
    if (['You folded','Hand settled','Preflop complete'].includes(phase)) {
      const view=page.getByRole('button',{name:'View hand result',exact:true})
      if(await view.isVisible()) await view.click()
      const outcome=page.getByRole('dialog',{name:'Showdown result',exact:true})
      if(await outcome.isVisible()) await outcome.getByRole('button',{name:'Back to table',exact:true}).click()
      completed++
      if(completed<5) await page.getByRole('button',{name:'Deal next live hand',exact:true}).click()
      continue
    }
    const acknowledgment=page.getByRole('button',{name:'Continue hand',exact:true})
    if(await acknowledgment.isVisible()) await acknowledgment.click()
    const moves = page.getByRole('group', { name: 'Your move', exact: true })
    if (await moves.isVisible()) {
      const ownHand = await page.getByRole('img', { name: /^Your hand:/ }).getAttribute('aria-label')
      let chosen
      if (heroDecisions === 0) { chosen = 'raise 2.5 BB'; await page.getByRole('button', { name: 'Raise / bet', exact: true }).click() }
      else if (completed === 1 && heroDecisions < 3) { chosen = 'fold'; await moves.getByRole('button', { name: 'Fold', exact: true }).click() }
      else if (await moves.getByRole('button', { name: 'Check', exact: true }).isVisible()) { chosen = 'check'; await moves.getByRole('button', { name: 'Check', exact: true }).click() }
      else { chosen = 'call'; await moves.getByRole('button', { name: /^Call / }).click() }
      heroDecisions++
      await openFeedback(page)
      const panel = page.getByRole('region', { name: 'Decision feedback' })
      await expect(panel).toBeVisible()
      const pack = await page.evaluate(k => JSON.parse(localStorage.getItem(k)), key)
      const reference = pack.current.feedback.at(-1).reference
      if (reference.chart) {
        await expect(panel.getByRole('gridcell')).toHaveCount(169)
        await expect(panel.locator('.cell--highlight')).toHaveText(reference.chart.hand)
        await expect(panel.getByRole('heading', { name: reference.frequency > 0 ? 'In range' : 'Outside range', exact: true })).toBeVisible()
      } else {
        await expect(panel.getByRole('heading', { name: 'No matching range', exact: true })).toBeVisible()
        await expect(panel.getByRole('grid')).toHaveCount(0)
      }
      turns.push({ ownHand, chosen, street: reference.chart?.title ?? 'ungraded', result: reference.status })
      if (!captured && reference.chart) {
        await page.setViewportSize({ width: 390, height: 844 })
        await panel.scrollIntoViewIfNeeded()
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
        await page.screenshot({ path: testInfo.outputPath('range-check-phone.png'), fullPage: true })
        const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
        expect(scan.violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) }))).toEqual([])
        await page.setViewportSize({ width: 1365, height: 950 })
        await panel.scrollIntoViewIfNeeded()
        await page.screenshot({ path: testInfo.outputPath('range-check-desktop.png'), fullPage: true })
        await page.setViewportSize(viewport)
        captured = true
      }
    } else {
      const next = page.getByRole('button', { name: 'Continue hand', exact: true })
      if (await next.isVisible()) await next.click()
    }
    await page.clock.runFor(900)
    await page.waitForTimeout(10)
  }
  expect(completed).toBe(5)
  expect(captured).toBe(true)
  expect(heroDecisions).toBeGreaterThanOrEqual(5)
  expect(errors).toEqual([])
  fs.writeFileSync(testInfo.outputPath('range-human-play.json'), JSON.stringify({ completed, heroDecisions, turns, errors }, null, 2))
})
