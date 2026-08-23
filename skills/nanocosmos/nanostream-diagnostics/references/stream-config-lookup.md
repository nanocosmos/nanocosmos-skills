---
id: stream-config-lookup
audience: customer
category: setup
triggers:
  - stream config
  - stream configuration
  - stream setup
  - how is the stream organized
  - how is my stream set up
  - stream architecture
  - push url
  - pushurl
  - where does my stream push to
  - restream
  - transcode profile
  - transcoding profile
  - transcoding setup
  - bitrate profile
  - is this stream a group
  - is this a daisy chain
  - daisy chain
  - stream group setup
  - ABR setup
  - multiple bitrates setup
severity_default: LOW
---

## Stream Configuration / Setup Lookup

A reusable diagnostic that resolves how a stream is organized — whether it is a single stream, a new-style ABR stream group, or an old-style daisy-chained transcode setup — and what external/internal URL (if any) it pushes to.

Use this whenever a question concerns stream architecture, transcode/bitrate profiles, or push/restream destinations for a stream name. The stream name must be known first. Works for streams of the organisation whose `BINTU_API_KEY` is configured.

### Steps

1. **Run the config script** with any known stream name:
   ```bash
   scripts/get_stream_config.sh <stream_name>
   ```
   **Note:** For `group` type streams, any stream name belonging to the set (not just the passthrough/index-0 name) returns the full group listing — the underlying API resolves the whole set from a single member.

2. **Read the `type` field** in the JSON output:
   - `"single"` — one stream, no transcoding. `stream` contains only `index:0`.
   - `"group"` — new-style ABR stream group. `stream` index 0 is the passthrough; indices 1+ each carry a `profile` (`bitrate`, `fps`, `width`, `height`) from that member's own `info` data. **A value of `0` in any of these fields is not a config gap** — it means that rendition follows the passthrough's own value for that field, auto-detected from RTMP metadata, rather than a fixed override.
   - `"daisy"` — old-style setup where transcodes are chained via the `pushUrl` key (internal schema `rtmp://127.0.0.1/TRANSCODE_PROFILE/STREAM_NAME`). Each `stream` entry's `profile` (if present) is resolved by matching the *previous* hop's `TRANSCODE_PROFILE` segment against the orga's transcoding profiles. Index 0 (the source) never has a profile.

3. **Read the `push` field** for where the stream (or, for `daisy`, the last stream in the chain) sends its output:
   - `null` — no push configured.
   - An external URL — the stream restreams outward to that destination.
   - An internal URL of the form `rtmp://127.0.0.1/live/<streamname>` — the stream pushes internally to another stream name on the platform (a restream, not a transcode hop). **That target stream belongs to its own organisation with its own independent ingest webhook — if troubleshooting an ingest issue, check the target's webhook health too (Dashboard → webhook settings, or ask nanocosmos support), not just the source's.** A source can ingest perfectly cleanly while the target org's webhook rejects the internal restream outright.

   Precedence rules:
   - `single`: index 0's own `pushUrl`.
   - `group`: the last index's `pushUrl` if set, otherwise index 0's — last index always takes precedence when both are set.
   - `daisy`: the last chain index's own `pushUrl` (whatever stopped the chain from continuing — i.e., a segment that didn't match a real transcode profile).

4. **Check for an optional `note` field** (never present for `group`): if the queried stream's own `tags` contain a `"N. Transcoded"` or `"N. Transcode"` entry (N = a number), a `note` is added warning that this stream may be a downstream member of a daisy chain whose parent can't be traced from this query alone.
   - **Caveat:** this tag is not guaranteed to be present on every daisy-chain member. A stream can be an untagged downstream member of another stream's chain and still show up with no `note` at all, `type:"single"` (or `"group"`), and no visible link to its real parent — there is currently no reliable way to detect this case or trace upward to the parent. Treat the absence of a `note` as "no known indication," not proof the stream is standalone.
   - **When tracing which parent a downstream/tagged member belongs to (including across an org boundary, e.g. a chain that ends in a cross-org push to another organisation's stream): never treat a shared free-text tag (e.g. a `GroupID <name>` or similar self-defined label) as confirmation on its own that two streams belong to the same chain.** Tags are customer/operator-defined strings, not platform-enforced identifiers, and can coincide or diverge from the real relay path for reasons unrelated to actual routing. The reliable, script-derived signal is this procedure's own forward `pushUrl` walk: run `get_stream_config.sh` (or the admin equivalent) against a **candidate** parent name and confirm the target stream actually appears in its resolved `stream[]` list (as a `daisy`/`group` member at some hop) before stating the link as fact. A tag match is only useful for **generating that candidate name to test** — e.g. when the direct route (a platform-side telemetry lookup that nanocosmos support can run) comes back empty because the downstream member has no ingest-side telemetry of its own (expected for a pure transcode-profile hop) — never as the confirmation itself.

5. **Cross-check `type` against actual ingest** when troubleshooting missing/broken transcoding: `group` and `daisy` types are configured with transcoding profiles, so their ingest must genuinely land on the transcoding infrastructure to produce those profiles live. **From past experience, a `group`/`daisy` stream with no transcoded renditions usually means the encoder is pointed at the wrong ingest hostname** — it must use `bintu-vtrans.nanocosmos.de` (the Dashboard's transcoding ingest URL) rather than `bintu-stream.nanocosmos.de`. The wrong host still lets the stream publish and play back fine as a plain passthrough — but ABR/bitrate switching will fail, since no transcoded renditions exist to switch to. See `abr-transcoding-troubleshooting` for the full diagnostic.
   - **Before running any liveness check, check which member was actually queried.** A transcode-profile member (any `stream[]` entry with a `profile`, i.e. anything other than index 0) never receives its own direct encoder connection — it's generated internally by the transcoding infrastructure from the passthrough. If the originally-queried name resolved to a non-index-0 member, check **the passthrough (index 0) stream name** instead, not the member's own name — its own name will correctly find no ingest, but that result is uninformative (expected, not a sign of anything wrong), unlike for the passthrough or a `single` stream. This applies even N levels deep in a `daisy` chain — always resolve back to `stream[0]`, never an intermediate hop. State both names clearly in the final answer so it's obvious which stream the liveness result actually refers to.

### Report Format
Always present the result as a table, not prose. First, the summary:

| Field | Value |
|---|---|
| Stream (queried) | `<stream_name>` |
| Type | `single` / `group` / `daisy` |
| Push | `null` / external URL / internal URL |
| Note | (only if the `note` field is present) |

Then the member/profile breakdown from `stream[]` — label index 0 explicitly as the passthrough/source (it has no `profile`):

| Index | Stream Name | Role | Bitrate | FPS | Width | Height |
|---|---|---|---|---|---|---|
| 0 | `<streamname>` | passthrough | — | — | — | — |
| 1 | `<streamname>` | transcode | `<bitrate>` | `<fps>` | `<width>` | `<height>` |

(Use `—` for index 0 / any entry with no `profile` — that's expected for the passthrough/source. Render a `0` value in `bitrate`/`fps`/`width`/`height` as "follows passthrough" rather than the literal `0` — see the `type: "group"` note above.)

### Customer Response Guidance
- Not typically a customer-facing procedure on its own — used to understand a stream's setup before answering questions about transcoding, ABR, or restreaming.
- If a customer asks whether their stream uses multiple bitrates: report the `type` and list the resolved profiles (bitrate/fps/width/height) from `stream`.
- If a customer asks where their stream pushes to: report the `push` value, clarifying whether it's external or an internal platform restream.
- Avoid exposing internal implementation details (e.g. raw `pushUrl` internals, API keys) beyond what's needed to answer the question.

### Contact nanocosmos support when
- `get_stream_config.sh` fails or returns an error
- `type` cannot be determined (unexpected API response shape)
- A `daisy` chain exceeds the traversal safety limit (20 hops) without resolving — likely indicates a misconfigured or looping chain and needs internal engineering review
- `type` is `group` or `daisy`, transcoded renditions are missing, and the encoder is confirmed already using `bintu-vtrans.nanocosmos.de` — points to an infrastructure-side issue, not encoder misconfiguration
