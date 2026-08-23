---
id: geo-restriction-regional-access
audience: customer
category: security
triggers:
  - geo-restriction
  - geo blocking
  - geoblocking
  - restrict by country
  - block countries
  - viewers in a specific country
  - regional access
  - restricted region
  - blocked in our region
  - custom domain
  - alternative domain
  - domain whitelist playback
  - restrict playback to domains
  - ip restriction playback
  - ingest ip whitelist
  - restrict who can publish
  - block ingest ips
  - ingest webhook restriction
severity_default: MEDIUM
---

## Geo-Restriction and Regional Access

### When to Use

Two opposite request shapes, both about geography:

1. **Restricting playback** — the customer wants their streams viewable only from certain countries, websites, or networks (rights management, market exclusivity, regulatory requirements).
2. **Enabling regional access** — viewers in a specific region/market cannot reach the streams (local network policies or national-level blocking of the default delivery domains) and the customer needs a delivery path that works there.

### Ingest and playback are protected by different mechanisms

Always establish first **which side** the customer wants to restrict — the mechanisms are completely separate:

- **Ingest protection (who may publish)** works through the **ingest webhook**: every publish attempt triggers the webhook, and its response accepts or rejects the connection. The webhook can be **hosted by the customer** (their own logic — IP allowlists, keys, schedules, anything) **or hosted by nanocosmos**. Based on this mechanism, nanocosmos can provide an **IP / geo blocking service for ingest**: the customer sends the IPs (or ranges) to whitelist or block, and the nanocosmos-hosted webhook enforces them. Requests of this shape ("only our studios may publish", "restrict SRT/RTMP ingest to these IP ranges") go to support with the IP list.
- **Playback protection (who may watch)** works through **secure playback tokens (JWT)** and/or **nanoStream Guardian** — described below. The ingest webhook plays no role in playback, and playback tokens play no role in ingest.

### 1. Restricting who can play a stream

Available restriction layers, from the standard security stack:

- **Secure playback tokens (JWT)** — the primary mechanism. Tokens are scoped per stream, carry an expiration time, and can restrict playback to authorised website domains (referrer) and to specific client devices/IPs for a limited time. Revoking one operator's/partner's token does not affect others. See `security-tokens.md` and https://docs.nanocosmos.net/docs/cloud/security
- **nanoStream Guardian** (in the Analytics dashboard) — an additional per-stream protection layer with IP, referrer, and geographic restrictions plus session termination, configurable individually for each stream. See https://docs.nanocosmos.net/docs/cloud/guardian
- **Country-level geo-blocking at scale** (e.g. "playable only inside country X, block everything else, detect VPNs") is a solution-design conversation, not a self-service toggle: capabilities in this area are evolving, and large-scale or contractual geo requirements are scoped together with the nanocosmos team. Collect the requirement (territories to allow/block, VPN handling expectations, timeline) and route to support/sales rather than promising specifics.

Do not state that a specific geo capability does or doesn't exist beyond the documented Guardian/token features above — verify against the docs links or ask the team; this area changes.

### 2. Regional delivery and access from a restricted region

Be precise about how regional delivery actually works — the domains are easy to misunderstand:

- **The default is automatic geo-balancing.** The standard playback domains route every viewer to the best region automatically (GeoDNS/GSLB — see `firewall-domain-whitelist.md`). Customers do not — and should not — pick a region themselves; there is nothing to configure for normal regional delivery, anywhere in the world.
- **Alternative playback domains are NOT a "choose your geo" mechanism.** They exist for the specific case where the standard domains have become unreachable for viewers in a market (e.g. national-level blocking) — a support-configured, per-customer setup that changes only the player configuration, not the streams:
  - The player is pointed at the alternative domains via config: the bintu API URL (`source.group.apiurl`), the playback server domain (`source.general.serverDomain`), the metrics endpoint (`metrics.serverDomain`), and the player script loaded from the alternative CDN host.
  - The stream names, tokens, and everything else stay unchanged — it is a delivery-path change only, and the alternative domains geo-balance just like the standard ones.
  - The concrete domain names are **assigned per customer by support and can change over time** (a domain that becomes unavailable in a region is replaced, and customers are notified to switch). Never copy domain names from another customer's setup or from old tickets — always request the current assignment from support.
- **Accessing a specific region directly** is possible in certain cases, but it is a **diagnostic tool, not a delivery choice**: its purpose is comparing network connectivity and quality between regions (e.g. "is the problem specific to the route viewers in market X are taking?"). If a customer asks to pin their viewers to a particular region for production traffic, that is almost never the right answer — the automatic geo-balancing is; clarify what problem they are actually trying to solve and involve support.

Customer reports viewers in a market cannot reach the streams: collect the affected region/market, whether the problem is confirmed from viewer reports or measured, and the platform (web/app) — then escalate to support, who decide between a routing investigation, a direct-region connectivity comparison, and (only for genuinely blocked markets) an alternative-domain assignment with the exact config snippet.


### Contact nanocosmos support when

- Any country-level geo-blocking requirement (allow/block lists of territories, VPN detection) — needs solution design with the team, never answer with a capability promise
- A regional-access problem is reported for a customer already on an alternative-domain setup — the assigned domain may have become unavailable in that region and may need rotation
- Regulatory/contractual restriction requirements (rights windows, market exclusivity) — involve sales
