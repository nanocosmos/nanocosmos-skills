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

### Setting Up Secure Playback
1. Enable secure playback in Dashboard stream settings
2. Generate tokens server-side via bintu API
3. Configure H5Live Player with the token
4. Use short token lifetimes (15–60 minutes); implement refresh before expiry
5. Longer-lived, orga-wide playback tokens (`scripts/get_jwt_token.sh --days N`) are fine for testing and development only — not for a production integration. Production should stay with the <24h, per-stream/per-group scoped pattern above; a leaked orga-wide token grants playback of every stream in the org for its full lifetime and can't be shortened after minting. The lifetime/scope tradeoff is always your own security decision based on your risk tolerance.

### Common Token Issues

| Error | Cause | Fix |
|---|---|---|
| Token expired | Token lifetime exceeded | Generate new token; check server clock sync |
| Token invalid | Wrong API key or malformed token | Verify API key; check token format |
| Token not working | Secure playback not enabled | Enable secure playback for the stream in Dashboard |
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
- For "token not working": first check if secure playback is actually enabled in Dashboard

### Contact nanocosmos support when
- Valid tokens are consistently rejected without clock skew or configuration issues (platform auth problem)
