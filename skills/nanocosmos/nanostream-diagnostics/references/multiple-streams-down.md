---
id: multiple-streams-down
audience: customer
category: ingest
triggers:
  - all streams down
  - multiple streams
  - outage
  - platform issue
  - everyone affected
  - widespread
  - nothing is working
severity_default: CRITICAL
---

## Multiple Streams Down / Platform Outage

### When to Use
A customer (or multiple customers) report that several streams are simultaneously down, suggesting a platform-level issue rather than an encoder problem.

### Steps
1. Check nanoStream status page immediately
2. **Check for an ingest webhook (`on_publish`) configured for the organisation** — a single failing webhook endpoint blocks ingest for *all* of the organisation's streams at once and looks like a platform outage from the customer's side. The platform calls the webhook on every publish attempt and only allows ingest if it returns HTTP 2xx. Customers can check this themselves:
   - Check whether an ingest webhook is configured (organisation settings in the Dashboard, or via the bintu API)
   - If one is set, verify the webhook service is running, publicly reachable, returning HTTP **200**, and not blocked by firewall rules or rate limiting
   - If the webhook service is down or erroring, all ingest is rejected until it is restored — even though every other setting is correct
   - **If the webhook (or the streams themselves) already look healthy by the time you check, that does not mean nothing happened** — a webhook outage routinely resolves on its own before anyone looks, and a current healthy check cannot tell you whether it was failing during the reported window.
3. Determine if the issue is regional or global
4. Check whether affected streams share a common encoder or network infrastructure (could still be customer-side)
5. Escalate to engineering immediately regardless of status page state

### Customer Response Guidance
- Acknowledge urgency
- If the customer has an ingest webhook configured, ask them to verify their webhook endpoint is up and returning HTTP 200 — this is the most common customer-side cause of all streams failing at once
- Confirm whether it is a known platform issue
- Provide an estimated time to resolution once engineering is engaged

### Contact nanocosmos support when
- Always — multiple streams down is always HIGH/CRITICAL severity
