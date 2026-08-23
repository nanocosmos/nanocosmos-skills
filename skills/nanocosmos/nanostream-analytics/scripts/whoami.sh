#!/bin/bash

# Reports which account the .env credentials belong to, its data scope, and the
# token lifetime.
#
#   bash scripts/whoami.sh
#
# Run this first in any session where a number will be quoted to someone, so
# every figure can be attributed to the right account and organisation.

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/env.sh"

source "${SCRIPT_DIR}/_claims.sh"

TOKEN="$(bash "${SCRIPT_DIR}/get_token.sh")"

HASH="$(token_orga_hash "${TOKEN}" || true)"
NAME="$(token_claim "${TOKEN}" organization.name || true)"
IAT="$(token_claim "${TOKEN}" iat || true)"
EXP="$(token_claim "${TOKEN}" exp || true)"
LEVEL="$(token_sidecar_field "${TOKEN}" 3 || true)"

echo "base url     : ${ANALYTICS_BASE}"
echo "account      : ${ANALYTICS_EMAIL}"
echo "organisation : ${NAME:-<unknown>} (hash: ${HASH:-<unknown>})"

if [ -n "${LEVEL}" ]; then
  case "${LEVEL}" in
    0) echo "access level : 0 (NONE)" ;;
    1) echo "access level : 1 (BASIC)" ;;
    2) echo "access level : 2 (FULL)" ;;
    3) echo "access level : 3 (PREMIUM)" ;;
    *) echo "access level : ${LEVEL}" ;;
  esac
fi

if [ -n "${IAT}" ] && [ -n "${EXP}" ]; then
  # The API does not set this lifetime — /authenticate passes the bintu token
  # through unchanged, so the TTL is whatever bintu issued.
  echo "token ttl    : $((EXP - IAT))s"
fi

echo
echo "DATA SCOPE: this account sees its own organisation's data only."
echo
echo "  Note that omitting the 'streams' filter on a query aggregates over"
echo "  every stream the organisation has — state the time range and filters"
echo "  alongside any figure you quote."
