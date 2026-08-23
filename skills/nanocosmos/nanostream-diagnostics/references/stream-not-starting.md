---
id: stream-not-starting
audience: customer
category: ingest
triggers:
  - stream stopped
  - stream not starting
  - stream offline
  - encoder disconnected
  - stream down
  - not live
  - went offline
severity_default: HIGH
---

## Stream Not Starting / Stream Stopped (Single Stream)

### When to Use
A customer reports that a single stream is not broadcasting or has stopped unexpectedly.

### Steps
1. **Check if the encoder is still broadcasting** — this is the most common cause:
   - In OBS: confirm "Stop Streaming" button is visible (i.e., streaming is active)
   - In other encoders: verify the broadcast is actively running
   - Hardware encoders: check power, network connection, and status indicators
2. Verify the stream name and ingest URL match what is shown in the Dashboard
3. Check encoder connection status and logs
4. Test network connectivity to `bintu-stream.nanocosmos.de`
5. Verify encoder settings: bitrate < 6 Mbps, keyframe interval = 2 s
6. Check Analytics dashboard for error alerts on that stream
7. **Always check ingest webhook health — do not skip this, even if the stream ran fine for a while before stopping.** A webhook (`on_publish`) is called on every publish attempt, not just the first one; if it starts failing partway through an otherwise-healthy stream's life, or if a reconnect cycle is failing to re-establish, the webhook is a common and easy-to-miss cause. See `ingest-connection-failure.md`'s webhook step for the **custom vs. internal webhook** distinction — only a *custom* webhook (one the customer configured themselves) is ever discussed with the customer; an internal-webhook finding is a platform-side matter to escalate, not something to describe to them in webhook terms.   - **If the stream has an internal `push`/restream destination** (per `stream-config-lookup.md`), the **push target is its own stream on its own organisation, with its own independent webhook (custom or internal, independently of the source's)** — check that target stream's webhook too, not just the source's. A source that ingests perfectly fine can still "end" from the customer's point of view if the internal push to the target is being rejected by the target org's webhook.
### Customer Response Guidance
- Lead with verifying the encoder is actively streaming before assuming platform issues
- Provide ingest troubleshooting steps
- If encoder is confirmed running, escalate and check platform status
- **Only ever discuss a *custom* webhook with the customer — never an internal one.** If no custom webhook is configured and the internal webhook is the actual cause, tell the customer only that ingest is being rejected on the platform side and is under investigation; don't give them response codes or call it "your webhook."
- **When both a connection/reconnect finding and a custom-webhook finding are being reported together, state the connection timeline first (exact times the instability was/wasn't observed), then introduce the webhook result as a plausible cause of that instability** — an unstable or rejecting webhook gates every (re)connect attempt, so it's a reasonable explanation for reconnects failing or being unstable, not a second unrelated issue. **Always label this as an inference from the data, not a confirmed root cause, and ask the customer to check and confirm on their end** — this matters most when the connection and webhook findings came from different streams/organisations (e.g. a source stream and its internal push target), where the causal link can't be directly proven from the data alone.

### Contact nanocosmos support when
- Multiple streams are affected (see `multiple-streams-down`)
- Customer confirms encoder is running but stream still fails after 10+ minutes
- The stream shows live/healthy by the time you check, but the customer reported a specific past time it was down — a self-recovered incident still has a real root cause and is still escalatable, don't close it out just because it looks fine now- A **custom** webhook check (source or push-target) turns up non-2xx responses — that's the likely root cause rather than continuing to look at encoder/network causes
- If no custom webhook is configured and ingest is still being rejected, the cause is platform-side — contact nanocosmos support
