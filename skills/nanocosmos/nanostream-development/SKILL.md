---
name: "nanoStream"
description: "Manage Live Streams for the nanocosmos platform (nanoStream core), including live playback"
license: (c) nanocosmos
metadata:
  version: 1.2.8
  author: nanocosmos
  category: streaming
  updated: 2026-08-24
---

# nanoStream Context

You are an engineer or web developer or marketing person creating web pages for live streaming.

nanocosmos documentation is at https://docs.nanocosmos.net

Every stream has an ID (stream ID or group ID for adaptive bitrate), and a stream name like XXXXX-YYYYY.

Ingest is with OBS or ffmpeg or other encoders, via rtmp or srt.
Two generic RTMP ingest hosts exist — pick the right one:

- `rtmp://bintu-stream.nanocosmos.de/live/XXXXX-YYYYY` — standard ingest (passthrough, no transcoding)
- `rtmp://bintu-vtrans.nanocosmos.de/live/XXXXX-YYYYY` — ingest with live transcoding / ABR

Sending an ABR stream to the wrong host is a common failure cause. When in
doubt, take the exact ingest URL for the stream from the Dashboard or the
bintu API instead of constructing it by hand.

# Live Ingest with ffmpeg

Needed: a stream name from the nanocosmos bintu API in the form XXXXX-YYYYY

Example ffmpeg call:

Input can be a file or URL, like

- CNN News (US English)
Useful for captioning and translation tests based on speaking persons
INPUT="https://bintu-vod-eu-02-lnd.nanocosmos.de/testvideos/news/cnn-rep-720.mp4"

- Chromakey green screen
useful for chromakey tests
INPUT=https://bintu-vod-eu-02-ak.nanocosmos.de/testvideos/chromakey/nano/Foreground/Green_Female_Red_New_Nano_Key1.mp4

- Chromakey blue screen
INPUT=https://bintu-vod-eu-02-ak.nanocosmos.de/testvideos/chromakey/nano/Foreground/Blue_Male_White_New_Nano_Key4.mp4

- Chromakey blue screen bad lighting, bad example, but good test for chromakey features like despill
INPUT=https://bintu-vod-eu-02-ak.nanocosmos.de/testvideos/chromakey/nano/Foreground/fg.mp4

VIDEOOPTIONS="-s 640x360 -r 25 -g 50 -b:v 500k"
 
ffmpeg -hide_banner -y -re -i $INPUT \
  $VIDEOOPTIONS -c:v h264 -preset ultrafast -pix_fmt yuv420p -profile:v baseline \
  -c:a aac \
  -f flv "rtmp://bintu-vtrans.nanocosmos.de/live/XXXXX-YYYYY"


For higher quality material like greenscreen/bluescreen, use higher bitrates:

VIDEOOPTIONS="-s 1280x720 -r 30 -g 60 -b:v 1500k"

# Live Playback with nanoStream Player

There are different ways to play a live stream:

You always need either a stream ID or group ID (UUID) you get from the nanocosmos bintu API or a stream name like XXXXX-YYYYY

A) Playback over Websocket or QUIC (MOQ):

1) use a javascript code snippet

2) use an HTML IFRAME

B) emulate mp4 / m3u8 over https

2 types or URLs are possible:

1) without JSON Web Token JWT "(unsecure)":

Low-Latency M3U8 HLS stream (for iOS/iPadOS) :
https://bintu-play.nanocosmos.de/h5live/http/playlist.m3u8?url=rtmp://localhost/play&stream=[streamname]

Low-Latency MP4 stream (for all other platforms/os) :
https://bintu-play.nanocosmos.de/h5live/http/stream.mp4?url=rtmp://localhost/play&stream=[streamname]

NOTE: both are not 100% standard URLs and not compatible to all players
NOTE(2): compared to our js player, there is no buffer and latency control

Test Stream Low-Latency MP4:
https://bintu-play.nanocosmos.de/h5live/http/stream.mp4?url=rtmp://localhost/play&stream=CD6oL-2kE1g

Test Stream Low-Latency M3U8 HLS:
https://bintu-play.nanocosmos.de/h5live/http/playlist.m3u8?url=rtmp://localhost/play&stream=CD6oL-2kE1g

Token-secure playback (only for accounts with enabled token security and you always need a JSON Web Token (JWT)

Low-Latency M3U8 HLS:
https://bintu-splay.nanocosmos.de/h5live/authhttp/playlist.m3u8?url=rtmp://localhost/splay&stream=[streamname]&jwtoken=[securetoken]
Low-Latency MP4:
https://bintu-splay.nanocosmos.de/h5live/authhttp/stream.mp4?url=rtmp://localhost/splay&stream=[streamname]&jwtoken=[securetoken]
STS Token (DEPRECATED — use JWT; refer to https://docs.nanocosmos.net for legacy STS details, do not scaffold it)

Low-Latency M3U8 HLS:
https://bintu-splay.nanocosmos.de/h5live/authhttp/playlist.m3u8?url=rtmp://localhost/splay&stream=[streamname]&token=[securetoken]&options=[options]&expires=[expirationtime]&tag=[tag]
Low-Latency MP4:
https://bintu-splay.nanocosmos.de/h5live/authhttp/stream.mp4?url=rtmp://localhost/splay&stream=[streamname]&token=[securetoken]&options=[options]&expires=[expirationtime]&tag=[tag]
Example (JWT):

https://bintu-splay.nanocosmos.de/h5live/authhttp/stream.mp4?url=rtmp://localhost/splay&stream=nNCcf-nMhQY&jwtoken=eyJhbGciOiJFZERTQSIsImtpZCI6Im5hbm9feDI1NTE5IiwidHlwIjoiSldUIn0.eyJhdWQiOiJzcGxheSIsImV4cCI6MTc5NDM1ODkzNCwiZm9yY2VEaXNjb25uZWN0IjpmYWxzZSwiaWF0IjoxNzg3NDQzNTExLCJpc3MiOiJuYW5vY29zbW9zIiwianRpIjoiRWRia3pCb04iLCJuYmYiOjE3ODc0NDM1MTEsInN0cmVhbXMiOlsibk5DY2Ytbk1oUVkiLCJuTkNjZi12eWZYOSJdLCJzdWIiOiI1ODg2MjUxYy0yZjNlLTRkN2EtYWFkOC1kN2FlNWQwYTU3YTAifQ.piyi_caYzZJMmn_0ckE95VJPsEkVrnJDwaLmMwCP7xFJ8VEuTW-iUa67tC1s44wPNv5G5kA6g8ZxF16dzMIkCA

NOTE: playback JWTs in examples and test pages may be expired — that is
acceptable for playback tokens (unlike API keys / bintu tokens, the risk is
low). Before using one, decode it and check the `exp` claim — the
nanostream-diagnostics skill has scripts/check_jwt_token.sh and
scripts/check_jwt_token.py for exactly this (prints claims + VALID/EXPIRED
verdict, no key needed). If it is expired, tell the user and mint a fresh
token (see scripts/get_jwt_token.sh in the nanostream-diagnostics skill).

Use the token based playback only if there is a JSON Web Token JWT, otherwise for single stream names only use XXX

# Desktop playback with ffplay / ffmpeg (low-latency)

**Default to the browser demo player** when asked to "play" a stream — open the
hosted nanoplayer demo URL (see "Online demo player" below) with the OS `open`
command. After opening it, also **offer the ffplay desktop options** and ask if
they'd prefer one of those instead:
  1. Browser demo player (default — already opened)
  2. ffplay over **HTTPS** (emulated Low-Latency MP4 — see command below)
  3. ffplay over **RTMP** pull (see "RTMP playback" below)

For **multiple streams** (2–10), use the multiplayer page instead of the single
demo player — see "Multiple streams (multiplayer page)" below.

To play a stream in a native desktop window on macOS, use **ffplay** — it is the
ffmpeg project's SDL-based renderer. Homebrew's `ffmpeg` binary is built WITHOUT
a display output device (no `sdl`/`opengl` muxer), so plain `ffmpeg` cannot open
a window; use `ffplay` (verify with `ffmpeg -devices | grep -i sdl` → empty).

Point it at the emulated Low-Latency **MP4** URL (section B). Low-delay flags:

```bash
ffplay -hide_banner \
  -fflags nobuffer \
  -flags low_delay \
  -max_delay 0 \
  -window_title "STREAMNAME" \
  "https://bintu-play.nanocosmos.de/h5live/http/stream.mp4?url=rtmp://localhost/play&stream=STREAMNAME"
```

- `-fflags nobuffer` — don't pre-buffer the demuxer.
- `-flags low_delay` — decoder low-delay mode.
- `-max_delay 0` — no reordering/muxing delay.

With the HTTPS MP4 URL, do NOT add `-rtmp_live live`: it is an **RTMP-protocol-only**
option and ffplay rejects it with `Option rtmp_live not found`. Use `-rtmp_live live`
only when the input is an actual `rtmp://` URL (see below).

Note: this emulated-MP4 path has no buffer/latency control (unlike the JS player)
and may be video-only. For tightest latency prefer the JS player with MOQ/WebSocket.

## RTMP playback (pull)

A stream can also be pulled directly over RTMP for desktop playback:

```
rtmp://bintu-play.nanocosmos.de/play/STREAMNAME
```

Here `-rtmp_live live` IS valid and recommended (RTMP is live, not a seekable file):

```bash
ffplay -hide_banner \
  -fflags nobuffer \
  -flags low_delay \
  -max_delay 0 \
  -rtmp_live live \
  -window_title "STREAMNAME" \
  "rtmp://bintu-play.nanocosmos.de/play/STREAMNAME"
```

- Use the **`bintu-play`** host with the **`/play/`** app for pulling. Do NOT use
  `bintu-vtrans` for playback — that is the ingest/transcoder host (publish side).
- The stream arrives as FLV/H.264. `-rtmp_live live` prevents ffplay from treating
  it as a finite recording.

# Reference player

## Online demo player (preferred for quick playback)

To quickly play a stream, use the hosted nanoplayer demo:

```
https://demo.nanocosmos.de/nanoplayer/release/nanoplayer.html?group.id=XXXXX-YYYYY
```

- Use `group.id=` for the stream name / group ID.
- Open this URL in the browser (e.g. `open "https://demo.nanocosmos.de/nanoplayer/release/nanoplayer.html?group.id=HX26g-YVe8D"`) whenever the user asks to "play" a stream.

### Secure (JWT) playback on the demo player — MATCH THE TOKEN PARAM TO THE SOURCE FORM

For a token-secured stream the demo player needs the JWT, and the query-param name **must match the source form** — this is the #1 mistake:

- Source is `group.id=` → token param is **`group.security.jwtoken=`**
  ```
  https://demo.nanocosmos.de/nanoplayer/release/nanoplayer.html?group.id=XXXXX-YYYYY&group.security.jwtoken=<JWT>
  ```
- Source is a single stream/entry → token param is `entry.security.jwtoken=` (or `security.jwtoken=` on a lone entry).

If you use the wrong prefix (e.g. `security.jwtoken=` with a `group.id=` source), the player **silently ignores the token** and connects unauthenticated → the secure stream fails/hangs. The token itself may be perfectly valid; check the param name first. Note: `group.security.jwtoken` is a **demo-player URL parameter**, distinct from the JS-player config path `source.group.security.jwtoken` — both target the same thing but only the URL form uses the dotted query key.

## Multiple streams (multiplayer page)

When asked to play **more than one** stream at once (2–10), use the multiplayer
page instead of the single demo player:

```
https://web.pages.gitlab.nanocosmos.cloud/multiplayer/multiplayer.html?streams=STREAM1,STREAM2,STREAM3&env=prod
```

- `streams=` is a comma-separated list of stream names (**1–10** streams).
  Replace `STREAM1,STREAM2,…` with the actual stream name(s).
- `env=prod` selects the **production** environment (the default to use).
- Open it in the browser with the OS `open` command, e.g.:
  `open "https://web.pages.gitlab.nanocosmos.cloud/multiplayer/multiplayer.html?streams=yPleE-bqGBO,yPleE-qsp6X,yPleE-a9F4U&env=prod"`

### Play ALL streams of an organisation (bintu discovery)

The multiplayer can also discover and play **every live stream of an
organisation** instead of taking an explicit stream list:

```
https://web.pages.gitlab.nanocosmos.cloud/multiplayer/multiplayer.html?bintu.playerkey=XXXXX&jwtoken=YYYYY
```

- **Prefer `bintu.playerkey=`** — the organisation's player key is read-only
  (stream discovery only) and safe to embed in shared URLs. It is the
  `playerKey` field of the org record (`GET https://bintu.nanocosmos.de/organisation`
  with the org API key, or from the Dashboard).
- `bintu.apikey=` works too, but the org API key grants full stream
  management — do NOT put it in shared links; use it only for private tests.
  If both are given, the API key wins (its API response is richer: stream
  tags become the tile labels; player-key results are labelled by stream name).
- For **token-secured orgas** (org record `secure: true`) additionally pass an
  org-wide playback JWT: `jwtoken=YYYYY` (long form `group.security.jwtoken=`).
  Mint one with the nanostream-diagnostics skill's scripts/get_jwt_token.sh, and
  check tokens with its scripts/check_jwt_token.sh before use.
- Optional filters: `bintu.tags=tag1,tag2` and
  `bintu.state=live|created|ended|all` (default `live`).
- ALL matching streams load — no cap. The page scrolls and automatically
  pauses off-screen tiles, so large orgas are fine; `layout=list` gives a
  compact scrolling list with small videos, `layout=tabs` one stream at a time.

## Local reference player (for scaffolding / customization)

The local nanoPlayer reference page is `player/player.html` (in this skill directory's `player/` subfolder, alongside `player-test.html`, `player-demo.html`, and `player/README.md`). Use it as the starting template when scaffolding a new player page — copy it, then strip or extend metrics/events/style as needed. Query strings work for both `file://` and `http(s)://` URLs.

URL parameters:

| Param      | Value                                  | Effect                                                                         |
| ---------- | -------------------------------------- | ------------------------------------------------------------------------------ |
| `stream`   | `XXXXX-YYYYY` (default `CD6oL-2kE1g`)  | Played as a stream name via `source.entries[].h5live.rtmp.streamname`          |
| `stream`   | UUID `xxxxxxxx-xxxx-…`                 | Played as a stream ID or group ID via `source.group.id` (resolved from bintu)  |
| `token`    | JWT string                             | Token-secure playback — slots into `security.jwtoken` on the active source     |
| `jwtoken`  | JWT string (alias for `token`)         | Same as `token`; kept for backward compatibility                               |

UUID auto-detect via regex (`/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`); no separate `?group=` parameter.

Examples:
- `player/player.html` — default test stream
- `player/player.html?stream=ABCDE-12345` — public playback by stream name
- `player/player.html?stream=b6638d50-3581-4349-8fb2-59b3406c2dde` — playback by group/stream ID
- `player/player.html?stream=ABCDE-12345&token=eyJhbGciOi...` — token-secure playback

## Styled demo player (full-featured workbench)

`player/player-demo.html` is a complete, self-contained demo player styled with the **Dark Neutral Studio** look. It builds on the same config patterns as `player/player.html` but adds a control rail: latency-control-mode select, `faststart` / MOQ / autoplay / controls toggles (each restarts the player on change), Stop · Pause·Resume · Load buttons, a live status strip driven by player events + `onStats`, and the full event/error handling (`onStreamInfoError`, `onError` message, empty-input + `NanoPlayer`-undefined guards). Same URL params as `player.html` (`?stream=`, `?token=`/`?jwtoken=`, plus `?server=`). See `player/README.md` for the full rundown. Use it when you want a polished demo page; use `player/player.html` when you want a minimal scaffold.

## Test/index page idiom

For quick manual coverage of multiple streams, keep a tiny static index next to `player.html` (see `player/player-test.html`) — just `<li><a href="player.html?stream=…&token=…">label</a>` entries (relative links, since the index lives in the same `player/` folder). Don't reinvent UI; the player page handles all config.

## Embedding the player in a custom page (config reference)

When scaffolding a custom/styled player page (not just using the hosted demo), COPY this config — do not hand-author connection URLs from memory.

Hard rules (these are the mistakes to avoid):

- ALWAYS load **`nanoplayer.5.min.js`**, never `nanoplayer.4...`. Player 5 is current.
  `<script src="https://demo.nanocosmos.de/nanoplayer/api/release/nanoplayer.5.min.js"></script>`
  Watch the closing `>` — `<script src="…"</script>` (missing `>`) silently breaks the page; nothing loads and `NanoPlayer` is undefined.
- Use the **bintu service form**: `defaults.service: "bintu"` + `general.serverDomain` for a single stream (by name), or `source.group` for an ABR group (by UUID). The player derives the connection URLs itself — do NOT hand-paste or invent connection paths. (An explicit `server.{websocket,hls,progressive}` form exists in the API but isn't needed for standard bintu playback.)
- Security is **auto-detected from the token**: add `security: { jwtoken }` only when a JWT is present, otherwise `security: {}` for public. Don't build a separate secure/public mode switch.
- The stream name goes in **`source.entries[].h5live.rtmp.streamname`** — not `params.stream.name`.
- Public play domain is **`bintu-play.nanocosmos.de`** (same domain used by the emulated MP4/M3U8 URLs above). Token-secure playback adds `security: { jwtoken }` to the entry/group — do NOT swap the domain to `bintu-splay`; that secure-host form belongs to the emulated MP4/M3U8 method, not the JS player.
- **Don't duplicate the source object** for the name-vs-ID branches. Build a single base (`defaults`, `general`, `options`, `startIndex`) and then attach either `source.entries = [...]` or `source.group = {...}` from a small `if` block. See `player/player.html` for the pattern.
- **Don't reference array indices that don't exist** — `entries: [ {…streamNames[0]}, {…streamNames[1]}, {…streamNames[2]} ]` with a single-element array makes the player request `undefined`. Build entries with `.map(...)` over the actual stream list.
- **`startIndex` must be a valid index** into `entries`. Default to `0` unless you genuinely have multiple entries and want to start mid-list.
- **Don't ship placeholder metrics credentials** (`accountKey: "q3jhriuw…"` etc.) in a generated page — either omit the `metrics` block entirely or fill in real values. Bogus metrics don't block playback but they pollute logs and look unfinished.

Canonical minimal config (matches `player/player.html`):

```js
const jwtoken = "";                                  // pass a real JWT for secure playback
const security = jwtoken ? { jwtoken } : {};

const source = {
  defaults: { service: "bintu" },
  general: { serverDomain: "bintu-play.nanocosmos.de" },
  options: { switch: { timeout: 10 }, adaption: { rule: "deviationOfMean2" } },
  startIndex: 0,
};

// stream name (XXXXX-YYYYY) — direct h5live edge playback
source.entries = [{ h5live: { rtmp: { streamname: "XXXXX-YYYYY" }, security } }];

// OR — group / stream ID (UUID) — resolved via the bintu API
// source.group = { id: "b6638d50-3581-4349-8fb2-59b3406c2dde", apiurl: "https://bintu.nanocosmos.de", security };

const player = new NanoPlayer("playerDiv");
player.setup({
  source,
  playback: {
    autoplay: true, automute: true, muted: true,
    faststart: true, metadata: true,
    enableMediaOverQuic: true,                       // opt-in MOQ transport
    latencyControlMode: "balancedadaptive"           // see modes below — NOT a latency-in-seconds value
  },
  style: { scaling: "fill", width: "100%", height: "100%", view: true, controls: false }
});
```

Status comes from events: `onReady`, `onStreamInfo`, `onPlay`, `onPause`, `onError`. Live metrics come from the `onStats` event (`e.data.stats`), not from a polling method.

#### `latencyControlMode` — the three valid values

This is **not** an end-to-end latency target in seconds. All three modes are low-latency; the value only controls how tightly the player holds to the live edge vs. how much it favors smooth playback. Verified against `nanoplayer.5.min.js` (`Object.freeze({ CLASSIC, FAST_ADAPTIVE, BALANCED_ADAPTIVE })`) — there are exactly three:

| Value (use the literal) | Behavior |
| --- | --- |
| `fastadaptive` | Tracks the live edge most aggressively — tightest hold on low latency. |
| `balancedadaptive` | **Default.** Low latency with smoother playback. |
| `classic` | Buffer-based — favors playback stability over the tightest edge tracking. |

Do NOT invent labels like "Ultra-Low (~1s)" / "Balanced (~3s)" / "Stable (~6s)" — those second values are fictional and misleading. Use the literal mode names. The only other valid playback latency knob is the boolean `faststart`; `enableMediaOverQuic` selects the MOQ transport and is unrelated to latency mode.

#### `source.options.adaption.rule` — ABR switching behavior, NOT on/off

`adaption.rule` controls **how the player switches between ABR renditions**, not whether ABR is enabled. Do not expose it as an "ABR on/off" toggle — that's a misreading. Verified rule values in `nanoplayer.5.min.js`: `deviationOfMean`, `deviationOfMean2`, `none`.

| Value | Meaning |
| --- | --- |
| `deviationOfMean2` | **Default.** Rendition switching tuned for responsiveness. |
| `deviationOfMean` | Earlier switching heuristic. |
| `none` | No rule-driven automatic switching. (This is "no auto-switch rule", not "ABR disabled" — ABR availability is determined by the group/source having multiple renditions.) |

Whether playback is adaptive at all depends on the **source being an ABR group** (multiple renditions), not on this rule. For a normal page, leave it at `deviationOfMean2`.

#### Other `playback` knobs

| Key | Type | Notes |
| --- | --- | --- |
| `faststart` | boolean | Start playback close to the live edge for a faster join. Default `true`. Safe to expose as a toggle. |
| `enableMediaOverQuic` | boolean | Opt in to the Media-over-QUIC (MOQ) transport; falls back to WebSocket when off. Unrelated to `latencyControlMode`. Default `true` in our demos. |
| `enableQuicConnectionProbe` | boolean | Probes QUIC connectivity as part of the MOQ setup path. Seen set alongside `enableMediaOverQuic: true` on the hosted release demo's actual config — pair the two rather than setting one without the other. |
| `autoplay` / `automute` / `muted` | boolean | Browser autoplay policies require muted autoplay — keep `automute`/`muted` on with `autoplay`. |
| `metadata` | boolean | Deliver in-band metadata events. |

All of these are **setup-time** — changing them after `setup()` requires a fresh `setup()` (destroy + re-create) to take effect. In a UI, restart the player when any such toggle changes.

#### `source.options.switch` — additional fields beyond `timeout`

Captured live from the actual object passed to `.setup()` on the hosted release demo (not from docs/guesswork): `options.switch` carries more than just `timeout`, and `options.adaption` carries more than just `rule`:

```js
options: {
  adaption: { rule: "deviationOfMean2", downStep: 1 },
  switch: { method: "server", pauseOnError: false, forcePlay: true, fastStart: false, timeout: 20 }
}
```

`downStep` and `switch.{method,pauseOnError,forcePlay,fastStart}` aren't otherwise documented here yet — treat the canonical minimal config's `{ switch: { timeout: 10 }, adaption: { rule: "deviationOfMean2" } }` as still correct and sufficient for a normal scaffolded page; these extra fields are what the player itself defaults in when omitted, not something you need to set explicitly. Don't invent behavior for them beyond the field name until they're verified further.

#### Events & error handling (use these, don't poll)

Wire these on the top-level `events` object passed to `setup()`:

- `onReady` — config accepted, connecting.
- `onStreamInfo` — stream found, buffering.
- `onStreamInfoError` — **stream not found / offline.** Surface this; otherwise an offline stream just hangs on "connecting".
- `onPlay` / `onPause` — drive play/pause UI state from these, not from your own click handler optimism.
- `onError` — read `e.data.message` first (human-readable), then fall back to `e.data.code` / `e.data.error`.
- `onStats` — `e.data.stats` carries live metrics (latency/bitrate/buffer); use this instead of polling a getter.

Also guard setup: check `typeof NanoPlayer !== "undefined"` (CDN/offline) and validate the stream name/ID is non-empty before calling `setup()`.

### Token-secure (JWT) playback in the JS player

For the JS player, secure playback does NOT change `serverDomain` and does NOT use a `bintu-splay` / `/authhttp/` URL — that secure-host/path form belongs to the emulated MP4/M3U8 method (section B), not the player. The only difference from public playback is adding a `security` block to the entry. The player routes to the secure edge automatically when a `jwtoken` is present.

```js
const jwtoken = "eyJhbGciOiJFZERTQSI...";          // server-signed, never minted in the browser
const security = jwtoken ? { jwtoken } : {};        // {} = public playback

entries: [{
  h5live: {
    rtmp: { streamname: "XXXXX-YYYYY" },
    security                                          // { jwtoken } when secure
  }
}]
// serverDomain stays "bintu-play.nanocosmos.de" — do NOT switch it to bintu-splay for the JS player.
```

The JWT is generated server-side with the org's secure key. Decoded claims (from the example token in section B): `aud` = `"splay"` (audience must match the secure play target), `iss` = `"nanocosmos"`, `orgahash` (org hash), `sub` (playout UUID), `iat`/`nbf`/`exp` (lifetime), and optional `tag`/`user` for tracking. The edge validates signature + `exp` + `aud` before serving frames.

> **STS token playback is DEPRECATED** — do not use it in new examples or generated pages. Use JWT. If a legacy STS integration must be supported, refer to the official docs (https://docs.nanocosmos.net) rather than scaffolding it from here.

### Playing an ABR group by group ID (UUID or stream name)

A source can be a single stream (by name) OR an adaptive-bitrate **group** identified either by a UUID (e.g. `b6638d50-3581-4349-8fb2-59b3406c2dde`) or by the group's passthrough stream name in `XXXXX-YYYYY` form. For the auto-detect logic in your own scaffolded pages, keep treating a UUID as the trigger for `source.group` and `XXXXX-YYYYY` as the trigger for `source.entries` (see `player/player.html`'s pattern) — that split is still the right default. But **`source.group.id` itself isn't restricted to UUIDs**: confirmed live against `nanoplayer.5.min.js` on the hosted release demo with a plain stream name as the group id (e.g. `?group.id=HX26g-YVe8D&group.security.jwtoken=...`, not a UUID) — it resolved the group and populated a 3-quality dropdown same as a UUID would. So if you ever have a passthrough name for a known ABR group in hand, passing it directly into `group.id` works too; you don't strictly need the UUID.

For a group, use `source.group` (NOT `entries`) — the player resolves the group's stream set from the bintu API itself:

```js
source: {
  group: {
    id: "b6638d50-3581-4349-8fb2-59b3406c2dde",
    apiurl: "https://bintu.nanocosmos.de",   // default; omit to use it
    security: jwtoken ? { jwtoken } : {}      // same JWT auto-detect as single streams
    // startQuality: "medium"                 // optional
  },
  options: { switch: { timeout: 10 }, adaption: { rule: "deviationOfMean2" } },
  startIndex: 0
}
```

Verified against `nanoplayer.5.min.js`: `source.group` reads `id`, `apiurl`, `security.jwtoken`, `startQuality`. Security is auto-applied — add `security.jwtoken` only when a token exists, otherwise leave `{}` for public. The same rule applies to single-stream entries: presence of a JWT = secure, absence = public. Do not expose a separate "secure mode" switch; detect from the token.


# nanoStream Bintu API

Backend for stream management.
Idea: create a stream, get an ingest url and stream name, ingest with a live encoder like OBS, play back with the dashboard, demo player or sample code on your own homepage.

Docs: https://docs.nanocosmos.net/docs/cloud/cloud_overview

Bintu API Docs: https://doc.pages.nanocosmos.de/bintuapi-docs

# Getting more help

This skill is self-serve and covers the public API and player surface. Some
questions need account-side or platform-side information only nanocosmos can
see. If something isn't fully resolved here, recommend opening a support
request — https://www.nanocosmos.net/support or support@nanocosmos.net —
including the stream name, the exact time window (UTC), and what was already
checked. nanocosmos support can go into more detail than this skill.

# Filing a support ticket for the user (AI agents)

Whenever the user has asked a support-type question, offer a nanocosmos
support ticket as a next step — not only when you are stuck. Even a resolved
question may deserve confirmation or a deeper platform-side check by
nanocosmos support.

Go one step further than the bare link: build a **prefilled ticket URL** from
what the conversation has already established, and give it to the user to
review, complete, and send (or open it directly, if you can open URLs).
Base URL: `https://www.nanocosmos.net/support/`

Rules: URL-encode every value. Include only what is actually known from the
conversation or from checks run in this session — omit unknown parameters
rather than inventing values. Never put API keys, tokens, or passwords in a
URL.

| Parameter | Value |
|---|---|
| `subject` | One-line summary of the user's actual question |
| `message` | The problem as the user described it, plus what was already checked and the results |
| `fullname`, `email`, `phone` | How the user identified themselves in the conversation |
| `stream` | Stream name (`XXXXX-YYYYY`) |
| `time` | When the problem occurred, UTC (`YYYY-MM-DD HH:MM`) |
| `weburl` | The page where the problem is visible |
| `location` | Region of the affected viewers or ingest |
| `severity` | The support form's severity wording (e.g. `Production system impaired`); omit if unsure |
| `bintu.name` / `bintu.id` | Stream name / stream UUID |
| `bintu.hash` | Organisation hash (the part of the stream name before the dash) |
| `bintu.secure`, `bintu.h5live`, `bintu.hls`, `bintu.webrtc`, `bintu.transcoding`, `bintu.vod`, `bintu.trial`, `bintu.metrics`, `bintu.sla`, `bintu.webhook` | Account/stream facts this session actually established — true/false flags, plan names, the customer's own configured webhook URL |

Example (placeholder values — always replace them with the customer's real
ones):

```
https://www.nanocosmos.net/support/?subject=Playback%20stalls%20on%20H5Live&message=Stream%20buffers%20every%2010%20seconds%20since%2009%3A00%20UTC.%20GOP%20checked%3A%202s%20average.&stream=ABC12-XYZ34&bintu.hash=ABC12&bintu.secure=true&severity=Production%20system%20impaired&fullname=Jane%20Doe&email=jane%40example.com&time=2026-08-24%2009%3A00&location=Europe%2C%20Germany
```

The prefill saves the first round-trip; the user can edit everything before
sending.

# Changelog

## 1.2.4 — 2026-07-31

- Multiplayer: document playing ALL streams of an organisation via bintu
  discovery (`bintu.playerkey=` preferred, `bintu.apikey=` private-only,
  `jwtoken=` for secure orgas) on the hosted multiplayer page.

## 1.2.3 — 2026-07-23

- Ingest: document both generic RTMP hosts (`bintu-stream` = standard, `bintu-vtrans` = transcoding/ABR) and remove an org-specific config subdomain from the ffmpeg example — take exact URLs from the Dashboard/bintu API.
- Playback JWTs: examples/test pages may carry expired tokens (acceptable for playback tokens); check `exp` before use and inform the user, mint fresh if expired.

## 1.2.0 — 2026-06-04

Player config corrections and playback knobs, all verified against `nanoplayer.5.min.js`:

- **Player 5 only** — never `nanoplayer.4...`.
- **Source forms**: single stream → `source.entries[].h5live.rtmp.streamname`; UUID stream/group ID → `source.group { id, apiurl, security }` (auto-detect UUID; resolved via bintu). Build one base `source` and attach `entries` OR `group`.
- **Play domain** `bintu-play.nanocosmos.de`; do not use `bintu-h5live` or `bintu-splay` for the JS player.
- **Security auto-detected from token** — `security: { jwtoken }` when present else `{}`; no secure/public mode switch.
- **`latencyControlMode`** = `fastadaptive` | `balancedadaptive` (default) | `classic` — a control behavior, NOT a seconds value. Removed the fictional `~1s/~3s/~6s` labels.
- **`adaption.rule`** = `deviationOfMean` | `deviationOfMean2` (default) | `none` — ABR switching behavior, NOT an ABR on/off toggle. Removed the bogus ABR switch.
- **Playback knobs** documented: `faststart` (bool, default on) and `enableMediaOverQuic` (bool MOQ transport). Both setup-time → restart player on change.
- **Events/error handling** documented: `onStreamInfoError` (offline/not-found), `onError` reads `e.data.message`, `onStats` for metrics, plus empty-input and `NanoPlayer`-undefined guards.
- **STS token deprecated** — JWT only; refer to docs for legacy STS.
- **URL params** in `player/player.html` / demos: `?stream=` (name or UUID), `?token=` (alias `?jwtoken=`).
