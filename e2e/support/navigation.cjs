const { expect } = require('@playwright/test')
async function home(page) {
  await page.goto('/')
  await expect(page.locator('.home-save')).toContainText(
    'Progress saved on this device',
  )
}
async function openReviews(page) {
  await home(page)
  await page.getByText('Earlier exercise history', { exact: true }).click()
  await page.getByRole('link', { name: 'Saved exercise reviews', exact: true }).click()
  await expect(
    page.getByRole('dialog', { name: 'Review your play' }),
  ).toBeVisible()
}
async function openArchivedSettings(page) {
  await home(page)
  await page.getByText('Earlier exercise history', { exact: true }).click()
  await page.getByRole('button', { name: 'Archived exercise settings', exact: true }).click()
}
module.exports = { home, openReviews, openArchivedSettings }
