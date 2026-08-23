---
id: analytics-monitoring
audience: customer
category: analytics
triggers:
  - analytics
  - monitoring
  - metrics
  - statistics
  - stream stats
  - concurrent viewers
  - viewer count
  - bitrate chart
  - troubleshooting dashboard
  - alerts
  - how do I monitor
  - latency graph
severity_default: LOW
---

## Analytics and Monitoring

### When to Use
A customer asks how to monitor streams, where to find metrics, or how to troubleshoot via Analytics.

### Accessing Analytics
1. Log in to the nanoStream Dashboard
2. Navigate to **Analytics**
3. Select a stream or time range

### Available Metrics

**Ingest (encoder side):**
- Stream state (live/offline), ingest bitrate, frame rate, connection stability, ingest server location

**Playback (viewer side):**
- Concurrent viewers, geographic distribution, playback quality/resolution, buffering events, latency measurements, device/browser breakdown

### Diagnosing with Analytics

| Symptom | Where to Look |
|---|---|
| Stream not playing | Analytics > Stream State, ingest metrics |
| Poor quality / buffering | Ingest bitrate stability, ABR switching events |
| High latency | Latency graph, encoder settings |
| Viewer complaints | Geographic distribution, viewer quality indicators |

### Alerts and API Access
- Alerts are configured in Dashboard settings: stream start/stop notifications, quality degradation; webhook notifications are available
- Programmatic access to metrics is via the **Analytics API at `metrics-api.nanostream.cloud`** — not the bintu API. Endpoint paths start directly with `/v2/...` (no `/api/` prefix), e.g. `https://metrics-api.nanostream.cloud/v2/h5live/playtime/timeseries`. It is public; the available feature set depends on the customer's plan. There's also a separate **Analytics Dashboard (web UI) at `metrics.nanostream.cloud`** — don't confuse the two. The old `metrics.nanocosmos.de` (with `/api/v2/...` paths) still works but is deprecated — prefer the new API host for new integrations. API docs: https://api.nanostream.cloud/docs/analytics/v2/.

### Customer Response Guidance
- Direct to Analytics > Troubleshooting for self-service diagnosis
- For ingest issues: point to ingest bitrate timeline
- For viewer issues: point to viewer quality and geographic breakdown

### Contact nanocosmos support when
- Analytics shows healthy ingest but viewers all report poor quality (potential CDN issue)
