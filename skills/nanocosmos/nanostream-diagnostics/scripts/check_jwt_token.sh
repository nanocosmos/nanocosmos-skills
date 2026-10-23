#!/bin/bash

# Usage:
#   check_jwt_token.sh <jwt>
#
# Decodes a nanoStream playback JWT (no signature check — that requires the
# server key) and validates its time claims. Prints the decoded claims plus
# a VALID / EXPIRED / NOT-YET-VALID verdict with human-readable dates.
#
# Exit codes: 0 = valid, 1 = expired or not yet valid, 2 = malformed input.
#
# Needs no API key. Python variant with identical behavior:
# check_jwt_token.py.

if [ -z "$1" ]; then
  echo "usage: $0 <jwt>" >&2
  exit 2
fi

PAYLOAD=$(echo "$1" | cut -d'.' -f2)
if [ -z "$PAYLOAD" ] || [ "$PAYLOAD" = "$1" ]; then
  echo "error: not a JWT (expected three dot-separated base64url parts)" >&2
  exit 2
fi

# base64url -> base64 with padding
PAYLOAD=$(echo "$PAYLOAD" | tr '_-' '/+')
case $(( ${#PAYLOAD} % 4 )) in
  2) PAYLOAD="${PAYLOAD}==" ;;
  3) PAYLOAD="${PAYLOAD}=" ;;
esac

CLAIMS=$(echo "$PAYLOAD" | base64 -d 2>/dev/null)
if [ -z "$CLAIMS" ]; then
  echo "error: payload is not valid base64url" >&2
  exit 2
fi

echo "$CLAIMS"
echo "---"

# Extract numeric claims without jq (portable grep/cut)
EXP=$(echo "$CLAIMS" | grep -o '"exp":[0-9]*' | cut -d':' -f2)
NBF=$(echo "$CLAIMS" | grep -o '"nbf":[0-9]*' | cut -d':' -f2)
NOW=$(date +%s)

# GNU date uses -d @ts, BSD/macOS date uses -r ts
ts_to_date() {
  date -d "@$1" 2>/dev/null || date -r "$1"
}

if [ -n "$NBF" ] && [ "$NOW" -lt "$NBF" ]; then
  echo "NOT-YET-VALID: nbf is $(ts_to_date "$NBF")"
  exit 1
fi

if [ -z "$EXP" ]; then
  echo "WARNING: no exp claim found"
  exit 2
fi

if [ "$NOW" -ge "$EXP" ]; then
  echo "EXPIRED: exp was $(ts_to_date "$EXP")"
  exit 1
fi

echo "VALID: expires $(ts_to_date "$EXP") ($(( (EXP - NOW) / 3600 ))h $(( ((EXP - NOW) % 3600) / 60 ))m left)"
exit 0
