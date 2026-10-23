#!/bin/bash

#Usage :
#Input arg - [stream name] (used for context only; profiles are orga-wide)
#Output json - [list of all available transcode profiles]
#
#Public API variant: uses your own organisation API key (BINTU_API_KEY) or
#an expiring access token (NANO_API_TOKEN, see create_access_token.sh).

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/env.sh" || exit 1

if [ -z "$1" ]; then
  echo "error: Stream name not found"
  exit 1
fi

RESPONSE=$(curl --silent --location "https://bintu.nanocosmos.de/transcoding_profiles" \
--header 'content-type: application/json' \
--header "${BINTU_AUTH_HEADER}")

echo "$RESPONSE"
