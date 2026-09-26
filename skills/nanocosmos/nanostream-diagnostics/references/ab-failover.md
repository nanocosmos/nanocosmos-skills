---
id: ab-failover
audience: customer
category: setup
triggers:
  - A/B ingest
  - A/B failover
  - AB failover
  - backup stream
  - redundant stream
  - primary and backup RTMP
  - stream switching
  - encoder failover
  - main stream backup stream
  - updateSource
  - switchStream
  - stream group failover
  - vtrans-a
  - vtrans-b
severity_default: MEDIUM
---

## A/B Ingest Failover — End-to-End Configuration

### When to Use
A customer asks about redundancy/failover for their stream — sending a primary and backup feed so a viewer keeps watching if one feed drops (encoder issue, network issue, ISP/router failure, etc.), or specifically asks about "A/B" streaming, backup RTMP, or automatic stream switching. This is an **end-to-end workflow with two independent halves that both need to be set up** — ingest redundancy and player-side switching — not a single toggle.

### The Core Concept
There is no automatic, platform-managed "backup stream" feature — nanoStream's own infrastructure already has server-level redundancy (if a server fails, another takes over transparently), but that's separate from **stream-level A/B failover**, which is entirely the customer's responsibility to configure at both ends:
1. **Ingest**: the encoder sends the *same content* to two *different* stream names, ideally via geographically/infrastructure-diverse ingest endpoints.
2. **Player**: the player is configured with both streams and automatically switches between them when it detects a problem with whichever one is currently active.

Both halves are needed for a real end-to-end solution — ingest redundancy alone does nothing if the player never switches, and player-side switching logic is useless without a genuinely independent second feed to switch to.

### Part 1: Ingest Configuration
- **Never ingest the same stream name twice** for A and B — this doesn't work and isn't expected to (can cause issues with recording/live processing and incorrect stream state). Stream A and Stream B must be two distinct stream names, each receiving an identical copy of the encoder's output (dual push from the encoder, or two encoders).
- Use the dedicated A/B ingest domains, which are guaranteed to route to different datacenters within a region:

| Region | A endpoint | B endpoint |
|---|---|---|
| EU | `bintu-vtrans-eu-a.nanocosmos.de` | `bintu-vtrans-eu-b.nanocosmos.de` |
| US | `bintu-vtrans-us-a.nanocosmos.de` | `bintu-vtrans-us-b.nanocosmos.de` |
| AS | `bintu-vtrans-as-a.nanocosmos.de` | `bintu-vtrans-as-b.nanocosmos.de` |

Push Stream A to the region's `-a` endpoint and Stream B to the same region's `-b` endpoint (e.g. `[STREAM-NAME-A].bintu-vtrans-eu-a.nanocosmos.de` and `[STREAM-NAME-B].bintu-vtrans-eu-b.nanocosmos.de`).

- **These A/B endpoints are transcoding (`vtrans`) servers — there is no separate/dedicated A/B setup for `single` (non-transcoding) streams.** A `single`-type stream *can* technically ingest into these same A/B `vtrans` endpoints (recall a `single` stream landing on `vtrans` is generally harmless — see `stream-config-lookup`), but doing so specifically to get A/B redundancy is **not a default supported path — confirm it with nanocosmos support first**. Don't point a `single` stream at the A/B URLs without that confirmation.
- There's no global/auto-nearest-region A/B entry point — the customer picks the region matching their broadcast location.

### Part 2: Player-Side Failover Configuration
Reference implementation: **https://files.nanocosmos.de/index.php/s/XcDmFzzqeYkSS3s** — link this directly in responses, it's the working example to adapt.

What it does:
- Configures the NanoPlayer with **two stream groups, A and B**, using **bintu group IDs** (not individual single-quality stream entries) — so this is designed for `group`-type A/B streams (see `stream-config-lookup`), not raw single streams.
- Implements failover using the player's **`updateSource` API** (https://docs.nanocosmos.net/docs/nanoplayer/nanoplayer_update_source#updatesource-api), switching from A→B or B→A when specific error conditions fire.
- Error conditions that trigger a switch are defined in `main.js` under `getReasonsForFailover()` — customizable to whatever error events should count as "this stream is bad, switch now."
- Includes a safeguard: `failoverCountMax` in `main.js` caps the number of failover attempts, to stop repeated flapping if the underlying issue persists rather than retrying indefinitely.

**Before handing this to a customer**, remind them to replace the placeholder group IDs in the example with their actual bintu group IDs for both A and B — the code won't work with the placeholders left in.

If a customer wants custom logic beyond player-reported error events (e.g. deciding which stream is healthier based on external monitoring), point them at the Monitoring API (https://api.nanostream.cloud/docs/analytics/v2/#tag/Monitoring) as an alternative/additional signal source for driving the switch decision themselves.

### Customer Response Guidance
- Present both halves together as one workflow — a customer asking only about ingest redundancy should still be told they need the player-side piece too (and vice versa), or their setup won't actually achieve automatic failover.
- Be clear that this is a customer-implemented pattern using nanoStream's building blocks (dual ingest endpoints + `updateSource` + the reference module), not a one-click platform feature.
- Don't say "there's no failover" flatly — nanoStream's server infrastructure already has its own automatic redundancy; what's being set up here is stream-level A/B switching, a different and complementary concern.
- If the customer's use case is a `single` stream (not `group`), check with nanocosmos support before pointing it at the A/B `vtrans` endpoints.

### Contact nanocosmos support when
- Customer has a `single`-type stream and wants A/B ingest redundancy — technically possible on the `vtrans` A/B endpoints, but needs internal discussion/clearance before recommending
- Customer needs a global/auto-nearest-region A/B entry point rather than manually picking EU/US/AS — not currently available
- The reference player module's failover logic doesn't fit the customer's specific error-detection needs and requires custom development beyond adapting `getReasonsForFailover()`
