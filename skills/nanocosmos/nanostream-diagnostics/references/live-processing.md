---
id: live-processing
audience: customer
category: setup
triggers:
  - live processing
  - cloud recording
  - stream recording
  - VOD recording
  - replay feature
  - clip and share
  - motionclip
  - thumbnails API
  - recording API
  - VOD asset URL
  - recording segment
  - recording 1 hour limit
  - trim recording
  - in and out points
  - ABR VOD playback
  - adaptive bitrate VOD
  - master playlist VOD
severity_default: LOW
---

## Live Processing (Recording / Replay / Thumbnails / Motionclip)

### When to Use
A customer asks about nanoStream's **Live Processing** feature suite — Cloud Recording, Replay (clip-and-share), Thumbnails, or Motionclip — including how to enable it, retrieve VOD assets via API, recording length limits, trimming, or ABR playback of recorded content.

**Live Processing vs. Classic VOD:** these are two distinct recording mechanisms — don't conflate them.
- **Classic VOD** (`rtmp` `/rec/` app): the older mechanism, starts/stops with the stream, 4GB file size limit. **Not the recommended approach for new setups** — superseded by Live Processing.
- **Live Processing recording** (`rec` opcode): the current, recommended mechanism. Enabled per stream via Dashboard or Bintu API, segments every 1 hour by design (see below), duration is customer-configurable but always auto-segmented.

If a customer is choosing between the two for a new setup, recommend Live Processing recording — only mention Classic VOD to explain legacy behavior or when a customer is already relying on it.

### Key Concepts

**Enabling is per stream, not per group.** The [processing API](https://doc.pages.nanocosmos.de/bintuapi-docs/#operation/processing) enables/disables Live Processing (recording, thumbnails, motionclip) on one stream at a time. For a `group`/`daisy` setup with a passthrough + N transcode profiles, enabling recording on all of them requires **N+1 separate API calls** — there is no single group-level call.

**Recordings auto-segment every 1 hour.** This is **by design**, not a bug — even if a longer `duration` is explicitly requested (e.g. 12 hours), MP4 recordings still cut into ~1-hour segments (or part thereof), distinguished by a timestamp suffix in the filename. **This is not documented in the public reference docs** — if a customer reports "my recording won't go past 1 hour," this is the expected, by-design answer, not a bug report.

**Trimming (in/out points) is only supported on `replay` (HLS), not on `rec` (MP4).** To let customers set in/out points for what's presented as VOD, use the `replay` feature (Dashboard has a clip-and-share UI for this). Raw MP4 recordings cannot be trimmed via API — trimming must happen client-side (e.g. via player, or post-processing the MP4 file) or via `replay`. Trimming is always **per stream**, not per streamgroup.

**`replay` vs `rec` — choosing the right asset type:**
| | `replay` (HLS) | `rec` (MP4, Live Processing) |
|---|---|---|
| Format | `.m3u8` playlist | `.mp4` file |
| Duration behavior | Continuous until stopped | Auto-segments hourly; not deleted, just rotated |
| Trimming/in-out points | Yes (Dashboard clip-and-share) | No |
| Use case | Ongoing/continuous VOD, trimming needed | Simple downloadable recording, no trimming needed |

**ABR/adaptive-bitrate VOD playback is not natively packaged as a single master manifest.** If a customer has a `group` stream (passthrough + multiple transcode qualities) and wants automatic quality-switching VOD playback (e.g. in JWPlayer), there is no single master `.m3u8` covering all qualities out of the box — each quality's `replay`/`rec` asset is a separate URL. As of the last confirmed status, nanoStream is actively developing broader master-playlist/ABR support for this workflow; in the interim, recommend a **single-stream M3U8** approach, noting that most players (JWPlayer included) won't auto-detect multiple separate M3U8s as ABR renditions without a master playlist — that requires custom client-side logic.

**Classic VOD can produce multiple recordings under the same stream name.** Every time a stream is stopped and restarted, a new VOD MP4 is created under the *same* stream name/ID — not a new stream. In `.playout.web[]`, filter on **`"type": "vod"`** specifically (the array also contains a `"type": "live"` entry that is not a recording). There can be more than two `vod` entries for a single stream — one per start/stop cycle — each distinguished by its `-timestamp` suffix. **nanoStream never merges/combines separate recordings into one file** — if an integration only reads the first or the non-timestamped entry, it will silently miss additional recordings from the same stream.

**Best practice: one stream per event.** To keep recordings cleanly grouped and unambiguous, recommend creating a new stream (new stream name) for each distinct event/session rather than reusing one stream name across unrelated recordings over time.

**VOD retention / auto-deletion is an org-specific internal policy, not universal.** Some organizations have an internal S3 lifecycle policy that auto-deletes VOD files after a set period (e.g. 30 days) — this is **configured per-organization internally, not a default applied to every account**. If a customer reports VOD files missing or "not showing" after some time has passed, **check whether their org has an auto-deletion policy configured** before assuming a display/API bug — don't state a blanket "files delete after 30 days" rule, since it may not apply to that customer's org at all.

### VOD Asset URL Reference

Retrieved via the [Stream Info API](https://doc.pages.nanocosmos.de/bintuapi-docs/#operation/Stream%20Info):

| Processing | Stream Info field | Filename pattern | Description |
|---|---|---|---|
| `thumbs` | `.playout.thumbnails[]` | `stream-name.jpg` | Latest JPG only — no other filenames kept |
| `motionclip` | `.playout.motionclip[]` | `stream-name.gif` | Latest GIF only — no other filenames kept |
| `replay` | `.playout.replay[]` | `replay/stream-name.m3u8` | Latest HLS playlist (same as latest timestamped one) |
| `replay` | `.playout.replay[]` | `replay/stream-name-timestamp.m3u8` | HLS playlist of one specific session |
| `record` (Live Processing — recommended) | `.playout.web[]` | `rec/stream-name.mp4` | Latest MP4 (same as latest timestamped one) |
| `record` (Live Processing — recommended) | `.playout.web[]` | `rec/stream-name-timestamp.mp4` | MP4 of one specific session (max ~1 hour segment) |
| Classic VOD (`rtmp /rec/` app — legacy, not recommended) | `.playout.web[]`, `type: "vod"` | `stream-name.mp4` | Latest MP4 (classic mechanism) |
| Classic VOD (`rtmp /rec/` app — legacy, not recommended) | `.playout.web[]`, `type: "vod"` | `stream-name-timestamp.mp4` | MP4 of one specific recording session — **there can be many of these per stream**, one per start/stop cycle; always enumerate all `type: "vod"` entries, never assume just one or two |

**Known API gap:** `https://bintu-vod.nanocosmos.de/vod/rec/stream-name.mp4` (no `-timestamp` suffix, `rec/` prefix) is directly accessible as a URL but was **not returned by the Stream Info API** — only the `-timestamp` variant was. Verify current API behavior before telling a customer to rely on the non-timestamped URL programmatically.

### Steps
1. **Confirm which Live Processing feature the customer needs**: recording (`rec`), replay/clip-and-share (`replay`), thumbnails, or motionclip.
2. **Check whether it's already enabled** on the relevant stream(s) — remember it's per-stream, so check/enable each transcode profile individually if it's a `group`/`daisy` setup (use `stream-config-lookup` first to enumerate the members).
3. **Retrieve asset URLs** via the Stream Info API using the filename patterns above.
4. **If the customer wants trimming/in-out points** → point them to `replay`, not `rec`.
5. **If the customer wants ABR/quality-switching VOD playback** → explain the current limitation (no master manifest) and recommend the single-stream M3U8 workaround, noting ongoing development.
6. **If a customer reports a playback error on a specific `replay` `.m3u8` URL (especially Safari-specific)** → historically this pointed to a race condition producing an invalid m3u8 playlist under certain conditions (fixed once already). If seen again, treat as a potential regression and escalate rather than assuming it's a one-off client issue.
7. **If a customer is currently using Classic VOD (`rtmp /rec/` app) and asks for recommendations** → suggest migrating to Live Processing recording, since Classic VOD is legacy and not the recommended path for new setups.
8. **If a customer reports missing/incomplete recordings under one stream** → check whether their integration is filtering `.playout.web[]` by `type: "vod"` and enumerating *all* matching entries (not just the first/latest) — this is the most common root cause. Recommend one-stream-per-event as a best practice going forward.
9. **If a customer reports VOD files disappearing after some time** → check whether their organization has an internal auto-deletion policy configured before assuming a bug; this is set per-organisation, not universal, so confirm with nanocosmos support rather than assuming a fixed retention period.

### Customer Response Guidance
- If asked which recording approach to use for a new setup, recommend **Live Processing recording** — only bring up Classic VOD to explain legacy behavior or if the customer already depends on it.
- Proactively mention the 1-hour auto-segmentation behavior for `rec` — it's a frequent point of confusion since it isn't in the public docs.
- For trimming requests, redirect to `replay`/clip-and-share rather than suggesting MP4 manipulation.
- For ABR VOD requests, be upfront that there's no single master-manifest solution today — don't imply this is a quick fix.
- For "missing recordings" reports, check the `type: "vod"` filtering/enumeration issue before escalating — it's usually the customer's own integration, not a nanoStream bug.
- Never state a blanket VOD retention/deletion period to a customer — confirm internally whether their org has an auto-deletion policy first.

### Contact nanocosmos support when
- Customer needs group-level (not per-stream) Live Processing enablement — not currently supported, would need a feature request
- Customer reports VOD files missing and you need to confirm whether an org-specific auto-deletion policy is configured
- A `replay` `.m3u8` URL fails to play (especially Safari-only failures) — possible race-condition regression, needs engineering investigation
- Customer needs true multi-bitrate ABR VOD playback with automatic switching — no current out-of-the-box solution, needs product/engineering input