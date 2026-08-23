#!/bin/bash

# Authenticated GET against any Analytics API v2 read route.
#
#   bash scripts/query.sh <path> [key=value ...]
#
# Examples:
#   bash scripts/query.sh /v2/h5live/playtime/timeseries \
#       from=2026-07-01T00:00:00 to=2026-07-02T00:00:00 interval=hour
#
#   # repeat a key for array (OR) filters:
#   bash scripts/query.sh /v2/h5live/bufferingratio/timeseries \
#       from=... to=... interval=hour streams=abcde-12345 streams=abcde-67890
#
#   # CSV instead of JSON — far more compact for long timeseries:
#   bash scripts/query.sh /v2/usage/bytes/timeseries from=... to=... interval=day format=csv
#
# Your account is scoped to your own organisation — every query returns your
# own data only.
#
# GET only, by design. The API also exposes write routes (alert-notification
# configuration); this skill is read-only and deliberately ships no wrapper
# for them — a mistaken change there can silently stop alert delivery for the
# whole organisation. Use the Analytics dashboard to change receivers.
#
# ANALYTICS_EXTRA_HEADER: optional — one additional HTTP header ("Name: value")
# sent with the request. Rarely needed directly; front-end scripts use it to
# add scoping headers without duplicating the request handling here.
#
# Exit codes: 0 data, 3 no data (API status 2000/2001), 1 error.

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/env.sh"

if [ $# -lt 1 ]; then
  echo "usage: query.sh <path> [key=value ...]" >&2
  echo "       see references/endpoints.md for the route map" >&2
  exit 1
fi

RAW_PATH="$1"; shift
# Git Bash (MSYS) rewrites an argument starting with '/' into a Windows path:
# '/v2/usage/bytes/timeseries' arrives as 'C:/Program Files/Git/v2/usage/...'.
# Any route always begins at '/v2/', so cut back to there.
case "${RAW_PATH}" in
  /v2/*) ;;
  */v2/*) RAW_PATH="/v2/${RAW_PATH#*/v2/}" ;;
  /*) ;;
  *) RAW_PATH="/${RAW_PATH}" ;;
esac

# Refuse anything that is not a v2 read route or the documented auth route.
case "${RAW_PATH}" in
  /v2/*) ;;
  *) echo "error: only /v2/... routes are allowed here (got '${RAW_PATH}')" >&2; exit 1 ;;
esac

# Block the known write routes even if someone passes them in.
case "${RAW_PATH}" in
  /v2/alerting/config/*)
    echo "error: '${RAW_PATH}' is an alert-notification configuration route." >&2
    echo "       This skill is read-only and ships no wrapper for it. Use the" >&2
    echo "       Analytics dashboard if you really need to change receivers." >&2
    exit 1 ;;
esac

QUERY="$("${PY}" - "$@" <<'PY'
import sys, urllib.parse
pairs = []
for arg in sys.argv[1:]:
    if '=' not in arg:
        sys.stderr.write("error: parameter '%s' is not key=value\n" % arg)
        sys.exit(2)
    k, v = arg.split('=', 1)
    pairs.append((k, v))
print(urllib.parse.urlencode(pairs))
PY
)"

TOKEN="$(bash "${SCRIPT_DIR}/get_token.sh")"

EXTRA_HEADER_ARGS=()
[ -n "${ANALYTICS_EXTRA_HEADER:-}" ] && EXTRA_HEADER_ARGS+=(-H "${ANALYTICS_EXTRA_HEADER}")

URL="${ANALYTICS_BASE}${RAW_PATH}"
[ -n "${QUERY}" ] && URL="${URL}?${QUERY}"

BODY_FILE="$(mktemp)"
trap 'rm -f "${BODY_FILE}"' EXIT

set +e
HTTP="$(curl -sS --max-time 60 -o "${BODY_FILE}" -w '%{http_code}' \
  -H "X-ACCESS-TOKEN: ${TOKEN}" "${EXTRA_HEADER_ARGS[@]+"${EXTRA_HEADER_ARGS[@]}"}" "${URL}")"
set -e
# curl already emits 000 on a transport failure; guard against an empty value
HTTP="${HTTP:-000}"

case "${HTTP}" in
  200) ;;
  401|403)
    # A 403 here is not always a credential problem. The API distinguishes:
    #   E5003 = the route is only available to the Analytics dashboard itself
    #   E5002 = the account's access level is too low for this route
    # Neither is fixed by refreshing the token, so say so before suggesting it.
    if grep -q 'E5003' "${BODY_FILE}" 2>/dev/null; then
      echo "error: HTTP ${HTTP} (E5003) — this route is only available to the" >&2
      echo "       Analytics dashboard itself, not to API clients. The token is" >&2
      echo "       fine and refreshing will not help — read this data from the" >&2
      echo "       dashboard instead." >&2
    elif grep -q 'E5002' "${BODY_FILE}" 2>/dev/null; then
      echo "error: HTTP ${HTTP} (E5002) — the access level of this account is" >&2
      echo "       too low for this route; some routes require a higher plan" >&2
      echo "       tier. The token is valid; refreshing it will not help." >&2
    else
      echo "error: HTTP ${HTTP} — token rejected. Retry once with a fresh token:" >&2
      echo "       bash scripts/get_token.sh --refresh" >&2
    fi
    exit 1 ;;
  000)
    echo "error: no response from ${ANALYTICS_BASE} (network/DNS/timeout)" >&2
    exit 1 ;;
  *)
    echo "error: HTTP ${HTTP} from ${ANALYTICS_BASE}" >&2
    head -c 500 "${BODY_FILE}" >&2; echo >&2
    exit 1 ;;
esac

# CSV responses have no status envelope — pass them straight through.
case " $* " in
  *" format=csv "*) cat "${BODY_FILE}"; exit 0 ;;
esac

# JSON: the HTTP status says nothing about whether data was found. The body
# carries the real outcome: 1000 OK, 2000 NO DATA, 2001 NO ALERTS.
STATUS="$("${PY}" -c "
import sys, json
try:
    d = json.load(open(sys.argv[1]))
except Exception:
    sys.exit(0)
if isinstance(d, dict):
    for k in ('status', 'statusCode', 'code'):
        if isinstance(d.get(k), int):
            print(d[k]); break
" "${BODY_FILE}" 2>/dev/null || true)"

cat "${BODY_FILE}"

case "${STATUS}" in
  2000) echo "note: API status 2000 — request succeeded but no data matched the filters." >&2; exit 3 ;;
  2001) echo "note: API status 2001 — request succeeded but no alerts were found." >&2; exit 3 ;;
esac

exit 0
