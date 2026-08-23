#!/bin/bash

#Usage :
#Input arg - [stream name] (used for context only; token is orga-wide)
#Output string - [orga wide jwt token with 1 hour expiry time]
#
#Public API variant: uses your own organisation API key (BINTU_API_KEY).

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/env.sh" || exit 1

if [ -z "$1" ]; then
  echo "error: Stream name not found"
  exit 1
fi

EXP=$(date -d "+1 hour" +%s 2>/dev/null || date -v+1H +%s)

JWT_TOKEN=$(curl --silent --location "https://token.nanostream.cloud/api/v1/splay" \
--header 'Content-Type: application/json' \
--header "x-bintu-apikey: ${BINTU_API_KEY}" \
--data "{\"orgawide\": true, \"exp\": ${EXP}}")

TOKEN=$(echo "$JWT_TOKEN" | grep -o '"data":{[^}]*}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  TOKEN=$(echo "$JWT_TOKEN" | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4)
fi

if [ -z "$TOKEN" ]; then
  echo "error: token not found in response"
  exit 1
fi

echo "$TOKEN"
