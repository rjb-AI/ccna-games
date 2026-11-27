# CCNA Games

A phone-first web app of study games for the Cisco CCNA 200-301 **v2.0** exam (first test date
3 Feb 2027). It is one hub with games grouped by the five exam domains. It works offline and can be
added to your home screen. Progress stays on your device.

The plans are in [`docs/`](docs/). Rules for contributors (and Claude Code) are in
[`CLAUDE.md`](CLAUDE.md).

## Run locally

You need Node.js 20 or later.

```
npm install
npm run dev
```

Then open the URL it prints (http://localhost:5173/ccna-games/).

## Tests

```
npm test                          # unit tests (Vitest)
npx playwright install chromium   # first time only
npm run test:e2e                  # browser tests at phone and desktop size (Playwright)
```

Other checks: `npm run lint`, `npm run typecheck`, `npm run build`.
