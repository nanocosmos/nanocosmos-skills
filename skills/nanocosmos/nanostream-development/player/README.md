# nanoStream Player Demo

A single-file demo player page for the [nanocosmos platform](https://docs.nanocosmos.net)'s nanoStream Player, styled as a matte "Dark Neutral Studio" AV workbench.

- **File:** `player-demo.html` (self-contained — HTML + CSS + JS, no build step)
- **Player:** nanoStream Player 5 (`nanoplayer.5.min.js`, loaded from the nanocosmos CDN)

## Sibling page: `player-simple.html`

The minimal counterpart to the diagnostics page: one stream input, Load/Stop, a status line, nothing else. Built on the nanocosmos **demo shell** with the common CSS (`fonts.css` + `demo.css` from the brand-guidelines skill) inlined per the standalone-shipping rule, so the single file works anywhere (`file://` or any static host). Same verified Player 5 config and URL params (`?stream=`, `?token=`/`?jwtoken=`, `?server=`); auto-loads on open, Enter in the stream field reloads.

## Sibling page: `player-concurrent.html`

`player-simple.html` plus one metrics panel: **max concurrent viewers** of the
played stream, from the nanoStream Analytics API v2
(`GET https://metrics-api.nanostream.cloud/v2/viewers/concurrent/timeseries`,
header `X-ACCESS-TOKEN`; the API is CORS-open, verified 2026-08-24). Shows a
headline number plus a **2-hour minute-resolution line chart** (inline SVG:
2px brand-blue line + 10% area wash, crosshair tooltip snapping to the nearest
minute, clean y-ticks, 30-min x labels, collapsible data table as the no-hover
fallback; the blue passes the dataviz palette validator on white). Polls once
per minute; the window ends at the second-last complete minute as the API spec
prescribes (the metric is written ~30 s after a minute closes, so the chart
trails live by ~2 minutes). A minute the API omits is plotted as 0 viewers.
Auth, either way: **sign in on the page** with an Analytics dashboard account
(credentials go only to the API's `/authenticate`, never stored — the page
keeps just the returned short-lived token), or paste/pass a token
(`?atoken=`). A **metrics-scoped bintu user token** works as the token too
(`/authenticate` passes bintu tokens straight through — verified live
2026-08-24 with a token minted per
`nanostream-support/references/nanostream-token-generation.md` Method 2,
`aud:["metrics"]`). Playing by stream name filters the count to
that stream; playing a UUID group shows the org-wide total (the `streams`
filter takes names, not UUIDs). **No credentials are embedded in the page.** HTTP 401 →
token expired, HTTP 403 → route needs a higher Analytics plan tier; both are
surfaced in the panel. Same player config and URL params as
`player-simple.html`.

## Sibling page: `player-diagnostics.html`

A diagnostics-focused variant built on the official nanocosmos **demo shell** (brand-guidelines demo mode: Lexend Deca + Source Sans 3, brand tokens, minimal header/footer, page version stamp) instead of the Dark Neutral Studio look — suitable for hosting on `web.pages.gitlab.nanocosmos.cloud`. Same verified Player 5 config and URL params (`?stream=`, `?token=`/`?jwtoken=`, `?server=`) plus a diagnostics tier:

- **Live stats panel** — latency / bitrate / buffer / frame rate from `onStats`, plus session counters (stats updates, buffering events, errors) and the raw latest `onStats` payload as collapsible JSON.
- **Stream info panel** — the flattened `onStreamInfo` / `onStreamInfoUpdate` payload (codecs, resolution, etc. as delivered by the player).
- **Timestamped event log** — all wired player events (`onReady`, `onStreamInfo(Error)`, `onPlay`/`onPause`, `onStartBuffering`/`onStopBuffering`, `onError`, `onWarning`, `onSwitchStream*`, mute events …), color-coded, capped at 300 lines.
- **Copy Diagnostics Report** — one click copies a plain-text report (UTC time, page URL with tokens redacted, user agent, config summary, counters, last stats, stream info, event log) for pasting into a support ticket. JWTs are never included.
- **Extra controls** — Pause/Resume, Mute/Unmute, Stop, latency-control-mode select and faststart / MOQ / autoplay / controls toggles (setup-time options restart the player on change).
- **Themes** — header button cycles `light → dark → studio`; URL param `?theme=light|dark|studio`; defaults to the OS preference and remembers the last manual choice (localStorage).
  - `dark` — brand navy scale (deep-navy page, platform-navy panels); orange/blue accents and the navy header unchanged.
  - `studio` — the **Dark Neutral Studio** look (dark-neutral-studio skill): matte graphite panels, brand-blue header with orange rule, recessed orange-edged inputs, orange Load button (orange = commit action), blue status strip. Brand fonts (Lexend Deca / Source Sans 3) stay unchanged in all themes.

## Run

Just open the file — it works over `file://` or any static host:

```bash
open player-demo.html
```

On open it auto-loads the configured stream. The page needs network access for the player CDN and the live stream.

## URL parameters

| Param      | Example                                      | Effect |
| ---------- | -------------------------------------------- | ------ |
| `stream`   | `?stream=HX26g-YVe8D`                         | Play by **stream name** (`XXXXX-YYYYY`) |
| `stream`   | `?stream=b6638d50-3581-4349-8fb2-59b3406c2dde`| Play by **stream/group ID** — a UUID is auto-detected and resolved via the bintu API |
| `token`    | `?token=eyJhbGci…`                            | Token-secure playback (JWT). Alias: `jwtoken` |
| `server`   | `?server=bintu-play.nanocosmos.de`            | Override the play server domain |

Example: `player-demo.html?stream=<uuid>&token=<jwt>`

## Controls

- **Stream Name or Group ID** — accepts `XXXXX-YYYYY` or a UUID; the type is auto-detected.
- **Play Server Domain** — defaults to `bintu-play.nanocosmos.de`.
- **JWT Token (optional)** — paste a server-signed JWT to enable token-secure playback. Security is **auto-applied** when a token is present; empty = public. There is no separate secure/public switch.
- **Latency Control Mode** — `fastadaptive` | `balancedadaptive` (default) | `classic`. This sets how tightly the player holds to the live edge, **not** an absolute latency in seconds — all modes are low-latency.
- **Fast start**, **Media over QUIC (MOQ)**, **Autoplay (muted)**, **Show player controls** — toggles (`playback.faststart`, `playback.enableMediaOverQuic`, `playback.autoplay`, `style.controls`). Changing any of these (or the latency mode) while a stream is loaded **restarts** the player so the new setup applies.
- **Stop** / **Pause·Resume** / **Load Stream** — `Pause` toggles `player.pause()`/`player.play()`; `Load Stream` applies text-field changes.

The status strip under the monitor reflects connection state (idle / connecting / live / error) and shows latency / bitrate / buffer from the player's `onStats` event.

## Config patterns (the parts that matter)

The player is configured from a single base `source`, with either `entries` (stream name) or `group` (UUID) attached — mirroring the reference `player.html` in the nanoStream skill:

```js
const security = jwt ? { jwtoken: jwt } : {};            // auto-detected from token presence

const source = {
  defaults: { service: "bintu" },
  general:  { serverDomain: "bintu-play.nanocosmos.de" },
  options:  { switch: { timeout: 10 }, adaption: { rule: "deviationOfMean2" } },
  startIndex: 0,
};

if (isUuid(input)) {
  source.group   = { id: input, apiurl: "https://bintu.nanocosmos.de", security };   // stream/group ID
} else {
  source.entries = [{ h5live: { rtmp: { streamname: input }, security } }];          // stream name
}

player.setup({
  source,
  playback: { autoplay: true, automute: true, muted: true,
              enableMediaOverQuic: true, faststart: true,
              latencyControlMode: "balancedadaptive" },
  style:    { scaling: "fill", width: "100%", height: "100%", view: true, controls: false },
});
```

### Two things that are easy to get wrong

- **`latencyControlMode`** is one of exactly `fastadaptive` / `balancedadaptive` / `classic`. It is a control *behavior*, not a target latency in seconds.
- **`adaption.rule`** (`deviationOfMean` / `deviationOfMean2` / `none`) controls how the player switches ABR renditions — it is **not** an ABR on/off switch. Whether playback is adaptive depends on the source being a multi-rendition group. Leave it at `deviationOfMean2`.

For ingest, the bintu API, and token details, see the nanoStream skill (`~/.claude/skills/nanostream/`) and the official docs at https://docs.nanocosmos.net.
