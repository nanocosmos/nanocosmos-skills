# nanoplayer-demo v2: design

Date: 2026-10-02 · Owner: player team · Status: draft for review
Supersedes parts of `2026-09-29-nanoplayer-demo-skill-design.md` (§4–§8); its
ownership split, layout and public/internal tiers still apply.

## 1. Why v2

The owner reviewed v1 against three rules:

1. Demos play by **bintu group ID (`source.group.id`)** by default, not by
   stream names.
2. The player configuration must be **clean, explicit and easy for a customer
   to change in the demo**.
3. The **latest nanoPlayer docs** are the authority for best practices and for
   deprecated or discouraged usage.

Source checked: `nano-docs` repo, `main` at `ddcd5d7` (2026-10-01), player
5.0.13 docs (`docs/nanoplayer/*`), published at
https://docs.nanocosmos.de/docs/nanoplayer/nanoplayer_introduction.

v1 breaks all three, plus a five-team trial (2026-10-01) found gaps. This spec
fixes both.

## 2. What v1 gets wrong

| # | v1 behavior | Docs / rule | v2 |
|---|---|---|---|
| 1 | Default `DEFAULT_STREAM = 'CD6oL-2kE1g'` played through `entries` | Group is "the easiest player configuration, especially for ABR" (getting started); rule 1 | Default is `source.group` |
| 2 | `startIndex: 0` sent for groups (= highest quality) | `group.startQuality` "is an enhanced version of startIndex, designed particularly for the stream group feature"; default `low` | `startQuality: 'medium'` for groups, no `startIndex` |
| 3 | `buildConfig()` in never-edit `demo-core.js` injects a dozen hidden defaults | rule 2 | Full config is a literal in the page; helpers never add options |
| 4 | `general.serverDomain: 'bintu-play.nanocosmos.de'` always set | "has highest prio and will override/modify all h5live server domains" (API) | Only set when `?server=` is given |
| 5 | `defaults.service: 'bintu'` always set | Fills endpoints for **entries** (source defaults page) | Only in entries mode |
| 6 | `muted: true` | Autoplay with automute "will attempt to start the playback unmuted", example `muted: false` (autoplay page) | `muted: false`; multi-player and booth/kiosk pages `muted: true` with a comment |
| 7 | `scaling: 'fill'` | Default `letterbox` | `letterbox` |
| 8 | Status line "Latency …" | `onStats` has no latency field | "Buffer delay" from `stats.buffer.delay.current`, with the latency control's target `stats.buffergoal.real` next to it |
| 9 | Bitrate printed as kbps | `stats.bitrate.*` "in Bit/s" | Divide by 1000 |
| 10 | Raw error message only | Error code ranges and never-retry list (errors page) | Readable text per code range, rules in best practices |
| 11 | ABR undocumented, renditions guessed | `switchStream` disables ABR, `setAdaption` changes rule, `onSwitchStream*` carry `data.entry` | ABR section; show the active entry from events; no invented quality list |
| 12 | `switch.timeout: 10` | API default 20 | `20`, written out |

No deprecated API is used in v1 (`switch.fastStart`, `source.h5live/bintu/hls`,
STS tokens). Keep it that way.

## 3. Decisions (owner, 2026-10-02)

- Default group ID: `b6638d50-3581-4349-8fb2-59b3406c2dde`.
- Group is the default; `?stream=XXXXX-YYYYY` is an explicit opt-in to
  entries mode for streams that are not in a group.
- Configuration is shown twice: a commented `PLAYER_CONFIG` block at the top
  of the page script, and an on-page **Configuration** panel with the
  effective config as JSON and a Copy button (tokens redacted).
- Audio: docs default (`muted: false`, `automute: true`); multi-player tiles
  and booth/kiosk (`branded-page`) pages use `muted: true`, commented.

## 4. The page configuration

Every template's page script starts with this block (values vary per
template only where noted):

```js
// ── Player configuration ───────────────────────────────────────────────
// This object is passed to nanoPlayer as-is. Edit it to change the demo.
// Reference: https://docs.nanocosmos.de/docs/nanoplayer/nanoplayer_api
var PLAYER_CONFIG = {
  source: {
    group: {
      id: 'b6638d50-3581-4349-8fb2-59b3406c2dde', // bintu stream group (ABR). URL: ?group=
      startQuality: 'medium',   // high | medium-high | medium | medium-low | low (default low)
      security: {}              // secure playback: { jwtoken: '…' }. URL: ?token=
      // apiurl: 'https://bintu.nanocosmos.de' // optional, this is the default
    },
    options: {
      adaption: { rule: 'deviationOfMean2' }, // ABR on. 'none' = keep the start quality
      switch: { method: 'server', pauseOnError: false, forcePlay: true, timeout: 20 }
    }
  },
  playback: {
    autoplay: true,
    automute: true,   // if the browser blocks sound, start muted instead of not at all
    muted: false,     // try with sound first
    faststart: true,
    enableMediaOverQuic: true, // MoQ where the browser supports it, else WebSocket
    latencyControlMode: 'balancedadaptive' // classic | fastadaptive | balancedadaptive
  },
  style: {
    width: '100%', height: '100%', // fills the page's video area
    scaling: 'letterbox',          // letterbox | fill | crop
    controls: false                // the demo has its own controls
  }
};
```

### 4.1 URL parameters

Applied by one visible call, `var config = NanoDemo.applyUrlParams(PLAYER_CONFIG, location.search);`,
which returns a deep copy and never adds options beyond these:

| Param | Effect on the copy |
|---|---|
| `?group=<id>` | `source.group.id` |
| `?token=<jwt>` (alias `?jwtoken=`) | `security.jwtoken` on the group (or on each entry in entries mode) |
| `?stream=XXXXX-YYYYY` | **Entries mode:** removes `source.group`, sets `source.defaults = { service: 'bintu' }` and `source.entries = [{ h5live: { rtmp: { streamname }, security } }]`, `startIndex: 0` |
| `?server=<domain>` | `source.general = { serverDomain }` (only then) |

Template-specific params (`?ticket=`, `?groups=`, `?tiles=`) are read by the
page script itself and documented in its helper text.

### 4.2 Configuration panel

Each template has a collapsible **Configuration** panel (theme
`.raw-toggle`/`.raw-payload` pattern) showing `NanoDemo.configJson(config)`:
the effective config without `events`, tokens replaced by `[redacted]`, plus
a Copy button. It updates whenever the page reloads the player.

## 5. Helper library changes (`lib/demo-core.js`)

Removed: `buildSource`, `buildConfig`, `readParams` (and their hidden
defaults), `DEFAULTS.stream/serverDomain/apiUrl/latencyControlMode`.

Added / changed:

| Function | Contract |
|---|---|
| `applyUrlParams(config, search)` | §4.1. Pure, deep copy, input untouched. Throws a readable error for a malformed `?stream=` (not `XXXXX-YYYYY`) |
| `configJson(config)` | Pretty JSON without `events`, tokens redacted |
| `createController(id, handlers, env).load(config, extra?)` | Takes the page's config unchanged and only attaches `events` (merged with any `config.events` the page set, page handlers first). Same supersede/pending/stale guards as v1 |
| `errorText(code, message)` | Readable text by documented range: 1005 "tap to play", 2001 not found, 2002/2003 no media, 2004 stopped, 4006 switch timeout, 4900–4999 token problem, 5001–5010 setup/config; else the player message |
| `formatStats(stats)` | `{ bitrate: kbps from bit/s, bufferDelay, bufferGoal, framerate }`; `statsLine` = "Bitrate … · Buffer delay … (target …)" |
| `statusHandlers(ui)` | `text` and `stats` both optional |
| `buildReport(info)` | adds `playerVersion` and optional `ticket` |

Kept: events → states, status/badge, sticky Error, log, redaction, report,
`startPlayer`/`stopPlayer`, pagehide, `SwitchPlayer`.

`stats.buffer.delay` and `stats.buffergoal` have no unit in the docs
(`onError`'s `bufferDelayCurrent` is ms). Seconds is the likely unit:
`buffer.start/end` are media-timeline times and the latency control compares
the delay against `tweaks.buffer` thresholds documented in seconds (target
1.2 s). v2 displays both in seconds with two decimals, marks the unit
UNVERIFIED in code and docs, and the browser check confirms it.
`buffergoal.real` ("the final calculated buffergoal value including
offsets") is the best available indicator of how close to the live edge the
player aims, so comparison pages lead with "buffer delay vs target".

## 6. Templates

| Template | v2 changes |
|---|---|
| `single-player` | §4 block; group field (label "Group ID") + Load/Stop; Configuration panel |
| `feature-showcase` | Controls edit a copy of the config (`latencyControlMode`, `enableMediaOverQuic`, `faststart`) and reload; panel shows the result |
| `multi-player` | `TILES = [{ label, override }]`, each tile = deep merge of `PLAYER_CONFIG` + `override`; default two tiles of the same group, `H5Live (WebSocket)` vs `MoQ`; `muted: true`; `?groups=a,b` gives one tile per group instead |
| `diagnostics` | `?ticket=` shown on the page and in the report; player version in report; per-load reset (v1 fix) kept |
| `branded-page` | `muted: true` (booth/kiosk); no developer URL text visible to viewers; slots for event line (e.g. booth, dates) and logo, with "logo pending" placeholder guidance |
| `feature-wrapper` | SwitchPlayer switches between **groups** (`?groups=`, default `b6638d50-…` and `HX26g-YVe8D` as group id); wrapper takes the page config and swaps only `source.group.id` via `updateSource` |

## 7. Scripts

- `new-demo.mjs`: `--group <id>` writes the group into `PLAYER_CONFIG`;
  prints `OK` on success; for `feature-wrapper` the copied
  `js/player-wrapper.js` is documented as the starting point to rename.
- `check-demo.mjs` new rules: `player-config` (a `var PLAYER_CONFIG =` literal
  in `index.html` or `js/app.js`), `no-server-domain-literal`
  (`serverDomain:` with a string literal), `no-start-index-with-group`
  (`startIndex` next to `group:` in the page config). Existing rules kept.

## 8. Docs

- `best-practices.md` rewritten: every player rule cites its docs page
  (published URL + `nano-docs` path). New sections: group playback, autoplay
  and audio, ABR (`switchStream` disables ABR, `setAdaption` changes the rule,
  `onSwitchStream*` with `data.entry`, no documented rendition list), errors
  (code ranges, never-retry list, 1005 tap-to-play), tokens (JWT only;
  expired token blocks new connections and stream switches).
- SKILL.md, wrapper-pattern.md, demo-checklist.md updated to the new API.
- `REVIEW-NOTES.md`: flag to `nanostream-development`'s owner that its
  "names → entries is the default" text contradicts rule 1.
- Skill version 2.0.0 (breaking: helper API changed).

## 9. Out of scope

- Multi-player *wrapper* failure semantics (trial item 8).
- Changing `nanostream-development` itself.
- Non-JWT token redaction (deferred minor), bfcache restore (deferred minor).

## 10. Testing

- TDD for every helper change (`node --test`); template tests extended:
  every template has `PLAYER_CONFIG` with `source.group`, and parses.
- Re-run the five-team trial with fresh agents against v2.
- Browser check (owner): group plays, quality events, buffer-delay unit,
  bitrate plausibility.
