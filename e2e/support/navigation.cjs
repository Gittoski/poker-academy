const { expect } = require('@playwright/test')
async function home(page) {
  await page.goto('/')
  await expect(page.locator('.home-save')).toContainText(
    'Progress saved on this device',
  )
}
async function openReviews(page) {
  await home(page)
  await page.getByRole('link', { name: 'All reviews', exact: true }).click()
  await expect(
    page.getByRole('dialog', { name: 'Review your play' }),
  ).toBeVisible()
}
module.exports = { home, openReviews }
