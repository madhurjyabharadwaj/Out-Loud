# Out Loud — the PM interview studio

A free, offline-first study app for product management interviews. Ten modules, 68 practice
questions, a 352-term glossary and a spaced-repetition drill system — all in a single HTML
file with no build step, no dependencies and no server.

**Live:** _add your GitHub Pages URL here after the first deploy_

---

## What it does

Most interview prep material is a PDF you read once. This is built to be *used*: you work
through the guide, drill questions against a rubric, review terms on a spaced-repetition
schedule, and the app tracks what you have actually covered.

**Five sections**

| Tab | What it is |
|---|---|
| **Home** | Daily targets, streak, current level, and a jump back into wherever you stopped |
| **Guide** | 10 modules → 27 chapters → 463 sections of written material |
| **Drill** | 68 practice questions with model answers and a five-dimension self-scoring rubric |
| **Terms** | 352-term glossary as Leitner-box flashcards (1 / 3 / 7 / 21-day intervals) |
| **You** | XP, 12 progression levels, badges, notes, and per-question-type coverage |

**The rubric.** Every drill attempt is scored on the five things interviewers actually
grade — structure, user empathy, prioritisation, data reasoning and communication — so
progress is measured against a fixed standard rather than a vibe.

---

## Why it is built this way

The constraint was: *it has to work on a phone, on the metro, with no signal, without an
account.* That ruled out a backend, and it ruled out anything that loads at runtime.

- **One file.** `index.html` is 1.9 MB and contains the stylesheet, the application, and
  a 286,648-word content payload inlined as JSON. There is no bundler, no `npm install`,
  no framework — it is vanilla JS in a single IIFE.
- **Genuinely offline.** A service worker precaches all 19 assets. `index.html` is
  network-first so a redeploy is picked up; fonts, icons and the manifest are cache-first.
  Verified by stopping the server and confirming the offline render was byte-identical to
  the online one.
- **Self-hosted fonts.** Bricolage Grotesque, Source Serif 4 and IBM Plex Mono ship as
  12 `woff2` files (499.5 KB total, under a 600 KB budget). Nothing is fetched from Google
  Fonts, so a cold offline load renders in the right typefaces instead of falling back to
  system fonts.
- **Installable.** Valid web app manifest, `display: standalone`, relative `start_url` and
  `scope` so it installs correctly even from a subdirectory, plus 192 / 512 / maskable icons.
- **Your data stays yours.** Progress lives in `localStorage`. No account, no analytics,
  no third-party requests after the first load. Clearing site data resets it; nothing
  leaves the device.

---

## Accessibility

Audited rather than assumed:

- **Contrast** — all ten token pairs across both themes measured at ≥ 4.5:1 (WCAG AA for
  body text). Four light-mode failures were fixed by darkening tokens while preserving hue.
  The worst case was a primary-button label at 2.65:1 in dark mode, caused by a hardcoded
  `#fff` against a themed background; it is now a themed `--on-accent` token at 7.07:1.
- **Touch targets** — every interactive element is ≥ 44 × 44 px, verified across all five
  tabs at 375 × 812.
- **Screen readers** — decorative badge emoji marked `aria-hidden`, icon buttons labelled,
  and a `<noscript>` fallback that explains what is going on.

Full measurements are in [`docs/ENGINEERING.md`](docs/ENGINEERING.md).

---

## Running it

Any static file server will do. Service workers need a secure context, so `localhost`
or HTTPS — not `file://` (which still renders, it just will not install or cache).

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

## Deploying

Any static host works — GitHub Pages, Netlify, Cloudflare Pages. Two things to remember:

1. **Bump `CACHE` in `sw.js` on every deploy** (`outloud-v1` → `outloud-v2` → …). The HTML
   refreshes itself, but cache-first assets will otherwise serve stale forever.
2. Serve `.webmanifest` as `application/manifest+json` and `.woff2` as `font/woff2`. The
   three hosts above already do.

This repo ships a GitHub Actions workflow that publishes the root of `main` to GitHub Pages
on every push. Enable it under **Settings → Pages → Source → GitHub Actions**.

---

## Repository layout

```
index.html               the entire app — styles, logic and content payload
manifest.webmanifest     PWA manifest
sw.js                    service worker (must stay at the repo root)
fonts/                   12 self-hosted woff2 files + 3 OFL licences
icons/                   192, 512, maskable-512, apple-touch-180
docs/ARCHITECTURE.md     how the app is put together
docs/ENGINEERING.md      build decisions, measurements and maintenance rules
```

## Documentation

- [**Architecture**](docs/ARCHITECTURE.md) — data model, rendering, storage, service worker
- [**Engineering notes**](docs/ENGINEERING.md) — font pipeline, accessibility audit,
  verification results, and the rules to re-apply if `index.html` is ever regenerated

---

## Licence

Code and content are released under the [MIT Licence](LICENSE).

The three bundled typefaces are **not** covered by that licence. Bricolage Grotesque,
Source Serif 4 and IBM Plex Mono are each licensed under the SIL Open Font License 1.1;
the full licence texts ship alongside the font files in `fonts/OFL-*.txt`, as the OFL
requires. Company and product names used as practice-question subjects belong to their
respective owners and appear here for educational purposes only.
