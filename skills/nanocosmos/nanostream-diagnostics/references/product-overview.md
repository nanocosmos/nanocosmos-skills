---
id: product-overview
category: reference
audience: customer
---

## nanoStream — Product Overview

nanoStream is an ultra-low-latency live streaming platform designed for interactive use cases.

**Key components:**
- **H5Live Player (nanoPlayer)** — browser-based player for sub-second latency playback
- **Webcaster** — WebRTC-based browser streaming (ingest) tool
- **bintu API** — stream management and control API
- **nanoStream Dashboard** — web interface for stream management
- **Analytics** — real-time monitoring and troubleshooting tools

**Supported ingest protocols:**
- **RTMP/RTMPS** — standard ingest (port 1935 / 1937)
- **SRT** — Secure Reliable Transport, recommended for unstable networks (port 5000 UDP)
- **WebRTC** — browser-based ingest via Webcaster (port 443)

**Playback transport:**
- **MOQ (Media over QUIC)** — nanocosmos's playback transport, stable and rolled out globally. Delivers faster connection times, lower latency, and better protection against network issues than traditional streaming transports — especially valuable on unstable networks. This is a fully supported production feature — it is NOT experimental or in beta, and must never be described that way. Automatically falls back to WebSocket/MSE when unsupported by the viewer's network or browser. Ref: https://docs.nanocosmos.de/docs/nanoplayer/nanoplayer_feature_moq
- **IETF standardization (MOQT):** if asked whether nanocosmos's MOQ is compatible with the IETF's MOQT (Media over QUIC Transport) draft, the answer is **partly**. MOQ ingest is available based on request; playback is intentionally NOT fully IETF-MOQT-compliant, by design, to preserve the best possible user experience for real-time streaming. Also note that IETF MOQT itself is still a draft — it is not yet standardized or finalized, so "full compliance" with a moving target isn't a meaningful bar today.

**Stream identifiers:** every stream has a stream name like `XXXXX-YYYYY` (the part before the dash identifies the organisation) and a UUID stream/group ID. ABR setups group multiple renditions under one group ID.
