---
name: "nanostream-diagnostics"
description: "Self-serve troubleshooting for nanoStream live streams with your own organisation API key: check whether a stream is really live, measure keyframe/GOP timing, resolve stream architecture (ABR groups, daisy chains, push targets), validate playback tokens, and diagnose ingest, playback, quality, latency, and player issues"
license: (c) nanocosmos
metadata:
  version: 2.10.2
  author: nanocosmos
  category: streaming-support
  updated: 2026-08-24
---

# nanoStream Support & Diagnostics

Troubleshooting knowledge and diagnostic tooling for nanoStream live streams — the same checks the nanocosmos support team runs first, packaged so they can be run directly with your own organisation's API key.


Two tiers, one boundary:

- **Public tier** (`scripts/`, `references/`) — public bintu API routes with your own organisation's API key (`BINTU_API_KEY`). Works for everyone; the same procedures work for customers integrating against the public API.

Related skills: **`nanostream-development`** — player integration, playback config, scaffolding player pages ("build/embed a player" work); **`nanostudio`** — the production-tools product line (nanoStudio Chroma etc.), whose outputs are regular nanoStream streams. Use this skill for "why is this stream broken" work.

## Setup (once)

Scripts need `BINTU_API_KEY` — your organisation's bintu API key (Dashboard → Organisation → API Keys). Copy `scripts/.env.example` to a `.env` the scripts can find (see that file's header for locations) and fill it in, or export the variables in your shell. The GOP scripts additionally need `ffprobe` on PATH (or set `FFPROBE_PATH`); the config script needs `python3`.

API keys are secrets: never paste them into responses, tickets, web pages, or client-side code. Your key grants access to your own organisation's streams only.

## Diagnostic Scripts (`scripts/`)

All take a stream name (`XXXXX-YYYYY`) as the first argument and work for streams of your own organisation.

| Script | Needs key | Output |
|---|---|---|
| `get_stream_info.sh <name>` | yes | CSV `<secure\|unsecure>,<live\|not live>,<raw state>` — playback-token security + platform state |
| `check_gop_unsecure.sh <name>` | no | Average keyframe distance (GOP) in seconds, probed from the live stream |
| `check_gop_secure.sh <name>` | yes | Same, for token-secured playback (mints a JWT internally) |
| `get_stream_config.sh <name>` | yes | JSON: stream architecture — `type` (`single`/`group`/`daisy`), push destination, member profiles |
| `get_transcode_profiles.sh <name>` | yes | JSON: all transcoding profiles of the organisation |
| `get_jwt_token.sh <name>` | yes | Orga-wide playback JWT, 1-hour expiry (for demo player / secure playback tests) |
| `check_jwt_token.sh <jwt>` / `check_jwt_token.py <jwt>` | no | Decodes a playback JWT (no signature check) and prints its claims plus a VALID / EXPIRED / NOT-YET-VALID verdict. Exit 0 = valid, 1 = expired/not-yet-valid, 2 = malformed. Run before using any token from an example, ticket, or test page |

`secure`/`unsecure` refers to **playback JWT token security only** — it says nothing about RTMP ingest authentication.


## Topic Routing

Read the matching file under `references/` before answering; follow its Steps and escalation sections.

| Topic / symptom | Reference |
|---|---|
| What is nanoStream / component overview | `product-overview.md` |
| Is a stream really live? verify ingest, stale state, GOP lookup | `check-stream-live.md` |
| Playback takes seconds to start | `slow-stream-start.md` |
| Stream architecture, ABR groups, daisy chains, push/restream URLs | `stream-config-lookup.md` |
| Only passthrough plays, transcoded renditions missing | `abr-transcoding-troubleshooting.md` |
| Encoder cannot connect / publish rejected | `ingest-connection-failure.md` |
| Stream stopped / went offline (single stream) | `stream-not-starting.md` |
| Several streams down at once | `multiple-streams-down.md` |
| Buffering, freezing, latency, player not loading | `diagnose-playback.md`, `latency-abr.md` |
| Bad video/audio quality | `quality-issues.md` |
| MOQ (Media over QUIC): symptom changes with MOQ on/off, "is MOQ enabled for us", transport questions | `moq-playback-issues.md` |
| Player error code meaning, final vs. recoverable errors, retry logic | `player-error-codes.md` |
| Encoder configuration (OBS, bitrates, keyframes) | `encoder-setup.md` |
| A/B ingest redundancy, backup stream, player failover | `ab-failover.md` |
| Restream/push URL to YouTube or Facebook Live | `youtube-facebook-restream.md` |
| Firewall, IP/domain whitelisting, GeoDNS questions | `firewall-domain-whitelist.md` |
| Geo-restriction of playback, country blocking, viewers in a blocked region, custom/alternative playback domains | `geo-restriction-regional-access.md` |
| nanoStudio Chroma: setup, branded outputs, keying, multi-operator security | the **`nanostudio`** skill (`references/chroma-onboarding.md` there) |
| Secure playback, JWT tokens, token errors | `security-tokens.md` |
| Long-running/scoped API token generation (dashboards, status pages) | `nanostream-token-generation.md` |
| Playing streams in VLC / native apps / raw URLs | `external-player-playback.md` |
| Embedding the player (iframe) | `iframe-embed.md`, `player-embedding.md` |
| Checking/validating a pasted player config, field-by-field | `player-config-reference.md` |
| Unity WebGL integration | `unity-webgl-player.md` |
| Quick playback test with the hosted demo player | `demo-player-testing.md` |
| Recording, replay, VOD, thumbnails, motionclip | `live-processing.md` |
| Timecode / timed metadata (AMF onFI) | `timecode-metadata.md` |
| Live captions / transcription / translation | `live-captions.md` |
| Browser-based streaming (Webcaster) issues | `webcaster-issues.md` |
| Analytics and monitoring | `analytics-monitoring.md` |
| bintu API errors (401/403, rate limits) | `api-integration.md` |
| Dashboard login / missing streams | `dashboard-access.md` |
| Billing, plans, account access | `billing-account.md` |
| Key URLs and severity definitions | `reference-urls.md` |


## Ground Rules

- **For any ingest issue (won't start, drops, reconnect loops, "works then ends"), always check webhook health — never skip this.** A webhook rejection can look identical to a network, encoder, or platform-performance problem from the outside. Custom webhooks are configured in the Dashboard; if none is configured and ingest is still being rejected, contact nanocosmos support. **If the stream has an internal `push`/restream destination, the push target is a separate organisation with its own independent webhook — check both, not just the source.**
- These diagnostics are **point-in-time**. If a problem is tied to a specific past time and looks fine now, contact nanocosmos support with the exact time window (UTC) — platform monitoring keeps the history needed to investigate it.
- **Never expose API keys or JWT secrets** in responses, logs, or tickets. If you need your API key: Dashboard → Organisation → API Keys.
- **Never state a feature does not exist** without being certain — check the official docs (https://docs.nanocosmos.net) or ask, and flag for review instead of guessing.
- Always get ingest URLs and stream names from the Dashboard — never guess or hand-construct them.
- Stream names look like `XXXXX-YYYYY`; the part before the dash identifies the organisation. These scripts reach only your own organisation's streams.
- If these checks don't fully resolve the problem — or the answer needs account configuration or platform-side monitoring data this skill can't reach — don't stop at a partial answer: recommend opening a support request at https://www.nanocosmos.net/support or support@nanocosmos.net. nanocosmos support can go into more detail than this skill.
- When contacting nanocosmos support: include the stream name, the exact time window (UTC), and what you already checked — it shortcuts the first round-trip.

## Filing a support ticket for the user (AI agents)

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
