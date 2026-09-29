---
name: nanoplayer-demo
description: "Build nanoPlayer demo pages the nanocosmos way: one base look, verified player usage, six starter templates (single player, feature showcase, multi-player grid, diagnostics, customer/event-branded page, feature wrapper such as a switch player), a demo checker and a done-checklist. Use whenever someone asks for a player demo, sample page, feature demo, comparison page or wrapper around nanoPlayer, for sales, marketing, support or product. Not for marketing pages on nanocosmos.net (nanocosmos-brand-guidelines) or raw player API questions (nanostream-development)."
license: (c) nanocosmos
metadata:
  version: 1.0.0
  author: nanocosmos
  category: streaming
  updated: 2026-09-29
---

# nanoplayer-demo

Every nanoPlayer demo, whoever builds it, starts from one of this skill's
templates, uses the shared `NanoDemo` helpers for all player work, and passes
`check-demo` plus the checklist before handover.

## Who owns what

| Concern | Owner |
|---|---|
| Look: colors, fonts, header/footer, buttons, panels | `nanocosmos-brand-guidelines` (`product-theme.css`, `product-sample.html`) |
| Player facts: config values, events, lifecycle, JWT, ABR | `nanostream-development` |
| Demo templates, `NanoDemo` helpers, wrapper pattern, rules, checklist | this skill |

Don't restate or override the other two here. For nanocosmos demos, don't
start from `nanostream-development/player/player-demo.html`: it uses the
Dark Neutral Studio colors, which brand-guidelines rules out for nanocosmos
pages.

## Workflow

1. **Pick the template.**

   | Type | Use for |
   |---|---|
   | `single-player` | One stream in the brand shell, e.g. a link for sales or marketing |
   | `feature-showcase` | One player feature with its controls and an "About this feature" panel |
   | `multi-player` | Grid of streams or side-by-side comparison (`?streams=a,b,c`, up to 9) |
   | `diagnostics` | Live stats, stream info, event log, copyable support report |
   | `branded-page` | Viewer-facing page for a customer or event (their logo and copy, nanocosmos theme) |
   | `feature-wrapper` | A JS wrapper presenting a feature as its own thing, e.g. the switch player |

2. **Scaffold.** From this skill's directory:

   ```bash
   node scripts/new-demo.mjs <type> <dest-dir> --title "Demo title"
   ```

   This copies the template, `js/demo-core.js` (+ `js/player-wrapper.js` for
   `feature-wrapper`) and the canonical `product-theme.css`. The theme is found
   via `--theme <path>`, `$NANOCOSMOS_PRODUCT_THEME`, or the installed
   `nanocosmos-brand-guidelines` skill under `~/.claude/skills`. Without that
   skill the scaffold stops and says so.

3. **Build the demo.** Edit `index.html` (markup and the inline page wiring,
   or `js/app.js`) and `page.css`. Never edit `product-theme.css` or
   `js/demo-core.js` in a demo; fix shared problems in this skill. Follow
   `references/best-practices.md`. For a wrapper, follow
   `references/wrapper-pattern.md`.

4. **Check.** `node scripts/check-demo.mjs <dest-dir>` must print `OK`.

5. **Walk the checklist.** `references/demo-checklist.md` covers the manual
   checks (real streams, browsers, copy).

<!-- internal -->
6. **Register and host.** See `internal/hosting.md`: theme-consumer
   registration and GitLab Pages deploy.
<!-- /internal -->

## Page layout

Every demo is a small folder, never a single file with inlined CSS:

```
<demo>/
  index.html          markup + inline wiring (or js/app.js)
  product-theme.css   unmodified copy of canonical, never edited
  page.css            demo-only rules, theme tokens only
  js/demo-core.js     NanoDemo helpers, never edited
```

Move the page wiring into `js/app.js` when the demo has a wrapper, more than
one page, or more than ~300 lines of inline script. All scripts are classic
scripts, so demos open from `file://` and from any static host.

## NanoDemo API (js/demo-core.js)

| Function | Use |
|---|---|
| `readParams(location.search)` | `{ stream, token, server, params }` from `?stream= ?token=/?jwtoken= ?server=` |
| `isUuid(s)` | Group/stream ID vs stream name |
| `buildSource({ stream, token, server })` | The verified base source (`entries` for names, `group` for UUIDs) |
| `buildConfig({ source, playback, style, events })` | Verified defaults; rejects invalid `latencyControlMode` |
| `createController(containerId, handlers)` | **Use this for every player.** `load(opts)` / `stop()` / `player`; handles double-loads, errors, pagehide |
| `playerEvents(handlers)` | Player events → `connecting/buffering/playing/paused/error` (used by the controller) |
| `statusHandlers(ui)` | Standard status-bar wiring for `{ badge, badgeText, text, stats }` |
| `statusView(state)` / `renderStatus(badge, label, state)` | Theme badge class + label for a state |
| `formatStats(stats)` / `statsLine(stats)` | `onStats` payload → display strings |
| `appendLog(box, name, detail)` | Timestamped, redacted log line, capped at 300 |
| `flatten(obj)` | Nested object → `[key, value]` rows |
| `buildReport(info)` | Redacted plain-text support report |
| `errorMessage(e)` / `redact(text)` | Readable player errors; strip JWTs and `token=` params |
| `startPlayer(id, config)` / `stopPlayer(player)` | Low-level lifecycle (the controller uses these) |

`NanoDemo.SwitchPlayer` (js/player-wrapper.js) is the worked wrapper example.

## Tests (skill maintainers)

```bash
cd <this skill> && node --test
```

Node 20+, no dependencies. Tests cover `lib/`, `scripts/` and every template.

## Changelog

### 1.0.0 (2026-09-29)

- First version: six templates, `NanoDemo` core, `SwitchPlayer` wrapper,
  `new-demo` / `check-demo` scripts, best practices, wrapper pattern, checklist.
