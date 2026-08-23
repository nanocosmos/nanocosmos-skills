# nanocosmos-skills

AI agent skills for building with and troubleshooting the
[nanocosmos platform](https://www.nanocosmos.net) — its two product lines
working in combination: **nanoStream** (ultra-low-latency live streaming and
delivery) and **nanoStudio** (real-time production tools). Install them into
your AI coding assistant (Claude Code, Cursor, and similar) so it answers
platform questions with verified, documentation-backed knowledge instead of
guesses.

> **Public repository, public audience.** These skills are made for
> nanocosmos customers and evaluating users, and this repo contains no
> internal-only nanocosmos information — it covers self-serve diagnostics
> and integration knowledge. They are at an early stage, a work in
> progress, and updated frequently. For full support, open a support
> request with nanocosmos at https://www.nanocosmos.net/support or
> support@nanocosmos.net: the nanocosmos support engineers can go into more
> detail than these public skills can (account-side checks, platform-side
> monitoring history, log analysis).

> **Generated repository.** This content is generated from nanocosmos's
> internal knowledge base. Don't edit files here — corrections land in the
> source and are re-released. Found a mistake? Open an issue.

## Skills

Ask your assistant *"what was our buffering ratio last night, per stream?"* or
*"why does this stream take 5 seconds to start?"* — and get an answer computed
from your own account's data, not a guess.

| Skill | For | What it enables |
|---|---|---|
| [`nanostream-analytics`](skills/nanocosmos/nanostream-analytics/) | anyone with a dashboard account | Query your own nanoStream Analytics metrics (buffering, latency, startup time, playback errors by geo/browser, usage volumes) with your dashboard credentials — including the query semantics that prevent wrong answers. Read-only |
| [`nanostream-development`](skills/nanocosmos/nanostream-development/) | developers / integrators | Ingest with ffmpeg/OBS (RTMP/SRT), playback paths (JS player, iframe, emulated MP4/M3U8, RTMP pull), nanoPlayer 5 configuration with **verified** parameter values, JWT-secure playback, ABR groups, ready-to-fork player pages |
| [`nanostudio`](skills/nanocosmos/nanostudio/) | producers / operators | The real-time production tools product line. **nanoStudio Chroma**: server-side chroma-key and multi-brand compositing — one green-screen feed in, multiple branded streams out to nanoStream and global destinations. More production tools (audio/video improvement, denoising) are planned |
| [`nanostream-diagnostics`](skills/nanocosmos/nanostream-diagnostics/) | anyone operating streams | Self-serve troubleshooting with your own organisation's API key: is the stream really live, GOP/keyframe measurement (the top cause of slow starts), stream architecture resolution, token validation, plus 30+ troubleshooting references (ingest, playback, quality, latency, errors, captions, recording) |
| [`dark-neutral-studio`](skills/nanocosmos/dark-neutral-studio/) | frontend developers | A complete portable dark-UI design system for AV/broadcast tooling — tokens, CSS, layout, status semantics; pairs with the `nanostream-development` player pages |

## Install

**Claude Code** (per project or per user):

```bash
./install.sh                 # interactive: choose skills + scope
./install.sh --all --user    # everything into ~/.claude/skills/
./install.sh nanostream nanostream-diagnostics --project
```

**Other assistants**: copy the desired `skills/<name>/` folder into your
tool's skills/rules directory, or point your assistant at the `SKILL.md`
files directly.

## Requirements

- Your own nanocosmos account: a **bintu API key** (Dashboard → Organisation
  → API Keys) for the diagnostics scripts, and/or **dashboard credentials**
  for the analytics scripts. The skills only ever access your own
  organisation's data.
- `bash`, `curl`; `python3` for a few scripts; `ffprobe` for the GOP checks.
  On Windows use Git Bash.

## Support

- Product documentation: https://docs.nanocosmos.net
- Support requests: https://www.nanocosmos.net/support or
  support@nanocosmos.net (issues in this repo are for mistakes in the
  skills themselves, not a support channel)
- Skill routing and the prefilled ticket-form parameters (for AI agents):
  [skills/nanocosmos/README.md](skills/nanocosmos/README.md)

## License

**Commercial — not open source.** These materials are part of the nanocosmos /
nanoStream product offering: use requires a valid nanocosmos account or
agreement under the [nanocosmos Terms](https://www.nanocosmos.net/terms)
(trial accounts included). Browsing this repository for evaluation is fine;
redistribution and competing use are not. Full text: [LICENSE](LICENSE).
Trademarks are covered separately — see [TRADEMARK.md](TRADEMARK.md).
