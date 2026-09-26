---
title: Endpoint map
audience: customer
---

# Analytics API v2 — endpoint map

Spec version **2.34.3**, 77 routes. Base URL `https://metrics-api.nanostream.cloud`.

> **Note:** some routes require higher plan tiers and return HTTP 403 on lower plans.

This is a map, not a reference. For exact parameters of any route:

```bash
bash scripts/describe_endpoint.sh /v2/h5live/playtime/timeseries
bash scripts/describe_endpoint.sh --list
```

Almost every route takes `from`, `to`, and the optional filters `streams`, `countries`, `tags`, `events` — see `query-semantics.md`, especially for the OR/AND difference. Timeseries routes additionally require `interval`. `format=csv` works on most routes.


## Access token

| Route | Method | What it gives you |
|---|---|---|
| `/authenticate` | POST | Authentication |

## Monitoring

| Route | Method | What it gives you |
|---|---|---|
| `/v2/monitoring/ingest/bitrate/audio/timeseries` | GET | Ingest audio bitrate |
| `/v2/monitoring/ingest/bitrate/timeseries` | GET | Ingest audio/video bitrate |
| `/v2/monitoring/ingest/bitrate/video/timeseries` | GET | Ingest video bitrate — verified live (2026-09-16) to return `{"statusCode":2000,"statusInfo":"no metrics have been found"}` for a stream confirmed genuinely live (real `ffprobe` I-frames, working curl playback) — a real platform-side gap for that stream, not a caller bug. If empty, try `/v2/monitoring/ingest/rtmp/latestMetrics` first (same figures, one stream/point-in-time, had data for the exact same stream at the exact same time) before concluding there's no ingest data at all. Same caveat likely applies to the sibling `bitrate/audio/timeseries`, `bitrate/timeseries`, `timeRatio/timeseries`, `maxFrameDelay/timeseries` routes. |
| `/v2/monitoring/ingest/maxFrameDelay/timeseries` | GET | Ingest max frame delay |
| `/v2/monitoring/ingest/rtmp/latestMetrics` | GET | Ingest latest RTMP metrics |
| `/v2/monitoring/ingest/srt/timeseries` | GET | Ingest SRT metrics |
| `/v2/monitoring/ingest/timeRatio/timeseries` | GET | Ingest stream time ratio |
| `/v2/monitoring/playout/bufferingRatio` | GET | Playout buffering play ratio |
| `/v2/monitoring/playout/errorcodes` | GET | Playout error codes |
| `/v2/monitoring/playout/startuptime` | GET | Playout startup time |

## Alerting

| Route | Method | What it gives you |
|---|---|---|
| `/v2/alerting/ingest` | GET | Ingest stream alerts/advices |
| `/v2/alerting/ingest/custom` | POST | Custom ingest stream alerts/advices |

## H5Live metrics

| Route | Method | What it gives you |
|---|---|---|
| `/v2/h5live/bufferingratio/streams/timeseries` | GET | Buffering play ratio per stream |
| `/v2/h5live/bufferingratio/timeseries` | GET | Buffering play ratio |
| `/v2/h5live/errorcodes/timeseries` | GET | Error Codes |
| `/v2/h5live/latency/streams/timeseries` | GET | Latency per stream |
| `/v2/h5live/latency/timeseries` | GET | Latency |
| `/v2/h5live/playtime/browser` | GET | Playtime per browser |
| `/v2/h5live/playtime/os` | GET | Playtime per operating system |
| `/v2/h5live/playtime/streams/timeseries` | GET | Playtime per stream |
| `/v2/h5live/playtime/timeseries` | GET | Playtime |
| `/v2/h5live/startuptime/streams/timeseries` | GET | Startup time per stream |
| `/v2/h5live/startuptime/timeseries` | GET | Startup time |
| `/v2/h5live/stopReasons/timeseries` | GET | Stop Reasons |
| `/v2/h5live/views/browser` | GET | Views per browser |
| `/v2/h5live/views/os` | GET | Views per operating system |

## Playback start success

| Route | Method | What it gives you |
|---|---|---|
| `/v2/playback/start/success/ratio/countries/timeseries` | GET | Ratio per country |
| `/v2/playback/start/success/ratio/countries/{breakdownTerm}` | GET | Broken down ratio per country |
| `/v2/playback/start/success/ratio/streams/timeseries` | GET | Ratio per stream |
| `/v2/playback/start/success/ratio/streams/top100` | GET | Ratio of TOP 100 streams |
| `/v2/playback/start/success/ratio/streams/{breakdownTerm}` | GET | Broken down ratio per stream |
| `/v2/playback/start/success/ratio/tags/timeseries` | GET | Ratio per tag |
| `/v2/playback/start/success/ratio/tags/{breakdownTerm}` | GET | Broken down ratio per tag |
| `/v2/playback/start/success/ratio/timeseries` | GET | Ratio |
| `/v2/playback/start/success/ratio/world` | GET | Ratio per world country |
| `/v2/playback/start/success/ratio/{breakdownTerm}` | GET | Broken down ratio |

## Playback start errors

| Route | Method | What it gives you |
|---|---|---|
| `/v2/playback/start/errors` | GET | Errors |
| `/v2/playback/start/errors/countries/{breakdownTerm}` | GET | Broken down errors per country |
| `/v2/playback/start/errors/streams` | GET | Errors per stream |
| `/v2/playback/start/errors/streams/top100` | GET | Errors of TOP 100 streams |
| `/v2/playback/start/errors/streams/{breakdownTerm}` | GET | Broken down errors per stream |
| `/v2/playback/start/errors/tags` | GET | Errors per tag |
| `/v2/playback/start/errors/tags/{breakdownTerm}` | GET | Broken down errors per tag |
| `/v2/playback/start/errors/world` | GET | Errors per world country |
| `/v2/playback/start/errors/{breakdownTerm}` | GET | Broken down errors |

## Viewer metrics

| Route | Method | What it gives you |
|---|---|---|
| `/v2/viewers/concurrent/timeseries` | GET | Concurrent viewer |

## Usage metrics

| Route | Method | What it gives you |
|---|---|---|
| `/v2/usage/bytes/timeseries` | GET | Byte usage |
| `/v2/usage/hourly/bytes/timeseries` | GET | Hourly byte usage |
| `/v2/usage/ip/details` | POST | Conspicuous IPs details |
| `/v2/usage/lastmonth` | GET | Byte usage last month |
| `/v2/usage/token/playback/details` | POST | Conspicuous Playback Tokens details |
| `/v2/usage/{groupBy}/ingest/bytes` | GET | Ingest byte usage breakdown |
| `/v2/usage/{groupBy}/playout/bytes` | GET | Playout byte usage breakdown |

## World map metrics

| Route | Method | What it gives you |
|---|---|---|
| `/v2/world/abr/playtime` | GET | ABR total playtime |
| `/v2/world/abr/switches` | GET | ABR switches |
| `/v2/world/abr/viewer` | GET | ABR viewers |
| `/v2/world/buffering/ratio` | GET | Average buffering play ratio |
| `/v2/world/latency` | GET | Average latency |
| `/v2/world/playoutIngest` | GET | Playouts and ingests |
| `/v2/world/playtime` | GET | Average playtime |
| `/v2/world/usage` | GET | Byte usage |

## Webcaster metrics

| Route | Method | What it gives you |
|---|---|---|
| `/v2/webrtc/bitrate/video` | GET | Video bitrate |
| `/v2/webrtc/count/browser` | GET | Ingests per browser |
| `/v2/webrtc/count/os` | GET | Ingests per OS |

## Live Captions metrics

| Route | Method | What it gives you |
|---|---|---|
| `/v2/captions/usage/language/source` | GET | Live Captions source language breakdown |
| `/v2/captions/usage/language/target` | GET | Live Captions target language breakdown |
| `/v2/captions/usage/stream/uptime` | GET | Live Captions uptime usage by stream |
| `/v2/captions/usage/timeseries` | GET | Live Captions uptime usage timeseries |

## Alert Notification Configuration

> **Write routes — deliberately not exposed by this skill.** These add, delete
> and replace the email and webhook receivers that production alerts are
> delivered to. `scripts/query.sh` refuses `/v2/alerting/config/*` outright.
> A mistaken `replaceAll` here silently stops alert delivery for the whole
> organisation. Change receivers in the Analytics dashboard, not from a chat
> session.

| Route | Method | What it gives you |
|---|---|---|
| `/v2/alerting/config/email` | GET | Get all configured email receivers |
| `/v2/alerting/config/email/add` | POST | Add a new email receiver |
| `/v2/alerting/config/email/delete` | DELETE | Remove an existing email receiver |
| `/v2/alerting/config/email/replaceAll` | PUT | Replace email receivers |
| `/v2/alerting/config/webhook` | GET | Get configured webhook receiver |
| `/v2/alerting/config/webhook/add` | POST | Add a new webhook receiver |
| `/v2/alerting/config/webhook/delete` | DELETE | Remove the configured webhook receiver |
| `/v2/alerting/config/webhook/replace` | PUT | Replace webhook receiver |
