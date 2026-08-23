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
severity_default: LOW
---

## nanoPlayer Error Codes — Meaning and Handling

### When to Use

A customer reports a specific nanoPlayer/H5Live error code from the `onError` event or the browser console, or asks which error codes are final versus recoverable (e.g. to build their own retry logic around the player).

Full official reference: https://docs.nanocosmos.net/docs/nanoplayer/nanoplayer_api_errors — always the authoritative source; this file covers the codes that actually come up in support and how to act on each.

### Error code ranges

| Range | Category |
|---|---|
| 1000–1999 | Player errors (playback state, browser policies) |
| 2000–2999 | Stream errors (source stream availability) |
| 3000–3999 | Media errors (decoding, MSE/HLS in the browser) |
| 4000–4999 | Network errors; 49xx = security/token errors |
| 5000–5999 | Setup errors (configuration, browser capability) |

### Common codes and what to do

| Code | Meaning | First action |
|---|---|---|
| 1005 | Playback must be initialized by user gesture (autoplay blocked, also iOS Low Power Mode) | Start playback muted or from a user click — a browser policy, not a stream problem |
| 1007 | Playback suspended by external reason (mobile OS/browser interruption) | Non-critical; resume when the interruption ends |
| 1008 | Playback error on iOS | Recoverable — the player's media error recovery handles it automatically |
| 1009 | Playback failed because the player was hidden (background tab) at load start | Load/start the player only while visible; resume on visibility change instead of blind retries |
| 2001 | The requested stream cannot be found | Check the stream is actually live and the stream name is correct — see `stream-not-starting` / `check-stream-live` |
| 2002 | No media available — the running stream stopped delivering data | Check ingest: the encoder side stopped or lost connection — see `ingest-connection-failure` |
| 2003 | Stream connected but not enough media data received | Usually an ingest/encoder output problem — verify the encoder is sending audio+video |
| 2004 | The source stream has been stopped (unpublished during playback) | Expected when the broadcast ends; if unexpected, investigate why ingest stopped |
| 3003 / 3005 / 3100 / 3101 | Media decode / HLS / MSE errors in the browser | Recoverable — auto-recovery retries them (see below); persistent recurrence points to a source encoding issue, see `quality-issues` |
| 4001 | Could not open connection (timeout; WebSocket unavailable) | Check firewall/proxy — see `firewall-domain-whitelist`; retry with backoff is reasonable |
| 4006 | Source switch (`updateSource`/`switchStream`) aborted by timeout | Retry the switch; check the target stream is live |
| 4106 | Connection failed — no network, wrong URL, or server unreachable; reconnect possible | The player reconnects automatically; persistent 4106 across viewers → escalate |
| 4901 | Security service denied access — authentication token invalid | Token problem, not a stream problem — see `security-tokens` (token contents, stream scope) |
| 4903 | Security service denied access — URL expired or token parameter missing | Regenerate the token; check expiry and required parameters — see `security-tokens` |
| 5001 | JavaScript error during setup (often undefined references in the embedding page's code) | Debug the integration code around `setup()`, not the stream |
| 5002 | Browser does not fully support HTML5/H5Live | Unsupported/very old browser — final for that browser |
| 5004 | Player source configuration malformed or missing | Fix the config: `source`, `group.id`, or stream name is bad/absent — see `player-embedding` |

### Which errors are final vs. recoverable

This is the distinction integrators need for their own retry logic:

- **Auto-recovered by the player — do not build extra retries around them:** media errors 1008, 3003, 3005, 3100, 3101 (built-in media error recovery, controlled by the `mediaErrorRecoveries` config, default 3 recoveries per rolling 60 s) and network errors including 4106 (built-in reconnection workflow).
- **Final — do NOT blind-retry:** autoplay/visibility policy errors (1005, 1007, 1009 — resolve the user-gesture/visibility condition instead), security errors (4901, 4903 and the 49xx range — fix the token instead), and setup errors (5001–5010 — fix the configuration instead).
- **Everything else:** retrying is acceptable with rate limiting and exponential backoff. For stream errors (2001–2004) the sensible retry trigger is the stream becoming live again, not a timer.

### Customer Response Guidance

- Translate the code into its plain meaning first, then give the one action that follows from it — most "player error" tickets are actually ingest (2xxx), token (49xx), or embedding-config (5004) issues wearing a player error code.
- For codes not listed here, point to the official reference page rather than guessing: https://docs.nanocosmos.net/docs/nanoplayer/nanoplayer_api_errors


### Contact nanocosmos support when

- A security error (4901/4903) persists after the token has been regenerated and validated
- 4106/4001 affects many viewers of a live stream at the same time (possible delivery-side incident)
- Recoverable media errors (3xxx) recur continuously on a stream — likely a source encoding problem needing an ingest-side check
- The reported code is not documented on the official error page
