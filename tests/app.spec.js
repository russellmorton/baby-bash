// @ts-check
const { test, expect } = require('@playwright/test');
const path = require('path');

// Set APP_URL to test a deployed copy, e.g. APP_URL=https://baby-bash-azure.vercel.app npm test
const APP = process.env.APP_URL || 'file://' + path.resolve(__dirname, '..', 'index.html');
const PENTATONIC = new Set([0, 2, 4, 7, 9]); // C D E G A

/** Open the app with the spy installed and Google Fonts stubbed out (no network in tests). */
async function open(page) {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await page.addInitScript({ path: path.join(__dirname, 'spy.js') });
  await page.goto(APP);
  return errors;
}

/** Real key press so the browser grants user activation (needed for audio and fullscreen). */
async function start(page) {
  await page.keyboard.press('KeyQ');
  await expect(page.locator('#start')).toBeHidden();
  await page.waitForTimeout(200); // let the hello chord's staggered notes fire
}

const spy = (page, expr = 's => s') => page.evaluate(`(${expr})(window.__spy)`);
const noteCount = page => spy(page, 's => s.notes.length');

/** Fire synthetic key events, all in the same tick. */
function mash(page, codes) {
  return page.evaluate(codes => {
    for (const code of codes) {
      window.dispatchEvent(new KeyboardEvent('keydown', { code, key: code.replace('Key', '').toLowerCase(), bubbles: true }));
    }
  }, codes);
}

/** Number of bright pixels on the canvas (the background is ~7% lightness). */
function brightPixels(page, box) {
  return page.evaluate(box => {
    const c = document.getElementById('sky');
    const ctx = c.getContext('2d');
    const s = c.width / innerWidth;
    const { x, y, w, h } = box || { x: 0, y: 0, w: innerWidth, h: innerHeight };
    const d = ctx.getImageData(x * s, y * s, w * s, h * s).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) if (Math.max(d[i], d[i + 1], d[i + 2]) > 80) n++;
    return n;
  }, box);
}

/** Hue in degrees of a canvas fillStyle such as "rgba(12, 200, 255, 0.9)". */
function hueOf(color) {
  const [r, g, b] = color.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => v / 255);
  const max = Math.max(r, g, b), d = max - Math.min(r, g, b);
  if (!d) return 0;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}

function midi(f) { return 69 + 12 * Math.log2(f / 440); }

test.describe('start screen', () => {
  test('loads cleanly and waits for a first touch', async ({ page }) => {
    const errors = await open(page);
    await expect(page.locator('#start')).toBeVisible();
    await expect(page.locator('#start h1')).toHaveText('Baby Bash');
    expect(await spy(page, 's => s.contexts')).toBe(0); // no audio before a gesture
    expect(errors).toEqual([]);
  });

  test('first key press hides the start card and plays a hello chord', async ({ page }) => {
    const errors = await open(page);
    await start(page);
    expect(await spy(page, 's => s.contexts')).toBe(1);
    expect(await noteCount(page)).toBe(3);
    await expect(page.locator('#hint')).toHaveClass(/show/);
    expect(errors).toEqual([]);
  });

  test('a tap also starts it', async ({ page }) => {
    await open(page);
    await page.mouse.click(300, 300);
    await expect(page.locator('#start')).toBeHidden();
  });
});

test.describe('sound', () => {
  test('every note is in C major pentatonic, whatever is pressed', async ({ page }) => {
    await open(page);
    await start(page);
    const keys = 'abcdefghijklmnopqrstuvwxyz0123456789'.split('').concat(['Enter', 'Space', 'ArrowUp', 'Shift', 'Tab', 'Backspace']);
    for (const k of keys) {
      await page.keyboard.press(k);
      await page.waitForTimeout(15);
    }
    const notes = await spy(page, 's => s.notes');
    expect(notes.length).toBeGreaterThanOrEqual(10); // fast presses hit the 14-voice cap, so not every key sounds
    for (const n of notes) {
      const m = midi(n.freq);
      expect(Math.abs(m - Math.round(m)), `${n.freq}Hz is out of tune`).toBeLessThan(0.01);
      expect(PENTATONIC.has(((Math.round(m) % 12) + 12) % 12), `${n.freq}Hz (midi ${m}) is not pentatonic`).toBe(true);
    }
  });

  test('the same key always makes the same sound', async ({ page }) => {
    await open(page);
    await start(page);
    const sounds = [];
    for (const k of ['KeyG', 'KeyG', 'KeyG']) {
      const before = await noteCount(page);
      await page.keyboard.press(k);
      await page.waitForTimeout(150);
      const n = await spy(page, `s => s.notes[${before}]`);
      sounds.push(`${n.type}@${n.freq}`);
    }
    expect(new Set(sounds).size).toBe(1);
  });

  test('different keys use a variety of notes and instruments', async ({ page }) => {
    await open(page);
    await start(page);
    for (const k of 'qwertyuiopasdfghjkl'.split('')) {
      await page.keyboard.press(k);
      await page.waitForTimeout(140); // longer than the 110ms throttle, so this tests sound choice not pacing
    }
    const notes = await spy(page, 's => s.notes.slice(3)');
    expect(new Set(notes.map(n => n.freq)).size).toBeGreaterThanOrEqual(6);
    expect(new Set(notes.map(n => n.type)).size).toBeGreaterThanOrEqual(3);
  });

  test('Space plays a three-note chord, a letter plays one note', async ({ page }) => {
    await open(page);
    await start(page);
    let before = await noteCount(page);
    await page.keyboard.press('Space');
    await page.waitForTimeout(200);
    expect((await noteCount(page)) - before).toBe(3);

    before = await noteCount(page);
    await page.keyboard.press('KeyM');
    await page.waitForTimeout(200);
    expect((await noteCount(page)) - before).toBe(1);
  });

  test('holding a key down is throttled instead of firing every repeat', async ({ page }) => {
    await open(page);
    await start(page);
    const before = await noteCount(page);
    await mash(page, Array(25).fill('KeyB'));
    expect((await noteCount(page)) - before).toBe(1);
    await page.waitForTimeout(150);
    await mash(page, ['KeyB']);
    expect((await noteCount(page)) - before).toBe(2);
  });

  test('mashing many keys at once never stacks more than 14 voices', async ({ page }) => {
    await open(page);
    await start(page);
    const codes = [];
    for (let i = 0; i < 26; i++) codes.push('Key' + String.fromCharCode(65 + i));
    for (let i = 0; i < 10; i++) codes.push('Digit' + i);
    await mash(page, codes);
    await page.waitForTimeout(50);
    expect(await spy(page, 's => s.maxAlive')).toBeLessThanOrEqual(14);
  });

  test('voices are freed after notes finish, so sound keeps working', async ({ page }) => {
    await open(page);
    await start(page);
    const codes = [];
    for (let i = 0; i < 26; i++) codes.push('Key' + String.fromCharCode(65 + i));
    await mash(page, codes);
    await page.waitForTimeout(2000); // longest note is 1.5s
    expect(await spy(page, 's => s.alive')).toBe(0);
    const before = await noteCount(page);
    await page.keyboard.press('KeyZ');
    expect((await noteCount(page)) - before).toBe(1);
  });

  test('a two-second keyboard mash stays well below clipping', async ({ page }) => {
    await open(page);
    await start(page);
    const keys = 'asdfjkl;qweruiopzxcvm,./1234 '.split('');
    const end = Date.now() + 2000;
    let i = 0;
    while (Date.now() < end) {
      await page.keyboard.press(keys[i++ % keys.length]);
      await page.waitForTimeout(10);
    }
    await page.waitForTimeout(500);
    const peak = await spy(page, 's => s.peak');
    expect(peak, 'no audio reached the output at all').toBeGreaterThan(0.01);
    expect(peak).toBeLessThan(0.9);
  });
});

test.describe('visuals', () => {
  test('a key press paints a colour burst that then fades away', async ({ page }) => {
    await open(page);
    await start(page);
    await page.waitForTimeout(3500); // let the hello burst clear
    const quiet = await brightPixels(page);
    await page.keyboard.press('KeyK');
    await page.waitForTimeout(150);
    const lit = await brightPixels(page);
    expect(lit).toBeGreaterThan(quiet + 500);
    await page.waitForTimeout(4000);
    expect(await brightPixels(page)).toBeLessThan(lit / 20);
  });

  test('letters and digits are shown big; other keys are not', async ({ page }) => {
    await open(page);
    await start(page);
    await page.keyboard.press('a');
    await page.waitForTimeout(150);
    await page.keyboard.press('7');
    await page.waitForTimeout(150);
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(100);
    const texts = await spy(page, 's => s.texts');
    expect(texts).toContain('A');
    expect(texts).toContain('7');
    expect(texts.some(t => !/^[A-Z0-9]$/.test(t))).toBe(false);
  });

  test('letters get colours from all around the colour wheel', async ({ page }) => {
    await open(page);
    await start(page);
    for (const k of 'abcdefghijklmnopqrstuvwxyz'.split('')) {
      await page.keyboard.press(k);
      await page.waitForTimeout(20);
    }
    const glyphs = await spy(page, 's => s.glyphs');
    expect(glyphs.length).toBe(26);
    const hues = glyphs.map(g => hueOf(g.color));
    const buckets = new Set(hues.map(h => Math.floor(h / 30))); // 12 slices of 30°
    expect(buckets.size, `hues: ${hues.map(Math.round).join(', ')}`).toBeGreaterThanOrEqual(8);
  });

  test('a tap bursts where the finger lands', async ({ page }) => {
    await open(page);
    await start(page);
    await page.waitForTimeout(3500);
    const box = { x: 950, y: 550, w: 120, h: 120 };
    const before = await brightPixels(page, box);
    await page.mouse.click(1010, 610);
    await page.waitForTimeout(60);
    expect(await brightPixels(page, box)).toBeGreaterThan(before + 200);
  });

  test('a burst storm keeps animating smoothly @perf', async ({ page }) => {
    await open(page);
    await start(page);
    for (let r = 0; r < 10; r++) {
      const codes = [];
      for (let i = 0; i < 26; i++) codes.push('Key' + String.fromCharCode(65 + i));
      await mash(page, codes);
      await page.waitForTimeout(120);
    }
    const fps = await page.evaluate(() => new Promise(res => {
      let n = 0; const t0 = performance.now();
      const tick = () => (++n, performance.now() - t0 < 1000 ? requestAnimationFrame(tick) : res(n));
      requestAnimationFrame(tick);
    }));
    expect(fps).toBeGreaterThan(40);
  });
});

test.describe('keeping little hands in the app', () => {
  test('keys have their browser default blocked (Tab, F5, Ctrl+R, Backspace)', async ({ page }) => {
    await open(page);
    await start(page);
    await page.evaluate(() => {
      window.__marker = 'still here';
      window.__allowed = [];
      addEventListener('keydown', e => { if (!e.defaultPrevented) window.__allowed.push(e.key); });
    });
    for (const k of ['Tab', 'F5', 'Control+r', 'Backspace', 'Alt+ArrowLeft', 'Control+l']) await page.keyboard.press(k);
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => window.__marker)).toBe('still here');
    expect(await page.evaluate(() => window.__allowed)).toEqual([]);
  });

  test('right-click menu and scrolling are blocked', async ({ page }) => {
    await open(page);
    await start(page);
    await page.evaluate(() => {
      window.__menu = null;
      addEventListener('contextmenu', e => { window.__menu = e.defaultPrevented; });
    });
    await page.mouse.click(400, 400, { button: 'right' });
    await page.mouse.wheel(0, 800);
    expect(await page.evaluate(() => window.__menu)).toBe(true);
    expect(await page.evaluate(() => scrollY)).toBe(0);
  });

  test('closing the page asks for confirmation once playing', async ({ page }) => {
    await open(page);
    await start(page);
    const dialog = new Promise(res => page.once('dialog', d => { res(d.type()); d.dismiss(); }));
    await page.close({ runBeforeUnload: true });
    expect(await dialog).toBe('beforeunload');
  });

  test('leaving full screen brings back the start card', async ({ page }) => {
    await open(page);
    await start(page);
    const full = await page.evaluate(() => !!document.fullscreenElement);
    test.skip(!full, 'this Chromium build did not enter full screen headless');
    await page.evaluate(() => document.exitFullscreen());
    await expect(page.locator('#start')).toBeVisible();
    await page.keyboard.press('KeyQ');
    await expect(page.locator('#start')).toBeHidden();
  });
});
