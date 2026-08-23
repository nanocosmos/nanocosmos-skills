---
id: timecode-metadata
audience: customer
category: setup
triggers:
  - timecode
  - timed metadata
  - AMF metadata
  - onFI
  - onMetaData
  - streamTime
  - timestamp injection
  - server-side timecode
  - metadata injection
  - metadata add-on
  - timecode injection
  - metadata not firing
  - onMetaData not firing
  - synchronize events
  - frame timestamp
  - studio timestamp
  - AMF onFI
severity_default: LOW
---

## AMF Timecode / Timed Metadata

### When to Use
A customer asks about injecting or receiving timecode or timed metadata in a live stream — typically to synchronize UI events, game state, or studio timestamps to the displayed video frame using the H5Live player's `onMetaData` event.

### Key Concepts

**Two injection approaches:**

1. **Encoder-side (RTMP only):** The encoder sends AMF `onFI` metadata frames with a custom payload. The H5Live player only handles `onFI` AMF messages — `onTextData` and other AMF event types are not exposed. The **Metadata Add-on must be enabled on the account** by the nanoStream team before this works. CDN passes through transparently once enabled.

2. **Server-side (Timecode Add-on):** nanoStream injects a nanocosmos-format timestamp into the stream at a configured interval. Works on both RTMP and SRT ingest. This is a **paid add-on** — not enabled on trial accounts by default. Enabled via Dashboard or Bintu API.

**Important:** Server-side timecode injects a nanoStream timestamp only — it does NOT carry custom payloads. For custom data (e.g. game event sequences), use encoder-side injection.

**SEI NAL timecode (H.264):** SEI NAL units are passed through the CDN but are NOT parsed or exposed by the H5Live player. Not recommended — use AMF/onFI instead.

### Support Matrix

| Feature | RTMP | SRT |
|---|---|---|
| Encoder-side AMF (onFI) metadata | Yes | **No** — AMF is not part of the SRT protocol |
| Server-side timecode injection | Yes | **Yes** — SRT supports server-side only |

**SRT ingest note:** SRT customers can only use server-side timecode injection. Encoder-side AMF onFI is not available for SRT streams.

### Steps

1. **Determine which approach the customer needs:**
   - Custom payload (e.g. game state, event sequence) → encoder-side AMF injection
   - Simple timestamp sync only → server-side Timecode Add-on

2. **For encoder-side AMF injection (RTMP):**
   - Customer sends `onFI` AMF events from their encoder/streaming library (only `onFI` is handled by the H5Live player)
   - **Requires the Metadata Add-on to be enabled on the nanoStream account** — contact nanocosmos support to enable it
   - Once enabled, CDN passes through `onFI` AMF metadata transparently

3. **For server-side Timecode Add-on:**
   - Enable via Dashboard: stream settings → Add Timecode Injection
   - Or via Bintu API: see Bintu API docs — Set Timecode endpoint
   - Restart the stream after enabling for settings to take effect
   - Recommended interval: **1000ms** (default); reduce to **500ms** for sub-second precision
   - Check if the account is on a trial plan — the add-on may not be enabled; contact support to enable it

4. **Player configuration (required for both approaches):**

   Enable metadata reception in the NanoPlayer config:
   ```javascript
   var config = {
     "playback": {
       "metadata": true
     }
   }
   ```

   Listen for the `onMetaData` event:
   ```javascript
   player.on("onMetaData", function(event) {
     console.log(event.data); // custom payload or timecode arrives here
   });
   ```

5. **Test with demo player:**
   Add `&metadata=1` to the demo player URL to verify metadata is being received.

   Non-secure account:
   ```
   https://demo.nanocosmos.de/nanoplayer/release/nanoplayer.html?group.id=[streamname]&metadata=1
   ```

   Secure account (JWT token required):
   ```
   https://demo.nanocosmos.de/nanoplayer/release/nanoplayer.html?group.id=[streamname]&group.security.jwtoken=[jwtoken]&metadata=1
   ```

### Customer Response Guidance

- Clarify which approach fits their use case (custom payload vs timestamp only)
- If `onMetaData` is never firing: check that `playback.metadata: true` is set AND that the encoder or server-side add-on is actually injecting metadata
- On a trial plan and need the server-side add-on: contact support to enable it
- SEI NAL timecode users: redirect to AMF/onFI approach — SEI is not exposed to the player

### Documentation
- Dashboard timecode setup: https://docs.nanocosmos.net/docs/cloud-frontend-v3/Dashboard_Start_Streaming#add-timecode-injection
- NanoPlayer onMetaData API: https://docs.nanocosmos.net/docs/nanoplayer/nanoplayer_api#NanoPlayer..event_onMetaData
- Bintu API — Set Timecode: https://doc.pages.nanocosmos.de/bintuapi-docs/#operation/Set%20Timecode

### Contact nanocosmos support when
- The Timecode Add-on needs enabling on the account — contact nanocosmos support
- `onMetaData` is still not firing after correct player config and confirmed encoder injection
- Customer needs custom server-side payload injection (not just nanoStream timestamps) — this is not supported; engineering input may be needed
