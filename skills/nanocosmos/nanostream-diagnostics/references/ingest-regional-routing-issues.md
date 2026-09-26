---
id: ingest-regional-routing-issues
audience: customer
category: ingest
triggers:
  - buffering from one studio
  - buffering from a specific location
  - multiple streams from same location buffering
  - streams recovered after republish
  - streams recovered after reconnecting
  - intermittent buffering same region
  - degraded route
  - network route issue
  - direct datacenter ingest
  - bypass load balancing ingest
  - regional ingest routing
  - one studio affected others fine
  - framerate drop one location
severity_default: MEDIUM
---

## Regional Ingest Routing Issues (Buffering From One Origin)

### When to Use
Several streams from the **same physical origin** (one studio, venue, or region) show buffering, added delay, or dropped framerate at the same time, while streams from other locations are unaffected. The problem may resolve on its own, come back intermittently, or clear up as soon as the encoder reconnects.

### Why This Happens
Ingest uses the same automatic geo-load-balancing (GeoDNS/GSLB) as playback (see `firewall-domain-whitelist.md`) to route each encoder to the nearest healthy nanoStream ingest point. Occasionally the network path between one specific origin and the datacenter it currently routes through degrades — packet loss or congestion on that path, not a problem with the encoder or with nanoStream generally. Because it is a *path* problem, it typically affects every stream taking that path at once, and clears up if the route recovers or traffic gets rerouted.

### Steps
1. Confirm the pattern: do the affected streams share one encoder location/studio, and are streams from other locations unaffected? This is what distinguishes a routing issue from a broader platform issue (see `multiple-streams-down.md`) or a single encoder problem (see `ingest-connection-failure.md`).
2. Ask the customer to republish the affected stream(s) — reconnecting can land the encoder on a different, healthy path automatically. Republish **one stream at a time**, with a short wait between each, rather than all at once.
3. A framerate drop with no ingest delay reported at the same time is not automatically the same issue — restarting that stream and confirming recovery is reasonable, but don't assume it shares the routing root cause without checking.
4. If the issue is confirmed ongoing or recurring, escalate to support with: the affected stream names, the reported time window(s) (UTC), and the encoder's approximate location.

### The Direct-Datacenter Workaround (Exceptional, Support-Assigned Only)
**This is a last resort, not the standard response to a confirmed regional route issue.** The default when a route is degraded is to keep monitoring and let it recover, or fix the routing itself internally — most confirmed cases resolve without ever handing a customer an ingest domain to reconfigure. Reaching for the direct-datacenter domain should be reserved for when the customer cannot reasonably wait for the normal fix path — most typically when the incident falls **outside normal support/engineering coverage hours (nights, weekends)** and an active or time-critical stream needs continuity now, rather than waiting for the next business window.

If, and only if, that bar is met, support may provide **direct datacenter ingest domain(s)** as a temporary workaround — a domain that targets one specific datacenter directly instead of the normal geo-balanced entry point, bypassing the affected route while it's investigated. This is the ingest-side equivalent of the alternative playback domains described in `geo-restriction-regional-access.md`, and follows the same rules:
- These domains are **assigned by support for the specific incident** — never reuse one from a previous ticket or another customer's setup; always request the current one.
- Point only the affected stream(s) at the direct domain; leave everything else on the standard `bintu-vtrans.nanocosmos.de` / `bintu-stream.nanocosmos.de` entry point.
- If several streams need to move, split them across the datacenter domains support provides rather than concentrating all of them on one, and republish one at a time.
- This is a **temporary bypass, not a permanent configuration** — it trades away automatic load balancing and bulk-ingest handling for that stream. Switch back to the standard ingest domain as soon as support confirms the route has recovered, and don't wait for the customer to ask.

### Customer Response Guidance
- Acknowledge the pattern (same origin, multiple streams) — this is a recognized failure mode, not a coincidence to dismiss.
- Don't state a root cause before support confirms it — "we're checking whether a specific network path is affected" is accurate; "your connection is broken" or "our platform is down" are not, until confirmed either way.
- If a direct-datacenter domain is issued, give the exact domain and the caveats above in writing (not only verbally), so the customer knows to switch back once the route recovers.

### Contact nanocosmos support when
- The pattern recurs across multiple sessions or days from the same origin — worth flagging as a standing infrastructure/vendor issue, not re-diagnosing from scratch each time.
- More than a couple of streams are affected at once, or the customer treats the affected stream(s) as time-critical (e.g. a live event) — escalate immediately rather than waiting to see if it repeats.
