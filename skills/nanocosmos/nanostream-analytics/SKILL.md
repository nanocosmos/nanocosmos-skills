---
name: "nanostream-analytics"
description: "Query your own nanoStream Analytics metrics via the Analytics API v2 with your Analytics dashboard account: playtime, buffering ratio, latency, startup time, concurrent viewers, playback start success and errors, ingest monitoring (bitrate, SRT, RTMP, frame delay), byte usage, world-map breakdowns, alerts and Live Captions usage. Read-only — authenticates with ANALYTICS_EMAIL/ANALYTICS_PASSWORD (your dashboard login) or an expiring access token (NANO_API_TOKEN, recommended for services)."
license: (c) nanocosmos
metadata:
  version: 1.2.0
  author: nanocosmos
  category: analytics
  updated: 2026-08-25
---

# nanoStream Analytics API

Programmatic, read-only access to nanoStream Cloud Analytics — pull metrics
directly instead of clicking through the dashboard. Covers the Analytics API
v2 at `https://metrics-api.nanostream.cloud`. A customer account is scoped to
its own organisation; every query returns that organisation's data only.

**Read-only by construction.** The scripts issue GET requests only, and
`query.sh` refuses the alert-notification write routes even if the credential
would permit them — a mistaken change there can silently stop alert delivery
for the whole organisation. Use a read-only Analytics account.

Some routes require higher plan tiers and return HTTP 403 (error code
`E5002`) on lower plans; a few others are only available to the Analytics
dashboard itself (`E5003`). Neither is a token problem — the scripts say so
when it happens.


## Setup (once)

The Analytics API has **no API key**. It authenticates with the credentials of
an Analytics dashboard account (`https://metrics.nanostream.cloud`) and returns
a short-lived JWT sent as the `x-access-token` header.

Copy `scripts/.env.example` to `.env` and fill in `ANALYTICS_EMAIL` and
`ANALYTICS_PASSWORD` — your Analytics dashboard login — or export them in
your shell. **Never commit a `.env`.**

**Recommended best practice — access tokens:** instead of (or in addition to)
the login, `NANO_API_TOKEN` can hold an expiring access token minted via the
Cloud Token Service (`POST https://token.nanostream.cloud/bintu/token`; the
`aud` array must include `metrics`; up to 365 days). All scripts here accept
it and it takes precedence over email/password. Prefer it wherever the
credential leaves your shell — a service, CI job, or dashboard — since it
expires and carries no login.

**Long-lived token (frequent question):** `/authenticate` always returns a
24-hour token and ignores expiry fields. For a longer lifetime, mint the token
with the Cloud Token Service as above (`exp` up to 365 days).
With `aud: ["bintu","metrics"]` one token drives both APIs:
`x-bintu-token` header for bintu, `x-access-token` for Analytics.

The Analytics login is the same account as the bintu dashboard (one shared
user database), and the same access token also drives the bintu API —
`NANOSTREAM_EMAIL`/`NANOSTREAM_PASSWORD` are accepted as unified aliases for
`ANALYTICS_EMAIL`/`ANALYTICS_PASSWORD`.


Because this is an account password rather than a scoped key: use a read-only
account, do not reuse a password from anywhere else, and never paste
credentials or tokens into responses, tickets, or client-side code.

`scripts/get_token.sh` handles the token lifecycle — it caches the JWT in a
0600 file under `$TMPDIR` and refreshes it automatically shortly before expiry.
You should not need to call it directly.

## Scripts

| Script | Purpose |
|---|---|
| `scripts/query.sh <path> [key=value ...]` | Authenticated GET against any `/v2/...` read route. Repeat a key for array filters. Exits `3` when the API reports no data. |
| `scripts/describe_endpoint.sh <path\|substring\|--list> [--example]` | Parameters, descriptions **and response shape** of any route, read from the bundled spec. No network, no credentials. |
| `scripts/get_token.sh [--refresh]` | Prints a valid JWT, cached until shortly before expiry. Called automatically by `query.sh`. |
| `scripts/whoami.sh` | Which account, which organisation, access level, token TTL. Run it first when a figure will be quoted. |
| `scripts/env.sh` | Internal helper: loads `.env`, locates a working Python 3 (`PY`), exports the config. Sourced by the others. |
| `scripts/_claims.sh` | Internal helper: reads informational token/account fields (organisation, access level, expiry) from the token cache or the JWT payload. Sourced by `whoami.sh`. |


**Always run `describe_endpoint.sh` before composing a query for a route you
have not used in this session.** Every route carries a full description,
documented parameters and a response schema in the bundled spec
(`references/openapi_v2.json`) — guessing a parameter name is never necessary
and costs a wasted call.

There are deliberately no per-endpoint wrappers. `query.sh` plus
`describe_endpoint.sh` cover all routes without 77 scripts to maintain, and
the spec ships with the skill so parameters never have to be guessed.

```bash
# average and median playtime, hourly, one day
bash scripts/query.sh /v2/h5live/playtime/timeseries \
  from=2026-07-01T00:00:00 to=2026-07-02T00:00:00 interval=hour

# buffering ratio for two specific streams, as CSV
bash scripts/query.sh /v2/h5live/bufferingratio/streams/timeseries \
  from=2026-07-01T00:00:00 to=2026-07-02T00:00:00 interval=hour \
  streams=abcde-11111 streams=abcde-22222 format=csv

# what parameters does this route take, and what does it return?
bash scripts/describe_endpoint.sh /v2/monitoring/ingest/srt/timeseries

# ...with a full response example
bash scripts/describe_endpoint.sh /v2/alerting/ingest --example
```

## Credential hygiene

These rules are in SKILL.md rather than a reference file on purpose: references
are only read on demand, and a rule that is not in context cannot be followed.

**Never read, print, `cat`, `grep`, or otherwise open the `.env` file, and never
echo `ANALYTICS_PASSWORD` or a JWT into a response, a log, a commit, or a
ticket.** There is no legitimate reason to inspect the credential file. If
authentication fails, diagnose it by *behaviour*, not by reading the secret:

```bash
bash scripts/get_token.sh --refresh          # does auth succeed at all?
[ -f .env ] && echo ".env exists"            # existence, not contents
grep -c '^ANALYTICS_EMAIL=' .env             # a count, never the value
```

If a credential is ever exposed in a session — pasted, printed, or read into
context — treat it as compromised and rotate it. Rotation is cheap.

The scripts here never print credentials: `env.sh` only exports them, and
`get_token.sh` sends them solely to `/authenticate`. Anything that surfaces a
secret is something a human or a model did on top, not the tooling.

### Tool-level enforcement (recommended)

The rule above is an instruction, not a boundary. For an actual block, add deny
rules to `.claude/settings.json` (project) or `~/.claude/settings.json` (global):

```json
{
  "permissions": {
    "deny": ["Read(**/.env)", "Read(**/.env.*)", "Read(**/*.pem)", "Read(**/*.key)"]
  }
}
```

Glob patterns rather than a fixed path, so the rule matches the `.env` wherever
you placed it — a path relative to the skill folder would not match a `.env`
kept outside it.

Verify rather than assume. Deny rules cover the Read tool; whether a
Bash-mediated read (`cat`) is caught is worth confirming, and enforcement bugs
have been reported in the past. Test in a throwaway folder with a dummy `.env`
containing fake values — never against the real one.

A ready-to-merge snippet ships as `claude-settings-snippet.json` in this
folder — merge it into your existing settings rather than overwriting, since
`permissions.deny` is a single shared list.


## Windows

The scripts are bash — run them in **Git Bash**, not PowerShell.

If Python cannot be found or does not run, pin it with `PYTHON=` in `.env` — the
`python3` on PATH is often the Microsoft Store stub rather than an interpreter, and
the scripts already work around that plus two further Windows quirks. Those
workarounds look redundant and are not: the odd-looking argument handling in
`describe_endpoint.sh` and the encoding exports in `env.sh` are load-bearing on
Windows, so leave them in place.

One caveat that is *not* handled: on Windows the cached token is effectively a
normally-readable file in `%TEMP%`, whatever permissions the script asks for. It is
short-lived and is not the password, but do not describe it as protected there.


## Read this before interpreting any result

`references/query-semantics.md` — not optional. The short version:

- **`tags` combines with AND**, while `streams`, `countries` and `events`
  combine with OR. Two tags narrow the query to their intersection.
- **HTTP 200 does not mean data exists.** The body carries the real outcome:
  `1000` OK, `2000` NO DATA, `2001` NO ALERTS. `query.sh` exits `3` on
  2000/2001 so a no-data result is distinguishable in a pipeline.
- **The API returns base units, the dashboard divides.** `bytes` comes back in
  bytes (shown as GB), `playtime` and Live-Captions uptime in seconds (shown as
  hours). The response field name tells you which — never put a raw figure next to
  a dashboard figure.
- **Usage is booked when a session stops, not while it runs.** A running stream
  contributes nothing; its whole volume lands in the bucket where it stopped. Sum a
  usage timeseries over a range — never read one bucket as throughput.
- **Top lists are capped at 1,000 and not exact** — an entry can be missing or come
  back too low, the more so over long ranges. Fine for ranking; a narrower query,
  e.g. explicit `streams`, is what makes the figures exact.
- All times are **UTC**; `from` rounds down and `to` rounds up to the minute.
  Convert local incident times before querying.
- H5Live routes return data only if the **player was instrumented** — an empty
  result is not proof of no viewers. Cross-check with `/v2/monitoring/ingest/...`.
- **Concurrent viewers arrive ~3 minutes late and backdated** — a window inside
  the last few minutes is empty *and will fill in later*, so a recent zero is a
  not-yet, never a measurement.
- Neither the SRT nor the latest-RTMP route takes a steerable `from`/`to` despite
  `timeseries` in the path: `latestMetrics` is a single point for one stream, while
  the SRT route returns a **series per stream** over the last completed minute.
- The base URL **changed in v2.34.2**: `metrics.nanocosmos.de/api/v2/...` is
  dead, it is now `metrics-api.nanostream.cloud/v2/...`.

## Topic routing

| Question | Where to look |
|---|---|
| Which route do I need? | `references/endpoints.md` |
| What parameters does it take, what does it return? | `scripts/describe_endpoint.sh <path> [--example]` |
| Why is my result empty / wrong / erroring? | `references/query-semantics.md` |
| Full machine-readable spec | `references/openapi_v2.json` |

Rough map by question type:

- **Viewer experience** — `/v2/h5live/...` (playtime, buffering ratio, latency,
  startup time, error codes, stop reasons, breakdown by browser/OS)
- **Did playback start at all** — `/v2/playback/start/success/...` and
  `/v2/playback/start/errors/...`, broken down by stream, country, tag, or any
  of the `breakdownTerm` values
- **Ingest health** — `/v2/monitoring/ingest/...` (audio/video bitrate, SRT,
  latest RTMP metrics, max frame delay, stream time ratio)
- **Alerts** — `/v2/alerting/ingest`
- **Volume and billing** — `/v2/usage/...`
- **Geography** — `/v2/world/...`
- **Concurrency** — `/v2/viewers/concurrent/timeseries`
- **Live Captions** — `/v2/captions/usage/...`

## Ground rules

- Read-only. Do not add wrappers for `/v2/alerting/config/*`; a mistaken
  `replaceAll` stops production alert delivery for the whole organisation.
  Change alert receivers in the Analytics dashboard instead.
- Never paste credentials or JWTs into responses, tickets, logs, or code, and
  never open the `.env` file — see *Credential hygiene* above.
- Analytics data can be sensitive. Stream names, IPs, referrers and city-level
  breakdowns should only be shared when you are certain of the recipient.
- When a number will be quoted or used in a report, state the exact time range
  and filters it came from. An AND-combined tag filter and a genuinely quiet
  hour look identical in the output.
- If a question can't be answered from the data reachable here — or a figure
  looks wrong platform-side — recommend opening a support request at
  https://www.nanocosmos.net/support or support@nanocosmos.net. nanocosmos
  support can check beyond what this account's API access reaches.

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
