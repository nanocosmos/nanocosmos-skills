---
id: latency-abr
audience: customer
category: playback
triggers:
  - latency
  - delay
  - lag
  - high latency
  - reduce latency
  - adaptive bitrate
  - ABR
  - quality switching
  - stream delayed
  - sub-second
  - real-time
severity_default: LOW
---

## Latency and ABR (Adaptive Bitrate)

### When to Use
A customer is asking about expected latency, how to optimize for lowest latency, or how to set up adaptive bitrate.

### Latency Overview
- nanoStream delivers **sub-second ultra-low latency** via H5Live technology
- Standard HLS/DASH has significantly higher latency — nanoStream is specifically designed to beat this

**Factors affecting latency:**
1. Keyframe interval (must be 2 s — higher values increase latency)
2. B-frames (disable for lowest latency)
3. Network conditions on both ingest and playback sides
4. Geographic distance between encoder, server, and viewer
5. Player buffer settings (tunable)

**To optimize for lowest latency:**
1. Set keyframe interval to 2 seconds
2. Disable B-frames
3. Use CBR (Constant Bitrate) rate control
4. Keep bitrate within upload bandwidth headroom
5. Use the nearest ingest server region

### ABR Overview
ABR automatically adjusts stream quality based on viewer bandwidth. Requires transcoding to be enabled in the Dashboard.

**How it works:**
1. Encoder sends one high-quality stream
2. nanoStream transcodes to multiple quality levels
3. H5Live Player auto-switches based on viewer bandwidth
4. No encoder changes needed

**ABR vs. Single Bitrate:**
- ABR: better viewer experience on variable networks, slightly higher latency
- Single bitrate (passthrough): lowest latency, requires stable viewer connection

### Customer Response Guidance
- For latency complaints: check encoder settings first (keyframe interval, B-frames)
- For ABR setup: direct to Dashboard > Transcoding settings
- Clarify trade-off: ABR = better reach, passthrough = lower latency

### Contact nanocosmos support when
- Latency is consistently above expected even with optimal encoder settings
