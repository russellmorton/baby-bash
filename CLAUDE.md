# Baby Bash

A full-screen toy for babies: every key or tap sets off a colour burst and a gentle synth note.

**Live at https://baby-bash-azure.vercel.app**

## Running it

Static page. Tests: `npm install` then `npm test` (Playwright).

## Deploying

The Vercel project is connected to this repo, so every push to `main` deploys to production. Pull requests get a preview deployment (preview links need a Vercel login).

## Rules

- Make changes on a branch and open a pull request with the preview link. Don't merge into `main` until the owner says so: merging publishes the game.
- No attribution, anywhere: no `Co-Authored-By`, `Claude-Session` or "Generated with Claude" lines in commits, pull requests, comments or code. `.claude/settings.json` turns off the automatic ones.
- All art is drawn in code and all sound is synthesised in the browser. Don't add stock images, sounds, fonts other than Google Fonts, or anything copied from another game or brand.
- baby-bash.vercel.app belongs to someone else (a gender-reveal site). Never link or test against it.
