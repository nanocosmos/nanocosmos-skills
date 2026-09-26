#!/bin/bash

#Usage :
#  get_jwt_token.sh [stream name] [--hours N | --days N | --exp EPOCH]
#Input args:
#  [stream name]  optional; the token is orga-wide regardless and this value
#                 is never sent to the API -- pass one only if it helps you
#                 track which check/demo the token was minted for
#  --hours N      expiry N hours from now
#  --days N       expiry N days from now (default: 1 hour, unchanged from
#                 before these flags existed, if none of --hours/--days/--exp given)
#  --exp EPOCH    explicit expiry as a unix timestamp (overrides --hours/--days)
#Output string - [orga-wide playback (splay) JWT, expiry as configured]
#
#Public API variant: uses your own organisation API key (BINTU_API_KEY).
#Minting via CTS authenticates with the API key only — a NANO_API_TOKEN
#cannot substitute here.
#
#Recommended lifetime: the live /api/v1/splay endpoint does not itself
#enforce a cap -- confirmed empirically with a 100-day exp, accepted and
#minted as requested, despite player-config-reference.md's note that
#"revocable tokens cap exp at 24 hours" (that note may describe a different
#mechanism -- the revocation/force-disconnect window -- rather than the
#JWT's own exp; unconfirmed, flagged for review rather than corrected here).
#Recommended practice for a customer's PRODUCTION integration is still a
#short-lived (<24h) token scoped per-stream/per-group where the player
#config allows it, refreshed server-side -- see security-tokens.md. An
#orga-wide token that leaks grants playback of every stream in the org for
#its full lifetime and can't be shortened after minting (forceDisconnect
#only kills already-open sessions, it doesn't block new connections before
#exp). Longer-lived, orga-wide tokens (days/weeks) are fine for testing and
#development only -- not a default to presume for a production integration.
#This is always your own call based on your security posture, not one to
#make for you.

case "$1" in -h|--help) grep '^#' "$0" | sed 's/^#//'; exit 0 ;; esac

ENV_SH_REQUIRE_KEY=1
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/env.sh" || exit 1

DAYS=""
HOURS=""
EXP=""
STREAM_NAME=""

while [ $# -gt 0 ]; do
  case "$1" in
    --hours) HOURS="$2"; shift 2 ;;
    --days) DAYS="$2"; shift 2 ;;
    --exp)  EXP="$2"; shift 2 ;;
    --*) echo "error: unknown option: $1 (see --help)" >&2; exit 1 ;;
    *) STREAM_NAME="$1"; shift ;;
  esac
done

if [ -z "$EXP" ]; then
  if [ -n "$DAYS" ]; then
    case "$DAYS" in
      ''|*[!0-9]*) echo "error: --days must be a whole number" >&2; exit 1 ;;
    esac
    EXP=$(date -d "+${DAYS} days" +%s 2>/dev/null || date -v+"${DAYS}"d +%s)
  elif [ -n "$HOURS" ]; then
    case "$HOURS" in
      ''|*[!0-9]*) echo "error: --hours must be a whole number" >&2; exit 1 ;;
    esac
    EXP=$(date -d "+${HOURS} hours" +%s 2>/dev/null || date -v+"${HOURS}"H +%s)
  else
    EXP=$(date -d "+1 hour" +%s 2>/dev/null || date -v+1H +%s)
  fi
fi

JWT_TOKEN=$(curl --silent --location "https://token.nanostream.cloud/api/v1/splay" \
--header 'Content-Type: application/json' \
--header "x-bintu-apikey: ${BINTU_API_KEY}" \
--data "{\"orgawide\": true, \"exp\": ${EXP}}")

TOKEN=$(echo "$JWT_TOKEN" | grep -o '"data":{[^}]*}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  TOKEN=$(echo "$JWT_TOKEN" | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4)
fi

if [ -z "$TOKEN" ]; then
  echo "error: token not found in response" >&2
  echo "$JWT_TOKEN" >&2
  exit 1
fi

EXP_HUMAN=$(date -u -d "@${EXP}" 2>/dev/null || date -u -r "${EXP}" 2>/dev/null)
CONTEXT_NOTE=""
[ -n "$STREAM_NAME" ] && CONTEXT_NOTE=" (context: ${STREAM_NAME})"
echo "playback token created: orga-wide, expires ${EXP_HUMAN} (${EXP})${CONTEXT_NOTE}" >&2
NOW_PLUS_24H=$(( $(date +%s) + 86400 ))
if [ "$EXP" -gt "$NOW_PLUS_24H" ]; then
  echo "note: expiry is beyond 24h -- fine for testing and development only; recommend <24h, per-stream/per-group scoped tokens for a production integration (security-tokens.md)" >&2
fi

echo "$TOKEN"
