# nanocosmos-skills

**Skills that teach your AI coding assistant the nanocosmos platform.**
Install them once, and Claude Code (or Cursor, Copilot, and similar tools)
answers questions about [nanoStream](https://www.nanocosmos.net) and
nanoStudio with verified, documentation-backed knowledge — and can run checks
against your own account instead of guessing.

Public home: https://github.com/nanocosmos/nanocosmos-skills

## What this is, in plain words

A *skill* is a folder with a `SKILL.md` file (instructions written for an AI
assistant) plus, where useful, small scripts and reference documents. Your
assistant reads a skill only when a question matches it, so installing all of
them costs nothing until they are needed. The scripts are ordinary `bash` and
`python3` files you can read before running; they call the public nanocosmos
APIs with **your** credentials and only ever reach **your own organisation's**
streams and metrics.

With the skills installed you can ask things like:

- *"Is my stream `XXXXX-YYYYY` really live, and why does it take five seconds to start?"*
- *"Give me a working nanoPlayer 5 config for secure playback of this stream."*
- *"What was our buffering ratio last night, per stream and per country?"*
- *"How do I set up nanoStudio Chroma for three branded outputs from one green-screen feed?"*
- *"Build me a dark, broadcast-style control panel for this player page."*

What the skills are **not**: a support channel, and not a replacement for the
[documentation](https://docs.nanocosmos.net). They are made for nanocosmos
customers and evaluating users, are updated frequently, and contain no
internal-only nanocosmos information. When a question needs account-side
checks or platform-side monitoring, the skills say so and point you to
[support](https://www.nanocosmos.net/support).

> **Generated repository.** Everything here is generated from nanocosmos's
> internal knowledge base and re-released on every sync. Don't edit files
> here — corrections land in the source. Found a mistake? [Open an issue](https://github.com/nanocosmos/nanocosmos-skills/issues).

## Skills

| Skill | For | What it enables |
|---|---|---|
| [`nanostream-analytics`](skills/nanocosmos/nanostream-analytics/) | anyone with a dashboard account | Query your own nanoStream Analytics metrics (buffering, latency, startup time, playback errors by geo/browser, usage volumes) with your dashboard credentials — including the query semantics that prevent wrong answers. Read-only |
| [`nanostream-development`](skills/nanocosmos/nanostream-development/) | developers / integrators | Ingest with ffmpeg/OBS (RTMP/SRT), playback paths (JS player, iframe, emulated MP4/M3U8, RTMP pull), nanoPlayer 5 configuration with **verified** parameter values, JWT-secure playback, ABR groups, ready-to-fork player pages |
| [`nanostudio`](skills/nanocosmos/nanostudio/) | producers / operators | The real-time production tools product line. **nanoStudio Chroma**: server-side chroma-key and multi-brand compositing — one green-screen feed in, multiple branded streams out to nanoStream and global destinations. More production tools (audio/video improvement, denoising) are planned |
| [`nanostream-diagnostics`](skills/nanocosmos/nanostream-diagnostics/) | anyone operating streams | Self-serve troubleshooting with your own organisation's API key: is the stream really live, GOP/keyframe measurement (the top cause of slow starts), stream architecture resolution, token validation, plus 30+ troubleshooting references (ingest, playback, quality, latency, errors, captions, recording) |
| [`dark-neutral-studio`](skills/nanocosmos/dark-neutral-studio/) | frontend developers | A complete portable dark-UI design system for AV/broadcast tooling — tokens, CSS, layout, status semantics; pairs with the `nanostream-development` player pages |

## Install

**Claude Code — as a plugin (recommended).** One install, all five skills,
updated together, invoked as `nanocosmos:<skill>`:

```bash
claude plugin marketplace add nanocosmos/nanocosmos-skills
claude plugin install nanocosmos@nanocosmos
```

Working from a local clone instead? `claude plugin marketplace add
/path/to/nanocosmos-skills` does the same.

**Claude Code — individual skills** (per project or per user):

```bash
git clone https://github.com/nanocosmos/nanocosmos-skills.git
cd nanocosmos-skills
./install.sh                 # interactive: choose skills + scope
./install.sh --all --user    # everything into ~/.claude/skills/
./install.sh nanostream-development nanostream-diagnostics --project
```

**Other assistants** (Cursor, Copilot, Windsurf, …): copy the desired
`skills/nanocosmos/<name>/` folder into your tool's skills or rules directory,
or point your assistant at the `SKILL.md` files directly.

## First steps

1. **Credentials, once.** The diagnostics scripts need your organisation's
   bintu API key (Dashboard → Organisation → API Keys); the analytics scripts
   need a dashboard login or an access token. Create the credential file with

   ```bash
   bash skills/nanocosmos/nanostream-diagnostics/scripts/init_env.sh \
        skills/nanocosmos/nanostream-analytics/scripts/.env.example
   ```

   and fill in `~/.config/nanocosmos/.env` (same path on macOS, Linux and
   Windows with Git Bash; it survives plugin updates). Exporting the variables
   in your shell works too. Prefer an expiring access token over the raw key
   wherever a credential leaves your machine — the diagnostics skill explains
   how (`create_access_token.sh`).
2. **Ask.** Start a session and ask a question from the list above, or say
   *"use the nanocosmos diagnostics skill to check stream XXXXX-YYYYY"*.
3. **Update.** New syncs land on every push; pick them up with

   ```bash
   claude plugin marketplace update nanocosmos && claude plugin update nanocosmos
   ```

   (`git pull` for a clone; re-run `install.sh` for copied skills.)

## Requirements

- Your own nanocosmos account (trial accounts included): a **bintu API key**
  for the diagnostics scripts and/or **dashboard credentials** for the
  analytics scripts. The skills only ever access your own organisation's data.
- `bash`, `curl`; `python3` for a few scripts; `ffprobe` (ffmpeg) for the
  keyframe/GOP checks and recordings; Node ≥ 18 only for the optional `.js`
  variants. On Windows use Git Bash.

## Privacy and security

- Credentials stay on your machine. No script sends anything anywhere except
  the nanocosmos APIs you are calling; there is no telemetry in this repo.
- Never paste API keys or tokens into chat, tickets, web pages or client-side
  code — the skills tell your assistant the same.
- The analytics scripts are read-only. Use a read-only dashboard account for
  them where possible.
- Scripts are plain text: read anything before you run it, as with any
  third-party code.

## Support and feedback

- Product documentation: https://docs.nanocosmos.net
- Support requests: https://www.nanocosmos.net/support or
  support@nanocosmos.net — this is where questions about *your* streams and
  account belong. GitHub issues in this repo are for mistakes in the skills
  themselves (wrong parameter, outdated statement, broken script), not a
  support channel.
- Pull requests are welcome as suggestions, but cannot be merged here
  directly: this repository is generated. Accepted changes are ported into the
  source and appear with the next sync, with credit in the changelog.
- Skill routing and the prefilled ticket-form parameters (for AI agents):
  [skills/nanocosmos/README.md](skills/nanocosmos/README.md)

## License

**Commercial — not open source.** These materials are part of the nanocosmos /
nanoStream product offering: use requires a valid nanocosmos account or
agreement under the [nanocosmos Terms](https://www.nanocosmos.net/terms)
(trial accounts included). Browsing this repository for evaluation is fine;
redistribution and competing use are not. Full text: [LICENSE](LICENSE).
Trademarks are covered separately — see [TRADEMARK.md](TRADEMARK.md).
