# nanocosmos skills — layout, routing, support

Each folder here is one AI-agent skill: `SKILL.md` is the entry point the
assistant reads, `scripts/` are runnable tools, `references/` are on-demand
knowledge files. For repo browsing the skills live under
`skills/nanocosmos/<name>/`; the plugin manifest in `.claude-plugin/` points
Claude Code at them, and the generic installers or the repo root's
`install.sh` flatten each chosen skill to `<skills-root>/<name>/` for tools
that discover skills only directly under their skills root. The install
routes are listed in the repository README.

## Which skill for which question

| Skill | Use when |
|---|---|
| [`nanostream-development`](nanostream-development/) | Building and integrating: ingest with ffmpeg/OBS (RTMP/SRT), playback paths, nanoPlayer configuration, embedding, JWT-secured playback, ABR groups |
| [`nanostream-diagnostics`](nanostream-diagnostics/) | "Why is this stream broken": is it really live, GOP/keyframe measurement, stream architecture, token validation, 30+ troubleshooting references |
| [`nanostream-analytics`](nanostream-analytics/) | Numbers from your own account via the Analytics API: playtime, buffering ratio, latency, startup time, playback errors, usage volumes |
| [`nanostudio`](nanostudio/) | Real-time production tools: nanoStudio Chroma — server-side chroma-key and multi-brand compositing into nanoStream delivery |
| [`dark-neutral-studio`](dark-neutral-studio/) | Styling AV/broadcast frontends: a portable dark-UI design system |

The skills combine: a production question often spans `nanostudio`
(compose) + `nanostream-development` (deliver) + `nanostream-diagnostics`
(troubleshoot).

## Getting support — and the prefilled ticket form

General support: **https://www.nanocosmos.net/support** or
**support@nanocosmos.net**. nanocosmos support can go deeper than these
skills — account-side checks, platform-side monitoring history, log
analysis. Open a ticket for anything unresolved, and even for a resolved
finding that deserves a platform-side confirmation.

**AI agents:** don't stop at the bare link — build a **prefilled ticket
URL** from what the conversation established and give it to the user to
review and send (or open it, if you can open URLs). Base:
`https://www.nanocosmos.net/support/` plus query parameters.

Rules: URL-encode every value. Include only what is actually known from the
conversation or from checks run in the session — omit unknown parameters
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
| `severity` | One of the form's options: `General help`, `Feature request`, `System impaired`, `Production system impaired`, `Production system down` (partial text is matched) — omit if unsure |
| `bintu.name` / `bintu.id` | Stream name / stream UUID |
| `bintu.hash` | Organisation hash (the part of the stream name before the dash) |
| `bintu.secure`, `bintu.h5live`, `bintu.hls`, `bintu.webrtc`, `bintu.transcoding`, `bintu.vod`, `bintu.trial`, `bintu.metrics`, `bintu.sla`, `bintu.webhook` | Account/stream facts the session actually established — true/false flags, plan names, the customer's own configured webhook URL. Fields without their own form input are collected into the form's account-details field |

Any `bintu.*` parameter also preselects the platform product in the form's
service dropdown.

Example (placeholder values — always replace them with the customer's real
ones):

```
https://www.nanocosmos.net/support/?subject=Playback%20stalls%20on%20H5Live&message=Stream%20buffers%20every%2010%20seconds%20since%2009%3A00%20UTC.%20GOP%20checked%3A%202s%20average.&stream=ABC12-XYZ34&bintu.hash=ABC12&bintu.secure=true&severity=Production%20system%20impaired&fullname=Jane%20Doe&email=jane%40example.com&time=2026-08-24%2009%3A00&location=Europe%2C%20Germany
```

The prefill saves the first round-trip; the user can edit everything before
sending. Each skill's `SKILL.md` carries a compact version of this guidance
so it works when installed standalone; this page is the full reference.
