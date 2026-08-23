#!/bin/bash

#Usage :
#Input arg - [stream name]
#Output csv - [orga setup status(secure or unsecure)],[stream state(live or not live)],[raw state(live/ended/created/...)]
#
#Public API variant: uses GET https://bintu.nanocosmos.de/stream/<name>
#with your own organisation API key (BINTU_API_KEY).

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/env.sh" || exit 1

if [ -z "$1" ]; then
  echo "error: Stream name not found"
  exit 1
fi

STREAM_NAME=$1

RESPONSE=$(curl --silent --location "https://bintu.nanocosmos.de/stream/${STREAM_NAME}" \
--header 'Content-Type: application/json' \
--header "x-bintu-apikey: ${BINTU_API_KEY}")

WEBSOCKET=$(echo "$RESPONSE" | grep -o '"websocket":"[^"]*"' | head -1 | cut -d'"' -f4)
STATE=$(echo "$RESPONSE" | grep -o '"state":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$WEBSOCKET" ] || [ -z "$STATE" ]; then
  echo "error"
  exit 1
fi

if echo "$WEBSOCKET" | grep -q "secure"; then
  WEBSOCKET_RESULT="secure"
else
  WEBSOCKET_RESULT="unsecure"
fi

if [ "$STATE" = "live" ]; then
  STATE_RESULT="live"
else
  STATE_RESULT="not live"
fi

echo "${WEBSOCKET_RESULT},${STATE_RESULT},${STATE}"
