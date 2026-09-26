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
| ----------- | ----------- | -------------------------------------------------- |
| `streams`   | **OR**      | union of the named streams                         |
| `countries` | **OR**      | union of the named countries                       |
| `events`    | **OR**      | union of the named H5Live events                   |
| `tags`      | **AND**     | **intersection** — streams carrying _all_ the tags |

Passing two tags does not widen the query, it narrows it. If a tag-filtered
query returns less than expected, drop to a single tag before concluding there
is no data.

Omitting `streams` entirely aggregates over **all streams the account can
see** — that is a meaningful difference from passing an explicit list, and for
an org-wide account it can be a very large query.

**Some routes do not support some filters, and you cannot tell from the path.**


Some routes simply do not support a given filter; if a filter appears to be ignored, that
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
- **`interval=minute` is hard-capped at a 12-hour range.** Verified live (2026-09-16):
  `HTTP 400 — The time range is too long: The max time range duration for interval 'Minute' is 12
  hours.` This isn't just a size/performance suggestion — it's a rejected request above 12h.
  `interval=hour` works fine up to at least 7 days. A simple `hours <= 12 ? "minute" : "hour"` switch
  covers both cases.
- **The `streams` filter matches by stream *name* (`XXXXX-YYYYY`), not by group/stream UUID.** If a
  UUID (nanoPlayer's `source.group.id` form) is passed as `streams`, it is silently ignored rather
  than erroring — the query falls back to org-wide aggregate data while still looking scoped to one
  stream. Resolve a UUID to its member stream name(s) first via
  `GET https://bintu.nanocosmos.de/stream/<uuid>` (header `x-bintu-token`, an access token whose
  `aud` includes `bintu` — the same analytics access token works since its `aud` is `["bintu",
  "metrics"]`) and pass the resolved name(s) as `streams` instead. This was a real bug caught live in
  a scaffolded dashboard: the first geo numbers it showed looked like real per-stream traffic but
  were actually whole-org aggregate, mislabeled as stream-scoped.


## Usage is booked when a session ends, not while it runs

This changes what a usage timeseries _is_, and it is easy to misread as a rate.

Usage — both `bytes` and `playtime`, for playout as well as ingest — **is
calculated and logged only when the stream or playout restarts or stops**. The
total is then attributed to the point in time of that restart or stop. Nothing is
booked while a session is still running.

Consequences, in order of how often they bite:

- **A running session contributes nothing.** A stream that has been live for six
  hours shows up as zero until it stops.
- **A bucket is not the traffic that flowed during it.** It is the sum of the
  sessions that _ended_ in it. Those six hours land entirely in the minute the
  stream stopped, however long the stream ran before that.
- **So sum, don't peak.** Totalling a usage timeseries over a range is valid.
  Reading one bucket as throughput-at-that-time is not — a spike marks a stop, not
  a load.
- **"Today so far" under-reports** for as long as sessions are still open, and
  keeps rising afterwards for the same time range.

Same trap as the concurrent-viewer delay below: a fresh number is not a final one.

**This is not limited to `usage/*` — the same booking-on-close applies to `world/playtime` and other
H5Live session-aggregate routes (playtime timeseries, buffering ratio, views-by-browser, etc.).**
Verified live (2026-09-16): a stream with real, sustained playback showed 26+ successful
`playback/start/success` events and non-zero `viewers/concurrent`, yet `world/playtime` stayed
`{"statusCode":2000,"statusInfo":"No data available"}` for the entire session — because none of the
viewing sessions had actually closed yet. Nothing was wrong; nothing had ended.

**For geo/country breakdowns specifically, prefer `/v2/world/playoutIngest` over `/v2/world/playtime`
when you need a real-time answer.** `playoutIngest` counts playout and ingest *connections* as they
happen — no session-end wait, confirmed to return data immediately for an in-progress session. Same
`country`/`alpha2` shape as `playtime`, different count fields: `ingest.count` / `playout.count` /
`total.count` instead of `totalUniquePlaybacks.count` / `averagePlaybackTime.seconds`. Use `playtime`
when you specifically want average-playback-time-per-country, or a final/settled count after sessions
have closed — not as the default "is anyone watching this right now" check.

**A paused player does not end its session.** In the nanoStream JS player, `pause()` only stops local
rendering — it does not close the underlying connection (see the `nanostream` skill's player-lifecycle
section). A paused viewer keeps counting toward `viewers/concurrent` and `world/playoutIngest`, and
never triggers the session-close that `world/playtime` needs. Only an actual disconnect —
`player.destroy()`, closing the tab, or the connection dropping — ends a session.

## Top lists are capped, and not exact

The usage breakdowns — by stream name, IP, referrer or token — return at most
**1,000 entries**, ordered by the metric. On top of that they are **approximate**:
an entry can be missing from the list altogether, or come back with a value that is
too low, and the ordering can be off with it.

The wider the query, the larger the deviation; a long time range is the main
driver. A narrow query is exact — with an explicit `streams` list or a short range,
the figures are the real ones.

A top list is therefore dependable for ranking and for finding candidates, less so
as a source of figures. Two readings in particular do not hold: the sum of a
breakdown compared against a total, and a stream's absence from the list taken as
evidence that it had no traffic.

## HTTP 200 does not mean "there is data"

The real outcome is in the response body:

| Body status | Meaning                                      |
| ----------- | -------------------------------------------- |
| `1000`      | OK — data found                              |
| `2000`      | NO DATA — request was valid, nothing matched |
| `2001`      | NO ALERTS — valid, but no alerts in range    |

`scripts/query.sh` checks this and exits `3` on 2000/2001 so a no-data result is
distinguishable from a successful one in a pipeline. Never report "no traffic"
to anyone on the basis of an HTTP 200 alone — confirm the body status first, and
confirm the filters, since an AND-combined tag filter produces exactly the same
`2000`.

## `format=csv`

Most routes accept `format=csv`. For long timeseries this is
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

**Concretely, "configured to send metrics" means a `metrics: {...}` block passed to the JS player's
`setup()` call** (`accountId`, `accountKey`, `userId`, `eventId`, `statsInterval` — see the `nanostream`
skill's player config reference for the exact shape and the literal value to use). Verified live
(2026-09-16): a player with no `metrics` block played a stream perfectly — real video, `onStats` firing,
no errors — while `playback/start/success`, `world/playtime`, `h5live/bufferingratio` and
`h5live/views/browser` stayed empty for the entire session. Adding the block (using the nanocosmos-wide
`accountKey` shipped in the skill's reference player, not a bogus placeholder) fixed it — the same
session then showed up in `playback/start/success` within under a minute. This is the single most
common reason a custom/scaffolded player page shows genuinely-live playback but zero analytics: the
`metrics` block was left out entirely, which is easy to do since playback itself never signals the gap.

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
the **last completed minute**. The result is not one value per stream but a _series_
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
DATA) as soon as _at least one_ requested stream came back empty, even if the
others returned full series. `query.sh` exits 3 on 2000, so a batch of 50 streams
with one idle stream exits 3 while the body holds good data for the other 49. When
you query more than one stream here, read `data`, not the exit code; the
`statusInfo` message names the streams that were empty.

**Latest RTMP metrics** (`/v2/monitoring/ingest/rtmp/latestMetrics`) _is_ the
point-in-time route: one stream, one value, the newest from roughly the last minute.
Use it for "what is this stream doing right now", and the SRT route for "what
happened inside the last minute".

## Error codes and stop reasons cannot be resolved from the API

The routes return codes, not descriptions, and there is no lookup endpoint — the
dashboard itself only links out. So a code you get back is meaningless until you
resolve it against the right external reference, and the references differ per
route:

| Route                        | Authority                                                                   |
| ---------------------------- | --------------------------------------------------------------------------- |
| `/v2/h5live/errorcodes/...`  | `docs.nanocosmos.de/docs/nanoplayer/nanoplayer_api#NanoPlayer..errorcode`   |
| `/v2/h5live/stopReasons/...` | `docs.nanocosmos.de/docs/nanoplayer/nanoplayer_api#NanoPlayer..pausereason` |


Note the naming trap in the second row: what the API calls **stop reasons are the
player's _pause_ reasons**. Do not read them as stream-ending events.
