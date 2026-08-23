---
id: encoder-setup
audience: customer
category: setup
triggers:
  - how do I configure
  - OBS settings
  - RTMP setup
  - SRT setup
  - encoder settings
  - what bitrate
  - stream key
  - ingest URL
  - configure encoder
  - getting started
  - setup guide
severity_default: LOW
---

## Encoder Setup / Streaming Configuration

### When to Use
A customer is setting up their encoder for the first time or asking for configuration guidance.

### Steps
1. Direct customer to the Dashboard to get their RTMP ingest URL and stream name — **do not provide generic RTMP URLs**
2. Share recommended encoder settings:

| Setting | Recommended Value |
|---|---|
| Video codec | H.264 |
| Audio codec | AAC |
| Keyframe interval | 2 seconds |
| B-frames | Disabled |
| Bitrate | 1–6 Mbps (max 6 Mbps) |
| Resolution | Up to 1080p |

**Common resolutions and bitrates:**
- 720p (1280×720): 2–3 Mbps
- 1080p (1920×1080): 4–6 Mbps
- Mobile/webcam: 1–2 Mbps

3. **OBS Studio specific settings:**
   - Settings > Stream > Service: Custom
   - Server: (from Dashboard, e.g., `rtmp://bintu-stream.nanocosmos.de/live`)
   - Stream Key: (from Dashboard)
   - Settings > Output > Mode: Advanced | Encoder: x264 or hardware (NVENC/QuickSync) | Rate Control: CBR | Keyframe Interval: 2

4. For unstable networks, recommend SRT (settings also in Dashboard)

### Customer Response Guidance
- Always send customer to the Dashboard for their unique ingest credentials
- Provide the OBS-specific steps if they mention OBS
- Link to documentation for full setup guide

### Contact nanocosmos support when
- Encoder follows recommended settings but stream still fails to connect (investigate network/firewall)
