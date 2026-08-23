---
id: external-player-playback
audience: customer
category: playback
triggers:
  - external player
  - native player
  - VLC
  - native app
  - own player
  - custom player
  - playback URL
  - HLS URL
  - MP4 URL
  - RTMP playback
  - play in app
  - view stream outside browser
  - iOS player
  - Android player
severity_default: LOW
---

## External Media Player / Native App Playback

### When to Use
Customer wants to play a nanoStream stream in an external media player (e.g. VLC), a native iOS/Android app, or any player other than the nanoPlayer JS widget.

### Steps
1. Confirm whether the stream has token security enabled (check stream settings in Dashboard or via bintu API — look for `websocket` value containing `secure`)
2. Identify the target platform:
   - iOS/iPadOS → use M3U8 HLS URL
   - All other platforms → use MP4 URL
   - Apps supporting RTMP (e.g. VLC) → RTMP URL is also an option
3. Provide the correct URL schema based on secure vs unsecure (see Customer Response Guidance)
4. Remind the customer this is an unsupported "as is" feature

### Customer Response Guidance

Inform the customer that native/external player URLs are available but **unsupported** — not compatible with all systems and without the buffer/latency control of the JS player.

**Unsecure streams (no token security):**

Low-Latency MP4 (all platforms except iOS):
```
https://bintu-play.nanocosmos.de/h5live/http/stream.mp4?url=rtmp://localhost/play&stream=[streamname]
```

Low-Latency M3U8 HLS (iOS/iPadOS):
```
https://bintu-play.nanocosmos.de/h5live/http/playlist.m3u8?url=rtmp://localhost/play&stream=[streamname]
```

RTMP (e.g. VLC):
```
rtmp://bintu-play.nanocosmos.de/play/[streamname]
```

**Secure streams (token security enabled) — JWT token:**

Low-Latency MP4:
```
https://bintu-splay.nanocosmos.de/h5live/authhttp/stream.mp4?url=rtmp://localhost/splay&stream=[streamname]&jwtoken=[securetoken]
```

Low-Latency M3U8 HLS:
```
https://bintu-splay.nanocosmos.de/h5live/authhttp/playlist.m3u8?url=rtmp://localhost/splay&stream=[streamname]&jwtoken=[securetoken]
```

RTMP secure (JWT):
```
rtmp://bintu-splay.nanocosmos.de/splayrtmp/[streamname]?jwtoken=[securetoken]
```

RTMPs (TLS):
```
rtmps://bintu-splay.nanocosmos.de:1937/splayrtmp/[streamname]?jwtoken=[securetoken]
```

**Secure streams — STS token:**

Low-Latency MP4:
```
https://bintu-splay.nanocosmos.de/h5live/authhttp/stream.mp4?url=rtmp://localhost/splay&stream=[streamname]&token=[securetoken]&options=[options]&expires=[expirationtime]&tag=[tag]
```

Low-Latency M3U8 HLS:
```
https://bintu-splay.nanocosmos.de/h5live/authhttp/playlist.m3u8?url=rtmp://localhost/splay&stream=[streamname]&token=[securetoken]&options=[options]&expires=[expirationtime]&tag=[tag]
```

Always recommend the nanoPlayer JS widget as the preferred option for browser-based playback.

**Note:** RTMP playback with token + referrers is not supported and will be rejected for secured streams.

### Contact nanocosmos support when
- Customer reports the URL is not working and stream state is confirmed live
- Customer needs token generation assistance (refer to security-tokens skill)
- Customer requires guaranteed compatibility or SLA on this feature
