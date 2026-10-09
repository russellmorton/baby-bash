// @ts-check
const { test, expect } = require('@playwright/test');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

test('launcher opens index.html full screen in its own Chromium profile', () => {
  // Stand-in "chromium" that prints its arguments instead of opening a window
  const bin = fs.mkdtempSync(path.join(os.tmpdir(), 'baby-bash-'));
  fs.writeFileSync(path.join(bin, 'chromium'), '#!/bin/sh\nprintf "%s\\n" "$@"\n', { mode: 0o755 });

  const out = execFileSync(path.join(ROOT, 'baby-bash.sh'), {
    cwd: os.tmpdir(), // must work from anywhere
    env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, XDG_CACHE_HOME: bin },
  }).toString().trim().split('\n');

  const app = out.find(a => a.startsWith('--app='));
  expect(app).toBe(`--app=file://${ROOT}/index.html`);
  expect(fs.existsSync(app.replace('--app=file://', ''))).toBe(true);
  expect(out).toContain('--start-fullscreen');
  expect(out).toContain(`--user-data-dir=${bin}/baby-bash-profile`);
});
