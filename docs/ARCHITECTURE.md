# Architecture

How Out Loud is put together, for anyone reading the source.

The whole application is `index.html`. Opening it in an editor shows four regions, in order:
the `<head>` (meta, self-hosted `@font-face` rules, inline SVG favicon), one `<style>` block
holding the design system, a `<script id="payload" type="application/json">` block holding
every word of content, and one `<script>` holding the application.

---

## Data model

Content is authored as Markdown and compiled into a single JSON payload that is inlined into
the page. It is parsed once at startup:

```js
window.__DATA__ = JSON.parse(document.getElementById('payload').textContent);
```

The payload has eight top-level keys:

| Key | Shape | Count |
|---|---|---|
| `modules` | ordered list, each with a title, blurb and chapter ids | 10 |
| `chapters` | belongs to a module, holds an ordered list of section ids | 27 |
| `sections` | the leaf unit — heading, Markdown body, word count | 463 |
| `glossary` | term → definition, the flashcard source | 352 |
| `questions` | practice questions with difficulty, source and a "why this is hard" note | 68 |
| `answers` | full spoken model answers, keyed by module | 6 modules |
| `pins` | the three always-available reference cards: cheat sheet, rubric, plan | 3 |
| `stats` | precomputed totals used by the progress views | — |

Everything is referenced by short hex id, never by array index, so re-ordering content does
not break saved progress. At boot the app builds `SEC_BY` / `CH_BY` / `MOD_BY` lookup maps
and flattens each module's chapters into a single `secs` array with a summed word count.

**286,648 words across 463 sections.** Section ids are what get written into saved state, so
they are effectively part of the storage contract — changing one orphans that section's
progress and notes.

---

## Rendering

There is no framework and no virtual DOM. The shell is four empty elements:

```html
<div class="rprog" id="rprog"></div>   <!-- reading progress bar -->
<header class="topbar"><div id="bar"></div></header>
<main id="app"></main>
<nav class="tabs" id="tabs"></nav>
```

A tab or route change builds an HTML string and assigns it to `#app.innerHTML`. Events are
handled by delegation from a small number of stable roots rather than bound per element, so
re-rendering a view does not leak listeners. Icons are inline SVG returned by a `svg(name)`
helper — no icon font, no sprite sheet, no extra request.

Markdown in section bodies is converted at render time by a small purpose-built `renderMd`,
sized to the subset the content actually uses. There is no Markdown library in the page.

Five routes, defined in one place:

```js
[['home','Home','home'], ['guide','Guide','book'], ['drill','Drill','target'],
 ['cards','Terms','cards'], ['you','You','user']]
```

---

## Storage

All state lives on the device under a single key.

```js
var KEY = 'pmstudio_v1';
```

> The key is deliberately *not* named after the app. It predates the rename from PM Studio
> to Out Loud and renaming it would orphan every existing user's XP, streaks, notes and
> flashcard boxes. **Leave it alone.**

`Store` is a two-line async façade that tries an optional host-provided `window.storage`
bridge, falls back to `localStorage`, and falls back again to an in-memory object so the app
still functions in a private-mode browser that throws on write. Writes are debounced 250 ms.

The saved object is versioned and merged over a `fresh()` default on load, so a state written
by an older build gains new fields instead of being discarded:

```js
S = saved && saved.v === 1 ? Object.assign(fresh(), saved) : fresh();
```

Shape:

| Field | Holds |
|---|---|
| `xp`, `badges` | score and unlocked achievements |
| `done`, `marks` | per-section completion and bookmarks |
| `notes` | per-section free text |
| `attempts` | one record per drill, with the five rubric scores |
| `cards` | per-term Leitner box and next-due date |
| `streak` | last active day, current run, personal best |
| `daily` | today's read / drill / card counters and whether the goal was claimed |
| `theme`, `last`, `started` | preference and resume state |

---

## The three progression systems

**XP and levels.** Twelve thresholds mapped to job titles, from *Curious outsider* at 0 to
*Chief Product Officer* at 27,000. Reading, drilling and reviewing all award XP, so no single
activity can carry the whole curve.

**Leitner boxes.** Flashcards move through intervals `[0, 0, 1, 3, 7, 21]` days. A correct
recall promotes a card one box; a miss sends it back to the start. Due dates are computed on
read, so nothing needs to run in the background.

**Coverage targets.** Each of the twelve question types carries a target number of attempts
(product design 12, guesstimates 8, behavioural 4, and so on), weighted by how often that
type shows up in real interviews. The *You* tab reports progress per type, which surfaces the
category you have been quietly avoiding.

---

## Service worker

`sw.js` sits at the repo root so its scope covers the whole app. It runs three strategies:

- **Navigations and `index.html` — network-first.** A successful fetch is cloned into the
  cache; failure falls back to the cached copy. This is what lets a redeploy be picked up
  without the user clearing anything.
- **`fonts/`, `icons/`, the manifest — cache-first.** Immutable assets; never hit the network
  twice for them.
- **Everything else same-origin — cache with network fallback.**

Install precaches all 19 entries with `addAll`, which is atomic: either the whole app is
cached or activation fails, so there is no half-cached offline state. Activate deletes every
cache whose name is not the current `CACHE` constant, then claims open clients.

Cross-origin and non-`GET` requests are passed straight through untouched.

Registration in `index.html` is double-guarded — it no-ops unless `serviceWorker` exists
*and* the origin is HTTPS or localhost, and the `register()` rejection is swallowed. Opening
the file over `file://` therefore throws nothing; it simply renders without offline support.

**The one maintenance rule:** bump `CACHE` on every deploy, or cache-first assets serve stale
forever.

---

## Design system

The stylesheet is CSS custom properties on `:root`, re-declared under `[data-theme="dark"]`.
Theme switching sets one attribute on `<html>`; nothing else observes it.

Four font stacks — `--f-display`, `--f-body`, `--f-ui`, `--f-mono` — map to Bricolage
Grotesque, Source Serif 4, the system UI stack and IBM Plex Mono. Colours are tokens
throughout, including `--on-accent` for anything sitting on a branded surface.

> Never hardcode `#fff` against a themed background. `--brand` inverts to a light lavender in
> dark mode, and hardcoded white on it measured 2.65:1 — the bug that made `--on-accent`
> necessary in the first place. Use the token.
