---
name: "nanostudio"
description: "nanoStudio — nanocosmos's real-time production tools product line, working in combination with nanoStream delivery. Covers nanoStudio Chroma: server-side chroma-key and multi-brand compositing that sends branded live streams into nanoStream and to global destinations. Setup, branded outputs, keying, multi-operator security"
license: (c) nanocosmos
metadata:
  version: 1.0.2
  author: nanocosmos
  category: streaming-production
  updated: 2026-08-24
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
| **nanoStudio Chroma** | Real-time chroma-key and multi-brand compositing: one green/blue-screen feed in, multiple branded output streams (own background, overlay, ABR renditions) out — each a regular nanoStream stream per operator/partner | `references/chroma-onboarding.md` |

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

## Filing a support ticket for the user (AI agents)

Whenever the user has asked a support-type question, offer a nanocosmos
support ticket as a next step — not only when you are stuck. Even a resolved
question may deserve confirmation or a deeper platform-side check by
nanocosmos support.

Go one step further than the bare link: build a **prefilled ticket URL** from
what the conversation has already established, and give it to the user to
review, complete, and send (or open it directly, if you can open URLs).
Base URL: `https://www.nanocosmos.net/support/`

Rules: URL-encode every value. Include only what is actually known from the
conversation or from checks run in this session — omit unknown parameters
rather than inventing values. Never put API keys, tokens, or passwords in a
URL.

| Parameter | Value |
|---|---|
| `subject` | One-line summary of the user's actual question |
| `message` | The problem as the user described it, plus what was already checked and the results |
| `fullname`, `email`, `phone` | How the user identified themselves in the conversation |
| `stream` | Stream name (`XXXXX-YYYYY`) |
| `time` | When the problem occurred, UTC (`YYYY-MM-DD HH:MM`) |
| `weburl` | The page where the problem is visible |
| `location` | Region of the affected viewers or ingest |
| `severity` | One of the form's options: `General help`, `Feature request`, `System impaired`, `Production system impaired`, `Production system down` (partial text is matched); omit if unsure |
| `bintu.name` / `bintu.id` | Stream name / stream UUID |
| `bintu.hash` | Organisation hash (the part of the stream name before the dash) |
| `bintu.secure`, `bintu.h5live`, `bintu.hls`, `bintu.webrtc`, `bintu.transcoding`, `bintu.vod`, `bintu.trial`, `bintu.metrics`, `bintu.sla`, `bintu.webhook` | Account/stream facts this session actually established — true/false flags, plan names, the customer's own configured webhook URL |

Example (placeholder values — always replace them with the customer's real
ones):

```
https://www.nanocosmos.net/support/?subject=Playback%20stalls%20on%20H5Live&message=Stream%20buffers%20every%2010%20seconds%20since%2009%3A00%20UTC.%20GOP%20checked%3A%202s%20average.&stream=ABC12-XYZ34&bintu.hash=ABC12&bintu.secure=true&severity=Production%20system%20impaired&fullname=Jane%20Doe&email=jane%40example.com&time=2026-08-24%2009%3A00&location=Europe%2C%20Germany
```

The prefill saves the first round-trip; the user can edit everything before
sending.
