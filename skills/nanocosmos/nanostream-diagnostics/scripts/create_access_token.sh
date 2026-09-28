#!/bin/bash

#Usage :
#  create_access_token.sh [--days N | --exp EPOCH] [--aud LIST] [--iss USER_ID]
#                         [--custom TEXT] [--from-login]
#
#Mints a bintu ACCESS token. Two methods (background:
#references/nanostream-token-generation.md):
#
#  default      Cloud Token Service:  POST https://token.nanostream.cloud/bintu/token
#               (auth: x-bintu-apikey — needs the real org API key).
#               Supports audience scoping (--aud) and user scoping (--iss).
#  --from-login POST https://bintu.nanocosmos.de/user/validate with the
#               NANOSTREAM_EMAIL / NANOSTREAM_PASSWORD login (no API key
#               needed; the token carries that user's own role). No --aud /
#               --iss here — scoping comes from the user's role.
#
#Recommended best practice for API access: use an expiring access token
#instead of the raw org API key wherever a credential leaves your shell
#(services, dashboards, CI, pages). The token goes in the
#  x-bintu-token   header for the bintu API   (https://bintu.nanostream.cloud)
#  x-access-token  header for the metrics API (https://metrics-api.nanostream.cloud)
#and can also be exported as NANO_API_TOKEN for the scripts in this skill
#and the analytics skill.
#
#Options:
#  --days N        expiry N days from now (default 1, max 365)
#  --exp EPOCH     explicit expiry as unix timestamp in seconds (overrides --days)
#  --aud LIST      comma-separated audiences (default: bintu,metrics)
#                  valid: bintu, metrics, splay, guardian, secure-conference
#  --iss USER_ID   scope the token to one user's role (numeric user id from
#                  Dashboard -> My Organization -> User Overview); without it
#                  the token carries the API key's full rights
#  --custom TEXT   free-text note stored in the token
#  --from-login    mint from NANOSTREAM_EMAIL/NANOSTREAM_PASSWORD instead of
#                  the API key (ANALYTICS_EMAIL/ANALYTICS_PASSWORD also accepted)
#
#Prints the token to stdout; a summary (expiry, audiences) goes to stderr.
#API docs: https://doc.pages.nanocosmos.de/cloudtokenservice-api-docs/

case "$1" in -h|--help) grep '^#' "$0" | sed 's/^#//'; exit 0 ;; esac

# The CTS route needs the real API key; the login route needs no key at all.
case " $* " in
  *" --from-login "*) ENV_SH_OPTIONAL_KEY=1 ;;
  *) ENV_SH_REQUIRE_KEY=1 ;;
esac

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/env.sh" || exit 1

DAYS=1
EXP=""
AUD="bintu,metrics"
ISS=""
CUSTOM=""
FROM_LOGIN=""

while [ $# -gt 0 ]; do
  case "$1" in
    --days)   DAYS="$2"; shift 2 ;;
    --exp)    EXP="$2"; shift 2 ;;
    --aud)    AUD="$2"; shift 2 ;;
    --iss)    ISS="$2"; shift 2 ;;
    --custom) CUSTOM="$2"; shift 2 ;;
    --from-login) FROM_LOGIN=1; shift ;;
    *) echo "error: unknown option: $1 (see --help)" >&2; exit 1 ;;
  esac
done

if [ -z "$EXP" ]; then
  case "$DAYS" in
    ''|*[!0-9]*) echo "error: --days must be a number" >&2; exit 1 ;;
  esac
  if [ "$DAYS" -gt 365 ]; then
    echo "error: the token service allows a maximum expiry of 365 days" >&2
    exit 1
  fi
  # GNU date first (Linux/Git Bash), BSD date as fallback (macOS)
  EXP=$(date -d "+${DAYS} days" +%s 2>/dev/null || date -v+"${DAYS}"d +%s)
fi

if [ -n "$FROM_LOGIN" ]; then
  # ── Method 1: login credentials, no API key ──────────────────────────────
  if [ -n "$ISS" ] || [ "$AUD" != "bintu,metrics" ]; then
    echo "error: --aud / --iss only work with the API-key method (drop --from-login)" >&2
    exit 1
  fi
  EMAIL="${NANOSTREAM_EMAIL:-${ANALYTICS_EMAIL}}"
  PASSWORD="${NANOSTREAM_PASSWORD:-${ANALYTICS_PASSWORD}}"
  if [ -z "$EMAIL" ] || [ -z "$PASSWORD" ]; then
    echo "error: --from-login needs NANOSTREAM_EMAIL / NANOSTREAM_PASSWORD (or ANALYTICS_*) in the environment or .env" >&2
    exit 1
  fi
  # Body built by jq-less printf on purpose; email/password never hit argv.
  RESPONSE=$(BODY_EMAIL="$EMAIL" BODY_PASSWORD="$PASSWORD" BODY_EXP="$EXP" bash -c '
    printf "{\"email\": \"%s\", \"password\": \"%s\", \"exp\": %s}" \
      "$BODY_EMAIL" "$BODY_PASSWORD" "$BODY_EXP" |
    curl --silent --location "https://bintu.nanocosmos.de/user/validate" \
      --header "content-type: application/json" --data @-')
  AUD="(the login user's own role)"
else
  # ── Method 2 (default): Cloud Token Service with the org API key ─────────
  AUD_JSON=$(echo "$AUD" | sed 's/[[:space:]]//g; s/,/","/g; s/^/["/; s/$/"]/')
  BODY="{\"exp\": ${EXP}, \"aud\": ${AUD_JSON}"
  [ -n "$ISS" ] && BODY="${BODY}, \"iss\": \"${ISS}\""
  [ -n "$CUSTOM" ] && BODY="${BODY}, \"custom\": \"${CUSTOM}\""
  BODY="${BODY}}"

  RESPONSE=$(curl --silent --location "https://token.nanostream.cloud/bintu/token" \
    --header 'content-type: application/json' \
    --header "x-bintu-apikey: ${BINTU_API_KEY}" \
    --data "$BODY")
fi

TOKEN=$(echo "$RESPONSE" | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "error: token not found in response" >&2
  # Do not dump the raw body on the login route (defence in depth); the CTS
  # error body carries no secrets (e.g. {"errorCode":...,"message":...}).
  if [ -n "$FROM_LOGIN" ]; then
    echo "$RESPONSE" | grep -o '"message":"[^"]*"' >&2
  else
    echo "$RESPONSE" >&2
  fi
  exit 1
fi

EXP_HUMAN=$(date -u -d "@${EXP}" 2>/dev/null || date -u -r "${EXP}" 2>/dev/null)
echo "access token created: aud=[${AUD}] expires ${EXP_HUMAN} (${EXP})" >&2
echo "use as: x-bintu-token (bintu API) / x-access-token (metrics API) / NANO_API_TOKEN (skill scripts)" >&2

echo "$TOKEN"
