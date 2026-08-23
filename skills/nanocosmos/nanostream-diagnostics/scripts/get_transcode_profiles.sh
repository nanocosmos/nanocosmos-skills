#!/bin/bash

#Usage :
#Input arg - [stream name] (used for context only; profiles are orga-wide)
#Output json - [list of all available transcode profiles]
#
#Public API variant: uses your own organisation API key (BINTU_API_KEY).

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/env.sh" || exit 1

if [ -z "$1" ]; then
  echo "error: Stream name not found"
  exit 1
fi

RESPONSE=$(curl --silent --location "https://bintu.nanocosmos.de/transcoding_profiles" \
--header 'Content-Type: application/json' \
--header "x-bintu-apikey: ${BINTU_API_KEY}")

echo "$RESPONSE"
