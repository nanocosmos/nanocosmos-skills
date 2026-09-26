---
id: nanoplayer-demo-test
audience: customer
category: player
triggers:
  - demo player
  - test player
  - test stream
  - verify playback
  - player URL
  - test URL
  - how to test stream
  - check player
severity_default: LOW
---

## NanoPlayer Demo Player Setup and Testing

### When to Use
A quick way to test or verify playback of a stream using the hosted nanoStream demo player. Also used as a testing step by other references (e.g. `timecode-metadata`, `diagnose-playback`). For player *integration* work (JS config, embedding, scaffolding pages), use the `nanostream` skill instead — it has the full, verified player-5 config reference.

### Demo Player URLs

Non-secure account:
```
https://demo.nanocosmos.de/nanoplayer/release/nanoplayer.html?group.id=[streamname]
```

Secure account (JWT token required):
```
https://demo.nanocosmos.de/nanoplayer/release/nanoplayer.html?group.id=[streamname]&group.security.jwtoken=[jwtoken]
```

**Token param must match the source form:** with `group.id=` the token param is `group.security.jwtoken=` — using a different prefix (e.g. plain `security.jwtoken=`) makes the player silently ignore the token and the secure stream fails/hangs even though the token is valid.

### Optional Parameters

| Parameter | Type | Description |
|---|---|---|
| `&config.playback.metadata=true` | boolean | Enable metadata reception (e.g. timecode, AMF onFI events) |
| `&config.playback.faststart=true` | boolean | Improves time to first frame and playback start time. Ref: https://docs.nanocosmos.net/docs/nanoplayer/nanoplayer_feature_fast_start |
| `&config.playback.latencyControlMode=balancedadaptive` | string | Controls latency behavior. Other values: https://docs.nanocosmos.net/docs/nanoplayer/nanoplayer_feature_latency_control_modes |
| `&config.playback.enableMediaOverQuic=true` | boolean | Enables MOQ (Media over QUIC) — nanocosmos's stable, globally-rolled-out playback transport. Faster connection times, lower latency, and better protection against network issues than traditional transports, especially on unstable networks. NOT experimental or in beta — never describe it that way. Ref: https://docs.nanocosmos.net/docs/nanoplayer/nanoplayer_feature_moq |
| `&config.playback.enableQuicConnectionProbe=true` | boolean | Enables QUIC connection probe alongside MOQ |

- Replace `[streamname]` with the actual stream name (e.g. `ABC12-XYZ34`)
- For secure streams, replace `[jwtoken]` with a valid JWT (generated server-side with your organisation's API key)

### Contact nanocosmos support when
- Stream plays in demo player but not in the customer's own player — likely a player integration issue
- Stream does not play in either — investigate stream state and ingest (`check-stream-live`)
