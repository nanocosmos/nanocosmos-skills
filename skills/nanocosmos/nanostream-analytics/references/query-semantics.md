---
title: Query semantics and gotchas
audience: customer
---

# Analytics API v2 — query semantics

Everything on this page is behaviour that will silently give you wrong or empty
results if you assume the obvious. Read it before interpreting any output.

## Filter combination is NOT uniform

This is the single most common source of silently-too-small result sets:

| Parameter   | Combines as | Meaning                                            |
|-------------|-------------|----------------------------------------------------|
| `streams`   | **OR**      | union of the named streams                          |
| `countries` | **OR**      | union of the named countries                        |
| `events`    | **OR**      | union of the named H5Live events                    |
| `tags`      | **AND**     | **intersection** — streams carrying *all* the tags  |

Passing two tags does not widen the query, it narrows it. If a tag-filtered
query returns less than expected, drop to a single tag before concluding there
is no data.

Omitting `streams` entirely aggregates over **all streams the account can
see** — that is a meaningful difference from passing an explicit list, and for
an org-wide account it can be a very large query.

**Some routes do not support some filters, and you cannot tell from the path.**
Tag filtering is off on `/v2/usage/history/timeseries`, on both
`/v2/alerting/ingest/find|details` and on the per-organisation playback-start
routes; the dashboard greys out its Live-Captions concurrency chart entirely when
a stream or tag filter is active rather than sending it. A filter that a route
ignores fails silently — the result looks like a filtered answer. Some routes
simply do not support a given filter; if a filter appears to be ignored, that
is why — believe the observed behaviour over the uniform look of the query
string.

Repeat the key for array parameters:

```bash
bash scripts/query.sh /v2/h5live/playtime/timeseries \
  from=2026-07-01T00:00:00 to=2026-07-02T00:00:00 interval=hour \
  streams=abcde-11111 streams=abcde-22222
```

## Time range handling

- `from` and `to` accept ISO-8601 (UTC) or a Unix timestamp in seconds.
- Resolution is one minute. `from` is rounded **down** to the last full minute,
  `to` is rounded **up** to the next full minute. A range therefore always
  covers slightly more than requested.
- Timestamps are UTC. Nothing in the API is local time — when a colleague
  reports a incident time in CEST, convert before querying or you will be
  looking at the wrong two hours.
- `interval` is **required** on timeseries routes and takes
  `minute | hour | day | week | month | year`. Choose it to match the range:
  `interval=minute` over a week returns an enormous payload.

## The API returns raw values; the dashboard converts them

Every figure you see on a dashboard panel has been divided by something. The API
returns base units, and **the response field name tells you which**:

| `metric=` | Response field | API returns | Dashboard shows |
|---|---|---|---|
| `bytes` | `bytes` | bytes | `/ 1e9` → **GB** |
| `playtime` | `seconds` | seconds | `/ 3600` → **hours** |

The same holds for Live Captions uptime — `/v2/captions/usage/...` returns
**seconds**, and every "[Hours]" column in the dashboard is `seconds / 3600`.

So a raw API number placed next to a dashboard number is wrong by a factor of
10⁹ or 3600. Convert before comparing, and state the unit whenever a figure is
quoted. When in doubt, look at which field the value came out of.

## Usage is booked when a session ends, not while it runs

This changes what a usage timeseries *is*, and it is easy to misread as a rate.

Usage — both `bytes` and `playtime`, for playout as well as ingest — **is
calculated and logged only when the stream or playout restarts or stops**. The
total is then attributed to the point in time of that restart or stop. Nothing is
booked while a session is still running.

Consequences, in order of how often they bite:

- **A running session contributes nothing.** A stream that has been live for six
  hours shows up as zero until it stops.
- **A bucket is not the traffic that flowed during it.** It is the sum of the
  sessions that *ended* in it. Those six hours land entirely in the minute the
  stream stopped, however long the stream ran before that.
- **So sum, don't peak.** Totalling a usage timeseries over a range is valid.
  Reading one bucket as throughput-at-that-time is not — a spike marks a stop, not
  a load.
- **"Today so far" under-reports** for as long as sessions are still open, and
  keeps rising afterwards for the same time range.

Same trap as the concurrent-viewer delay below: a fresh number is not a final one.

## Top lists are capped, and not exact

The usage breakdowns — by stream name, IP, referrer or token — return at most
**1,000 entries**, ordered by the metric. On top of that they are **approximate**:
an entry can be missing from the list altogether, or come back with a value that is
too low, and the ordering can be off with it. Nothing in the response indicates
either.

The wider the query, the larger the deviation; a long time range is the main
driver. A narrow query is exact — with an explicit `streams` list or a short range,
the figures are the real ones.

A top list is therefore dependable for ranking and for finding candidates, less so
as a source of figures. Two readings in particular do not hold: the sum of a
breakdown compared against a total, and a stream's absence from the list taken as
evidence that it had no traffic.

## HTTP 200 does not mean "there is data"

The real outcome is in the response body:

| Body status | Meaning                                              |
|-------------|------------------------------------------------------|
| `1000`      | OK — data found                                       |
| `2000`      | NO DATA — request was valid, nothing matched          |
| `2001`      | NO ALERTS — valid, but no alerts in range             |

`scripts/query.sh` checks this and exits `3` on 2000/2001 so a no-data result is
distinguishable from a successful one in a pipeline. Never report "no traffic"
to anyone on the basis of an HTTP 200 alone — confirm the body status first, and
confirm the filters, since an AND-combined tag filter produces exactly the same
`2000`.

## `format=csv`

65 of the 77 routes accept `format=csv`. For long timeseries this is
dramatically more compact than the JSON envelope and much cheaper to read into
context. Prefer it whenever the result is going to be summarised rather than
parsed field-by-field. CSV responses carry no status envelope, so the 1000/2000
distinction is not available — an empty body means no data.

## Metrics depend on client-side reporting

H5Live routes only return data if the player was configured to send metrics.
An empty H5Live result can therefore mean "no viewers" **or** "player not
instrumented". Before treating it as a traffic signal, confirm with an
ingest-side route under `/v2/monitoring/ingest/...`, which does not depend on
player configuration.

## Routes that do not behave like the rest

**Concurrent viewers appear about 3 minutes late, and backdated.** The counts are
computed with a delay of roughly 3 minutes and then filed under the timestamp they
belong to — not the time they arrived. Two consequences:

1. A window covering the last ~3 minutes comes back empty, which looks exactly like
   "nobody was watching".
2. **The same query answers differently later.** An empty recent window fills in
   once the values arrive, so a fresh zero is a not-yet rather than a measurement.
   Recording or reporting it captures a placeholder.

For a "right now" reading, end the window at least ~3 minutes back — e.g.
`now-240s` to `now-180s`, floored to the minute, and more if it is running behind.

**SRT ingest is a per-stream timeseries over a window you cannot choose.**
`/v2/monitoring/ingest/srt/timeseries` ignores `from` and `to` and always returns
the **last completed minute**. The result is not one value per stream but a *series*
per stream — the individual SRT samples from that minute, oldest first.

```
data: [ { streamname, values: [ { timestamp, timestampAsString,
                                  bitrate: { kbits },
                                  roundTripTime: { milliseconds },
                                  packetsLost: { count },
                                  packetsDropped: { count } }, … ] }, … ]
```

So the range is not steerable, but the resolution inside that minute is real —
use it to spot an RTT or packet-loss spike within the minute, not to compare
hours. `streams` is **required** and capped at **50 names per request**, and a
single response carries at most 1000 samples across all of them, so a large batch
of busy streams can truncate.

**Mind the status code on this route.** Every requested stream appears in `data`,
with `values: []` when it had no samples — and the status flips to `2000` (NO
DATA) as soon as *at least one* requested stream came back empty, even if the
others returned full series. `query.sh` exits 3 on 2000, so a batch of 50 streams
with one idle stream exits 3 while the body holds good data for the other 49. When
you query more than one stream here, read `data`, not the exit code; the
`statusInfo` message names the streams that were empty.

**Latest RTMP metrics** (`/v2/monitoring/ingest/rtmp/latestMetrics`) *is* the
point-in-time route: one stream, one value, the newest from roughly the last minute.
Use it for "what is this stream doing right now", and the SRT route for "what
happened inside the last minute".

## Error codes and stop reasons cannot be resolved from the API

The routes return codes, not descriptions, and there is no lookup endpoint — the
dashboard itself only links out. So a code you get back is meaningless until you
resolve it against the right external reference, and the references differ per
route:

| Route | Authority |
|---|---|
| `/v2/h5live/errorcodes/...` | `docs.nanocosmos.de/docs/nanoplayer/nanoplayer_api#NanoPlayer..errorcode` |
| `/v2/h5live/stopReasons/...` | `docs.nanocosmos.de/docs/nanoplayer/nanoplayer_api#NanoPlayer..pausereason` |
| `/v2/webrtc/errorcodes/...` | `docs.nanocosmos.de/docs/webrtc/nanostream_webrtc_api#errorcode--number` |
| `/v2/webrtc/stopReasons/...` | `docs.nanocosmos.de/docs/webrtc/nanostream_webrtc_api#events` |
| `/v2/troubleshooting/playout` events | `docs.nanocosmos.de/docs/nanoplayer/nanoplayer_api_errors` |
| `/v2/alerting/ingest/...` | `docs.nanocosmos.de/docs/analytics/alerting#alert-definitions` |
| `/v2/troubleshooting/rtmp/...` | `docs.nanocosmos.de/docs/analytics/troubleshooting#other-samples` |


Note the naming trap in the second row: what the API calls **stop reasons are the
player's *pause* reasons**. Do not read them as stream-ending events.

## Filter-discovery routes are referenced but absent

Several parameter descriptions point to "Available countries" / "Available
events" routes under a *Filtering* section. The `Filtering` and
`Playback token revocation` tags exist in the spec but carry **no operations**
in v2.34.3. Do not build anything that depends on them; derive the available
values from a broken-down query (`breakdownTerm=country`) instead.
