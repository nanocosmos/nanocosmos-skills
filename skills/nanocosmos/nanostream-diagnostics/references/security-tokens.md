---
id: security-tokens
audience: customer
category: security
triggers:
  - secure token
  - playback token
  - unauthorized access
  - token expired
  - token invalid
  - secure stream
  - prevent embedding
  - API authentication
  - token not working
  - clock skew
severity_default: MEDIUM
---

## Security and Playback Tokens

### When to Use
A customer asks about securing their stream, setting up playback tokens, or is experiencing token-related errors.

### Security Layers
1. **API Keys** — backend bintu API access (Dashboard > Organization > API Keys)
2. **Secure Tokens (Playback Tokens)** — viewer/player authentication
3. **Stream Keys** — unique ingest credentials
4. **Webhook Signatures** — secure webhook verification

### How Secure Tokens Work
1. Backend generates a token using the bintu API (never in client-side code)
2. Token includes stream info, expiration, and optional client restrictions
3. Player receives the token instead of raw stream credentials
4. Token is validated by nanoStream servers on each playback request

### Secure Playback Is an Organization Setting
- Secure playback is enabled or disabled for the **whole organization**, not per stream. When it is on, **every** stream of that organization requires a valid playback token; when it is off, no stream does.
- It cannot be switched on per stream in the Dashboard, and a customer cannot enable it themselves on an existing non-secure organization. A customer who needs secure playback on a non-secure account needs a (new) secure-enabled organization — our sales team sets this up.
- A mixed setup (some streams token-protected, others open) needs at least **two separate organizations**: one secure, one non-secure.

### Setting Up Secure Playback
1. Make sure the organization is secure-enabled (see above)
2. Generate tokens server-side via the bintu API with your organization API key
3. Configure H5Live Player with the token
4. Use short token lifetimes (15–60 minutes); implement refresh before expiry
5. Longer-lived, orga-wide playback tokens are fine for testing and development only — not for a production integration. Production should stay with the <24h, per-stream/per-group scoped pattern above; a leaked orga-wide token grants playback of every stream in the org for its full lifetime and can't be shortened after minting. The lifetime/scope tradeoff is always your own security decision based on your risk tolerance.

### Common Token Issues

| Error | Cause | Fix |
|---|---|---|
| Token expired | Token lifetime exceeded | Generate new token; check server clock sync |
| Token invalid | Wrong API key or malformed token | Verify API key; check token format |
| Token not working | Organization is not secure-enabled (tokens are ignored) | Secure playback is an organization setting, not a stream setting — a secure-enabled organization is needed (contact sales) |
| Clock skew | Server time out of sync | Sync server time (NTP) |

### Stream Ingest Security
- Each stream has a unique stream name/key — treat it like a password
- Stream keys can be regenerated in the Dashboard if compromised
- Optional: IP allowlisting for ingest

### Best Practices
- Never expose API keys in frontend/client-side code
- Generate tokens server-side only
- Rotate API keys periodically
- Use HTTPS for all API calls and player embeds

### Customer Response Guidance
- For expired tokens: guide through server-side token generation and refresh logic
- For "token not working": first check whether the organization is secure-enabled at all. Never tell the customer to enable secure playback per stream in the Dashboard — it is an organization setting. If they need it on a non-secure account (or need secure and open streams side by side), explain that this needs a separate secure-enabled organization, set up by our sales team
- Don't assume which account the customer means. Customers with a mixed setup have several organizations, some secure and some not, so don't state whether "their" account is secure until the specific organization or stream is confirmed — ask which stream or account it is about

### Contact nanocosmos support when
- Valid tokens are consistently rejected without clock skew or configuration issues (platform auth problem)
