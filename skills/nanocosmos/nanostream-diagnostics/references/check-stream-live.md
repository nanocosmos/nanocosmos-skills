---
id: check-stream-live
audience: customer
category: ingest
triggers:
  - check stream
  - check on stream
  - investigate stream
  - look at stream
  - stream check
  - check if stream is live
  - is the stream live
  - verify stream status
  - confirm stream is streaming
  - stream live check
  - check stream state
  - stream status
  - is stream running
  - stream info
severity_default: MEDIUM
---

## Check Stream Live Status

A reusable diagnostic that verifies whether a stream is truly live and actively ingesting. Use this whenever you need to confirm actual stream state before taking further action — not just what the platform reports, but whether real data is flowing.

This procedure is designed to be called from other references (e.g., `slow-stream-start`) or directly. The stream name must be known first. All scripts use your own organisation's `BINTU_API_KEY` — they work for streams of your own organisation.

**This check is point-in-time only — it has no historical mode.** If the customer's report is tied to a specific past time (not "is it live right now"), a clean result here only proves the stream is live *now*; it says nothing about whether it was live during the reported window. For a report tied to a past time window, contact nanocosmos support — platform monitoring keeps the history needed to check that window; don't conclude the report doesn't match reality from a live check alone.

### Why Two Checks?

The platform state (from `get_stream_info.sh`) can sometimes lag — a stream may show as "live" while the encoder has already stopped. Running the playback probe against the actual stream confirms real ingest activity by pulling real frames — not just GOP, but the actual codec/profile/level/chroma/resolution/bitrate the encoder is really sending, which the platform-state check can never see since that only reflects what was configured. A result means data is flowing; an error means it is not.

**Important:** The `secure`/`unsecure` value refers to **playback JWT token security only** — whether a JWT is required to play the stream back. It has no relation to RTMP ingest authentication.

### Steps

1. **If the stream is a `group`/`daisy` member (per `stream-config-lookup`), check the passthrough instead.** A non-index-0 member never receives its own direct encoder connection — running this check against its own name will falsely look "not live." Resolve to `stream[0]` first (see `stream-config-lookup`'s step 5) and run the checks below against that name.

2. **Get stream info**
   ```bash
   scripts/get_stream_info.sh <stream_name>
   ```
   Returns CSV: `<secure|unsecure>,<live|not live>,<raw state>` — the third column is the platform's raw state (`live` / `ended` / `created`).

3. **If the CSV contains `not live`**
   The stream is offline according to the platform. No further checks are needed.
   → **Result: not live** (if raw state is `ended`, suggest the customer verify their encoder is still broadcasting — in OBS: click "Start Streaming")

4. **If the CSV contains `live` — verify actual ingest**
   Run the appropriate playback probe based on security type:
   - CSV contains `unsecure`:
     ```bash
     scripts/probe_stream_unsecure.sh <stream_name>
     ```
   - CSV contains `secure` (the probe generates a JWT to access the playback stream for measurement — same stream, different access method):
     ```bash
     scripts/probe_stream_secure.sh <stream_name>
     ```

5. **Interpret the probe output**
   - **Returns a CSV line** (`<gop_seconds>,<video_codec>,<profile>,<level>,<chroma>,<w>x<h>,<video_bitrate>,<audio_codec>,<audio_bitrate>`): the stream is genuinely live and ingesting. The first field is the average keyframe distance (GOP length) in seconds; the rest is what the encoder is actually sending, useful for catching an unnoticed config drift (wrong profile/level, unexpected chroma, resolution/bitrate mismatch) alongside the liveness answer.
     → **Result: live, GOP = `<first field>`** (report the remaining fields too when the question concerns quality/config, not just liveness)
   - **Returns an error**: the platform state is stale — the encoder has stopped even though the platform still shows "live".
     → **Result: not live (stale state)**

### Output to Pass to the Calling Procedure

- `status`: `live` or `not live`
- `reason`: `platform_offline` | `truly_live` | `stale_state`
- `gop_seconds`: the GOP value if live, otherwise `null`
- `security_type`: `secure` | `unsecure` | `unknown`

### GOP Interpretation (direct GOP questions)

GOP length and keyframe distance are the same metric — the average time in seconds between I-frames. When someone asks for a stream's GOP directly:
- Report the measured value
- ≤ 2 seconds is the recommended range; > 2 seconds may cause slow stream startup for viewers (a viewer may wait up to that many seconds before playback begins)
- To fix: **OBS**: Settings → Output → Encoding → Keyframe Interval = `2`; **other encoders**: look for Keyframe Distance, GOP Size, or I-Frame Interval

### Contact nanocosmos support when
- Script fails to execute or returns unexpected output
- Platform reports `live` but the playback probe returns an error consistently across retries

### Scope
These scripts reach only streams of the organisation whose API key is configured — your own.
