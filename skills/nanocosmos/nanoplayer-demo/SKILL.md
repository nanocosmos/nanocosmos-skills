---
name: nanoplayer-demo
description: "Build nanoPlayer demo pages the nanocosmos way: play by bintu stream group (source.group.id), show the complete nanoPlayer configuration explicitly (commented PLAYER_CONFIG + on-page Configuration panel a customer can copy), follow the nanoPlayer 5 docs, one base look. Six starter templates (single player, feature showcase, multi-player / A-B comparison, diagnostics, customer/event-branded page, feature wrapper such as a switch player), a scaffolder, a demo checker and a done-checklist. Use whenever someone asks for a player demo, sample page, feature demo, comparison page or wrapper around nanoPlayer, for sales, marketing, support or product. Not for marketing pages on nanocosmos.net (nanocosmos-brand-guidelines) or raw player API questions (nanostream-development)."
license: (c) nanocosmos
metadata:
  version: 2.0.0
  author: nanocosmos
  category: streaming
  updated: 2026-10-02
---

# nanoplayer-demo

Every nanoPlayer demo, whoever builds it, starts from one of this skill's
templates, plays a **stream group** by default, and carries its **whole
player configuration in plain view**: a commented `PLAYER_CONFIG` at the top
of the page script, and a Configuration panel on the page that shows (and
copies) exactly what nanoPlayer receives. Customers change a demo by editing
that one object.

## Rules

1. **Group by default.** `source.group.id` (+ `startQuality`), not stream
   names. A single stream is an explicit opt-in with `?stream=XXXXX-YYYYY`.
2. **Explicit configuration.** All options are in the page's `PLAYER_CONFIG`
   in the docs' shape. The helper library builds no config and adds nothing
   except event handlers.
3. **The nanoPlayer docs are the authority** (player 5.0.13, `nano-docs`
   repo `docs/nanoplayer/`, published at
   https://docs.nanocosmos.de/docs/nanoplayer/nanoplayer_introduction).
   `references/best-practices.md` cites the page for every rule.

## Who owns what

| Concern | Owner |
|---|---|
| Look: colors, fonts, header/footer, buttons, panels | `nanocosmos-brand-guidelines` (`product-theme.css`, `product-sample.html`) |
| Player behavior and options | nanoPlayer docs (see rule 3); `nanostream-development` for integration help |
| Demo templates, `NanoDemo` helpers, wrapper pattern, rules, checklist | this skill |

For nanocosmos demos, don't start from
`nanostream-development/player/player-demo.html`: it uses the Dark Neutral
Studio colors and stream-name defaults.

## Workflow

1. **Pick the template.**

   | Type | Use for |
   |---|---|
   | `single-player` | One group in the brand shell, e.g. a link for sales or marketing |
   | `feature-showcase` | One player feature with its controls and an "About this feature" panel (default: latency mode, MoQ, fast start) |
   | `multi-player` | Tiles from one config: default compares H5Live (WebSocket) vs MoQ on the same group; `?groups=a,b,c` = one tile per group |
   | `diagnostics` | Live stats, stream info, event log, copyable support report with `?ticket=` |
   | `branded-page` | Viewer-facing page for a customer or event (their logo and copy, nanocosmos theme, muted) |
   | `feature-wrapper` | A JS wrapper presenting a feature as its own thing, e.g. the switch player (switches groups) |

2. **Scaffold.** From this skill's directory:

   ```bash
   node scripts/new-demo.mjs <type> <dest-dir> --title "Demo title" --group <group id>
   ```

   There is no public demo group: templates ship with an empty
   `source.group.id`, and the page asks for one until it is set. Use the
   requesting team's group; never commit real group IDs or tokens to this
   skill.

   It copies the template, `js/demo-core.js` (+ `js/player-wrapper.js` for
   `feature-wrapper`, the starting point to rename for a new wrapper) and the
   canonical `product-theme.css`, writes the group into `PLAYER_CONFIG`, and
   prints `OK` when the demo passes `check-demo`. The theme is found via
   `--theme <path>`, `$NANOCOSMOS_PRODUCT_THEME`, or the installed
   `nanocosmos-brand-guidelines` skill under `~/.claude/skills`.

3. **Build the demo.** Change player behavior only in `PLAYER_CONFIG` (or a
   control that writes into a copy of it via `mergeConfig`). Page layout and
   copy go in `index.html` / `js/app.js` and `page.css`. Never edit
   `product-theme.css` or `js/demo-core.js` in a demo. Follow
   `references/best-practices.md`; for a wrapper, `references/wrapper-pattern.md`.

4. **Check.** `node scripts/check-demo.mjs <dest-dir>` must print `OK`.

5. **Walk the checklist.** `references/demo-checklist.md` (real streams,
   browsers, copy).

<!-- internal -->
6. **Register and host** (only when the demo is published): see
   `internal/hosting.md`: theme-consumer registration and GitLab Pages deploy.
   One-off local builds skip this step.
<!-- /internal -->

## The page configuration

```js
var PLAYER_CONFIG = {
  source: {
    group: { id: '<group id>', startQuality: 'medium', security: {} },
    options: {
      adaption: { rule: 'deviationOfMean2' },
      switch: { method: 'server', pauseOnError: false, forcePlay: true, timeout: 20 }
    }
  },
  playback: { autoplay: true, automute: true, muted: false, faststart: true,
              enableMediaOverQuic: true, latencyControlMode: 'balancedadaptive' },
  style: { width: '100%', height: '100%', scaling: 'letterbox', controls: false }
};
var config = NanoDemo.applyUrlParams(PLAYER_CONFIG, location.search);
```

URL parameters: `?group=` · `?token=` (alias `?jwtoken=`) · `?stream=XXXXX-YYYYY`
(entries mode, wins over `?group=`) · `?server=` (sets `general.serverDomain`,
only then). Templates add their own (`?groups=`, `?ticket=`, `?config=1`) in
their helper text.

## Page layout

```
<demo>/
  index.html          markup + PLAYER_CONFIG + wiring (or js/app.js)
  product-theme.css   unmodified copy of canonical, never edited
  page.css            demo-only rules, theme tokens only
  js/demo-core.js     NanoDemo helpers, never edited
```

All scripts are classic scripts, so demos open from `file://` and any static host.

## NanoDemo API (js/demo-core.js)

| Function | Use |
|---|---|
| `applyUrlParams(config, location.search)` | Copy of the page config with `?group= ?token= ?stream= ?server=` applied; throws a readable error for a malformed `?stream=` |
| `mergeConfig(base, override)` | Copy with an override merged in (controls, multi-player tiles) |
| `clone(value)` | Deep copy (handlers by reference) |
| `sourceId(config)` / `withSourceId(config, id)` | Read / set the group id (or stream name in entries mode) |
| `validateConfig(config)` | Readable problem (missing id, bad enum) or `null`; the controller calls it |
| `configJson(value)` | JSON for the Configuration panel: no handlers, tokens redacted |
| `mountConfigPanel({ toggle, pre, copy, confirm })` | Wires the panel; `render(config)` shows and remembers what Copy copies |
| `createController(containerId, handlers)` | **Use this for every player.** `load(config, extra?)` / `stop()` / `player` / `config`; supersede-safe, destroys on pagehide |
| `playerEvents(handlers)` | Player events → `connecting/buffering/playing/paused/error` (used by the controller) |
| `statusHandlers(ui)` | Status-bar wiring for `{ badge, badgeText, text?, stats? }` |
| `statusView(state)` / `renderStatus(badge, label, state)` | Theme badge class + label for a state |
| `formatStats(stats)` / `statsLine(stats)` | `onStats` → bitrate (kbps), buffer delay and its target |
| `errorText(code, message)` / `errorMessage(e)` | Readable text for documented error codes |
| `appendLog(box, name, detail)` | Timestamped, redacted log line, capped at 300 |
| `flatten(obj)` | Nested object → `[key, value]` rows |
| `buildReport(info)` | Redacted support report (player version, ticket, config, stats, log) |
| `redact(text)` | Strip JWTs and `token=` params |
| `startPlayer(id, config)` / `stopPlayer(player)` | Low-level lifecycle (the controller uses these) |

`NanoDemo.SwitchPlayer` (js/player-wrapper.js) is the worked wrapper example.

## Tests (skill maintainers)

```bash
cd <this skill> && node --test
```

Node 20+, no dependencies. Tests cover `lib/`, `scripts/` and every template.

## Changelog

### 2.0.0 (2026-10-02)

- Breaking: demos play by `source.group.id` by default; `?stream=` is opt-in.
- Breaking: the page's commented `PLAYER_CONFIG` is the only config;
  `buildSource`/`buildConfig`/`readParams` removed; `createController.load(config)`.
- New Configuration panel (`configJson`, `mountConfigPanel`) on every template.
- Follows nanoPlayer 5.0.13 docs: `startQuality`, `muted: false` + automute,
  `letterbox`, no hardcoded `serverDomain`, `switch.timeout: 20`, bitrate in
  bit/s, buffer delay with target, readable error codes, ABR/token rules.
- `new-demo --group`, `OK` output; `check-demo` rules `player-config`,
  `no-server-domain-literal`, `no-start-index-with-group`.
- Multi-player tiles take config overrides (A/B comparison); diagnostics
  `?ticket=` and player version; branded page without developer text.

### 1.0.0 (2026-09-29)

- First version: six templates, `NanoDemo` core, `SwitchPlayer` wrapper,
  `new-demo` / `check-demo` scripts, best practices, wrapper pattern, checklist.
