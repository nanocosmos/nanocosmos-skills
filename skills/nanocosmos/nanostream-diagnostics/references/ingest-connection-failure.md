---
id: ingest-connection-failure
audience: customer
category: ingest
triggers:
  - failed to connect
  - connection refused
  - cannot publish
  - publish failed
  - ingest failed
  - encoder can't connect
  - stream won't start
  - RTMP error
  - RTMPS error
  - SRT failed
  - connection error
  - stream key invalid
  - authentication failed
  - wrong ingest URL
  - ingest not working
  - encoder error
  - connect error
  - connection timeout
  - stream rejected
severity_default: HIGH
---

## Ingest Connection Failure / Cannot Publish

### When to Use
The encoder is actively trying to publish but fails to establish or maintain a connection to the nanoStream ingest endpoint. The stream never goes live. This is distinct from `stream-not-starting` (where the encoder was previously connected) and `encoder-setup` (first-time configuration help).

Typical symptoms:
- Encoder reports "failed to connect", "connection refused", or "publish error"
- Stream shows as `created` or `ended` in the Dashboard but never goes `live`
- Connection drops immediately after the encoder attempts to start streaming

---

### Diagnostic Steps

**1. Check for ingest webhook configuration (do this first)**
An ingest webhook (`on_publish`) is called by the platform before allowing the ingest to start, and the platform only allows publishing if it returns HTTP 2xx. There are two kinds, and **only one of them is ever the customer's to check:**
- **Custom webhook** — the customer configured this themselves (Dashboard or bintu API), pointing at their own endpoint. This is the one to discuss with the customer.
- **Internal webhook** — used automatically when no custom webhook is configured; this is nanoStream's own internal gating mechanism. **Never describe this to the customer as "your webhook" or give them response-code detail about it** — they didn't configure it and can't fix it. If it turns out to be the cause of a rejection, tell them only that ingest is being rejected on the platform side and is being investigated.

- Check whether a **custom** webhook is configured (organisation settings in the Dashboard, or via the bintu API)
- If one is set, verify the webhook endpoint is running, publicly reachable, returning HTTP **200**, and not blocked by firewall rules for inbound calls
- If the service is temporarily down, ingest will fail until it is restored
- If no custom webhook is configured, the internal webhook is handling gating — this is not something to trouble the customer with directly (see above)

This is the most common non-obvious cause of publish failure — always check it before assuming a credentials or network issue. If the customer reports this happened at a specific time and things look fine now, a current check alone doesn't tell you whether the webhook was actually failing at that time — a self-recovered failure is still a real one.

**2. Verify ingest credentials from the Dashboard**
The exact ingest URL and stream name from the nanoStream Dashboard must be used — never generic or guessed values. Common mistakes:
- Using the wrong stream name (copy-paste error, using group ID instead of stream name)
- Using an outdated ingest URL from a previous project

**3. Confirm the correct ingest URL and protocol**

| Protocol | Ingest host | Port |
|---|---|---|
| RTMP (no transcoding) | `rtmp://bintu-stream.nanocosmos.de/live` | 1935 |
| RTMPS (no transcoding) | `rtmps://bintu-stream.nanocosmos.de/live` | 1937 |
| RTMP (with transcoding) | `rtmp://bintu-vtrans.nanocosmos.de/live` | 1935 |
| RTMPS (with transcoding) | `rtmps://bintu-vtrans.nanocosmos.de/live` | 1937 |
| SRT | `bintu-srt.nanocosmos.de` | 5000 (UDP) |
| WebRTC | `bintu-webrtc.nanocosmos.de` | 443 (TCP) |

Check that the right host is used for the stream type (with or without transcoding).

**Note:** Both `/live` and `/rec` are valid RTMP ingest paths on `bintu-stream` and `bintu-vtrans` — either is accepted and should not be treated as an error.

**4. Check for protocol/port mismatch**
- RTMP uses port **1935** (TCP); RTMPS uses port **1937** (TCP) — these are not interchangeable
- SRT uses port **5000 UDP** — many firewalls block UDP by default
- If the customer is behind a corporate firewall, refer to `firewall-domain-whitelist`

**5. Verify encoder settings**
Even with the correct URL, bad settings can cause immediate rejection:
- Bitrate must be ≤ 6 Mbps — higher values are rejected
- Video codec must be **H.264** — H.265/HEVC is not supported
- Audio codec must be **AAC**
- B-frames must be **disabled**

**6. Test network connectivity**
Verify the ingest endpoint is reachable from the encoder's network:
- RTMP: `telnet bintu-stream.nanocosmos.de 1935`
- RTMPS: `telnet bintu-stream.nanocosmos.de 1937`
- SRT: requires UDP — check firewall/router allows outbound UDP on port 5000

**7. Check for RTMPS SSL issues**
If using RTMPS and the encoder reports an SSL or certificate error:
- Confirm the encoder supports RTMPS (not all do)
- Ensure the system's SSL certificates are up to date
- Some older encoder versions may not support TLS 1.2+ — recommend upgrading

---

### Common Causes and Fixes

| Symptom | Likely Cause | Fix |
|---|---|---|
| "Connection refused" | Wrong host or port | Verify ingest URL from Dashboard |
| "Invalid stream key" | Wrong stream name | Copy stream name exactly from Dashboard |
| Connects then immediately drops | Bitrate too high or unsupported codec | Set bitrate ≤ 6 Mbps, use H.264 + AAC |
| SRT fails, RTMP works | UDP port 5000 blocked | Check firewall/router, use RTMP instead |
| RTMPS fails, RTMP works | SSL issue or unsupported by encoder | Update encoder, check TLS support |
| Encoder connects but stream stays `created` | Wrong stream name (publishing to wrong stream) | Verify stream name matches Dashboard exactly |

---

### Customer Response Guidance

- Ask the customer to share the exact error message from their encoder logs
- Always direct them to get the ingest URL and stream name from the Dashboard — do not guess
- If they're behind a corporate network, link to `firewall-domain-whitelist` for port/domain requirements
- If credentials look correct but connection still fails, ask if anything changed recently (new firewall rule, ISP change, encoder update)

### Contact nanocosmos support when
- Credentials are confirmed correct, network connectivity verified, settings are valid — but connection still fails
- Multiple customers reporting the same ingest endpoint is unreachable (possible platform issue)
- Customer is using a hardware encoder with limited troubleshooting options
