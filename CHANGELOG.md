# Changelog

## Unreleased (branch feature/nanoplayer-demo-skill)

- `nanoplayer-demo` 2.0.0: demos play by `source.group.id` by default
  (`?stream=` opt-in), carry their whole nanoPlayer config as a commented
  `PLAYER_CONFIG` plus an on-page Configuration panel (copyable, tokens
  redacted), and follow the nanoPlayer 5.0.13 docs (startQuality, autoplay
  with automute, letterbox, no hardcoded serverDomain, bitrate in bit/s,
  buffer delay vs target, readable error codes). Breaking helper API change.
- `nanoplayer-demo` 1.0.0 (new): nanoPlayer demo templates (single player,
  feature showcase, multi-player, diagnostics, branded page, feature wrapper),
  the tested `NanoDemo` helper library and `SwitchPlayer` wrapper,
  `new-demo.mjs` / `check-demo.mjs`, best practices and a done-checklist.
  Templates use `product-theme.css` from `nanocosmos-brand-guidelines`.

## 2026-09-26 sync

Cumulative sync of source changes accumulated since 0.1.0 — the changelog
wasn't updated on every intermediate sync; going forward each sync gets its
own dated entry here.

- `nanostream-diagnostics` 2.10.0 → 2.20.0 — `check_gop_secure.sh` /
  `check_gop_unsecure.sh` renamed to `probe_stream_secure.sh` /
  `probe_stream_unsecure.sh`: now also reports video/audio codec, profile,
  level, chroma subsampling, resolution and bitrate alongside GOP, not just
  the keyframe interval. New `ingest-regional-routing-issues.md` reference
  and `create_access_token.sh` script. Several other reference updates.
- `nanostream-analytics` 1.1.0 → 1.2.0 — unified `NANOSTREAM_EMAIL` /
  `NANOSTREAM_PASSWORD` credential precedence across scripts;
  `NANO_API_TOKEN` accepted as an alternative to email/password login.
- `nanostream-development` 1.2.6 → 1.3.3 — new `api-authentication.md`
  reference and `send_test_stream.sh` script.
- `dark-neutral-studio` 1.0.1 → 1.1.0, `nanostudio` 1.0.0 → 1.0.3 — SKILL.md
  updates (no detailed per-change history recorded for these two before
  this changelog was refreshed).

## 0.1.0 — 2026-08-23

Initial generated release candidate:

- `nanostream-analytics` 1.1.0 — query your own Analytics metrics with your dashboard account (API spec, endpoint map, query semantics, auth/query scripts)
- `nanostream-development` 1.2.6 — player 5 integration, ingest, playback, demo player pages
- `nanostudio` 1.0.0 — the production-tools product line: nanoStudio Chroma (server-side chroma-key / multi-brand compositing) onboarding and troubleshooting
- `nanostream-diagnostics` 2.10.0 — self-serve diagnostics scripts + 36 troubleshooting references (the public tier of nanocosmos's support knowledge base; version tracks that source)
- `dark-neutral-studio` 1.0.1 — portable dark AV-workbench UI design system
