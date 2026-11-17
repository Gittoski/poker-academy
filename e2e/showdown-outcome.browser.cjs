const { test, expect } = require('@playwright/test')
const fs = require('node:fs')
const AxeBuilder = require('@axe-core/playwright').default
const cases = [
  ['hero', '3bp-BTN-SB/8s6h3h-2', 'You win'],
  ['villain', 'srp-LJ-BTN/Qs5h3d-4', 'Villain wins'],
  ['split', '3bp-CO-BB/7s6h3d-4', 'Split pot'],
]
for (const [winner, id, title] of cases)
  test(`terminal ${winner} result is readable and never grades a decision`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const script = JSON.parse(
      fs.readFileSync(`public/full-hands/${id}.json`, 'utf8'),
    )
    expect(script.result.kind).toBe('showdown')
    expect(script.result.winner).toBe(winner)
    const index = JSON.parse(
      fs.readFileSync('public/full-hands/index.json', 'utf8'),
    )
    await page.route('**/full-hands/index.json', (r) =>
      r.fulfill({
        json: { ...index, hands: index.hands.filter((h) => h.id === id) },
      }),
    )
    await page.addInitScript(() => {
      Math.random = () => 0.99
      const native = setTimeout
      window.setTimeout = (fn, d, ...args) =>
        native(fn, d === 1000 ? 20 : d, ...args)
    })
    await page.goto('/archive/play')
    const move = page.getByRole('group', { name: 'Your move', exact: true }),
      view = page.getByRole('button', {
        name: 'View hand result',
        exact: true,
      }),
      popup = page.getByRole('dialog', { name: title, exact: true })
    await expect(move).toBeVisible({ timeout: 20000 })
    await expect(popup).toHaveCount(0)
    for (let i = 0; i < 30; i++) {
      await expect
        .poll(
          async () =>
            (await move.isVisible()) ||
            (await view.isVisible()) ||
            (await popup.isVisible()),
        )
        .toBe(true)
      if ((await view.isVisible()) || (await popup.isVisible())) break
      await move.getByRole('button').first().click()
      await expect(page.locator('.verdict:visible')).toBeVisible()
      await expect(popup).toHaveCount(0)
      if ((await view.isVisible()) || (await popup.isVisible())) break
      await page.getByRole('button', { name: 'Continue', exact: true }).click()
    }
    if (await view.isVisible()) await view.click()
    await expect(popup).toBeVisible()
    await expect(
      page.locator('.trainer-table .range-card__title > span'),
    ).toHaveText('Showdown complete')
    await expect(popup.locator('.outcome-pot')).toHaveText(
      `${script.result.pot} BB pot`,
    )
    await expect(popup.locator('.outcome-hands dd')).toHaveText([
      script.result.heroHand,
      script.result.villainHand,
    ])
    await expect(page.locator('.board .playing-card')).toHaveCount(5)
    const scan = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()
    expect(
      scan.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([])
    await page.screenshot({ path: info.outputPath(`outcome-${winner}.png`) })
    await popup.getByText('Hand details', { exact: true }).click()
    for (const [width, height] of [
      [320, 568],
      [390, 844],
      [844, 390],
    ]) {
      await page.setViewportSize({ width, height })
      const box = await popup
        .getByRole('button', { name: 'Next hand', exact: true })
        .boundingBox()
      expect(box.y).toBeGreaterThanOrEqual(0)
      expect(box.y + box.height).toBeLessThanOrEqual(height + 1)
      expect(
        await popup
          .getByRole('heading', { name: title, exact: true })
          .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
      ).toBe(true)
    }
    await popup.getByRole('button', { name: 'Back to table' }).click()
    await expect(popup).not.toBeVisible()
    await expect(
      page.getByRole('region', { name: 'Hand result' }),
    ).toContainText(title)
    await page.getByRole('button', { name: 'Show result', exact: true }).click()
    await expect(popup).toBeVisible()
    await page.reload()
    await expect(popup).toBeVisible()
  })
