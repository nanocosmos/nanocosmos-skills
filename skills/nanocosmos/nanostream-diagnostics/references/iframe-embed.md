---
id: iframe-embed
audience: customer
category: player
triggers:
  - iframe embed
  - embed player
  - embed stream
  - iframe implementation
  - how to embed
  - embed code
  - embed URL
  - nanoplayer embed
  - embed nanostream
  - iframe stream
  - embed live stream
  - player embed
  - website embed
  - embed on website
severity_default: LOW
---

## nanoPlayer iFrame Embed Implementation

### When to Use
A customer asks how to embed a nanoStream stream on their website using an iframe — including setup, configuration options, ABR multi-bitrate, and token security.

**Before using this skill, always fetch the full documentation to get the latest version, parameters, and examples:**
https://docs.nanocosmos.net/docs/nanoplayer/nanoplayer_embed_detailed

Use whatever version and configuration details are current in the docs — do not rely solely on the examples below, as they may be outdated.

---

### Basic Embed

The embed base URL is:
```
https://demo.nanocosmos.de/nanoplayer/embed/2.0.0/nanoplayer.html
```

**Minimal required iframe:**
```html
<iframe
  src="https://demo.nanocosmos.de/nanoplayer/embed/2.0.0/nanoplayer.html?entry.rtmp.streamname=XXXXX-YYYYY"
  frameborder="0"
  allowfullscreen
  width="1280"
  height="720">
</iframe>
```

Replace `XXXXX-YYYYY` with the customer's stream name.

---

### Configuration Parameters

All parameters are appended to the `src` URL as query parameters using dot notation.

**Stream / Source:**
| Parameter | Description |
|---|---|
| `entry.rtmp.streamname` | Primary stream name (required) |
| `entry2.rtmp.streamname` | Second stream (ABR) |
| `entry3.rtmp.streamname` | Third stream (ABR) |
| `entry.info.bitrate` | Bitrate in kbps for ABR |
| `startIndex` | Starting stream index for ABR |
| `defaults.service=bintu` | Use bintu as stream source |

**Playback:**
| Parameter | Values | Description |
|---|---|---|
| `playback.autoplay` | `true` / `false` | Autoplay on load |
| `playback.muted` | `true` / `false` | Start muted |
| `playback.automute` | `true` / `false` | Auto-mute if autoplay is blocked |
| `playback.faststart` | `true` / `false` | Fast start mode |
| `playback.metadata` | `true` / `false` | Enable metadata |
| `playback.latencyControlMode` | `classic` / `balancedadaptive` / `fastadaptive` | Latency control |
| `playback.timeouts.buffering` | number (seconds) | Buffering timeout |

**Style / UI:**
| Parameter | Values | Description |
|---|---|---|
| `style.fullScreenControl` | `true` / `false` | Show fullscreen button |
| `style.displayMutedAutoplay` | `true` / `false` | Show muted autoplay indicator |
| `style.backgroundColor` | color (e.g. `black`) | Player background color |
| `style.poster` | image URL | Thumbnail before playback |
| `title` | string | Custom page title |

**Analytics:**
| Parameter | Description |
|---|---|
| `metrics.accountKey` | Analytics account key |
| `metrics.accountId` | Analytics account ID |

**Advanced:**
| Parameter | Description |
|---|---|
| `options.adaption.rule` | ABR rule (e.g. `deviationOfMean2`) |
| `tweaks.buffer.limit` | Buffer limit (e.g. `1.7`) |

---

### ABR Multi-Bitrate Example

```html
<iframe
  src="https://demo.nanocosmos.de/nanoplayer/embed/2.0.0/nanoplayer.html
    ?entry.rtmp.streamname=HX26g-NRbx9&entry.info.bitrate=1500
    &entry2.rtmp.streamname=HX26g-uVn3M&entry2.info.bitrate=800
    &entry3.rtmp.streamname=HX26g-VbAxm&entry3.info.bitrate=200
    &options.adaption.rule=deviationOfMean2&startIndex=2"
  frameborder="0" allowfullscreen width="1280" height="720">
</iframe>
```

---

### Important Notes

**Strict boolean type checking (v2.0.0):**
Boolean parameters must use the string values `"true"` or `"false"`. Numeric values (`0`, `1`) are not accepted and will be ignored.

**Referer binding not supported:**
Secure playback with referer restriction cannot be used with the iframe embed. If the customer needs referer-based security, they must use the nanoPlayer JS SDK instead.

**JWT token security:**
JWT token authentication is supported. Pass the token via the appropriate URL parameter. Refer to the nanoPlayer security documentation for token generation.

---

### Customer Response Guidance

- Always provide the minimal iframe code block with the customer's stream name filled in
- If they want ABR, show the multi-entry example and explain that each stream entry should be a different bitrate of the same content
- If they ask about security with referer binding, explain this is not supported in embed mode and recommend the nanoPlayer JS SDK
- For full configuration options, point them to: https://docs.nanocosmos.net/docs/nanoplayer/nanoplayer_embed_detailed

### Contact nanocosmos support when
- Customer needs referer binding security with embed (not supported — recommend JS SDK)
- Customer reports embed not working after following the correct implementation
- Customer needs advanced configuration not covered by URL parameters