#!/bin/bash

# Helpers to read informational fields about the current token and account.
# Sourced by whoami.sh; not run directly. Source scripts/env.sh first — these
# need ${PY} and analytics_token_cache_path.
#
# TWO SOURCES, IN THIS ORDER:
#
#   1. The '.tier' sidecar that get_token.sh writes next to the cached token —
#      the account metadata /authenticate reported (see get_token.sh). This is
#      what the server actually stated, not an inference.
#   2. The JWT payload, decoded locally. Used when the sidecar is missing — an
#      old cache from before the sidecar existed, or a token handed in from
#      elsewhere.
#
# No signature verification and no network in either case. The values are
# informational; the API enforces authorisation itself.

# Prints one field of the tier sidecar, or nothing (exit 1) when the sidecar
# is absent or does not belong to the token passed in. Fields, one per line,
# exactly as get_token.sh wrote them:
#   1 = isAdmin flag   2 = organisation hash   3 = access level code
#
# The token is compared against the cached one on purpose. Without that check
# a caller passing some *other* token would be told about whatever account
# happens to sit in the cache — a silent mislabelling the sidecar exists to
# prevent.
token_sidecar_field() {
  local _tok="$1" _field="$2" _cache _cached _value
  [ -n "${ANALYTICS_EMAIL:-}" ] || return 1
  _cache="$(analytics_token_cache_path 2>/dev/null || true)"
  [ -n "${_cache}" ] || return 1
  [ -f "${_cache}" ] && [ -f "${_cache}.tier" ] || return 1
  _cached="$(cat "${_cache}" 2>/dev/null || true)"
  [ -n "${_cached}" ] && [ "${_cached}" = "${_tok}" ] || return 1
  _value="$(sed -n "${_field}p" "${_cache}.tier" 2>/dev/null || true)"
  [ -n "${_value}" ] || return 1
  printf '%s' "${_value}"
}

# Decode one claim out of the JWT payload, e.g. token_claim "$TOKEN" exp.
# Dotted paths descend into nested objects: token_claim "$TOKEN" organization.name
token_claim() {
  local _tok="$1" _path="$2"
  printf '%s' "${_tok}" | "${PY}" -c "
import sys, json, base64
tok = sys.stdin.read().strip()
parts = tok.split('.')
if len(parts) < 2:
    sys.exit(1)
pad = parts[1] + '=' * (-len(parts[1]) % 4)
try:
    payload = json.loads(base64.urlsafe_b64decode(pad))
except Exception:
    sys.exit(1)
node = payload
for key in sys.argv[1].split('.'):
    if not isinstance(node, dict) or key not in node:
        sys.exit(1)
    node = node[key]
print(node if not isinstance(node, (dict, list)) else json.dumps(node))
" "${_path}" 2>/dev/null
}

# Prints the organisation hash, or nothing (exit 1) if no known location
# carries it. The hash claim is NOT in a fixed place in the JWT — tokens have
# been seen with both the nested shape ({"organization": {"hash": ...}}) and a
# flat one ({"hash": ...}) — so prefer the sidecar, then check every known
# location.
token_orga_hash() {
  local _tok="$1" _h _path
  if _h="$(token_sidecar_field "${_tok}" 2)"; then
    printf '%s' "${_h}"
    return 0
  fi
  for _path in organization.hash hash organisation.hash org.hash; do
    _h="$(token_claim "${_tok}" "${_path}" || true)"
    if [ -n "${_h}" ]; then
      printf '%s' "${_h}"
      return 0
    fi
  done
  return 1
}
