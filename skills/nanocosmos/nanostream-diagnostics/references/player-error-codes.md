---
id: player-error-codes
audience: customer
category: player
triggers:
  - error code
  - player error
  - error 1005
  - error 1009
  - error 2001
  - error 2002
  - error 2003
  - error 2004
  - error 3003
  - error 4001
  - error 4106
  - error 4901
  - error 4903
  - error 5004
  - onError
  - which errors are recoverable
  - final error
  - retry error
  - player.destroy
  - when to replay vs destroy
  - onPause reason
severity_default: LOW
---

## nanoPlayer Error Codes — Meaning and Handling

### When to Use

A customer reports a specific nanoPlayer/H5Live error code from the `onError` event or the browser console, asks which error codes are final versus recoverable, or wants guidance on building their own retry/replay logic around the player.

Full official reference: https://docs.nanocosmos.net/docs/nanoplayer/nanoplayer_api_errors — always the authoritative source for a code not covered below; this file covers the codes that actually come up in support, with meaning and handling merged into one lookup.

### Error code ranges (orientation only)

| Range | Category |
|---|---|
| 1000–1999 | Player errors (playback state, browser policies) |
| 2000–2999 | Stream errors (source stream availability) |
| 3000–3999 | Media errors (decoding, MSE/HLS in the browser) |
| 4000–4999 | Network/connection errors; 49xx = security/token errors |
| 5000–5999 | Setup errors (configuration, browser capability); 52xx = metrics config |

**These ranges group codes by subsystem, not by final-vs-recoverable.** A code sitting in the "network errors" range doesn't mean it's final, and a code needing a longer backoff isn't automatically less serious than one in a different range — use the categorized tables below to decide actual handling, not the range alone.

### First: how the player already reacts, before your code sees `onError`

`onError` only fires **after** the player's own internal recovery has already tried and given up — `playback.reconnect.maxRetries` (default 10) for connection issues, `playback.mediaErrorRecoveries` (default 3 attempts per rolling 60s) for media/decode issues. Many reconnect events never reach `onError` at all — they surface as `onWarning` plus an `onPause` with `reason: 'reconnectionimminent'` while the player recovers silently. This has two consequences:
- **Never replay immediately from inside the `onError` handler for `3xxx`/`4xxx` codes** — the player already tried the fast internal recovery paths for those; an immediate app-level replay just races the player's own reconnect attempt.
- A code reaching your `onError` handler at all already means the *cheap* automatic recovery is exhausted — what's left is either a genuinely final condition, or a case for your own longer-delay backoff, not "no problem, ignore it."

**Recommended integration pattern:**
- Don't replay from inside `onError` — just store `data.code`/`data.message` to decide what to do next.
- Decide in the `onPause` handler: when `reason !== 'normal'`, use the stored error code to pick the right bucket below.
- Reset your own retry counter in `onPlay`, and also in `onSwitchStreamSuccess` and `onUpdateSourceSuccess`.
- Cap consecutive replay attempts and increase the delay between them (max attempts + backoff) rather than looping indefinitely.

### Not recoverable → `player.destroy()`

Config, setup, access, and codec errors — these genuinely need a fix on the integrator's side (config, token, browser), not a retry:

| Code | Meaning |
|---|---|
| `1001`, `1002`, `1003` | RTMP URL, server, or config missing |
| `1010` | Invalid stream entry index |
| `3004` | Audio/video codec not supported — won't change for the same stream |
| `4001` | **Only** when the message is `SyntaxError: Failed to construct 'WebSocket'` — a malformed URL. The same code `4001` with a different message is recoverable instead — see below. |
| `4400`, `4401` | Bad request, playback access rejected |
| `4900`–`4904` | Security service — token invalid or expired |
| `5001`–`5010` | Setup errors (config/embedding bug) |
| `5201`–`5208` | Metrics config errors |

- `5002` (browser not supported) — retrying is meaningless, that browser will never work.
- `5101` (stream not live) is the one exception worth calling out separately: it allows a **new** `setup()` later once the stream goes live, unlike the rest of this bucket.
- Security errors (`4900`–`4904`, including `4901`/`4903`) need a **fresh token/URL** from the backend before any retry is meaningful — retrying with the same expired/invalid token just fails again.

### Conditionally recoverable — not a connectivity problem, needs a specific trigger

| Code | Meaning | Handling |
|---|---|---|
| `1005` | Playback must be initialized by a user gesture (autoplay blocked; also iOS Low Power Mode) | Prompt for a click/tap/slide, call `player.play()` from inside that interaction handler |
| `1007` | Playback suspended by an external reason (mobile OS/browser interruption) | Wait, then `player.play()` — not an immediate replay |
| `1009` | Player was in visibility state `'hidden'` at load start (backgrounded tab) | Track `document.visibilityState`; replay on `visibilitychange` |

**Note:** these three are *not* final — they don't need `player.destroy()`, just a different trigger than a blind retry.

### No action required

| Code | Meaning | Why |
|---|---|---|
| `4xxx` with `onPause` reason `reconnectionimminent` | Reconnect already in progress | Handled internally — surfaces as `onWarning`, not `onError` |
| `1004` | Pause while not playing | No impact |
| `1006`, `4004` | Buffer or reconnect config invalid | Player falls back to defaults, playback continues |
| `2011`–`2014` | Metadata problems | Playback itself not affected |

### Recoverable — replay with backoff (`player.play()`, longer delay for `3xxx`/`4xxx`)

| Code | Meaning |
|---|---|
| `2001`–`2005` | Stream not found, stopped, no media, or not enough data received — replay **immediately**, then back off if it keeps recurring |
| `1008` | Playback error, mainly iOS — longer delay |
| `3001`–`3005`, `3100`–`3102`, `3200`, `3201` | Media, decode, and buffer errors — longer delay (the player's own `mediaErrorRecoveries` already tried first) |
| `4001`, `4002`, `4003` | Connection failed / reconnect gave up — longer delay |
| `4005`, `4006` | Source stream stopped, or a source-switch (`updateSource`/`switchStream`) timed out — longer delay |
| `4101`–`4115`, `4201` | WebSocket/transport errors — longer delay |
| `4500`, `4503` | Server error / service unavailable — longer delay |

Notes:
- The longer delay for `3xxx`/`4xxx` is specifically because the player already retried internally before surfacing the error — see "how the player already reacts" above.
- `4003` is documented but rarely seen in practice — a genuinely exhausted reconnect usually still reports as `4001` or `4002`.
- After max attempts, stop and show "stream not available" with an optional manual retry button rather than retrying forever.

### Customer Response Guidance
- Translate the code into its plain meaning first, then give the one action that follows from it — most "player error" tickets are actually ingest (2xxx), token (49xx), or embedding-config (5xxx) issues wearing a player error code.
- For an integrator building their own retry logic, lead with the "how the player already reacts" pattern above (don't replay in `onError`, decide in `onPause`, reset the counter in `onPlay`) before walking through individual codes — most confusion in practice is about *when* to replay, not what any single code means.
- `1005`/`1007`/`1009` are not failures needing a fix — say so explicitly if a customer is treating them as errors to eliminate; they need a different trigger (user gesture / visibility change), not different config.
- For codes not listed here, point to the official reference page rather than guessing: https://docs.nanocosmos.net/docs/nanoplayer/nanoplayer_api_errors


### Contact nanocosmos support when

- A security error (`4900`–`4904`) persists after the token has been regenerated and validated.
- `4001`/`4002`/`4003` or `4101`–`4115` affects many viewers of a live stream at the same time (possible delivery-side incident).
- Recoverable media errors (`3xxx`) recur continuously on a stream — likely a source encoding problem needing an ingest-side check.
- The reported code is not documented on the official error page.
