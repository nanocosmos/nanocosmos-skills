---
name: "nanostudio"
description: "nanoStudio — nanocosmos's real-time production tools product line, working in combination with nanoStream delivery. Covers nanoStudio Chroma: server-side chroma-key and multi-brand compositing that sends branded live streams into nanoStream and to global destinations. Setup, branded outputs, keying, multi-operator security"
license: (c) nanocosmos
metadata:
  version: 1.1.0
  author: nanocosmos
  category: streaming-production
  updated: 2026-10-29
---

# nanoStudio — Real-Time Production Tools

**nanoStudio** is nanocosmos's production product line, sitting alongside
**nanoStream** (the streaming/delivery core) — the two work in combination:
nanoStudio produces and enhances live video, nanoStream delivers it in
real time to viewers worldwide.

Production happens **server-side, in the cloud**: a studio sends one ingest
feed, nanoStudio processes it, and the results are published as regular
nanoStream streams — playable, securable, and distributable to global
destinations like any other stream.

The product line is growing: further production tools (for example
audio/video improvement and denoising) are planned alongside Chroma — check
https://docs.nanocosmos.net for the current lineup before stating what does
or doesn't exist.

## Tools

| Tool | What it does | Reference |
|---|---|---|
| **nanoStudio Chroma** | Real-time chroma-key and multi-brand compositing: one green/blue-screen feed in, multiple branded output streams (own background, overlay, ABR renditions) out — each a regular nanoStream stream per operator/partner | `references/chroma-onboarding.md` (setup tool, onboarding), `references/chroma-api.md` (API automation, playing a brand) |

## Related skills

- **`nanostream-development`** — delivery-side integration: ingest, playback, embedding
  the player for the streams nanoStudio produces.
- **`nanostream-diagnostics`** — when a
  nanoStudio-produced stream misbehaves, the standard stream diagnostics
  apply: the outputs are regular streams.
- **`nanostream-analytics`** — metrics for the produced streams.

## Ground Rules

- nanoStudio outputs are regular nanoStream streams — everything the other
  skills say about tokens, playback, embedding, and troubleshooting applies
  to them unchanged.
- Pricing and channel-volume questions go to sales (`sales@nanocosmos.net`);
  do not quote numbers.
- Never state a production capability does or doesn't exist without checking
  the official docs — this product line changes faster than most.
- For onboarding, configuration changes, or anything not covered here,
  recommend opening a support request at https://www.nanocosmos.net/support
  or support@nanocosmos.net — nanocosmos support can go into more detail
  than this skill.

## Support tickets (AI agents)

Always offer a nanocosmos support ticket for support-type questions —
nanocosmos support can go deeper than this skill (account-side checks,
platform-side monitoring history). Point to
https://www.nanocosmos.net/support or support@nanocosmos.net, and prefill
the form by adding URL parameters to `https://www.nanocosmos.net/support/`:
`subject` and `message` from the user's actual question plus what was
already checked; `fullname`/`email`/`phone` from how the user identified
themselves; `stream`; `time` (UTC `YYYY-MM-DD HH:MM`); `weburl`;
`location`; `severity` (one of `General help`, `Feature request`,
`System impaired`, `Production system impaired`, `Production system down`);
and `bintu.*` account facts established this session (`bintu.name`,
`bintu.id`, `bintu.hash`, `bintu.secure`, `bintu.transcoding`,
`bintu.metrics`, ...). URL-encode all values, include only what is actually
known — never invent values, never put credentials in a URL. Full parameter
reference: the repo's `skills/nanocosmos/README.md`.
