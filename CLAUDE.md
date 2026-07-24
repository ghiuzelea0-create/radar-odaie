# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"Lut & Lemn" — a static storefront site (Romanian, no backend) for a handmade home-decor shop, plus a
daily Python bot that researches trending products via the Claude API and writes them into `products.json`,
which the storefront fetches at runtime. There is no real checkout/payment processor — the site is a demo
shopfront (see "Demo — aici s-ar deschide plata" toast in `assets/shop.js` and the note in `PROMOVARE.md`).

## Repo layout

- `index.html` — the entire page markup + inline CSS (no build step, no bundler)
- `assets/shop.js` — an ES module with all the site's data (product catalog, hero slides, categories) and
  behavior (cart, filters, hero slider, "exploded diagram" animation, radar merge). Loaded via
  `<script type="module" src="assets/shop.js">` at the bottom of `index.html`. Auto-runs `initShop(document)`
  when loaded in a real browser (guarded by `typeof document!=='undefined'`), so it's also safely importable
  in tests without side effects when `document` has no `#cats` element yet.
- `products.json` — "trending" products appended by the daily bot, at repo root; fetched live by the browser
  from `RADAR_URL` in `assets/shop.js` (a `raw.githubusercontent.com` URL pointing at `main`, **not** a
  relative path) and merged into the in-memory `products` array on page load.
- `agent.py` — the daily research bot: calls the Claude Messages API with the web-search tool, asks for 5
  trending home-decor products as JSON, writes `products.json`, and optionally posts a Telegram alert.
- `assets/products/`, `assets/editorial/` — real product/editorial photography referenced by `shop.js`.
- `assets/social/`, `assets/email-lansare.html`, `PROMOVARE.md` — marketing collateral (social captions,
  launch email template); not part of the app runtime.
- `.github/workflows/`:
  - `radar.yml` — runs `agent.py` daily (06:10 UTC), commits the regenerated `products.json` back to `main`.
  - `deploy-pages.yml` — publishes the static site to GitHub Pages on every push to `main` that touches
    `index.html`, `robots.txt`, `sitemap.xml`, `assets/**`.
  - `tests.yml` — runs the Python and JS test suites on push/PR.
- `tests/` — pytest suite for `agent.py`.
- `tests-js/` — Vitest suite for `assets/shop.js` (split into pure-logic tests and DOM-wiring tests).

Note: `README.md` describes `index.html` as containing HTML+CSS+JS "într-un singur fișier" (all in one
file) — that's out of date. The JS has since been extracted into `assets/shop.js` as a testable ES module.

## Commands

### JavaScript (site logic — `assets/shop.js`)
- Install: `npm ci`
- Run all tests: `npm test` (= `vitest run`)
- Run a single test file: `npx vitest run tests-js/shop.pure.test.js`
- Run tests matching a name: `npx vitest run -t "escapes ampersands"`
- Watch mode: `npx vitest`

Tests run under `jsdom` (configured in `vitest.config.js`) and only pick up `tests-js/**/*.test.js`.

### Python (`agent.py`)
- Install: `pip install -r requirements-dev.txt` (pulls in `requirements.txt` + `pytest`)
- Run all tests: `pytest -v`
- Run a single test: `pytest tests/test_agent.py::test_parse_json_plain_array -v`
- `pytest.ini` sets `pythonpath = .` (so `import agent` works from `tests/`) and `testpaths = tests`.

### Running the site locally
No build step. Serve the repo root with any static file server (e.g. `python -m http.server`) and open
`index.html` — opening the file directly via `file://` will break the `fetch(RADAR_URL)` radar call and ES
module loading in some browsers.

### Running the bot locally
`agent.py` requires `ANTHROPIC_API_KEY` in the environment (`TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID` are
optional — without them it just skips the Telegram alert). Run with `python agent.py`; it overwrites
`products.json` in the current directory.

## Architecture notes

**Two independent product sources merge at runtime, not at build time.** `assets/shop.js` ships a static
`products` array (ids 1–12, 18–25) covering the fixed core collection. On page load, `initShop()` calls
`loadRadar()`, which fetches `products.json` from the raw GitHub URL for `main` and merges in any items with
new ids via `mergeRadarData`. This means editing local `products.json` on a branch has no visible effect on
the deployed site until it's on `main` — the site always reads the current `main` branch's `products.json`
over the network, regardless of what's deployed to Pages.

**`agent.py` and `assets/shop.js` share the product schema by convention, not by import.** The bot writes
objects with keys `id, name, cat, catName, price, desc, img, tag, scorViral, deCeTrend, sursa`. The
`CAT_NAME` map in `agent.py` (categories: `iluminat`, `ceramica`, `textile`, `perete`, `arome`, `accente`)
must stay in sync with `radarStyle` and `categories` in `assets/shop.js` — a category present in one but not
the other will silently fall back (`agent.py` defaults unknown categories to `accente`; `shop.js`'s
`buildRadarProduct` falls back to `style.accente` too).

**`assets/shop.js` is structured as pure functions + one stateful `initShop(doc)` entry point.** Pure/testable
helpers (`escAttr`, `fmt`, `hasRealImg`, `filterProducts`, `computeCartTotals`, `applyQtyChange`,
`buildRadarProduct`, `mergeRadarData`, `nextSlideIndex`, `prefersReducedMotion`, `renderExplodeMarkup`) are
exported standalone and covered by `tests-js/shop.pure.test.js`. Everything stateful — cart contents, hero
slide index/timer, and all DOM rendering/wiring — lives inside `initShop(doc=document)`, which takes the
document as a parameter specifically so `tests-js/shop.dom.test.js` can drive it against a jsdom fixture
(see the `FIXTURE` HTML string there) without touching the real page. `initShop` returns an object exposing
internal actions (`renderGrid`, `addToCart`, `goToSlide`, `getCart`, etc.) for tests to call directly.

**Product images degrade gracefully.** `media(p)` in `shop.js` always renders an inline SVG illustration
(`obj(type, color)`) as a base layer, then layers a real `<img>` on top only if `hasRealImg(p)` (a non-empty
`https?://` URL, not the `LINK_POZA` placeholder used by `agent.py` before a real photo is set — see
"Poze reale de produs" in `README.md`); `onerror="this.remove()"` strips a broken image back down to the SVG.

**No build/bundle/transpile step anywhere.** `index.html` and `assets/shop.js` are shipped as authored;
`deploy-pages.yml` uploads the repo root as-is (via `upload-pages-artifact`). Any change to `assets/shop.js`
or `index.html` markup takes effect on the next deploy with no compilation.

**CI is two independent jobs** (`tests.yml`): `test-python` (pytest) and `test-js` (`npm ci && npm test`).
Both must pass; they don't depend on each other.

## Language

UI copy, commit-adjacent content in `agent.py` (docstrings, Telegram messages), and `README.md`/`PROMOVARE.md`
are in Romanian — this is intentional (the shop targets the Romanian market). Keep new user-facing strings
and product-data fields in Romanian to match the existing catalog.
