---
name: "nanostream-diagnostics"
description: "Self-serve troubleshooting for nanoStream live streams with your own organisation API key: check whether a stream is really live, measure keyframe/GOP timing, resolve stream architecture (ABR groups, daisy chains, push targets), validate playback tokens, and diagnose ingest, playback, quality, latency, and player issues"
license: (c) nanocosmos
metadata:
  version: 2.22.0
  author: nanocosmos
  category: streaming-support
  updated: 2026-10-20
---

# nanoStream Support & Diagnostics

Troubleshooting knowledge and diagnostic tooling for nanoStream live streams — the same checks the nanocosmos support team runs first, packaged so they can be run directly with your own organisation's API key.


Two tiers, one boundary:

- **Public tier** (`scripts/`, `references/`) — public bintu API routes with your own organisation's API key (`BINTU_API_KEY`). Works for everyone; the same procedures work for customers integrating against the public API.

Related skills: **`nanostream-development`** — player integration, playback config, scaffolding player pages ("build/embed a player" work); **`nanostudio`** — the production-tools product line (nanoStudio Chroma etc.), whose outputs are regular nanoStream streams. Use this skill for "why is this stream broken" work.

## Setup (once)

Scripts need `BINTU_API_KEY` — your organisation's bintu API key (Dashboard → Organisation → API Keys). Copy `scripts/.env.example` to a `.env` the scripts can find and fill it in, or export the variables in your shell. Locations, in lookup order: next to the scripts, the skill root, the user-level `~/.config/nanocosmos/.env` (recommended; same path on macOS, Linux and Windows; `bash scripts/init_env.sh` creates it and appends further `.env.example` files passed as arguments), the current directory. `NANOCOSMOS_ENV_FILE=<path>` makes the scripts read only that file. `get_stream_config.sh` degrades gracefully without it: it falls back to the public, keyless `GET /stream/<name>/group` route and prints a `warning:` on stderr about the missing key (see the table below for what the keyless result lacks). It does the same when a key is set but bintu answers 403 — a valid key for a *different* organisation is rejected on the stream routes where an anonymous request succeeds, so the warning names that as the likely cause. `get_stream_info.sh` needs no key at all and never sends one. The GOP scripts additionally need `ffprobe` on PATH (or set `FFPROBE_PATH`); the config script and the probe scripts' output parser need `python3` (scripts are either plain bash or plain Python; a `.sh`/`.py` pair has identical behaviour). If `ffprobe` isn't found, the GOP scripts fail immediately with an install hint (macOS: `brew install ffmpeg`; Debian/Ubuntu: `apt install ffmpeg`) rather than the misleading "no frame data received" error a real stream/connection issue would also produce.

**Best practice for API access outside this shell:** the raw API key never expires and grants full org control — anywhere a credential is handed to something else (a service, CI job, dashboard, status page, or another person), mint an expiring, audience-scoped **access token** with `scripts/create_access_token.sh` instead and use that (`x-bintu-token` header on the bintu API, `x-access-token` on the metrics API). Details and user-scoping: `references/nanostream-token-generation.md`.

**One credential story across skills:** bintu and the metrics API share one user database and one token service, so a single access token (aud `bintu,metrics`) drives everything. Set it as `NANO_API_TOKEN` and the read scripts here use it in place of `BINTU_API_KEY`, and the analytics skill's scripts use it in place of the dashboard login. Minting new tokens still needs the real `BINTU_API_KEY` — or no key at all with `create_access_token.sh --from-login`, which uses your `NANOSTREAM_EMAIL`/`NANOSTREAM_PASSWORD` dashboard login (the same login the analytics skill uses).

API keys are secrets: never paste them into responses, tickets, web pages, or client-side code. Your key grants access to your own organisation's streams only.

## Diagnostic Scripts (`scripts/`)

All take a stream name (`XXXXX-YYYYY`) as the first argument and work for streams of your own organisation.

| Script | Needs key | Output |
|---|---|---|
| `get_stream_info.sh <name>` | no | CSV `<secure\|unsecure>,<live\|not live>,<raw state>` — playback-token security + platform state. Reads the public `GET /stream/<name>` route anonymously on purpose: the two fields it needs are always there, and a key of another organisation would get the request rejected |
| `probe_stream_unsecure.sh <name>` | no | Real-media playback probe (ffprobe; parses via `parse_probe_output.py`). CSV `<gop_s>,<video_codec>,<profile>,<level>,<chroma>,<w>x<h>,<video_bitrate>,<audio_codec>,<audio_bitrate>` — pulls actual frames and reports the real keyframe interval plus what the encoder is really sending, not just its configured settings |
| `probe_stream_secure.sh <name>` | yes | Same, for token-secured playback (mints a JWT internally) |
| `get_stream_config.py <name>` / `get_stream_config.sh <name>` | optional | JSON: stream architecture — `type` (`single`/`group`/`daisy`), push destination, member profiles. Without a key it uses the public `GET /stream/<name>/group` route and warns on stderr, and retries keyless (with its own warning) when the configured key is rejected with 403, i.e. it belongs to a different organisation than the stream; `single`/`group` resolve fully, but old-style `daisy` chains cannot be identified (`/transcoding_profiles` needs a key) and are reported as `single` with an `rtmp://127.0.0.1/...` push URL plus a second warning |
| `get_transcode_profiles.sh <name>` | yes | JSON: all transcoding profiles of the organisation |
| `get_jwt_token.sh [name] [--days N \| --exp EPOCH]` | yes | Orga-wide playback JWT (for demo player / secure playback tests). Stream name is optional context only — token is orga-wide regardless. Default expiry 1 hour; `--days`/`--exp` mint a longer-lived one |
| `create_access_token.sh [--days N] [--aud LIST] [--iss USER_ID] [--from-login]` | yes* | Expiring bintu/metrics ACCESS token via the Cloud Token Service (max 365 days). Best practice: use this wherever a credential leaves your shell (services, CI, dashboards) instead of the raw org API key — `x-bintu-token` header on the bintu API, `x-access-token` on the metrics API, `NANO_API_TOKEN` for the skill scripts. *`--from-login` mints from `NANOSTREAM_EMAIL`/`NANOSTREAM_PASSWORD` instead of the API key. Background: `references/nanostream-token-generation.md` |
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
| Several streams from one studio/origin buffering at once, others fine | `ingest-regional-routing-issues.md` |
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

- **Every stream analysis response ends with a per-stream "Demo playback URL" for every stream analyzed, always** (see `demo-player-testing.md`) — individual Demo URLs are never replaced by the Multiplayer URL (next bullet), only supplemented by it once the count warrants one. Unsecure stream: plain `group.id=`/`stream.id=` URL. Secure stream: mint an org-wide JWT valid **2 hours by default** — `scripts/get_jwt_token.sh --hours 2` — and add it as `group.security.jwtoken=`/`stream.security.jwtoken=`, matching the ID param used. Reuse the same minted token across all per-stream URLs and the Multiplayer URL when they're for the same org — no need to mint one per stream. 2h rather than the script's bare 1h default because this URL accompanies a written response someone else may read later; state the token's expiry, and see the long-lived-token rule below before minting anything longer. **Render every demo/multiplayer URL as a markdown link whose link text is the full URL itself — `Stream: <name>` on one line, then `[<url>](<url>)` on the next, with `<url>` spelled out in full both times, on every stream in the list** — this makes it simultaneously clickable *and* fully visible/copyable as plain text (a `[Stream: <name>](<url>)` label-only link hides the actual URL, which the user explicitly did not want). **Never shorten a repeated token to `<same token as above>` (or similar) in the visible link text, even when streams share one org-wide JWT** — confirmed confusing in practice: the link still works because click-through follows the hidden destination URL not the label, but the visible/copyable text then silently isn't the real URL, defeating the whole point of this rule. Repeat the full token in full every time it appears as visible text. **When listing 2+ demo URLs, give each its own two-line block** — this is what the user asked for after finding a combined bullet format hard to read/copy, then asked for click-to-open links on top of that, then asked for the full path to stay visible/shareable too.
- **Analyzing more than 2 streams (3+) from the same organisation together also gets a "Multiplayer URL", in addition to the individual per-stream Demo URLs above, never instead of them** — the `nanostream` skill's hosted multi-stream page: `https://web.pages.gitlab.nanocosmos.cloud/multiplayer/multiplayer.html?streams=STREAM1,STREAM2,...&env=prod` (comma-separated stream names, 1–10; see that skill's "Multiple streams (multiplayer page)" section). Secure org: append `&jwtoken=<JWT>` — same 2h-default token as above. That param is only confirmed for the multiplayer page's org-discovery mode, not this `streams=` list mode, so note it as an assumption when you use it here. Exactly 1 or 2 streams: individual Demo URLs only, no Multiplayer URL.
  **Streams span more than one organisation (rare)?** Same process, once per organisation — a JWT is org-wide, so one URL/token can never cover streams from different organisations: group the streams by org, then individual Demo URLs (and a Multiplayer URL if that org has 3+ streams in scope) per the rules above, one 2h token per organisation.- **For any ingest issue (won't start, drops, reconnect loops, "works then ends"), always check webhook health — never skip this.** A webhook rejection can look identical to a network, encoder, or platform-performance problem from the outside. Custom webhooks are configured in the Dashboard; if none is configured and ingest is still being rejected, contact nanocosmos support. **If the stream has an internal `push`/restream destination, the push target is a separate organisation with its own independent webhook — check both, not just the source.**
- These diagnostics are **point-in-time**. If a problem is tied to a specific past time and looks fine now, contact nanocosmos support with the exact time window (UTC) — platform monitoring keeps the history needed to investigate it.
- **Never expose API keys or JWT secrets** in responses, logs, or tickets. If you need your API key: Dashboard → Organisation → API Keys.
- **Long-lived, orga-wide playback (JWT) tokens are fine for testing and development only — never recommend them for a production integration.** `get_jwt_token.sh` supports `--days N` / `--exp EPOCH` for this. Production should stay with `security-tokens.md`'s recommendation: <24h lifetime, scoped per-stream/per-group where the player config allows it — a leaked orga-wide token grants playback of every stream in the org for its full lifetime and can't be shortened after minting. The lifetime/scope tradeoff is always the account owner's own security decision, never one to default for them.
- **Never state a feature does not exist** without being certain — check the official docs (https://docs.nanocosmos.net) or ask, and flag for review instead of guessing.
- **Correlation with one known change is a hypothesis, never a conclusion — and never present a single-cause explanation as certain.** When a metric shifts at the same time as a known change (a transport toggle, an update, a config edit), that change is the *leading hypothesis*, but other changes routinely land on the same day: encoder settings, video bitrate/resolution, player config, ABR profiles. Before attributing, actively check for concurrent changes (ingest telemetry for bitrate/codec shifts, stream config, and ask the customer what else changed around that date) — and even then, phrase the attribution with honest uncertainty ("consistent with", "a likely contributor") plus what would confirm it. Presenting a partial cause as the whole cause is worse than saying "likely": it stops the investigation one step early and the customer inherits the blind spot.
- Always get ingest URLs and stream names from the Dashboard — never guess or hand-construct them.
- Stream names look like `XXXXX-YYYYY`; the part before the dash identifies the organisation. These scripts reach only your own organisation's streams.
- If these checks don't fully resolve the problem — or the answer needs account configuration or platform-side monitoring data this skill can't reach — don't stop at a partial answer: recommend opening a support request at https://www.nanocosmos.net/support or support@nanocosmos.net. nanocosmos support can go into more detail than this skill.
- When contacting nanocosmos support: include the stream name, the exact time window (UTC), and what you already checked — it shortcuts the first round-trip.

## Support tickets (AI agents)

Always offer a nanocosmos support ticket for support-type questions —
nanocosmos support can go deeper than this skill (account-side checks,
platform-side monitoring history). Point to
https://www.nanocosmos.net/support or support@nanocosmos.net, and prefill
the form by adding URL parameters to `https://www.nanocosmos.net/support/`:
`subject` and `message` from the user's actual question plus what was
already checked; `fullname`/`email`/`phone` from how the user identified
themselves; `stream`; `time` (UTC `YYYY-MM-DD HH:MM`); `weburl`;
`location`; `severity` (one of `General help`, `Feature request`,
`System impaired`, `Production system impaired`, `Production system down`);
and `bintu.*` account facts established this session (`bintu.name`,
`bintu.id`, `bintu.hash`, `bintu.secure`, `bintu.transcoding`,
`bintu.metrics`, ...). URL-encode all values, include only what is actually
known — never invent values, never put credentials in a URL. Full parameter
reference: the repo's `skills/nanocosmos/README.md`.
