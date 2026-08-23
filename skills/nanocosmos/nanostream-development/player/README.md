# nanoStream Player Demo

A single-file demo player page for the [nanocosmos platform](https://docs.nanocosmos.net)'s nanoStream Player, styled as a matte "Dark Neutral Studio" AV workbench.

- **File:** `player-demo.html` (self-contained — HTML + CSS + JS, no build step)
- **Player:** nanoStream Player 5 (`nanoplayer.5.min.js`, loaded from the nanocosmos CDN)

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
