// @ts-check
const { defineConfig } = require('@playwright/test');

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
      // Use the system Chromium (the same browser the launcher script opens)
      executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
      args: ['--autoplay-policy=no-user-gesture-required'],
    },
  },
});
