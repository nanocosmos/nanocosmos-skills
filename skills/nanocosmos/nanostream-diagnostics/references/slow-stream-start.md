---
id: slow-stream-start
audience: customer
category: playback
triggers:
  - slow start time
  - takes too long to start
  - 10 seconds to start
  - high startup time
  - startup latency
  - playback takes long
  - long loading time
  - stream loads slowly
  - delayed playback start
  - slow to start
  - loading time
  - slow loading
  - startup delay
  - stream slow to play
  - takes a while to load
  - long buffering at start
  - initial load time
  - seconds to load
  - seconds to start playing
severity_default: MEDIUM
---

## Slow Stream Start / High Startup Time

### When to Use

A stream takes longer than expected to begin playing — typically more than 4–5 seconds — but once it is running, it plays normally.

If there is **also** buffering, freezing or lagging *during* playback (not just at the start), that points to a bandwidth or quality problem instead — see `quality-issues` and `diagnose-playback`.

The most common cause of a slow start is a **keyframe interval (GOP length) that is too long**. The recommended value for ultra-low-latency streaming is **2 seconds**.

### Why the keyframe interval controls startup time

A player can only begin showing video at a keyframe. It joins the stream, waits for the next keyframe to arrive, and starts from there.

That means the keyframe interval sets the worst-case wait before playback begins. With a 10-second interval, a new viewer can wait up to 10 seconds. With a 2-second interval, that worst case drops to about 2 seconds. Nothing else in the delivery chain can compensate for this — the video simply cannot start earlier.

### Steps

1. **Check the keyframe interval in your encoder.** This is the fastest check, because your encoder is where the value is set — there is no need to measure anything. Look for a setting named **Keyframe Interval**, **Keyframe Distance**, or **GOP Size**.

2. **If it is above 2 seconds, set it to 2** and restart the stream. See the encoder settings below.

3. **If some encoders express the interval in frames rather than seconds**, multiply your frame rate by 2. At 30 fps set `60`; at 25 fps set `50`.

4. **Confirm the stream is actually live** in the Dashboard before testing — a stream that is not currently publishing cannot be measured or tested.

5. **Test again after restarting the stream.** The change only takes effect on a new publishing session, not on the running one.

**If you are not sure what your encoder is really sending**, ask support to measure it. We can read the actual keyframe distance directly from your live stream while it is publishing, which is more reliable than the configured value — some encoders, especially in "auto" keyframe modes, send a different interval than the one set in their settings.

### Encoder settings

- **OBS Studio:** Settings → Output → Output Mode: *Advanced* → Streaming → **Keyframe Interval** → set to `2`
- **Most other encoders:** find **Keyframe Interval**, **Keyframe Distance** or **GOP Size** and set it to `2` seconds
- **Encoders that use frames:** frame rate × 2 (30 fps → `60`, 25 fps → `50`)
- Avoid "auto" or "dynamic" keyframe settings — these often produce intervals far longer than 2 seconds

After changing the setting, **stop and restart the broadcast** so the new interval takes effect.

### If the keyframe interval is already 2 seconds

Then the slow start is not caused by keyframe distance. Continue with `diagnose-playback`, and check:

- whether the delay affects all viewers or only some (points to a local network or region issue)
- whether it affects all your streams or only one
- whether playback is otherwise stable once started

### Measuring the actual GOP yourself

Do not rely on the configured encoder setting alone; "auto" keyframe modes and some hardware encoders produce a different interval than configured. Measure it from the live stream:

1. Check state and security mode:
   ```bash
   scripts/get_stream_info.sh <stream_name>
   ```
   Returns CSV: `<secure|unsecure>,<live|not live>,<raw state>`. If `not live`, start the broadcast first — the measurement needs a running stream.

2. Measure the average keyframe distance:
   - CSV contains `unsecure`:
     ```bash
     scripts/check_gop_unsecure.sh <stream_name>
     ```
   - CSV contains `secure`:
     ```bash
     scripts/check_gop_secure.sh <stream_name>
     ```

3. Interpret: **≤ 2 s** → GOP is fine, fall back to `diagnose-playback`. **> 2 s** → confirmed cause, proceed with the encoder fix above.


### Contact nanocosmos support when

- The keyframe interval is confirmed at 2 seconds and the slow start persists
- Slow startup is accompanied by buffering or freezing during playback
- Several streams are affected at the same time — see `multiple-streams-down`
- Startup time suddenly got worse with no change to the encoder configuration
