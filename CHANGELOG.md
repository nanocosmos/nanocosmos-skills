# Changelog

## 2026-10-23 sync

Public home is now https://github.com/nanocosmos/nanocosmos-skills; the README
was rewritten for an outside audience and the internal review notes removed.

- `nanostream-diagnostics` 2.20.0 → 2.23.0 — credentials can live in the
  user-level `~/.config/nanocosmos/.env` (same path on macOS, Linux and
  Windows; survives plugin updates), created by the new `init_env.sh`;
  `NANOCOSMOS_ENV_FILE` override. `get_stream_config.py`, `env.py` and
  `parse_probe_output.py` split out of the bash scripts. New helpers:
  `record_rtmp_flv.sh` (RTMP pull recording with log), `relay_stream.sh`
  (restream with ffmpeg), `set_stream_captions.sh`, `set_stream_processing.sh`,
  `setup_restream_captions.sh`/`.js` (Live Captions, Live Processing,
  restream setups). Token-generation, security-tokens and check-stream-live
  references updated; keyless `/stream/<id>` route semantics documented.
- `nanostream-analytics` 1.2.0 → 1.3.2 — query-semantics additions, including
  how to read a `101004` error (range limit vs. malformed date); same
  credential-file change as above.
- `nanostream-development` 1.3.3 → 1.3.6 — ingest vs. playout stream names,
  keyless route behaviour, credential-file note in `api-authentication.md`.

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
