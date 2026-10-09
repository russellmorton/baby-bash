# Baby Bash

[![Tests](https://github.com/russellmorton/baby-bash/actions/workflows/test.yml/badge.svg)](https://github.com/russellmorton/baby-bash/actions/workflows/test.yml)

A full-screen toy for babies who love to bash the keyboard. Every key or tap sets off a colour burst and plays a gentle synth note. Runs in any modern browser with nothing to install.

![Typing "baby bash" into Baby Bash: big letters and colour bursts on a night-sky background](docs/demo.gif)

- All notes are from C major pentatonic, so mashing always sounds musical.
- Each key always makes the same colour and sound, so cause and effect are easy to learn.
- Letters and digits appear large on screen. Space and Enter make a big burst and a chord.
- Quiet master volume with a limiter. No strobing or white flashes.
- Goes full screen with keyboard lock on the first key press. **Grown-ups: hold Esc to exit.**

## Run it

Open `index.html` in a browser, or launch a dedicated full-screen Chromium window:

```sh
./baby-bash.sh
```

Desktop shortcuts handled by your window manager (for example Super-key bindings) can't be blocked by a web page.

## Tests

```sh
npm install
npm test            # headless Chromium: sound, visuals, input blocking, launcher
npm run test:perf   # frame rate under a burst storm (opens a visible window)
```

Tests use the system Chromium at `/usr/bin/chromium` when it exists (set `CHROMIUM_PATH` to use another), otherwise Playwright's own (`npx playwright install chromium`). CI runs `npm test` on every push.

## Deploy

It's a single static page with no build step. `vercel.json` serves the repo root as-is and `.vercelignore` keeps tests and tooling out of the deployment.

## License

MIT. See [LICENSE](LICENSE).
