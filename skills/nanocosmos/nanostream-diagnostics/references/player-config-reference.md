---
id: player-config-reference
audience: customer
category: player
triggers:
  - check my player config
  - is this config correct
  - validate player config
  - review player config
  - player config error
  - config looks wrong
  - player setup not working
  - why isn't my player config working
  - source.entries
  - source.group
  - nanoplayer config
  - config field reference
severity_default: LOW
---

## Player Config Field Reference & Validation

A field-by-field reference for **checking whether a given nanoPlayer v5 config
is well-formed** — every `source`/`playback`/`style`/`events`/`tweaks`/
`metrics` key, its valid values/ranges, documented defaults, what silently
changed between v4 and v5, and which runtime error code a given mistake
surfaces as. Gathered from all 26 config-relevant pages under
https://docs.nanocosmos.de/docs/nanoplayer (list at the bottom).

### When to Use

A customer or agent has a nanoPlayer config (JS object, or an embed/demo
player URL) and asks "why doesn't this work" / "is this set up right" /
pastes a config and wants it checked. Use this as the lookup table to check
each field against; capture the live config from the page with browser DevTools (intercept the `NanoPlayer.setup()` call) if you need
to *obtain* the actual live config from a page rather than trust a
hand-pasted one — a customer's copy of "what I configured" can differ from
what the page truly sends (see that doc's "static vs. resolved config"
section).

### Reporting format — always tables, never prose bullet lists

Every evaluation of a config gets reported as tables — hard errors,
warnings/notes, the Feature Summary Table, and the ABR architecture table
(§16 defines the latter two) all render as markdown tables. This applies
even when a config is partial: if `playback`/`metrics`/`style`/etc. blocks
are missing entirely, don't skip those rows or fall back to a prose "can't
evaluate this part" caveat — fill the row with the resulting v5 **default**
value and mark it `(default, not set in config)`. A missing block still
resolves to a concrete, reportable value; only genuinely unknown things
(e.g. a live backend cross-check that couldn't run — see §16) get a stated
limitation instead of a table row.

### 1. Top-level config shape

```js
var config = {
  source:   { entries: [...], startIndex, defaults: {...}, group: {...}, general: {...}, options: {...} },
  playback: { ...playback flags, reconnect: {...}, timeouts: {...} },
  style:    { ...visual/UI },
  events:   { onReady, onPlay, ... },
  tweaks:   { buffer: {...}, bufferDynamic: {...} },   // H5Live-only, advanced
  metrics:  { accountId, accountKey, ... }
};
NanoPlayer.setup(config, "playerDivId").then(player => ...);
```

A valid config needs **at least one way to describe the source**: either
`source.group.id` (stream group) or `source.entries[]` (one or more explicit
entries). Everything else is optional with documented defaults.

**Precedence when both are set (confirmed):** if a config sets *both*
`source.group` and `source.entries`, **`source.group` wins** — the entries
array is silently overridden/ignored, entirely. This is not itself a hard
error (the player will still play, off the group), but it means every
entries-only setting (`entries[]` contents, `source.startIndex`) is dead
weight in that config. **Flag this combination as a warning — state the
mechanical fact (group is what's actually in effect, entries is inert) and
ask which one was intended, without assuming the answer.** Either side could
be the mistake: maybe `entries` is stale leftover and `group` is correct as
written, or maybe the author actually wants entries-based playback and
`group` is the stray leftover silently hijacking it. Don't default to
recommending "remove entries" — that only holds if group was in fact the
intended source; if entries was intended, the fix is to remove `group`
instead. Surface the conflict and let the customer/agent decide which one
matches their actual intent.

**Exception (confirmed): a blank `source.group.id` does not count as "set."**
If `group.id` is empty/blank, treat `group` as absent for precedence
purposes — `source.entries` takes effect normally, with no warning needed
for this case. This matters because a config can carry a `group` object
with every field blank (`id: ""`, `apiurl: ""`, `startQuality: ""`,
`security.jwtoken: ""`) purely as schema scaffolding — see "Runtime/full-
schema dumps" below — without that blank object actually overriding a real,
populated `entries[]`. Only flag the group-vs-entries conflict above when
`group.id` actually holds a real value.

**Recognizing a runtime/full-schema dump vs. a hand-authored static
config:** some pasted configs carry every possible field from the full
schema, most of them blank (`""`/`{}`) — e.g. top-level `source.h5live`,
`source.bintu`, `source.hls` (which per the schema only exist at the
*entry* level, never at the top of `source`), or a `state` field on `bintu`/
`group` (which is a **resolved-
output-only** field the library fills in, e.g. `group.state: "ended"` — a
caller never sets it). Seeing these — blank or not — is a strong signal
you're looking at a full runtime/schema object (or a template derived from
one) rather than a deliberately hand-built input config. **Treat blank
placeholder fields across such a dump as inert scaffolding, not individual
findings** — don't flag each blank field on its own. Focus validation on
whichever fields actually carry real values (as in the `group.id`-blank
exception above), and it's fine to note in passing that the config looks
like a runtime/schema dump rather than a minimal static one, without turning
that observation itself into a pile of warnings.

### 2. Four canonical ways to specify `source`

**Option 1 — Stream group** (recommended for ABR / multi-quality):
```js
source: {
  group: {
    id: 'xxxxxxxx-zzzz-yyy-aaaa-aaabbbcccddd',   // required
    security: { jwtoken: 'xxx' },                 // only if group is secured
    apiurl: 'https://bintu.nanocosmos.de',        // optional, this is the default
    startQuality: 'medium'                        // optional: high|medium-high|medium|medium-low|low
  },
  options: {
    adaption: { rule: 'deviationOfMean2' },
    switch:   { method: 'server', pauseOnError: false, forcePlay: true, timeout: 10 }
  }
}
```
- Stream groups since H5Live Player v4.18.0. Group id is found in the Cloud
  Dashboard `stream` object or the Bintu API `/stream/{id}` response — it
  doesn't have to be a UUID, a plain passthrough stream name also works.
- `startQuality` replaces `startIndex` for groups (stream count may be
  unknown ahead of time); it maps proportionally across whatever number of
  renditions the group actually has.
- ABR is on by default for groups (`deviationOfMean2`).

**Option 2 — bintu shortcut via `source.defaults.service`:**
```js
source: {
  defaults: { service: 'bintu' },
  entries: [{ h5live: { rtmp: { streamname: 'XXXXX-YYYYY' } } }]
}
```
- `defaults.service: 'bintu'` back-fills `h5live.rtmp.url` and all four
  `h5live.server.*` endpoints (websocket/hls/progressive/webtransport) for
  every entry, **without overwriting values an entry sets explicitly** (since
  v4.13.0). `source.general.serverDomain` (v4.16.0+) overrides the domain
  across all backfilled server URLs with "highest priority" — for pinning a
  geo/region endpoint. Works with both secure and unsecure playback, and with
  `bintu.streamid` entries too.

**Option 3 — Fully custom RTMP + server endpoints** (self-hosted / non-bintu):
```js
source: {
  entries: [{
    h5live: {
      rtmp: { url: 'rtmp://bintu-play.nanocosmos.de:80/play', streamname: 'XXXXX-YYYYY' },
      server: {
        websocket:    'wss://bintu-h5live.nanocosmos.de:443/h5live/stream/stream.mp4',
        hls:          'https://bintu-h5live.nanocosmos.de:443/h5live/http/playlist.m3u8',
        progressive:  'https://bintu-h5live.nanocosmos.de:443/h5live/http/stream.mp4',
        webtransport: 'https://bintu-h5live.nanocosmos.de:443/h5live/stream/stream.mp4'
      }
    }
  }]
}
```
Needed when not using `defaults.service: 'bintu'` — every endpoint must be
given explicitly, or MOQ/HLS/etc. silently won't be available for that entry.

**Option 4 — bintu stream id shortcut** (no rtmp/server fields at all):
```js
source: { entries: [{ bintu: { streamid: '1111-2222-3333-4444-5555' } }] }
```

**Validation implication:** an entry object should contain exactly one of
`h5live` (rtmp/server-based) or `bintu` (streamid-based) — mixing both, or
neither, is malformed input; that maps to runtime error `5004` ("source
configuration is malformed or missing").

### 2a. Push mode vs. pull mode — and what `h5live.token` actually is

All four options above are **push mode**: the encoder pushes RTMP into
nanoStream, and playback reads back from nanocosmos's own hosted
h5live infrastructure. In push mode, `h5live.rtmp.url` is typically a
placeholder like `rtmp://localhost/play` (or omitted entirely) — it is
**not** a real address the player fetches from; the actual playback
endpoints are `h5live.server.*`. This is the default/recommended setup and
what nearly every config seen in support is doing.

**Pull mode** is a separate, non-default setup: the customer already runs
their own external RTMP server, and H5Live Player is configured to pull
directly from it instead of from nanocosmos's push-ingested infrastructure.
Per https://docs.nanocosmos.de/docs/nanoplayer/nanoplayer_introduction#pull-mode:
```
h5live.rtmp.url=rtmp://<yourserver-address>/<yourserver-application>
h5live.rtmp.streamname=<yourserver-streamname>
h5live.token={"type":"token1","key":CUSTOMERTOKEN}
```
- `h5live.rtmp.url` must be a real, externally-reachable address in pull
  mode — **not** `localhost`. A `localhost` (or absent) `rtmp.url` is itself
  the signal that a config is push mode, regardless of whether a `token`
  field is also present.
- `h5live.token` here is an **account/license-unlock credential** — the docs
  describe it as needed to "unlock your account (you may need to change this
  based on your license)," obtained by email. **It is a completely different
  mechanism from `h5live.security.jwtoken` / `h5live.security.{token,expires,options,tag}`
  (§5)** — don't conflate the two just because both are named "token." A
  bare `h5live.token` does not provide per-stream/per-viewer playback
  security; if that's the actual goal, it's the `security.*` fields that are
  needed, and they're independent of push/pull mode.

**The check is entirely on `h5live.rtmp.url`, nothing else — don't inspect
or decode the `h5live.token` value itself.**
- `rtmp.url` is `localhost`/absent → **push mode.** `h5live.token` is
  ignored — it has no documented function outside pull mode. Say so and
  move on; there's no need to parse or validate its contents, since it
  isn't read regardless of what's in it.
- `rtmp.url` is a real external address → pull mode. `h5live.token` is the
  account/license-unlock credential in that case — be clear with the
  customer that it secures *account/license access*, not *this specific
  stream's playback*; if they also want playback security, that's the
  separate `security.*` mechanism (§5).

### 3. `source.entries[]` — full entry object shape

| Field | Type | Notes |
|---|---|---|
| `index` | number | position; used with `startIndex` / `switchStream(index)` |
| `label` | string | e.g. `'high'`, `'low'` — free text quality label |
| `tag` | string | custom metadata, echoed back in switch events |
| `info` | object | `{ bitrate, width, height, framerate }` — informational only |
| `h5live.rtmp.url` | string | RTMP source URL |
| `h5live.rtmp.streamname` | string | stream name |
| `h5live.server.websocket` \| `.hls` \| `.progressive` \| `.webtransport` | string | per-protocol playback endpoints |
| `h5live.security.token` / `.expires` / `.options` / `.tag` | string/number | STS security (deprecated) |
| `h5live.security.jwtoken` | string | JWT security (recommended, v4.18+) |
| `bintu.streamid` | string | alternative to `h5live.rtmp` — bintu resolves endpoints server-side |
| `bintu.apiurl` | string | **optional**, default `https://bintu.nanocosmos.de` — same field as `source.group.apiurl` (§2), just settable per entry. It can legitimately be a non-default value (e.g. a regional/dedicated API endpoint). **If it's set, just check whether it matches the default** — if it does, it's a no-op worth ignoring; if it doesn't, highlight it (not as wrong, just as worth a second look/confirmation that the non-default host is intentional). |
| `hls` | string | direct HLS URL alt-form |

Ordering convention: **entries should be ordered by descending bitrate**,
index 0 = highest quality (matters for ABR "switch up only from below-max"
behavior and for `downStep` semantics).

`source.startIndex`: default in v5 is `entries.length - 1` (i.e. **lowest**
quality first) — a v4→v5 breaking default change (v4 defaulted to index 0 /
highest). An out-of-range or invalid `startIndex` silently falls back to `0`.

**General rule: any field not covered by this reference is not a valid
config parameter — confirmed, don't assume it does something just because
it looks plausible.** This reference is built from every config-relevant
page under `docs.nanocosmos.de/docs/nanoplayer/` (list at the bottom); if a
field isn't in it, the player doesn't read it, full stop — treat it as
inert/vestigial rather than guessing at a purpose for it. Example seen live:
`source.startMobileIndex`, sitting right next to a real `startIndex` in a
real capture, reads exactly like a plausible "mobile-specific start index"
feature — it isn't one; the player ignores it entirely. Don't invent
behavior for an unrecognized field just because its name suggests something
reasonable — flag it as unrecognized/no effect, and only escalate to
"verify against current docs" (§ Escalate When) if it's actually load-
bearing for the question being asked, since player releases do add new
fields over time that this reference won't have caught up to yet.

### 4. `source.options` — switching & ABR

```js
options: {
  switch: {
    method: 'server',       // 'server' (default) | 'client'
    pauseOnError: false,    // default false
    forcePlay: true,        // default true — resume after switch even if was paused
    timeout: 10,            // seconds, range 5–30, default 20
    tag: 'custom-id'        // echoed in switch* events
    // fastStart: DEPRECATED, do not use
  },
  adaption: {
    rule: 'deviationOfMean2',   // 'none' | 'deviationOfMean' | 'deviationOfMean2' (v4.5+)
    downStep: 1,                 // int, 1..(entries.length-1), default 1
    omitRenditions: ['low']      // exclude labels or numeric indices from ABR
  }
}
```
- v5 default `adaption.rule` changed to `'deviationOfMean2'` (v4 default was
  `'none'`) — ABR is **on by default** in v5 whenever more than one entry
  exists. One of the biggest v4→v5 behavior traps. Missing/invalid rule
  defaults to `'none'`.
- `switch.timeout` expiry → error `4006`. Minimum player version for
  switching: 4.3. Manual `player.switchStream(index)` disables ABR until
  `player.setAdaption(...)` re-enables it.

### 5. Security — secure vs unsecure playback

**An absent `security`/`jwtoken` is only "fine" if the org itself isn't
security-enabled — and that fact isn't visible in the client config at
all.** Account-level security status is external metadata, not something
derivable from the `source` object being evaluated. Don't default to
treating a missing `security` object as neutral/unsecured-and-therefore-OK
— if you know (or the customer/agent tells you) the org has security
enabled, a missing `group.security.jwtoken` /
`entries[].h5live.security.jwtoken` is a **hard error**, not a stylistic
choice, even though the config is otherwise syntactically well-formed.
Confirmed directly: a real Dashboard-generated config for a known
security-enabled org carried no `security` object anywhere — flag that
regardless of whether playback happens to be failing for some unrelated
reason at the moment you're looking (e.g. ingest simply hasn't started
yet). **Don't tie the missing-token finding to whatever playback symptom is
currently visible unless you've actually confirmed the causal link** — a
paused/zero-bitrate player proves nothing about *why* on its own; check the
actual cause (no source live, a real auth rejection, something else)
separately rather than assuming the two findings explain each other. If org
security status is unknown and nothing else indicates it, ask rather than
assume either way.

**Baseline ("unsecure") config**: all playback already runs over HTTPS/WSS —
"unsecure" just means no token restriction, anyone with the URL can play it.
No `security` object needed at all.

**"Secure" config** requires:
1. Account prerequisite: a security-enabled Bintu organization (separate
   business agreement — an account-level flag, not something a config alone
   can turn on).
2. Once enabled at the account level, **every** stream group or stream
   requires a token to play at all — omitting `security` on an account that
   has security enabled is itself a misconfiguration.

**JWT (recommended since v4.18.0):**
- One JWT can cover **all** streams in a stream group (unlike STS, no
  per-stream token needed).
- Location differs by source style: stream group → `source.group.security.jwtoken`;
  entries → `source.entries[].h5live.security.jwtoken`.
- Claims: `exp` (expiry, unix ts — blocks *new* connections after expiry but
  doesn't kill existing sessions unless force-disconnect is set), `nbf` (not
  valid before). Revocable tokens cap `exp` at **24 hours**.
- Decoded claims match `security-tokens.md` / `nanostream-token-generation.md`:
  `aud`, `iss`, `orgahash`, `sub`, `iat`/`nbf`/`exp`, optional `tag`/`user`.
  Use `scripts/get_jwt_token.sh` to mint and `scripts/check_jwt_token.sh`/`.py`
  to decode/verify one before assuming it's the problem.

**STS token (deprecated, kept for backward compat only — do not scaffold new
integrations with it):**
```json
"h5live": { "security": {
  "token":   "[generated token]",
  "expires": "1591747200",   // unix seconds, NOT ms; not in the past; ≤365 days out
  "tag":     "[your custom tag]",
  "options": "9"              // numeric bitmask of which restrictions apply
}}
```
- Generated via POST to `https://bintu-splay.nanocosmos.de/secure/token` with
  the Bintu API key — token/expires/options come back pre-computed.
- Optional embedded restrictions: `referer` (bare domain incl. TLD, no
  scheme/path, 1–63 chars/label, ≤253 total) and `ip` (IPv4 only).
- **Every one of token/expires/options must be present together** — error
  `4903` fires if any of `expires`/`token`/`options` is missing; `4901` fires
  on a token that's simply invalid/forged.

**Checks worth running against a pasted config:**
- Security object present but incomplete (STS missing one of the 4 fields;
  JWT field empty) → flag.
- JWT at the wrong nesting (`group.jwtoken` instead of `group.security.jwtoken`,
  or `h5live.jwtoken` instead of `h5live.security.jwtoken`) → flag; this is
  the single most common secure-config mistake seen.
- `expires` looks like milliseconds (13 digits) instead of seconds, is in the
  past, or is >365 days out → flag.
- STS fields mixed into a JWT-secured entry (or vice versa) → not a
  documented supported pattern, flag.
- For the JS player, secure playback does **not** change `serverDomain` and
  does **not** use `bintu-splay`/`/authhttp/` — that host/path form is only
  for the emulated MP4/M3U8 URLs, not `source.entries`/`source.group`. A
  config that swapped the play domain just because a token is present is a
  mistake worth flagging.

### 6. `source.defaults` / `source.general` — defaults & overrides

- `source.defaults.service: 'bintu'` → back-fills, per entry, whatever of
  `h5live.rtmp.url` / `h5live.server.{websocket,hls,progressive,webtransport}`
  wasn't explicitly set. Never overwrites explicit values.
- `source.general.serverDomain` → highest-priority override of the domain
  part of *all* h5live server URLs (defaults or explicit). Since v4.16.0.

### 7. `playback` block

| Field | Default | Notes |
|---|---|---|
| `autoplay` | true | |
| `automute` | **true in v5** (was `false` in v4) | falls back to muted playback if browser blocks unmuted autoplay |
| `muted` | false | initial mute state |
| `volume` | 1.0 | range 0.0–1.0 |
| `latencyControlMode` | **`'balancedadaptive'` in v5** (was `'classic'` in v4) | `'classic'` \| `'fastadaptive'` \| `'balancedadaptive'` — a switching-behavior mode, NOT a latency-in-seconds value |
| `faststart` | **true in v5** (was `false` in v4) | reduces time-to-first-frame; pair with a conservative `startIndex`/`startQuality` for ABR sources |
| `metadata` | false | |
| `metadataLowDelay` | true | avoids delayed metadata on iOS |
| `videoId` | — | id(s) of pre-existing `<video>` element(s) to bind to instead of player-created one |
| `keepConnection` | false | |
| `allowSafariHlsFallback` | false | permits low-latency HLS fallback on Safari macOS |
| `crossOrigin` | `'not-set'` | `'anonymous'` \| `'use-credentials'` \| `'not-set'`; `'anonymous'` required for canvas/snapshot access |
| `mediaErrorRecoveries` | 3 | auto-recovery count per rolling 60s window for error codes 1008/3003/3005/3100/3101; 0 disables |
| `enableMediaOverQuic` | true | MOQ; needs `webtransport` server URL on custom entries; auto-falls back to WS/MSE if unsupported/probe fails |
| `enableQuicConnectionProbe` | true | tests WebTransport/QUIC at setup; pair with `enableMediaOverQuic: true` |
| `enableWakeLock` | true | |
| `manageAudioSessionType` | true | |
| `reconnect.minDelay` / `.maxDelay` / `.delaySteps` / `.maxRetries` | 2 / 10 / 10 / 10 | seconds/count; `maxRetries: 0` disables reconnect entirely |
| `timeouts.connecting` | 5 (range 5–30) | → error `4106` on expiry; **must be ≤ `timeouts.loading`** |
| `timeouts.loading` | 20 (range 10–60) | → error `2001` |
| `timeouts.buffering` | 20 (range 10–60) | → error `2002` |

**v4 → v5 breaking default changes to flag when reviewing an "upgraded"
config:** `latencyControlMode`, `automute`, `faststart`, `source.startIndex`,
`source.options.adaption.rule` — a config written for v4 semantics that
doesn't explicitly set these five may now behave differently under v5
without any error being thrown (silent behavior change, not a hard error).

Other v5 removals: Flash Player fallback, native HLS on iOS <10,
`style.scaling` values `'resize'`/`'original'`. A config using any of these
is v4-only and invalid under v5. MOQ playback renders to `<canvas>` instead
of `<video>` — a config that binds `videoId` to a DOM `<video>` node while
`enableMediaOverQuic` is on may not behave as expected; `enableMediaOverQuic:
false` is the documented escape hatch.

### 8. `style` block

| Field | Default | Notes |
|---|---|---|
| `width` / `height` | `'640px'` / — | px, `%`, or `'auto'` |
| `aspectratio` | `'16/9'` | e.g. `'4/3'` |
| `controls` | true | |
| `interactive` | true | |
| `view` | true | |
| `scaling` | `'letterbox'` | `'letterbox'` \| `'fill'` \| `'crop'` — **`'resize'`/`'original'` were removed in v5**, flag as invalid if seen |
| `keepFrame` | true | |
| `displayAudioOnly` | true | |
| `audioPlayer` | false | forces audio-only layout, default 640×51px |
| `displayMutedAutoplay` | true | |
| `fullScreenControl` | true | |
| `backgroundColor` | `'black'` | CSS color |
| `fullScreenBackgroundColor` | `'inherit'` | inherits `backgroundColor` if unset |
| `centerView` | true | |
| `symbolColor` | `'rgba(244,233,233,1)'` | |
| `controlBarColor` | `'rgba(0,0,0,0.5)'` | |
| `buttonAnimation` / `buttonHighlighting` | true / true | |
| `buttonCursor` | `'pointer'` | valid CSS cursor keyword |
| `poster` | — | image URL |

Responsive pattern: `width/height: 'auto'` + a CSS aspect-ratio box
(`padding-bottom: 56.25%` for 16:9) on the containing div.

### 9. `events` block

All optional, all functions: `onReady, onPlay, onPause, onLoading,
onStartBuffering, onStopBuffering, onError, onStats, onMetaData, onMute,
onUnmute, onVolumeChange, onStreamInfo, onStreamInfoUpdate, onWarning,
onDestroy, onUpdateSourceInit/Success/Fail/Abort,
onSwitchStreamInit/Success/Fail/Abort, onServerInfo, onFullscreenChange,
onActiveVideoElementChange`. Also `onStreamInfoError` (offline/stream-not-found
— should be wired up, otherwise an offline stream just hangs on "connecting").
A config with non-function values under `events.*` is invalid.

### 10. `tweaks` block — buffer (H5Live only, "can cause unstable playback")

```js
tweaks: {
  buffer: { min: 0.2, start: 0.5, target: 1.2, limit: 1.7, max: 8.0 },
  bufferDynamic: { offsetThreshold, offsetStep, cooldownTime }
}
```

**Intent:** `tweaks.buffer` is manual, low-level buffer tuning — it exists
for `latencyControlMode: 'classic'`, where the player doesn't manage
buffering adaptively on its own and these thresholds are the direct knobs
for it (`min`/`start`/`target`/`limit`/`max`, in that ascending order).

- Ordering constraint: `min < start < target < limit < max`.
- Docs explicitly say **don't combine custom `tweaks.buffer` with
  `latencyControlMode: 'balancedadaptive'` or `'fastadaptive'`** — those
  modes manage buffering themselves. If a config sets `tweaks.buffer` while
  using (or defaulting to, since `balancedadaptive` is the v5 default)
  either adaptive mode, **recommend not configuring `tweaks.buffer` at all**
  under that mode, rather than proposing specific replacement values.
- **Never suggest specific `min`/`start`/`target`/`limit`/`max` values.** If
  `tweaks.buffer` genuinely needs to be configured (e.g. deliberately on
  `classic` mode for a latency profile the adaptive modes don't fit),
  consult nanocosmos support for the right
  values for the specific case rather than proposing numbers — this is exactly the
  kind of per-deployment tuning that shouldn't be guessed at from the docs
  alone.

### 11. `metrics` block

| Field | Required? |
|---|---|
| `accountId` | required (to use metrics at all) |
| `accountKey` | required |
| `userId` | optional |
| `eventId` | optional |
| `statsInterval` | optional, seconds, min 5, default 10 |
| `customField1`..`customField10` | optional |
| `serverDomain` | optional, white-label domain, default `glog1.nanocosmos.de` (v4.31.0+) |

If `metrics` is present at all, `accountId`+`accountKey` should both be
present — one without the other is a plausible misconfig. Placeholder
credentials (`accountKey: "q3jhriuw…"` etc.) don't block playback but pollute
logs and look unfinished — flag and ask whether real values exist.

**A missing `metrics` block entirely is not ambiguous — it plainly means no
analytics/stats are sent to the nanocosmos backend for that playback
session.** It doesn't affect playback itself either way. State it as that
plain fact (no metrics being sent) rather than as something to "confirm was
intentional" — it's only worth raising as a question if the context
otherwise implies metrics were expected (e.g. every other config from the
same integration has one and this one doesn't).

### 12. Error codes relevant to config validation

| Code | Range meaning | Trigger |
|---|---|---|
| 1005 | Player | Autoplay unmuted blocked without user gesture (iOS) |
| 1008 | Media | Playback error (counts toward mediaErrorRecoveries) |
| 2001 | Stream | `timeouts.loading` exceeded |
| 2002 | Stream | `timeouts.buffering` exceeded |
| 3003/3005/3100/3101 | Media | decode/HLS/MSE errors (auto-recovery eligible) |
| 4006 | Network | `options.switch.timeout` exceeded |
| 4106 | Network | `timeouts.connecting` exceeded |
| 4901 | Security | invalid/forged auth token |
| 4903 | Security | URL expired, or one of token/expires/options missing |
| 5001 | Setup | JS error during setup promise (often undefined refs in caller code, not the config itself) |
| 5002 | Setup | browser lacks required HTML5/H5Live capability |
| 5004 | Setup | **source config malformed/missing** — bad/absent `source`, `group.id`, or `rtmp.streamname` |

`5004` is the single most directly "config validator" error code — the
generic catch-all for structurally broken `source`. If a customer reports
this exact code, go straight to §2/§3 above.

### 13. iframe / embed player — a THIRD config surface (dotted URL params)

There are **two distinct iframe/embed products** — don't conflate them when
a customer pastes a URL:

1. **Hosted release demo player** (`demo.nanocosmos.de/nanoplayer/release/nanoplayer.html`)
   — see `demo-player-testing.md`. Params: `group.id=`, `group.security.jwtoken=`,
   `entry.security.jwtoken=`, `stream=`, `token=`/`jwtoken=`, etc. — thin
   wrappers that build the normal JS `source.group`/`source.entries` config
   internally.
2. **Standalone embed player v2.0.0** (`demo.nanocosmos.de/nanoplayer/embed/2.0.0/nanoplayer.html`,
   docs page `nanoplayer_embed_detailed`) — a **separate, older product** for
   pure iframe embedding with no JS. See `iframe-embed.md` for the
   customer-facing walkthrough; the parameter details that matter for
   *validating* an embed URL are:

   ```html
   <iframe src="https://demo.nanocosmos.de/nanoplayer/embed/2.0.0/nanoplayer.html?entry.rtmp.streamname=XXXXX-YYYYY"
     frameborder="0" allowfullscreen width="1280" height="720"></iframe>
   ```

   Confirmed parameter names (verbatim from the docs page): `entry.rtmp.streamname`,
   `entry2.rtmp.streamname`, `entry3.rtmp.streamname` (additional ABR entries
   — numbered, not an array index), `entry.info.bitrate`, `defaults.service`,
   `startIndex`, `options.adaption.rule`, `playback.autoplay`,
   `playback.automute`, `playback.muted`, `playback.faststart`,
   `playback.metadata`, `playback.latencyControlMode`,
   `playback.timeouts.buffering`, `style.fullScreenControl`,
   `style.displayMutedAutoplay`, `style.backgroundColor`, `style.poster`,
   `tweaks.buffer.limit`, `metrics.accountId`, `metrics.accountKey`, `title`
   (sets the page `<title>`, not a player field).

   **Type-strictness trap (breaking change at v2.0.0):** only the literal
   strings `"true"`/`"false"` are parsed as booleans. Numeric `1`/`0` (valid
   in embed v1.x, e.g. `playback.metadata=1`) do **not** convert — a v1.x URL
   migrated verbatim to v2.0.0 silently fails its boolean params. **Flag any
   `playback.*=1`/`=0` or `style.*=1`/`=0` param as a likely v1.x leftover** —
   this is a plausible root cause for "I set autoplay but it's not working"
   on an embed-v2.0.0 URL.

   **Stream group / JWT support**: added at embed v1.3.1 (matching H5Live
   Player v4.18.x). `group.id=` is now **confirmed** — the nanoStream
   Dashboard's own "Playout" page generates its embed-v2.0.0 iFrame URL as
   `.../embed/2.0.0/nanoplayer.html?group.id=<group_id>`, first-party
   evidence straight from nanocosmos's own product. `group.security.jwtoken=`
   for a secure group still isn't independently confirmed the same way —
   presumed to follow the same dotted path convention, but verify live if a
   real secure-group case turns on it.

   **Explicitly unsupported**: "secure playback with referer binding" — the
   STS `referer` restriction has no embed-v2.0.0 equivalent; only
   token/jwtoken-style security works here. A customer asking why a `referer`
   param has no effect on an embed-v2.0.0 URL — this is why.

### 14. Context notes (not config-schema, but relevant when a config "looks wrong")

- **WebViews (Android/iOS)**: needs `mediaPlaybackRequiresUserGesture=false`
  (Android) / `mediaTypesRequiringUserActionForPlayback=[]` +
  `allowsInlineMediaPlayback=true` (iOS) at the *native* WebView level for
  `playback.autoplay` to actually work — a config with `autoplay:true` inside
  a WebView that hasn't set these will silently not autoplay. This is a
  native-app setting, not something fixable in the player config itself.
- **Supported browsers**: Chrome 54+, Firefox 48+, Edge, IE11 (Win8.1+),
  Safari iOS/macOS 10+. Needs HTML5 video, WebSockets, MSE, fMP4/H264/AAC.
  Browser emulation mode is explicitly unsupported/unreliable for testing —
  don't debug a config against an emulated device profile.
- **`crossOrigin: 'anonymous'`** required if the integration does canvas
  snapshotting (`onActiveVideoElementChange` / video-access use cases).

### 15. Validation checklist

Run through these when a config is pasted for review. Hard errors first,
then soft warnings.

**Hard errors:**
- `source` missing entirely, or has neither `group.id` nor non-empty `entries[]`.
- An entry has neither `h5live` nor `bintu`, or has both.
- `h5live` entry has `rtmp.streamname` but no way to reach a server (no
  `server.*` fields AND no `source.defaults.service`).
- Security object present but incomplete: STS missing any of
  token/expires/options; JWT field empty.
- JWT at the wrong nesting (`group.jwtoken` vs `group.security.jwtoken`,
  `h5live.jwtoken` vs `h5live.security.jwtoken`).
- `expires` looks like milliseconds (13 digits), is in the past, or is >365
  days out.
- Numeric ranges out of documented bounds: `timeouts.connecting/loading/buffering`,
  `options.switch.timeout`, `options.adaption.downStep`, `playback.volume`.
- `timeouts.connecting` > `timeouts.loading`.
- `style.scaling` using removed values (`resize`, `original`).
- `events.*` value present but not a function.
- `tweaks.buffer` violates `min < start < target < limit < max`.
- `metrics` present with only one of `accountId`/`accountKey`.
- Embed-v2.0.0 URL: boolean param given as `1`/`0` instead of `true`/`false`;
  non-contiguous `entryN` numbering; a `referer` param (unsupported there).

**Soft warnings (valid but likely-mistake / v4→v5 drift):**
- **Both `source.group` and `source.entries` set, AND `group.id` is
  non-blank** → not an error, but `source.group` takes precedence and
  `entries[]` (plus `source.startIndex`, which only applies to entries) is
  silently ignored — see §1 above. **Flag it as a warning only; don't
  prescribe which side to delete.** State the mechanical fact (group wins,
  entries is currently inert) and ask which one the customer actually
  intended — it could just as easily be that `group` is the stray leftover
  and `entries`-based playback was the real goal, in which case the fix is
  removing `group`, not `entries`. **If `group.id` is blank, skip this
  warning entirely** — a blank id doesn't count as "set," `entries` is what's
  actually in effect, and this is likely just schema scaffolding (see
  "Runtime/full-schema dumps," §1).
- Multi-entry `source.entries` with no explicit `options.adaption.rule` →
  ABR silently on by default in v5 (may surprise a v4-authored config).
- `tweaks.buffer` set together with `latencyControlMode: balancedadaptive|fastadaptive`
  (or with no `latencyControlMode` set at all, since `balancedadaptive` is
  the v5 default) → recommend not configuring `tweaks.buffer` under either
  adaptive mode; don't propose replacement values. See §10.
- `playback.autoplay: true` with `automute`/`muted` both false → will be
  blocked by browser autoplay policy.
- Config relies on `videoId` + MOQ enabled without disabling
  `enableMediaOverQuic` — canvas-vs-video mismatch risk.
- `apiurl` (on `source.group` or an entry's `bintu`) set to something other
  than the default `https://bintu.nanocosmos.de` → highlight it as worth a
  second look/confirmation, not as inherently wrong — a non-default API host
  can be a legitimate regional/dedicated endpoint. See §2/§3.
- `h5live.token` present on an entry whose `rtmp.url` is `localhost`/absent
  (push mode) → see §2a. The field is simply ignored — no documented
  function outside pull mode. Say so; don't inspect or validate its value.
- JS-player config that swapped the play domain to `bintu-splay` or added
  `/authhttp/` just because a token is present — that form belongs to the
  emulated MP4/M3U8 URLs only.
- **Any field not appearing anywhere in this reference** → flag as
  unrecognized/no effect, don't infer a plausible-sounding purpose for it.
  See §3's general rule (the confirmed `startMobileIndex` example).

### 16. Feature summary table (report alongside the validation checklist)

For every config evaluation, also report this table — it's a plain factual
summary of what's configured for six specific features, independent of
whether anything is wrong. Fill in "Setting" from the actual config values;
"Setting" should never say "not documented" — every field here has a real
v5 default, so "not set in config" still resolves to a concrete value.

| # | Feature | Setting to report | Reference |
|---|---|---|---|
| 1 | MOQ (Media over QUIC) | `playback.enableMediaOverQuic` (Enabled/Disabled, default **true**) and `playback.enableQuicConnectionProbe` (Enabled/Disabled, default **true**) — report both together, they're meant to be paired. If enabled, note whether every custom `h5live.server` entry actually carries a `webtransport` URL (bintu-managed sources already have it); if not, MOQ silently has nothing to run over for that entry and falls back to WebSocket/MSE. | [nanoplayer_feature_moq](https://docs.nanocosmos.de/docs/nanoplayer/nanoplayer_feature_moq) |
| 2 | Fast playback start | `playback.faststart` (Enabled/Disabled, default **true** in v5, was **false** in v4 — flag if a v4-authored config left this unset expecting the old default). If enabled on a multi-entry/ABR source, note whether `startIndex`/`startQuality` is pinned to a conservative (medium/low) tier — faststart + a high-bitrate start on a constrained connection is the documented risk case. | [nanoplayer_feature_fast_start](https://docs.nanocosmos.de/docs/nanoplayer/nanoplayer_feature_fast_start) |
| 3 | Autoplay | `playback.autoplay` / `automute` / `muted` (state each). **Setup guidance to give if autoplay is wanted on a webpage:** browsers only allow autoplay when muted — set `autoplay:true, automute:true` so the player attempts unmuted first and falls back to muted automatically, or set `muted:true` outright for a guaranteed (silent) autoplay. On iOS, autoplay — even muted — can still require a user gesture (error `1005`); don't recommend forcing it, recommend a "tap to play" UI instead. If the target is a native mobile WebView rather than a browser tab, autoplay additionally needs the *native* WebView configured for it (Android `mediaPlaybackRequiresUserGesture=false`; iOS `mediaTypesRequiringUserActionForPlayback=[]` + `allowsInlineMediaPlayback=true`) — a player config with `autoplay:true` can't fix this on its own from inside a WebView that hasn't set those. | [nanoplayer_autoplay](https://docs.nanocosmos.de/docs/nanoplayer/nanoplayer_autoplay) |
| 4 | Latency control mode | `playback.latencyControlMode` — state the literal value, or "not set → defaults to `balancedadaptive`" (v5 default; v4 default was `classic`). Cross-reference §10: flag if `tweaks.buffer` is also configured under `balancedadaptive`/`fastadaptive`. | [nanoplayer_feature_latency_control_modes](https://docs.nanocosmos.de/docs/nanoplayer/nanoplayer_feature_latency_control_modes) |
| 5 | Player metrics | State plainly: "Set — `accountId`/`accountKey` present" (name which, if either is missing) or "**Not set — no metrics/analytics are sent to the nanocosmos backend for this playback session.**" Absence has no effect on playback; only worth extra comment if it breaks a pattern (e.g. every other config from the same integration has one and this one doesn't). | [nanoplayer_player_metrics](https://docs.nanocosmos.de/docs/nanoplayer/nanoplayer_player_metrics) |
| 6 | ABR | `source.options.adaption.rule` (state the literal value: `none` = manual-switch only, `deviationOfMean`/`deviationOfMean2` = auto-ABR; `deviationOfMean2` is the v5 default if unset) **and** the starting point (`source.startIndex` for entries, `source.group.startQuality` for a group — state which, and whether the two agree if both happen to be present). Then cross-check against the **actual backend stream architecture** using the dedicated ABR architecture table below — don't fold this into a single prose sentence in the row above; always render the full table. | see ABR architecture table below |
| 7 | Security / JWT | If `group.security.jwtoken` / `entries[].h5live.security.jwtoken` is present, **decode it (base64url header.payload.signature, no key needed — don't verify the signature, just read claims) and report as its own sub-table**: `iss`, `sub`, `aud`, `orgahash`, `tag`, `jti`, `iat`/`nbf`/`exp` converted to human-readable UTC alongside the raw epoch, computed lifetime (`exp - iat`), and current validity (compare `exp` against the actual current time — valid/expired, and if valid, time remaining). Also state `revocable` and `forceDisconnect` plainly, and if `revocable: true`, flag whether the lifetime exceeds the documented 24h cap (§5). If STS-style fields (`security.token`/`.expires`/`.options`/`.tag`) are present instead, report those verbatim — `expires` is already a plain epoch, no decoding needed, just convert to human-readable and check validity the same way. **If no security field is present at all, state that plainly** ("No token in config") rather than omitting the row — this is itself informative, especially on a known secure org (§5). | see §5 |

**JWT decoded-claims table — format.** When row 7 finds a `jwtoken`, render it as its own table right below the Feature Summary Table, in this shape (worked example — claim values from a nanocosmos demo-account token):

| Claim | Value |
|---|---|
| `iss` | `nanocosmos` |
| `sub` | `5886251c-2f3e-4d7a-aad8-d7ae5d0a57a0` |
| `aud` | `splay` |
| `orgahash` | `nNCcf` |
| `tag` | `nanostream-cloud-dashboard-player-token` |
| `jti` | `Z8InO3EA` |
| `iat` | `1786714444` → 2026-08-14 13:34:04 UTC |
| `nbf` | `1786714444` → 2026-08-14 13:34:04 UTC |
| `exp` | `1786800543` → 2026-08-15 13:29:03 UTC |
| Lifetime (`exp - iat`) | 86,099s ≈ 23.9h — under the documented 24h cap |
| `revocable` | `true` |
| `forceDisconnect` | `false` |
| **Current validity** (checked against actual UTC now) | **Valid** — state time remaining, or **Expired** — state how long ago |

Get "actual UTC now" from a real clock read (e.g. a shell `date -u`), never assume or hardcode a value — the whole point of the validity row is comparing `exp` against the real current time at evaluation time.

**ABR cross-check against the real backend (not just the static config):**
The player config's `entries[]`/`group` only says what the *page* is asking
for — it doesn't tell you whether that actually matches a real passthrough +
transcode setup on the backend, or something else entirely (see the
externally-provided case below). Resolve the real architecture with
`scripts/get_stream_config.sh <stream_name>` — see `stream-config-lookup.md`
for the full method — then **always report it as its own table**, not a
prose summary, using this format:

| Entry (config label/index) | Streamname queried | Resolved type | Role | Bitrate | FPS | Width | Height | Status |
|---|---|---|---|---|---|---|---|---|
| HIGH (0) | `HX26g-YRPSE` | group | passthrough | — | — | — | — | ✅ in player config |
| MEDIUM (1) | `HX26g-y8HtL` | group | transcode | 2000 | 25 | 1280 | 720 | ✅ in player config |
| LOW (2) | `HX26g-z728B` | group | transcode | 800 | 25 | 852 | 480 | ✅ in player config |
| *(not configured)* | `HX26g-uysvq` | group | transcode | 300 | 15 | 640 | 360 | ⚠️ real rendition, missing from player config |

(Shape and numbers are the actual result from a config checked earlier in
this skill's development — kept as a worked reference, not a hypothetical;
the stream names have been replaced with nanocosmos demo-org examples.)

**How many streamnames to query depends on the source style:**
- **`source.group`-sourced config**: query the group id (or any one member
  streamname) once — the bintu API resolves the *whole* member set from a
  single query.
- **`source.entries[]`-sourced config**: query **each entry's streamname
  individually** and give each its own table row. Unlike a group, there's no
  guarantee the entries are linked in bintu at all — assuming entry 1's
  result tells you anything about entry 2 is exactly the mistake to avoid.

**Interpreting what comes back (fill the `Resolved type`/`Role`/`Status`
columns accordingly):**
- **All entries resolve into the same `type: "group"` (or the same
  `daisy` chain)** — nanocosmos-side transcoding: one real source,
  transcoded into the renditions by nanocosmos's own infrastructure, exactly
  like the worked table above. Compare the real member **count** against
  the player config's `entries[]` length (or, for a `group`-sourced config,
  remember the player resolves its own rendition list from the group id
  rather than trusting the static `entries[]` at all — see §1's precedence
  rule). For `daisy`, resolve back to `stream[0]` (the true source), not an
  intermediate hop.
- **Each entry independently resolves as its own `type: "single"`** — this
  is not evidence anything is broken; give it its own status like
  "✅ independent passthrough — externally provided," not a warning
  symbol. It means each rendition is its own independent stream, pushed and
  passthrough on nanocosmos's side — the actual multi-bitrate encoding
  happens **externally**, upstream of nanocosmos (the customer's own
  transcoding pipeline or multiple encoder outputs), not on nanocosmos's
  transcode infrastructure. A `single` result is only a red flag when the
  player config expected nanocosmos-side transcoding (paired with a
  `source.group`) and got a lone `single` instead of a real group.
- **A queried streamname doesn't resolve at all** (`get_stream_config.sh`
  errors / not found) — mark that row's status "❌ not found," and note that
  this is the real "nothing to resolve to" case, distinct from a valid
  `single` result. Don't let one failed entry cast doubt on the others —
  report each row's own outcome.
- **Mixed results** (some entries share a group, others are standalone
  singles) are possible since each was queried independently — the table
  format handles this naturally: just report exactly what each row found.

**Streams of another organisation:** `get_stream_config.sh` only resolves
streams belonging to your own org's `BINTU_API_KEY`. For a stream you don't
own, report the ABR row from the static config alone and state explicitly
that the live backend cross-check wasn't performed.

### Customer Response Guidance

- Report findings as hard errors (config will not work / breaks a specific
  feature) vs. soft warnings (works, but likely not what was intended) in
  **separate tables** — don't blend them into one list, and don't fall back
  to prose bullets (see "Reporting format" near the top of this doc).
- For each finding, name the exact field/path and, where relevant, the error
  code it produces at runtime (§12) so the customer can correlate it with
  what they're actually seeing in the browser console.
- If secure playback is involved and the token itself is suspect, point to
  `security-tokens.md` / `nanostream-token-generation.md` and
  `scripts/check_jwt_token.sh` rather than re-deriving JWT mechanics here.
- Don't rewrite the customer's entire config unprompted — point at the
  specific fields to fix and let them apply the change, unless they've asked
  for a corrected version outright.
- If `tweaks.buffer` genuinely needs configuring (not just dropped for an
  adaptive `latencyControlMode`, see §10), don't propose `min`/`start`/
  `target`/`limit`/`max` values yourself — recommend consulting the internal
  team for the right values for that deployment.

### Contact nanocosmos support when

- The config looks fully valid by every rule above and the stream still
  fails — this points to a live/infrastructure issue, not a config issue;
  hand off to `diagnose-playback.md` / `check-stream-live.md`.
- A pasted config uses fields not covered by this reference at all (possible
  undocumented/internal field, or a v4-only field not listed here) — don't
  guess at its meaning.
- The customer's actual browser-console error code doesn't match anything in
  §12 for the mistake you've identified — re-verify against current docs
  rather than assuming this reference is exhaustive; player releases add new
  codes.

### Source pages read (all under docs.nanocosmos.de/docs/nanoplayer/ unless noted)

nanoplayer_introduction · nanoplayer_getting_started · nanoplayer_api ·
nanoplayer_api_errors · nanoplayer_feature_source_defaults ·
nanoplayer_feature_customization · nanoplayer_token_security ·
nanoplayer_feature_security_sts · nanoplayer_security_jwt ·
nanoplayer_feature_stream_group_configuration ·
nanoplayer_feature_stream_switching · nanoplayer_v5_migration_guide ·
nanoplayer_feature_reconnect_timeouts · nanoplayer_update_source ·
nanoplayer_feature_media_error_recovery ·
nanoplayer_feature_latency_control_modes · nanoplayer_autoplay ·
nanoplayer_feature_moq · nanoplayer_feature_video_access_and_processing ·
nanoplayer_player_metrics · nanoplayer_feature_fast_start ·
nanoplayer_iframe · nanoplayer_webview · nanoplayer_supported_browsers ·
nanoplayer_feature_fullscreen_api · nanoplayer_embed_detailed

Not yet read (didn't surface config-shape info in the nav sweep; revisit if a
future gap shows up): nanoplayer_faq, nanoplayer_blogposts,
nanoplayer_release_latest(+v4), nanoplayer_release_history,
nanoplayer_api_v4 (legacy v4 API, superseded by this doc for v5).
