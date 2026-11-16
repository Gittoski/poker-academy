const { test, expect } = require('@playwright/test')
const fs = require('node:fs')
const nodePath = require('node:path')

test('approved brand artwork loads in all existing logo slots and platform icon metadata', async ({
  page,
  request,
}, info) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  for (const [path, size] of [
    ['/brand-mark', 144],
    ['/icon', 512],
    ['/apple-icon', 180],
  ]) {
    const trace = nodePath.resolve(`.next/server/app${path}/route.js.nft.json`)
    const files = JSON.parse(fs.readFileSync(trace, 'utf8')).files
    expect(
      files.some(
        (file) =>
          nodePath.resolve(nodePath.dirname(trace), file) ===
          nodePath.resolve('src/branding/spade.png'),
      ),
    ).toBe(true)
    const response = await request.get(path)
    expect(response.ok()).toBe(true)
    expect(response.headers()['content-type']).toContain('image/png')
    const png = await response.body()
    expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
    expect(png.readUInt32BE(16)).toBe(size)
    expect(png.readUInt32BE(20)).toBe(size)
  }
  for (const route of ['/', '/ranges', '/learn']) {
    await page.goto(route)
    const logo = page.locator('img.app-logo')
    await expect(logo).toHaveCount(1)
    await expect(logo).toHaveAttribute('src', '/brand-mark')
    await expect
      .poll(() =>
        logo.evaluate((img) => img.complete && img.naturalWidth === 144),
      )
      .toBe(true)
    for (const width of [320, 390, 1365]) {
      await page.setViewportSize({ width, height: 844 })
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true)
    }
    await expect(page.locator('link[rel="icon"]')).toHaveAttribute(
      'href',
      /\/icon(?:\?|$)/,
    )
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
      'href',
      /\/apple-icon(?:\?|$)/,
    )
  }
  const manifest = await (await request.get('/manifest.webmanifest')).json()
  expect(manifest.icons).toContainEqual({
    src: '/icon',
    sizes: '512x512',
    type: 'image/png',
    purpose: 'any',
  })
  const pack = await (await request.get('/offline-assets.json')).json()
  for (const path of ['/brand-mark', '/icon', '/apple-icon'])
    expect(pack.urls).toContain(path)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect
    .poll(() =>
      page
        .locator('img.app-logo')
        .evaluate((img) => img.complete && img.naturalWidth === 144),
    )
    .toBe(true)
  await page.screenshot({ path: info.outputPath('approved-logo-home.png') })
  expect(errors).toEqual([])
})
