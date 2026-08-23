---
id: youtube-facebook-restream
audience: customer
category: setup
triggers:
  - restream to youtube
  - restream to facebook
  - youtube live restreaming
  - facebook live restreaming
  - push url
  - push_url
  - simulcast
  - multistream
  - stream to youtube and facebook
  - youtube live dashboard
  - facebook stream key
  - RTMPS facebook
severity_default: LOW
---

## YouTube and Facebook Live Restreaming (Push URL)

### When to Use
A customer wants to restream their nanoStream broadcast out to YouTube Live and/or Facebook Live, or asks about the bintu "push URL" feature. Full API reference: https://bintu.nanocosmos.de/doc/#stream-push-url

### Core Mechanism
Both platforms use the same bintu API call — set a **push URL** on the stream, and bintu forwards (restreams) the broadcast to that destination:

```bash
curl -H "Content-Type: application/json" -H "X-BINTU-APIKEY: YOUR_BINTU_API_KEY" -X PUT \
  -d "{\"url\":\"<destination_rtmp_url>\"}" \
  https://bintu.nanocosmos.de/stream/YOUR_BINTU_STREAM_ID/push_url
```

- `YOUR_BINTU_API_KEY` — a bintu API key.
- `YOUR_BINTU_STREAM_ID` — the bintu **stream ID**, not the stream key/stream name. These are frequently confused — the stream ID is what goes in the URL path here; the stream key/name is what the customer's encoder publishes as.

**If the stream is part of a transcode group or daisy chain (not a `single` stream), the push URL must be set on the LAST transcode stream in that setup — never on the passthrough (index 0) or a middle member.** Use `stream-config-lookup` first to resolve the stream's `type` and enumerate its members: for `group`, that's the highest-index entry; for `daisy`, that's the final stream at the end of the chain (the one whose own `pushUrl` is what actually gets used, per that skill's push-precedence rules). Setting the push URL on the wrong member (e.g. the passthrough) will not produce the expected restream.

Only `<destination_rtmp_url>` differs between YouTube and Facebook — see below.

### A) YouTube
1. On the YouTube Live Dashboard (https://www.youtube.com/live_dashboard), under **Encoder Settings**, copy the **RTMP Server URL** and **Stream Name/Key** separately.
2. Concatenate them into one URL: `<RTMP Server URL>/<Stream Name>` — e.g. `rtmp://a.rtmp.youtube.com/live2` + `aaaa-bbbb-cccc-dddd` → `rtmp://a.rtmp.youtube.com/live2/aaaa-bbbb-cccc-dddd`.
3. Set this as the push URL via the API call above, using the correct stream ID per the group/daisy rule above if applicable.

**Important operational caveat — this is the most common failure mode, not a one-time setup step:** bintu's push URL implementation resolves and stores the destination's **IP address at the time the push URL is set**, not the domain name. YouTube's `a.rtmp.youtube.com` resolves to different IPs frequently, so a push URL that worked initially can silently start failing once YouTube's IP changes. The fix is to **re-set the push URL periodically** (re-resolving the domain fresh each time) rather than setting it once and assuming it stays valid indefinitely. If a customer reports "restreaming to YouTube worked, then stopped," this IP-staleness issue is the first thing to check — not a bug on nanoStream's side.

### B) Facebook Live
Facebook requires RTMPS, and bintu supports this restreaming to Facebook with one specific substitution: replace Facebook's actual RTMPS endpoint `rtmps://live-api-s.facebook.com:443/rtmp/` with `rtmp://127.0.0.1:8443/rtmp/` when constructing the push URL — this loopback address is bintu's internal handler for the RTMPS connection to Facebook, not a literal external address.

```bash
curl -X PUT -H "content-type: application/json" \
  -H "X-BINTU-APIKEY: YOUR_BINTU_API_KEY" \
  -d "{\"url\":\"rtmp://127.0.0.1:8443/rtmp/YOUR_FACEBOOK_STREAM_KEY\"}" \
  https://bintu.nanocosmos.de/stream/YOUR_BINTU_STREAM_ID/push_url
```

`YOUR_FACEBOOK_STREAM_KEY` is obtained from Facebook's own live producer/streaming setup. The same group/daisy last-member rule above applies here too.

### C) Simultaneous YouTube + Facebook
**Not currently possible.** Each bintu stream supports only **one push URL at a time** — a customer wanting both destinations simultaneously would need to restream to one platform directly via bintu's push URL, and handle the second destination through some other means (e.g. a separate encoder output, or a third-party restreaming/simulcast tool) — this isn't something bintu's push URL feature can do on its own.

### Customer Response Guidance
- Always clarify stream ID vs. stream key/name if the customer seems to be mixing them up — it's a frequent point of confusion in this API.
- **If the customer's stream is a `group` or `daisy` setup, run `stream-config-lookup` first** to identify the correct (last) member to set the push URL on before giving any push URL instructions — don't assume the stream ID they mention is the right target.
- For YouTube setups, proactively mention the IP-staleness caveat rather than waiting for the customer to report an unexplained failure later.
- For Facebook, give the exact `rtmp://127.0.0.1:8443/rtmp/` substitution — don't let a customer try to push directly to Facebook's real RTMPS URL, it won't work through this mechanism.
- If asked for simultaneous multi-platform restreaming, say clearly that it's not supported today rather than implying a workaround exists within bintu.

### Contact nanocosmos support when
- Customer needs simultaneous restreaming to multiple destinations from one stream — not supported, would need a feature request or an external multistreaming solution
- YouTube restreaming fails after initially working and the customer has already re-set the push URL with a fresh resolution — may indicate something else is wrong, worth deeper investigation
- Push URL was set correctly on the last transcode member (verified via `stream-config-lookup`) but restreaming still doesn't work — needs deeper investigation rather than assuming customer error
- Customer needs restreaming to a platform other than YouTube/Facebook — confirm whether the same generic push URL mechanism applies before assuming it does
