---
id: moq-playback-issues
audience: customer
category: playback
triggers:
  - moq
  - media over quic
  - quic
  - webtransport
  - enableMediaOverQuic
  - works when moq disabled
  - works with moq off
  - moq enabled
  - moq disabled
  - quic connection probe
  - moq handshake
  - is moq enabled for our account
severity_default: MEDIUM
---

## MOQ (Media over QUIC) Playback Issues

### When to Use

A playback problem where MOQ is suspected or mentioned — the behavior changes when MOQ is enabled/disabled, the customer asks whether MOQ is active for their account, or a symptom appears only on browsers/devices where MOQ is in use while WebSocket playback of the same stream is fine.

MOQ (Media over QUIC) is nanocosmos's playback transport, stable and rolled out globally. It delivers faster connection times, lower latency, and better protection against network issues than traditional streaming transports — especially valuable on unstable networks. It is a fully supported production feature — it is NOT experimental or in beta, and must never be described that way. Reference: https://docs.nanocosmos.net/docs/nanoplayer/nanoplayer_feature_moq

### How MOQ is selected

- Two player config parameters control it, both in the `playback` object and both default **enabled**: `enableMediaOverQuic` (MOQ playback itself) and `enableQuicConnectionProbe` (probes WebTransport/QUIC connectivity during setup). They are meant to work as a pair.
- MOQ requires the WebTransport and WebCodecs browser APIs. As of 2026-08: Chromium browsers (Chrome, Edge, Opera, Brave, Samsung Internet) v110+, Firefox v130+ (Windows/macOS only), Safari on macOS/iOS/iPadOS 26.4+ — browser support evolves, so verify the current matrix on the docs page above before quoting it.
- When MOQ is unsupported or the connection probe fails, the player **automatically falls back to WebSocket/MSE** — viewers still get the stream, over the classic transport.
- Custom `h5live.server` entries need a `webtransport` URL for MOQ to have anything to run over; bintu-managed sources carry it automatically. Without it, that entry silently plays over WebSocket/MSE.

### Steps

1. **Isolate the transport.** Reproduce the issue once with MOQ explicitly disabled: set `playback.enableMediaOverQuic: false` (or in the demo player, append `&playback.enableMediaOverQuic=false`). If the symptom disappears with MOQ off — or only appears with MOQ off — that is the single most useful fact for the investigation; note it precisely.

2. **Record the environment.** Browser and exact version, OS and version, device model. MOQ availability is decided per browser/OS, so "works on my machine" comparisons are only meaningful with versions attached.

3. **Check whether the affected browsers actually support MOQ** (versions above). On unsupported browsers the player already uses WebSocket/MSE, so MOQ cannot be the cause there.

4. **For custom server configurations**, confirm every custom `h5live.server` entry includes a `webtransport` URL. A missing one doesn't break playback — it just means WebSocket/MSE is used for that entry.

5. **Report to support** with: the stream name, the on/off comparison result from step 1, the environment list from step 2, and the time window when it occurred. Account-level MOQ settings can be reviewed and adjusted by the nanocosmos team — whether MOQ is enabled for an organisation is something support can check and change.

### Customer Response Guidance

- Never call MOQ experimental, beta, or unstable — it is a production transport with automatic fallback.
- If the customer's comparison shows a MOQ-specific symptom, acknowledge it as a valuable reproduction, collect the environment details, and escalate — do not simply advise "keep it disabled" as a fix; disabling MOQ also gives up its connection-time and latency advantages, so it is a diagnostic step and, at most, a temporary measure agreed with support.
- If asked whether MOQ is compatible with IETF MOQT: partly — ingest is available on request, playback is intentionally not fully IETF-MOQT-compliant to preserve the best real-time experience, and IETF MOQT itself is still a draft.


### Contact nanocosmos support when

- A reproducible symptom appears only with MOQ enabled (or only disabled) on a supported browser — include the on/off comparison and environment details
- Audio or video behavior differs between MOQ and WebSocket playback of the same stream
- The customer asks for MOQ to be enabled/disabled for their account — account-level transport settings are changed by the nanocosmos team, not self-service
- Multiple customers or streams show the same MOQ-specific symptom at the same time
