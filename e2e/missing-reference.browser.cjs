const { test, expect } = require('@playwright/test')
test.use({ viewport: { width: 1365, height: 950 } })
for (const mode of ['preflop', 'full-hands']) {
  test(`${mode}: missing references never silently act or reveal a stored result`, async ({ page }) => {
    const errors = []
    page.on('pageerror', e => errors.push(e.message))
    await page.route('**/ranges/Cash_100_PTO.json', route => route.fulfill({ json: [{ id: 'unrelated', scenario: 'open', rangeTypes: ['pto'], hero: ['SB'], range: { raise: 'AA' } }] }))
    await page.goto(`/archive/play?mode=${mode}&seat=LJ`)
    await expect(page.getByText(/No action was taken and no winner is assigned/).first()).toBeVisible({ timeout: 20000 })
    await expect(page.getByRole('group', { name: 'Your move', exact: true })).toHaveCount(0)
    await expect(page.locator('.showdown')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Next hand', exact: true })).toBeEnabled()
    const text = await page.locator('.table-wrap').innerText()
    await page.waitForTimeout(1800)
    await expect(page.getByText(/No action was taken and no winner is assigned/).first()).toBeVisible()
    expect(await page.locator('.table-wrap').innerText()).toBe(text)
    await page.reload()
    await expect(page.getByText(/No action was taken and no winner is assigned/).first()).toBeVisible({ timeout: 20000 })
    expect(errors).toEqual([])
  })
}
