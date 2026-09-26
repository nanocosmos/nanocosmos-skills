# nanoStream API Authentication

How the nanoStream Cloud APIs authenticate, and why expiring access tokens
are the recommended credential for all API access.


## 1. One account, one token, three services

bintu (stream management), the metrics API (analytics), and the Cloud Token
Service (CTS) all authenticate against the **same user database** and share the
**same token library**. Every token in this document is one and the same JWT
format, signed with the platform key (`kid: nanocosmos`) — what differs is only
*how it is minted* and *which audiences it carries*.

```
login (email+password)  ──┐
                          ├──▶  access token (JWT)  ──▶  bintu API      (x-bintu-token)
org API key             ──┘     expiring, scoped    ──▶  metrics API    (X-ACCESS-TOKEN)
```

The consequence for integrators and for our own tooling: **there are not two
credential systems to manage.** One access token with `aud: ["bintu","metrics"]`
drives both APIs, and the login used for the Analytics dashboard *is* the bintu
dashboard login.

## 2. Credential types

| Credential | Lifetime | Scope | Where it belongs |
|---|---|---|---|
| **Org API key** (`x-bintu-apikey`) | never expires | full control of the organisation | Server-side secret store only. Never in a browser, ticket, or client-side code. Its main remaining job: *minting tokens*. |
| **Login** (email + password) | until changed | the user's role (e.g. nanoAdmin, nanoReadOnly) | A person's dashboard login. Also mints tokens (no API key needed). |
| **Access token** (JWT; `x-bintu-token` / `X-ACCESS-TOKEN`) | chosen at mint, max 365 days (default 24 h) | ≤ the minting credential; narrowable by audience (`aud`) and user (`iss`) | **The recommended credential for all API access** — services, CI, dashboards, status pages, anything the raw key should never touch. |
| **Playback token** (JWT; h5live `security` object) | chosen at mint | playback of specific streams / groups / org-wide | Client-facing players on *secured* organisations. Self-contained (validated by signature, no API involved) — a different product, see below. |

> **Do not confuse: access tokens ≠ playback tokens.**
> **Playback needs no API authentication at all.** Viewers never authenticate
> against an API: on unsecured organisations playback is simply open, and on
> secured organisations it is gated by a **self-contained JWT playback token**
> that the platform validates by signature alone — no API call, no lookup.
> Playback tokens come from `POST /api/v1/splay`, require the organisation to
> be secured (`errorCode 5003 "Not a secured organisation"` otherwise), and go
> into the player's `security` config.
> API authentication — the access tokens this document is about — exists only
> for *managing* live streams and reading metrics **through the APIs** (create
> streams, configure webhooks, query analytics, …). Access tokens come from
> `POST /bintu/token` or the login routes and work for every organisation. In
> the skills tooling the environment variable is deliberately named
> `NANO_API_TOKEN` to keep the two apart.

## 3. Minting: three routes, one result

### 3.1 CTS `POST /bintu/token` — scoped tokens from the API key

The most controllable route: audience scoping and per-user scoping.
Authenticates with the org API key.

```bash
curl -X POST https://token.nanostream.cloud/bintu/token \
  -H "X-BINTU-APIKEY: <org api key>" \
  -H "Content-Type: application/json" \
  -d '{
    "exp": 1790261651,          # unix seconds · default 24 h · max 365 days (error 3000 beyond)
    "nbf": 1787669652,          # optional "not before" · default: now
    "aud": ["bintu","metrics"], # optional · default ["bintu"] · also: splay, guardian, secure-conference
    "iss": "<user id>",         # optional · limits the token to that user's role (e.g. read-only)
    "custom": "service XYZ"     # optional free-text note, stored in the JWT
  }'
# → { "success": true, "data": { "token": "eyJ…" }, "nbf": …, "exp": … }
```

Without `iss`, the token inherits the API key's full rights — so for anything
client-facing, mint against a read-only user's id and list only the audiences
actually needed. `POST /bintu/verify` validates a token.

### 3.2 bintu `POST /user/validate` — tokens from the login, no API key

Mints a token carrying exactly the login user's own role. The safer default
when a suitable (e.g. read-only) user exists, because no org-level key is
handled at all. No `aud`/`iss` here — the response token carries the full
audience list and the user's role is the scope.

```bash
curl -X POST https://bintu.nanocosmos.de/user/validate \
  -H "Content-Type: application/json" \
  -d '{ "email": "<email>", "password": "<password>", "exp": 1790271095 }'
```

### 3.3 metrics `POST /authenticate` — the dashboard's own login

What the Analytics dashboard uses. It logs in against bintu and passes the
resulting bintu token straight through — **the TTL is fixed at 24 hours and
cannot be influenced**: `expiresIn`, `expires_in`, `ttl`, and `expiry` fields
are silently ignored (verified empirically 2026-08-25). For anything
longer-lived, mint via 3.1 or 3.2 instead.

> **Rule of thumb.** Interactive session → `/authenticate` or `/user/validate`
> with defaults. Service, CI, dashboard → CTS route with `iss` (read-only
> user) + minimal `aud` + the shortest workable `exp`. The 365-day maximum is
> a ceiling, not a recommendation.

## 4. Using a token

| API | Base URL | Header | Requires audience |
|---|---|---|---|
| bintu | `https://bintu.nanostream.cloud` | `x-bintu-token: <jwt>` | `bintu` |
| metrics / analytics v2 | `https://metrics-api.nanostream.cloud` | `X-ACCESS-TOKEN: <jwt>` | `metrics` |

The same token value goes into both headers. There is no documented revocation
route for bintu access tokens (the revocation machinery covers playback
tokens) — **expiry is the control**, which is the strongest argument for short
`exp` values.

## 5. Anatomy of a token

Claims observed in a real minted token (org `yPleE`, nanocosmos demo):

| Claim | Example | Meaning |
|---|---|---|
| `aud` | `["bintu","metrics"]` | services the token may call |
| `exp` / `nbf` / `iat` | `1790261651` / … | validity window (unix seconds) |
| `jti` | `V3pbNuym` | unique token id — quote this when reporting a token, never the token itself |
| `sub` | `6142e82f-…` | the user the token acts as |
| `hash` | `yPleE` | organisation hash — the token is always single-org |
| `metrics` | `full` | metrics access level |
| `permissions.bintu` | `0x1fffffffff` | bintu permission bitmask (from the role) |
| `custom` | `"service XYZ"` | free-text note from minting |

