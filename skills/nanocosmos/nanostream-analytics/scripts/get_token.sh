#!/bin/bash

# Prints a valid Analytics API JWT to stdout.
#
#   TOKEN=$(bash scripts/get_token.sh)
#   curl -H "x-access-token: ${TOKEN}" ...
#
# Analytics tokens are short-lived, so the value is cached in a 0600 file under
# $TMPDIR and reused until it is within 30s of expiry. Credentials are only
# ever sent to /authenticate; the token is never echoed to logs.
#
# The token lifetime is NOT set here, and not by the Analytics API either:
# /authenticate logs in against bintu and passes the bintu token straight
# through, so the TTL is whatever bintu issued. Read it with whoami.sh.
#
# Force a fresh token:  bash scripts/get_token.sh --refresh
#
# Alongside the token, the account metadata reported by /authenticate
# (organisation hash, access level) is cached in a '.tier' sidecar file next
# to it; whoami.sh consumes that sidecar instead of decoding the JWT, because
# it is what the server actually stated rather than an inference.

set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/env.sh"

# True when the given JWT decodes and has more than 30s of validity left.
# No signature check — this is a local, informational expiry read, the same
# kind _claims.sh's token_claim() does; the API enforces authorisation itself.
token_still_valid() {
  "${PY}" - "$1" <<'PY' 2>/dev/null
import sys, json, base64, time
parts = sys.argv[1].split('.')
if len(parts) < 2:
    sys.exit(1)
pad = parts[1] + '=' * (-len(parts[1]) % 4)
exp = json.loads(base64.urlsafe_b64decode(pad)).get('exp', 0)
sys.exit(0 if exp - time.time() > 30 else 1)
PY
}

# --- explicit token override -------------------------------------------------
# NANO_API_TOKEN: an access token minted via the Cloud Token Service
# (audience must include `metrics`). Takes precedence over email/password —
# the recommended way to hand API access to services and automation, since it
# expires and carries no login. Fails loudly when expired rather than
# silently sending a dead token.
if [ -n "${NANO_API_TOKEN:-}" ]; then
  if token_still_valid "${NANO_API_TOKEN}"; then
    printf '%s' "${NANO_API_TOKEN}"
    exit 0
  fi
  echo "error: NANO_API_TOKEN is expired or malformed" >&2
  echo "hint: mint a fresh access token via the Cloud Token Service (POST /bintu/token, aud including 'metrics'), or unset NANO_API_TOKEN to fall back to ANALYTICS_EMAIL/ANALYTICS_PASSWORD" >&2
  exit 1
fi

CACHE="$(analytics_token_cache_path)"
# Sidecar holding the tier as the SERVER reported it. Same lifetime as the token.
TIER_CACHE="${CACHE}.tier"

# --- reuse a cached token that is still comfortably valid -------------------
if [ "${1:-}" != "--refresh" ] && [ -f "${CACHE}" ]; then
  CACHED="$(cat "${CACHE}" 2>/dev/null || true)"
  if [ -n "${CACHED}" ] && token_still_valid "${CACHED}"; then
    printf '%s' "${CACHED}"
    exit 0
  fi
fi

# --- authenticate -----------------------------------------------------------
PAYLOAD="$("${PY}" - <<'PY'
import json, os
print(json.dumps({"email": os.environ["ANALYTICS_EMAIL"],
                  "password": os.environ["ANALYTICS_PASSWORD"]}))
PY
)"

RESPONSE="$(curl -sS --max-time 20 -X POST "${ANALYTICS_BASE}/authenticate" \
  -H 'content-type: application/json' \
  -d "${PAYLOAD}" || true)"

TOKEN="$(printf '%s' "${RESPONSE}" | "${PY}" -c "
import sys, json
try:
    d = json.load(sys.stdin)
except Exception:
    sys.exit(1)
t = d.get('token')
if not t:
    sys.exit(1)
print(t)
" 2>/dev/null || true)"

if [ -z "${TOKEN}" ]; then
  echo "error: authentication failed against ${ANALYTICS_BASE}/authenticate" >&2
  echo "hint: verify ANALYTICS_EMAIL / ANALYTICS_PASSWORD; the account must be able to log in at https://metrics.nanostream.cloud" >&2
  exit 1
fi

# The /authenticate response states the account metadata outright: isAdmin,
# the organisation hash and the access level. Keep those instead of inferring
# them later from the JWT payload — they are the server's own statement.
# Written as three plain lines so no JSON parser is needed to read it back.
# Nothing here is a secret: the token itself lives in the neighbouring file,
# and none of these three values grants access.
TIER_DATA="$(printf '%s' "${RESPONSE}" | "${PY}" -c "
import sys, json
try:
    d = json.load(sys.stdin)
except Exception:
    sys.exit(1)
if not isinstance(d, dict):
    sys.exit(1)
is_admin = d.get('isAdmin')
org = d.get('organization') or {}
lvl = d.get('accessLevel') or {}
# Absent fields become an empty line, which sidecar readers treat as
# 'unknown' rather than as a value. Do not substitute a default here.
print('true' if is_admin is True else ('false' if is_admin is False else ''))
print(org.get('hash') or '')
print(lvl.get('code') if isinstance(lvl.get('code'), int) else '')
" 2>/dev/null || true)"

umask 077
printf '%s' "${TOKEN}" > "${CACHE}"
if [ -n "${TIER_DATA}" ]; then
  printf '%s\n' "${TIER_DATA}" > "${TIER_CACHE}"
else
  # Never leave a stale sidecar next to a fresh token — wrong metadata is
  # worse than none, because readers trust the sidecar over the JWT.
  rm -f "${TIER_CACHE}"
fi

printf '%s' "${TOKEN}"
