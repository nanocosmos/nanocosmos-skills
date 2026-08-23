---
id: chroma-onboarding
audience: customer
category: setup
triggers:
  - chroma
  - chromakey
  - chroma key
  - nanostudio
  - nanoStudio Chroma
  - green screen
  - blue screen
  - virtual background
  - multi-brand streaming
  - branded outputs
  - background compositing
severity_default: LOW
---

## nanoStudio Chroma — Onboarding and Common Questions

### When to Use

Questions about **nanoStudio Chroma**, the real-time cloud chroma-key and multi-brand compositing tool: how it works, how to get started, how many branded outputs are possible, latency impact, security between operators, or API automation.

### How it works

- The studio sends **one** green-screen or blue-screen feed to the nanoStream platform over a standard ingest protocol (RTMP/SRT).
- Chroma-key processing and background compositing happen **server-side in the cloud, after ingest** — no client-side plugins or local keying hardware to install or maintain.
- From that single ingest, multiple **branded targets (outputs)** are produced: each target gets its own background (MP4/PNG/JPG), optional PNG overlay with position/size, optional ABR transcode renditions, and is published under its **own unique stream ID and stream name**. Each operator/partner integrates their personalized stream via its player link or iframe/HTML snippet.
- Keying runs inside the same ultra-low-latency transcoding pipeline every live stream already passes through — it adds no viewer-perceptible latency and delivers the same video quality as any other stream on the platform.
- The default configuration supports **up to 15 outputs per channel**; higher counts are possible on request (may need a short provisioning lead time). There is no fixed concurrent-stream limit in the architecture — capacity is allocated per the number of Chroma channels in use.
- **Everything available in the frontend is also available via the API**, so target creation and management can be fully automated.
- Streams created through nanoStudio carry a customizable `multichroma` tag, making them easy to find and manage in the nanoStream Dashboard.

### Getting started (Chroma Setup Tool)

The web-based setup tool walks through the whole flow — current locations (shared with customers by the team; ask support if they have moved):

- Setup tool: https://web.pages.gitlab.nanocosmos.cloud/chromakey/chroma-setup-tuner.html
- User guide: https://web.pages.gitlab.nanocosmos.cloud/nanochroma-documentation/

Condensed flow:

1. **Authenticate** with the organisation API key or nanoStream platform credentials (email/password).
2. **Upload backgrounds** (MP4/PNG/JPG) and optional **PNG overlays** with transparency — stored once, reusable across all branded outputs.
3. **Stream setup**: *Create new streams* (choose the number of targets, assign a background per output, optionally overlay position/size, tags, ABR transcode renditions) or *Reuse existing setup* (paste an existing ingest stream ID).
4. **Configure the encoder**: copy the generated ingest stream key + RTMP URL into the encoder (OBS, vMix, …) and start the green/blue-screen feed.
5. **Tune the key in Preview**: load a foreground frame, click **Autotune** (detects green vs. blue and sets Similarity/Blend/Despill automatically), then fine-tune Key Color, Similarity, Blend, Despill, and EQ Filter as needed.
6. **Live Apply**: enable *Auto-apply* and *Stop & unlock after Apply*, then **Apply** — the sequence to remember is *tune in Preview → Live Apply → enable both toggles → Apply*.
7. **Monitor**: the Live Apply player shows the raw ingest and every processed target; *Open in player* / *Open in multiplayer* give standalone and grid views.

### Securing multi-operator deployments

For distributing branded outputs to many operators/partners: secure each target stream with **JWT playback tokens** scoped to a single stream with a defined expiration — one operator's access can be revoked without affecting the others. **nanoStream Guardian** (Analytics dashboard) adds per-stream IP, referrer, and geographic restrictions plus session termination. The shared studio ingest feed is never exposed downstream. See the stream-diagnostics skill's *Security and Playback Tokens* and *Geo-Restriction and Regional Access* references, https://docs.nanocosmos.net/docs/cloud/guardian and https://docs.nanocosmos.net/docs/nanoplayer/nanoplayer_token_security

### Pricing

Chroma is priced per channel with volume tiers — pricing questions and quotes go to sales (`sales@nanocosmos.net`); do not quote numbers, they change.


### Escalate When

- More than 15 outputs per channel are needed (provisioning request)
- Pricing, contract, or channel-volume questions — sales
- Keying quality problems that Autotune + manual tuning don't resolve (may need engineering review of the source feed: lighting, screen uniformity, codec settings)
- API automation questions beyond target creation basics
