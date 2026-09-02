# Engineering notes

A record of the four changes that turned this from a static page into an installable,
genuinely-offline PWA — the decisions, the measurements, and the rules to re-apply if
`index.html` is ever regenerated.

For how the app is structured, see [ARCHITECTURE.md](ARCHITECTURE.md). For what it does and
how to run it, see the [README](../README.md).

---

## What changed, and why

This app was previously **PM Studio** and pulled its three typefaces from Google Fonts
at runtime, so a cold offline load fell back to system fonts. Two things were fixed:
the fonts are now self-hosted, and the app is installable.

### 1. Renamed PM Studio → Out Loud

`APP_NAME="Out Loud"`, `APP_TAGLINE="the PM interview studio"`.

| Where | Now reads |
|---|---|
| `<title>` | `Out Loud — the PM interview studio` |
| `apple-mobile-web-app-title` | `Out Loud` |
| `og:title` | `Out Loud — the PM interview studio` |
| `og:description` | rewritten to lead with the new name |
| CSS banner comment | `OUT LOUD — design system` |
| `<noscript>` `<h1>` | `Out Loud` |
| JS banner comment | `OUT LOUD — application` |
| topbar fallback title (JS) | `'Out Loud'` |
| home screen title (JS) | `'Out Loud'` |
| home hero `<h1>` (JS) | `Out Loud` (was "The PM Interview Studio") |
| manifest `name` / `short_name` | `Out Loud — the PM interview studio` / `Out Loud` |

> **The localStorage key `pmstudio_v1` was deliberately NOT renamed.**
> It is still `var KEY='pmstudio_v1'`. Renaming it would orphan every existing
> user's XP, streaks, notes and flashcard boxes. **Never change it.**
> The rename was done with `s/PM Studio/Out Loud/g` — the space-separated form,
> which cannot match `pmstudio_v1`.

The home hero `<h1>` read "The PM Interview Studio". It is a hardcoded string in the
inline app JS, **not** in the payload JSON — a `grep` for "PM Studio" misses it,
because the string is "PM *Interview* Studio". Search for `Interview Studio` as well
as `PM Studio` when checking the rename is complete.

### 2. Self-hosted fonts (was: Google Fonts)

**Removed** three tags from `<head>`: the two `preconnect`s and the
`fonts.googleapis.com/css2?...` stylesheet link.

**Replaced with** an inline `<style>` block of 12 `@font-face` rules pointing at
`fonts/`, every one carrying `font-display: swap` and the original Google
`unicode-range` values so latin / latin-ext split-loading still works.

| Family | Files | Notes |
|---|---|---|
| Bricolage Grotesque | 2 | **variable**, `font-weight: 600 800` |
| Source Serif 4 roman | 2 | **variable**, `font-weight: 400 700` |
| Source Serif 4 italic | 2 | static 400 — the app only uses italic 400 |
| IBM Plex Mono | 6 | static 400/500/600; family has no variable version |

Each family ships latin + latin-ext. **Total font payload: 511,440 bytes (499.5 KB)**,
under the 600 KB budget. All three are SIL OFL 1.1; the licences ship in
`fonts/OFL-*.txt` as the licence requires.

The CSS custom properties and the `--f-display` / `--f-body` / `--f-ui` / `--f-mono`
variable stacks were **not** touched — only the source of the fonts changed.

> Requesting italic as a `400..700` range instead of a pinned `400` costs an extra
> 146 KB and pushes the payload over budget. Keep italic pinned.

### 3. PWA plumbing

- `manifest.webmanifest` — `display: standalone`, relative `start_url`/`scope` (`./`)
  so it also installs correctly from a subdirectory. No absolute `id` and no
  `orientation` lock, for the same portability reason.
- `icons/` — brand-blue (`#2C3AD6`) rounded square with a white waveform mark.
  The maskable icon is full-bleed with the mark spanning **128–384px of 512**; the
  80% safe zone is 51.2–460.8px, so it clears it comfortably.
- The inline SVG favicon was updated from the old "PM" lettermark to the same
  waveform, so it matches the new icons.
- `sw.js` at project root (scope = whole app):
  - cache `outloud-v1`; `activate` deletes every cache that is not the current name
  - `index.html` and navigations: **network-first**, cache fallback, so a redeploy is picked up
  - `fonts/`, `icons/`, manifest: **cache-first**
  - `skipWaiting()` + `clients.claim()`
- Registration in `index.html` (the only JS added) is feature-detected and
  double-guarded: it no-ops unless `serviceWorker` exists **and** the origin is
  https/localhost, and the `register()` rejection is swallowed. Opening
  `index.html` over `file://` therefore throws nothing.

### 4. Accessibility / touch-target pass

The visual identity was deliberately left intact — the type scale, palette, spacing,
motion and component shapes are unchanged. Only measured defects were corrected.

**Contrast (WCAG AA, 4.5:1 for body text).** Dark mode already passed everywhere.
Light mode had four failures, fixed by darkening three tokens; hue preserved:

| Token | Was | Now | Ratio |
|---|---|---|---|
| `--ink3` on `--paper` | `#767D9B` 3.52:1 | `#656C85` | 4.52:1 |
| `--mid` on `--midsoft` | `#A96A0C` 3.86:1 | `#9A600B` | 4.53:1 |
| `--gold` on `--card` | `#B98900` 3.16:1 | `#987000` | 4.51:1 |

**The serious one:** `.btn` hardcoded `color:#fff` and `.tick svg` hardcoded
`stroke:#fff`. In dark mode `--brand` becomes a light lavender (`#8C96FF`), so the
primary button's label sat at **2.65:1** and the completed-mission checkmark at
**2.11:1** — effectively invisible. Fixed with a new `--on-accent` token
(light `#FFFFFF`, dark `#0E1120`), giving 7.07:1 and 8.91:1. **Never hardcode `#fff`
against a themed background — use `var(--on-accent)`.**

**Touch targets** raised to 44px: `.iconbtn` (40→44), `.chip` (~34→44),
`.btn--sm` (40→44), `.jump a` (~29→40, plus gap 6→8px). Verified in-browser at
375×812: zero interactive elements under 44px on all five tabs, no horizontal scroll.

**Also:** smallest text raised off 9px (`.penta__v` 9→10, `.seg button small`
9.5→10); decorative badge emoji given `aria-hidden="true"` so screen readers don't
announce "seedling" before "First rep". Icon buttons already had `aria-label`s.

---

## Deploying

**Bump `CACHE` in `sw.js` on every deploy** (`outloud-v1` → `outloud-v2` → ...).
`index.html` is network-first so it refreshes on its own, but fonts, icons and the
manifest are cache-first and will otherwise serve stale forever.

Serve `.webmanifest` as `application/manifest+json` and `.woff2` as `font/woff2`.
Netlify, Cloudflare Pages and GitHub Pages all do this already.

---

## If index.html is ever regenerated

A rebuild of `index.html` will drop all of the below. Re-apply, in order:

1. **Do not** re-add the Google Fonts `preconnect`/stylesheet tags.
2. Re-insert the 12-rule `@font-face` `<style>` block into `<head>`
   (regenerate with the recipe below, or copy it from this version of the file).
3. Re-add `<link rel="manifest" href="manifest.webmanifest">` and
   `<link rel="apple-touch-icon" href="icons/apple-touch-icon-180.png">`.
4. Re-apply the waveform inline SVG favicon.
5. Re-apply the rename table above — and **confirm `pmstudio_v1` is still intact**.
6. Re-add the service-worker registration block before `</body>`.
7. Bump `CACHE` in `sw.js`.

### Regenerating the fonts

```bash
curl -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36" "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600..800&family=Source+Serif+4:ital,opsz,wght@0,8..60,400..700;1,8..60,400&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
```

The Chrome UA is required — without it Google serves TTF instead of woff2. Keep only
the `/* latin */` and `/* latin-ext */` blocks, download each `.woff2`, and rewrite
each `src: url(...)` to `fonts/<file>`. Weight **ranges** (`600..800`) return variable
fonts; discrete weights (`600;700;800`) return static instances.

---

## Verification performed

| Check | Result |
|---|---|
| `grep -c "fonts.googleapis.com\|fonts.gstatic.com" index.html` | **0** |
| `grep -c "pmstudio_v1" index.html` | **1** (unchanged from before) |
| `grep -ci "PM Studio" index.html` | **0** |
| `grep -c "Interview Studio" index.html` | **0** |
| `<script id="payload">` JSON | **byte-identical** — md5 `a187cd50311757dc1be77697f8807515`, 1,871,514 bytes, before and after |
| Service worker in real Chrome | live `service_worker` target for `sw.js` |
| Precache | all 19 entries fetched 200 (`addAll` is atomic — activation proves the cache is complete) |
| **Offline render** | server stopped (connection refused), reload → screenshot **md5-identical** to the online render, all three families correct |
| `file://` | renders, no JS error (only a benign manifest CORS notice) |
| Manifest | valid JSON; name/short_name/start_url/scope/display present; `display: standalone` |
| Icons | declared `sizes` match actual PNG dimensions; 192 + 512 `purpose=any` present |
| Contrast | all 10 token pairs (both themes) computed ≥ 4.5:1 |
| Touch targets | 0 interactive elements < 44px across all five tabs at 375×812 |
| Horizontal scroll | none, on every tab at 375×812 |

Font payload **511,440 bytes (499.5 KB)**, icons 20,623 bytes.

### Not verified here

Lighthouse and the Chrome install prompt were not run — this machine has no Node, and
headless Chrome does not fire `beforeinstallprompt`. Every input Chrome's installability
check reads was verified individually instead (secure context, linked and fetched
manifest, required manifest fields, 192 + 512 `any` icons, and an active service worker
with a `fetch` handler). Worth confirming once in a desktop browser after the first deploy.
