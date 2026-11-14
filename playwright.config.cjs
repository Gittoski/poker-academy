const { defineConfig } = require('@playwright/test')
const fs = require('node:fs')
const browser = process.env.CHROMIUM_PATH || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined)
module.exports = defineConfig({
  testDir: './e2e',
  testMatch: '**/*.browser.cjs',
  timeout: 90000,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:3100',
    viewport: { width: 390, height: 844 },
    reducedMotion: 'reduce',
    launchOptions: { ...(browser ? { executablePath: browser } : {}), args: ['--no-sandbox'] },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run start -- --hostname 127.0.0.1 --port 3100',
    url: 'http://127.0.0.1:3100',
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
})
