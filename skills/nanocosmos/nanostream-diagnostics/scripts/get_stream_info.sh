#!/bin/bash

#Usage :
#Input arg - [stream name]
#Output csv - [orga setup status(secure or unsecure)],[stream state(live or not live)],[raw state(live/ended/created/...)]
#
#No API key needed -- reads the public GET https://bintu.nanocosmos.de/stream/<name>
#route anonymously. The two values this script needs (the h5live websocket
#playout URL, which tells secure from unsecure, and the platform `state`)
#are in the keyless record for every stream, secure or not. An org key only
#adds fields this script does not use (ingest, tags, transcoding, ...), and a
#key of a DIFFERENT organisation gets the request rejected with 403 where the
#anonymous one succeeds -- so no credential is sent on purpose. env.sh is
#still sourced (with the key check skipped) so .env handling stays uniform.
#
#"error" with exit 1 means no usable stream record came back. The public
#route answers 404 ("Stream not found", code 3001) for a well-formed but
#unknown name or UUID, and 403 ("Access denied", code 2001) only for a
#malformed name.

ENV_SH_OPTIONAL_KEY=1
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/env.sh"

if [ -z "$1" ]; then
  echo "error: Stream name not found"
  exit 1
fi

STREAM_NAME=$1

RESPONSE=$(curl --silent --location "https://bintu.nanocosmos.de/stream/${STREAM_NAME}" \
--header 'content-type: application/json')

WEBSOCKET=$(echo "$RESPONSE" | grep -o '"websocket":"[^"]*"' | head -1 | cut -d'"' -f4)
STATE=$(echo "$RESPONSE" | grep -o '"state":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$WEBSOCKET" ] || [ -z "$STATE" ]; then
  echo "warning: no stream record from the public route (unknown stream name?)" >&2
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
