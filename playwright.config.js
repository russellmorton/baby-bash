// @ts-check
const { defineConfig } = require('@playwright/test');
const fs = require('fs');

// Prefer the system Chromium (the browser the launcher opens); fall back to Playwright's own, e.g. on CI
const systemChromium = process.env.CHROMIUM_PATH || '/usr/bin/chromium';

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30_000,
  fullyParallel: true,
  reporter: 'list',
  projects: [
    // Frame rate needs real GPU compositing, so the @perf check runs in a visible window
    { name: 'default', grepInvert: /@perf/ },
    { name: 'perf', grep: /@perf/, use: { headless: false } },
  ],
  use: {
    viewport: { width: 1280, height: 800 },
    launchOptions: {
      executablePath: fs.existsSync(systemChromium) ? systemChromium : undefined,
      args: ['--autoplay-policy=no-user-gesture-required'],
    },
  },
});
