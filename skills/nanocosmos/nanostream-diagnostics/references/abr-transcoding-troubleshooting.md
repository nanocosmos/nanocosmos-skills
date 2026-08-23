---
id: abr-transcoding-troubleshooting
audience: customer
category: quality
triggers:
  - transcodes not working
  - transcodes not there
  - transcoding not working
  - transcode missing
  - renditions missing
  - ABR not working
  - ABR renditions missing
  - only passthrough plays
  - passthrough only
  - only original quality
  - no other qualities
  - multibitrate not working
  - MBR not working
  - quality switching missing
  - missing bitrates
  - transcode profile
  - one quality only
severity_default: MEDIUM
---

## ABR / Live Transcoding Not Working (Passthrough OK, Transcodes Missing)

### When to Use
An ABR/multi-bitrate stream plays only its **passthrough (original ingest)** rendition — the transcoded quality levels are missing from the group, or the player shows only one quality with no others to switch to. The stream itself is live (passthrough works), so this is NOT a token, player, or "stream offline" problem — it is a transcoding **configuration** problem.

**Distinguish from:**
- `stream-not-starting` / `check-stream-live` — nothing plays at all (no ingest).
- `security-tokens` / demo-player param issues — secure stream won't authenticate.
- `latency-abr` — general "how do I set up ABR" question, not a failure.

### Diagnostic Order (check in this sequence — step 1 is the most common cause)

**1. Check the ingest server FIRST — transcoding requires `bintu-vtrans`, not `bintu-stream`.**
   - Streams with transcoding **must be ingested to the transcoding ingest host**:
     - With transcoding → `rtmp://bintu-vtrans.nanocosmos.de/live/…` (Dashboard gives a **config-specific subdomain**, e.g. `rtmp://<configid>.bintu-vtrans.nanocosmos.de/live/XXXXX-YYYYY`)
     - Passthrough only (no transcoding) → `rtmp://bintu-stream.nanocosmos.de/live/…`
   - If the encoder is pointed at `bintu-stream` (or at `bintu-vtrans` **without** the config-specific subdomain), the transcoder never receives the stream → **only the passthrough exists, no transcodes are produced**. This matches the symptom exactly.
   - **Verify (fastest — bintu API):** query the stream object and read four fields (see "Verify via the bintu API" below). `ingest.rtmp.url` shows the exact host the encoder should use; `transcoding`/`processing`/`tags` show whether transcoding ran at all. This is more reliable than log-diving.
   - **Fix:** re-point the encoder at the transcoding ingest URL from the Dashboard (config-specific `bintu-vtrans` subdomain) and restart the stream. The renditions should then appear in the group.

#### Verify via the bintu API
For streams of your own organisation, the public API has everything needed (auth: your orga key — same `BINTU_API_KEY` as the scripts):

```
GET https://bintu.nanocosmos.de/stream/<STREAM_NAME>
    header: x-bintu-apikey: <BINTU_API_KEY>
```

Read these fields on the returned stream object:

| Field | Passthrough-only (broken ABR) | Transcoding working |
|---|---|---|
| `ingest.rtmp.url` | `rtmp://bintu-stream.nanocosmos.de:1935/live` | `rtmp://…bintu-vtrans.nanocosmos.de:1935/live` |
| `transcoding` | `false` | `true` |
| `processing` | `[]` | populated with the profile ladder |
| `tags` | includes `"Passthrough"` | profile/rendition tags |
| `streamgroup` | equals the stream `id` (group = just this one stream) | group contains multiple renditions |

If `ingest.rtmp.url` points at `bintu-stream` and `transcoding` is `false` with `processing: []`, the diagnosis is confirmed: the encoder used the passthrough host, so no transcodes exist — go to Fix.

**2. Check transcoding profiles exist and the bitrate hierarchy is valid.**
   - Requirement (documented): **each Transcoding Profile's bitrate must be lower than the ingest/passthrough bitrate — and lower than the profile above it.**
   - A profile configured at a bitrate **≥ the actual ingest bitrate**, or at a **resolution higher than the ingest** (upscaling), will **not be produced** — that rendition stays dead while passthrough works.
   - **Verify:** compare each profile's target bitrate/resolution (Dashboard → stream → transcoding profiles) against the **actual ingest bitrate** (Analytics → Ingest Metrics).
   - **Fix:** lower any offending profile below the real ingest bitrate; keep the ladder strictly descending.

**3. Confirm the ingest is high enough to feed the ladder.**
   - If the source bitrate/resolution dropped below what a profile expects (variable or too-low ingest), that rung dies. Ensure ingest quality is stable and above the top profile.

**4. Confirm valid keyframes.**
   - Transcoding needs decodable video with regular keyframes. If a GOP check on a transcode rendition returns "no keyframe data" while passthrough is fine, it is consistent with no transcode output (usually caused by step 1 or 2).

**5. Still missing after host + profiles + ingest are all correct → escalate** (transcoder error or capacity issue, not a config the customer can fix).

### Customer Response Guidance
- **Wrong ingest host (most common):** Explain that streams with transcoding must be ingested to the transcoding ingest URL (from the Dashboard — a `bintu-vtrans` config-specific address), whereas `bintu-stream` produces the passthrough only. Provide the correct ingest URL from their Dashboard and ask them to restart the encoder.
- **Bitrate hierarchy:** Explain that each transcoding profile must target a bitrate lower than their ingest bitrate (and lower than the profile above). Identify the profile that is too high and have them reduce it.
- Reassure that since the passthrough plays, ingest connectivity and playback auth are fine — only the transcode configuration needs correction.

### Contact nanocosmos support when
- Ingest host is correct (`bintu-vtrans`, config-specific), profiles are valid and below the ingest bitrate, ingest is healthy — but transcode renditions still are not generated.
- Transcoder appears to error or drop renditions intermittently.

### References
- ABR / Live Transcoding (profiles + bitrate-hierarchy rule): https://docs.nanocosmos.net/docs/cloud-frontend-v3/Dashboard_ABR_Transcoding
- Ingest host table (with vs without transcoding): see `ingest-connection-failure` and `firewall-domain-whitelist`
