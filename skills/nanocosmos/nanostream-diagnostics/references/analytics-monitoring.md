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
  - accountId
  - accountKey
  - metrics account
  - metrics account credentials
  - where do I find my account key
  - player metrics not showing
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

### Player Metrics Credentials (accountId / accountKey)

The nanoPlayer's `metrics.accountId` and `metrics.accountKey` config fields
are a **different credential from your Analytics Dashboard login.** The
dashboard login (email/password, or `NANO_API_TOKEN` for API access) is what
gets you into `metrics.nanostream.cloud` to view reports. The player's
`accountId`/`accountKey` pair is what the *player itself* sends alongside
each playback session so that session's stats get attributed to your
organization.

**These are not self-service — there is no settings page in the Analytics
Dashboard that displays them.** If metrics/analytics has been enabled for
your account but you don't have the `accountId`/`accountKey` values yet,
the correct next step is to request them directly from your nanocosmos
contact (support or sales), not to search the dashboard UI for them.

Once you have the values, they go into the player config like:
```js
metrics: { accountId: "...", accountKey: "..." }
```
See `player-config-reference.md` for the full field table and validation
rules for the `metrics` block.

### Alerts and API Access
- General reference docs for the monitoring and alerts feature: https://docs.nanocosmos.net/docs/analytics/monitoring
- Alerts are configured through the **Analytics API** (not Dashboard settings): stream start/stop notifications, quality degradation; webhook notifications are available
- Programmatic access to metrics is via the **Analytics API at `metrics-api.nanostream.cloud`** — not the bintu API. Endpoint paths start directly with `/v2/...` (no `/api/` prefix), e.g. `https://metrics-api.nanostream.cloud/v2/h5live/playtime/timeseries`. It is public; the available feature set depends on the customer's plan. There's also a separate **Analytics Dashboard (web UI) at `metrics.nanostream.cloud`** — don't confuse the two. The old `metrics.nanocosmos.de` (with `/api/v2/...` paths) still works but is deprecated — prefer the new API host for new integrations. API docs: https://api.nanostream.cloud/docs/analytics/v2/.

### Email Alert Notifications (as of 2026-09-16)
- A separate, newer capability from the API/webhook alerts above: **email notifications for stream alerts**, meant to surface issues early without the customer having to watch the dashboard.
- An email is sent: when a new alert is detected, when it resolves, and every **12 hours** as a reminder while it stays active.
- **Detection latency: ~3–4 minutes**, because alerting runs on a 5-minute monitoring window — don't imply near-instant notification.
- Conditions covered: performance issues, stream restarts, duplicated ingests, bandwidth problems, and other conditions that can affect viewers.
- Each alert email includes the affected stream, links to troubleshooting guidance, live test playback, quality metrics, and subscription management.
- **Subscription/recipient management:** https://metrics.nanocosmos.cloud/alertConfig/email (also linked from every alert email). **Only two recipients can be configured** — for more, the customer needs an email-client forwarding rule on one of the two configured addresses.
- Docs: https://docs.nanocosmos.net/docs/analytics/email-notification
- Monitoring the alerts themselves (not just the emails) is still via the nanoStream Dashboard's Analytics section.

### Customer Response Guidance
- Direct to Analytics > Troubleshooting for self-service diagnosis
- For ingest issues: point to ingest bitrate timeline
- For viewer issues: point to viewer quality and geographic breakdown

### Contact nanocosmos support when
- Analytics shows healthy ingest but viewers all report poor quality (potential CDN issue)
