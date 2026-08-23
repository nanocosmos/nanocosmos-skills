---
id: firewall-domain-whitelist
audience: customer
category: setup
triggers:
  - firewall
  - whitelist
  - IP whitelist
  - domain whitelist
  - firewall policy
  - network policy
  - outbound policy
  - blocked traffic
  - DNS mismatch
  - GeoDNS
  - GSLB
  - IP subnets
  - IP ranges
  - firewall rules
  - network restrictions
  - corporate network
  - enterprise firewall
  - router policy
  - port whitelist
severity_default: MEDIUM
---

## Firewall / Router Policy and Domain Whitelisting

### When to Use
A customer reports connectivity issues caused by their network or firewall blocking traffic to nanoStream endpoints. Common scenarios:
- Firewall drops traffic due to IP mismatch from GeoDNS/GSLB (different IPs returned by different resolvers)
- Customer asks for a static IP list or static FQDN to bypass geographic load balancing
- Customer needs to whitelist nanoStream domains/ports in their firewall or router policy
- Intermittent connectivity to `bintu.nanocosmos.de` or other nanoStream endpoints

### Key Points to Explain

**Why IPs change:** nanoStream uses geographic load balancing (GeoDNS/GSLB) to route traffic to the nearest regional infrastructure. DNS resolution intentionally returns different IP addresses depending on the resolver and the client's location. This is by design and cannot be bypassed.

**No static FQDN:** We do not offer a dedicated static FQDN that bypasses geo-load balancing — it is a core part of how low-latency streaming is delivered globally.

**No static IP list:** We cannot provide an exhaustive, guaranteed list of IP subnets for permanent whitelisting. Our infrastructure is dynamic — servers may be replaced, IPs may change, and new regions may be added. A static IP allowlist would require ongoing maintenance and could break unexpectedly after infrastructure changes.

**Recommended approach:** Configure the firewall to whitelist by **DNS domain names**, not by IP addresses. This is resilient to infrastructure changes and covers all current and future nanoStream endpoints.

### Domain Whitelist

**Option A — Wildcard (simplest):**
Whitelist `*.nanocosmos.de` **and** `*.nanostream.cloud` to cover all nanoStream services. The second wildcard is required for the Dashboard and the token API, which do not live under `nanocosmos.de`.

**Option B — Granular service-based whitelist:**

| Service | Domain | Port / Protocol |
|---|---|---|
| Bintu API | `bintu.nanocosmos.de` | 443 (TCP/HTTPS) |
| WebRTC Ingest | `bintu-webrtc.nanocosmos.de` | 443 (TCP) |
| WebRTC Ingest (TURN) | `turn.nanocosmos.de` | All UDP |
| SRT Ingest | `bintu-srt.nanocosmos.de` | 5000 (UDP) |
| RTMP Ingest (no transcoding) | `bintu-stream.nanocosmos.de` | 1935 / 80, 1937 (RTMPS) |
| RTMP Ingest (with transcoding) | `bintu-vtrans.nanocosmos.de` | 1935 / 80, 1937 (RTMPS) |
| H5Live Playback | `bintu-play.nanocosmos.de` | 443 (TCP/HTTPS) |
| H5Live Playback | `bintu-h5live.nanocosmos.de` | 443 (TCP/HTTPS) |
| H5Live Playback | `bintu-splay.nanocosmos.de` | 443 (TCP/HTTPS) |
| H5Live Playback (secure) | `bintu-h5live-secure.nanocosmos.de` | 443 (TCP/HTTPS) |
| RTMP Playback | `bintu-play.nanocosmos.de` | 1935 / 80, 1937 (RTMPS) |
| Dashboard (web UI, login) | `dashboard.nanostream.cloud` | 443 (TCP/HTTPS) |
| Token API (JWT creation) | `token.nanostream.cloud` | 443 (TCP/HTTPS) |
| Analytics API (programmatic) | `metrics-api.nanostream.cloud` | 80 (TCP/HTTPS) |
| Analytics Dashboard (web UI) | `metrics.nanostream.cloud` | 80 (TCP/HTTPS) |
| Analytics API (deprecated, still active) | `metrics.nanocosmos.de` | 80 (TCP/HTTPS) |

### Customer Response Guidance

- Acknowledge their analysis if they've identified the GeoDNS/GSLB behavior — it shows good understanding and is correct
- Clearly explain why static IPs and static FQDNs are not available
- Recommend domain-based whitelisting as the robust, maintenance-free solution
- If the customer only needs specific services (e.g., only RTMP ingest, no playback), offer the granular list so they can limit their firewall scope accordingly

### Contact nanocosmos support when
- Customer cannot configure domain-based firewall rules and insists on IP-based whitelisting — contact nanocosmos support for further guidance
- Connectivity issue persists after applying the recommended whitelist
- Customer is behind a strict enterprise proxy that intercepts HTTPS — may require additional SSL inspection bypass configuration