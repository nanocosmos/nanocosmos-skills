---
id: nanostream-token-generation
audience: customer
category: security
triggers:
  - long running token
  - long-lived token
  - read only token
  - readonly token
  - generate a bintu token
  - API token for dashboard
  - status page token
  - embedding api key
  - token.nanostream.cloud
  - user/validate
  - iss userid
  - aud bintu metrics
  - analytics api token
  - metrics api token
  - analytics token expires after one day
  - token for bintu and metrics
severity_default: LOW
---

## nanoStream Long-Running Token Generation

### When to Use
A customer asks how to create a long-running (up to 1 year) access token for a specific nanoStream / bintu user — typically for a self-built dashboard, status page, or script that needs to call bintu APIs without embedding a full-access API key client-side. Also use this if a customer pastes a curl command hitting `token.nanostream.cloud` or `bintu.nanocosmos.de/user/validate` and asks whether it's correct.

### Why This Matters
 Putting a full-access org API key anywhere a browser can read it (e.g. hardcoded in client-side JavaScript) hands anyone who opens dev tools complete control of the account. Both methods below mint a **token** instead: scoped to one user's actual role (e.g. read-only) and/or a specific service audience, with a real expiration — safe to embed in a client-facing page or script.

Before generating anything, check whether the use case actually needs broad access, or whether a read-only, time-limited, audience-scoped token would do. For anything public-facing, it should almost always be the latter.

Full API reference: https://api.nanostream.cloud/docs/token/#operation/Create%20a%20token%20for%20the%20bintu%20services — check this for the authoritative, current list of valid `aud` values rather than assuming the ones below are exhaustive.

### Step 0: Ensure a Read-Only User Exists (if needed)
Both methods mint a token that inherits the rights of an existing user — they don't create a new permission level. If the use case needs read-only access and no read-only user exists in the org yet:
1. Create an invite token for the organization to register a new user with the `nanoReadOnly` role. See https://docs.nanocosmos.de/docs/user_roles for what a read-only user can/can't do (basic stream config, states, metrics, alerts — read-only).
2. The invited user completes signup with their own email/password.
3. Now there's a real read-only account whose credentials/user ID can feed into either method below.

Skip this if the token should carry the same rights as an existing (e.g. admin) user.

### Method 1 (Recommended): Email + Password
No API key needed — just the target user's own login. Safer default since it never requires handling an org-level API key; the resulting token is scoped to exactly whatever role that email/password pair already has.

```bash
curl --location 'https://bintu.nanocosmos.de/user/validate' \
  --header 'Content-Type: application/json' \
  --data-raw '{"email":"<user_email>","password":"<user_password>","exp":<epoch_seconds>}'
```

- `exp` is a Unix epoch timestamp in seconds — e.g. `date -d '+365 days' +%s`, or https://www.epochconverter.com/, up to about a year out.
- If `exp` is omitted, it **defaults to 24 hours**.

### Method 2: Org API Key + User ID, Scoped with `aud`
Use when the target user's password isn't available — e.g. minting a token on someone else's behalf from an admin context. Always include `aud` to scope the token to only the service(s) it actually needs.

```bash
curl --location 'https://token.nanostream.cloud/bintu/token' \
  --header 'X-BINTU-APIKEY: <org_api_key>' \
  --header 'Content-Type: application/json' \
  --data '{"iss":"<user_id>","exp":<epoch_seconds>,"aud":["bintu","metrics"]}'
```

- `iss` ("issuer") is the target user's **numeric user ID**, not their email or the org hash (the 5-character prefix used in stream names). Found in Dashboard → `My Organization` → `User Overview`.
- The API key must belong to the org the user is a member of — an org-level credential does the minting, but the *resulting token* is still scoped to whatever role `iss` points to (e.g. a read-only user's ID still produces a read-only token) and to whichever `aud` entries were listed.
- `aud` is an array — include only the audiences actually needed (e.g. `["metrics"]` alone for a metrics-only dashboard). See the API reference above for the full current list — don't guess at unconfirmed values.
- If `exp` is omitted, it **defaults to 24 hours**, same as Method 1.

### Tokens for the Analytics (metrics) API
The Analytics API login `POST https://metrics-api.nanostream.cloud/authenticate` always returns a token that expires after **24 hours**. You cannot change this lifetime: the route ignores all expiry fields. For a longer lifetime (up to 365 days), mint the token with the Cloud Token Service (Method 2 above). Put `metrics` in the `aud` array, e.g. `"aud":["metrics"]` for a metrics-only dashboard.

Send the token in the `X-ACCESS-TOKEN` header to the Analytics API.

### One Token for bintu and Analytics
One token can call both APIs, because both use the same user accounts. Mint it once with both audiences, then send the same value in two different headers:

```bash
# 1. Mint with the Cloud Token Service (Method 2)
TOKEN=$(curl -s 'https://token.nanostream.cloud/bintu/token' \
  --header 'X-BINTU-APIKEY: <org_api_key>' \
  --header 'Content-Type: application/json' \
  --data '{"iss":"<user_id>","exp":<epoch_seconds>,"aud":["bintu","metrics"]}' \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# 2. bintu API: header x-bintu-token
curl -s 'https://bintu.nanostream.cloud/stream?limit=1' --header "x-bintu-token: $TOKEN"

# 3. Analytics API: header X-ACCESS-TOKEN
curl -s 'https://metrics-api.nanostream.cloud/v2/usage/lastmonth' --header "X-ACCESS-TOKEN: $TOKEN"
```

### After Generating
The response contains the token itself. Send it in the `x-bintu-token` header to the bintu API, and in the `X-ACCESS-TOKEN` header to the Analytics API. The token has a scope and an expiry, so a leaked token does much less damage than a leaked org API key.

### Customer Response Guidance
- Never recommend embedding an org-level API key in anything client-facing — steer toward one of these two token methods first.
- Don't default to Method 2 just because it involves an API key header — Method 1 is the recommended default since it avoids handling a higher-privilege credential entirely.
- Don't confuse `iss` (numeric user ID) with an org hash — different identifiers from different systems.
- Never surface a real org hash, API key, token, or user ID from internal tickets/tooling in a customer-facing response — use generic placeholders only.

### Contact nanocosmos support when
- A read-only user needs to be created and you can't do it yourself — contact nanocosmos support for the invite
- A generated token doesn't behave as scoped (e.g. a read-only user's token allows write access) — likely a role-configuration issue, needs engineering review
- Customer needs an `aud` value not confirmed in the API reference — verify with the reference link before promising it works
