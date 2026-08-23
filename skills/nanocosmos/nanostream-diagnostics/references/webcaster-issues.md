---
id: webcaster-issues
audience: customer
category: webcaster
triggers:
  - webcaster
  - camera not detected
  - microphone not detected
  - WebRTC failing
  - browser streaming
  - webcam
  - no camera
  - no mic
  - permission denied
  - lagging
  - stuttering
severity_default: MEDIUM
---

## Webcaster Issues (Browser-Based Streaming)

### When to Use
A customer has trouble using the browser-based Webcaster tool (camera/mic not detected, WebRTC failures, poor quality, or lagging/stuttering playback).

### Steps
1. Grant browser permissions for camera and microphone (check browser address bar for blocked icons)
2. Use Chrome or Edge — they have the best WebRTC support
3. Check that a firewall or VPN is not blocking WebRTC ports
4. Try a different camera or microphone device
5. Ensure the page is served over HTTPS (WebRTC requires it)

### Lagging / Stuttering Playback

When a customer reports "lagging" or stuttering with a Webcaster stream, the cause is usually on the **encoder/Webcaster side** (browser), not the player:

**Common causes:**
- Bitrate set too high for the source or upload bandwidth
- Unstable source frame rate (camera/screen capture)
- CPU overload in the browser during encoding
- Insufficient network upload bandwidth

**Diagnostic steps:**
1. Test with lower settings first to isolate the cause — try 600 kbps at 640×480, then increase gradually if that plays smoothly
2. Check source stability (is the camera/screen capture providing stable frames?)
3. Monitor browser CPU usage — WebRTC encoding is CPU-intensive
4. Test upload bandwidth to confirm a stable upstream connection

**Webcaster bitrate recommendations:**
- Webcam (640×480): 400–800 kbps
- Webcam (720p): 1000–1500 kbps
- Screen share: 1000–2000 kbps (depends on motion)
- High-quality camera (1080p): 2000–3000 kbps

Unlike dedicated encoders, Webcaster runs in the browser with more constraints — start conservative and increase only if source and network can handle it. If playback issues occur on **all** viewers, the problem is almost always encoder/Webcaster-side, not player configuration.

### Customer Response Guidance
- Check browser permissions first — most Webcaster issues stem from blocked camera/mic access
- Recommend Chrome or Edge as the primary browser
- If corporate firewall suspected, test on a different network
- For lagging/stuttering, guide the customer to test with reduced bitrate/resolution first, then walk through the bitrate recommendations table

### Contact nanocosmos support when
- WebRTC connections fail on multiple browsers and networks with no firewall suspected
- Lagging persists after reducing to conservative bitrate/resolution settings
