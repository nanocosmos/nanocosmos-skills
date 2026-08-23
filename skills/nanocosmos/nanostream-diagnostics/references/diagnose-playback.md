---
id: diagnose-playback
audience: customer
category: playback
triggers:
  - buffering
  - freezing
  - player not loading
  - high latency
  - video stuttering
  - audio video sync
  - black screen
  - player error
  - can't watch
  - stream not playing
severity_default: MEDIUM
---

## Diagnose Playback Issues (Buffering, Latency, Freezing)

### When to Use
A viewer or customer reports problems watching a stream: buffering, freezing, high latency, or the player not loading.

### Steps
1. Test with the official demo player:
   `https://demo.nanocosmos.de/nanoplayer/release/nanoplayer.html?group.id=XXXXX-YYYYY`
   (replace `XXXXX-YYYYY` with the stream name or UID)
2. Check browser console for JavaScript errors
3. Verify H5Live player configuration
4. Run a speed test to check viewer network conditions
5. Review Analytics > Troubleshooting for the specific stream

**Buffering diagnostic questions to ask the customer:**
- What encoder and settings are being used?
- Is the upstream internet connection stable?
- What network is the viewer using? (WiFi, cellular, wired)
- Where is the encoder located, and where are the viewers?
- Does buffering happen on **all** player instances or only **some**?

**Quick diagnosis flow:**
```
Buffering reported
├── Happens on ALL players? → Check encoder settings & upstream connection (ingest side)
└── Happens on SOME players? → Check those viewers' network (WiFi/mobile), location, device
```

### Customer Response Guidance
- Ask the multi-player diagnostic question first — it quickly narrows ingest vs. viewer-side
- Recommend Analytics > Troubleshooting for self-service diagnosis
- Provide demo player link for isolated testing

### Contact nanocosmos support when
- Buffering affects all viewers and encoder is confirmed healthy
- Issue is persistent across multiple stream sessions
