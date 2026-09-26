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
echo "account      : ${ANALYTICS_EMAIL:-<token auth, no email in .env>}"
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

# The scope line reports the organisation the login named, rather than
# asserting "this account sees its own data only". The login response does not
# always state an account's scope, and an assertion the reader cannot check is
# worth less than a hash they can compare against what they expect.
echo
echo "DATA SCOPE: the login reports organisation ${HASH:-<unknown>}."
echo
echo "  Check that this is the organisation you expect before you pass any"
echo "  number from this account to someone. If it is not, stop and check"
echo "  which account .env logs into."
echo
echo "  A query without a 'streams' filter covers every stream in the"
echo "  organisation. Whenever you pass a number on, pass the time range"
echo "  (UTC) and the filters with it: the same number means something"
echo "  different under different filters."
