#!/bin/bash
# set_stream_captions.sh -- enable or update Live Captions (+ translation) on
# an existing stream of your organisation.
#
# Usage:
#   set_stream_captions.sh <stream-name|stream-id> [source-lang] [target-langs]
#
#   source-lang   spoken language of the audio, e.g. en, de, pt-BR (default: en)
#   target-langs  comma-separated translation targets, e.g. "de,pt-BR"
#                 (default: none -> transcript in the source language only).
#                 Keep it a STRING: the JSON-array form shown in the Live
#                 Captions API guide answers HTTP 500 (verified 2026-10-21).
#                 Must not contain the source language itself (API rejects it).
#
# Environment: ENGINE (default deepgram), BINTU_API_KEY via env.sh / .env.
#
# POST /stream/{id}/options creates the captions option group; if one exists
# already the script falls back to PUT (modify, with the existing "group"). Either way the new settings
# apply on the NEXT ingest session only -- restart the encoder/relay after.
# Needs Live Captions enabled on the organisation (403 LiveCaptioningNotEnabled
# otherwise) -- which also implies a secure (token-protected) organisation.
# Prints the resulting option group as JSON.
case "$1" in -h|--help|"") grep '^#' "$0" | sed '1d;s/^#//'; exit 0 ;; esac

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/env.sh" || exit 1
command -v jq >/dev/null 2>&1 || { echo "error: jq is required" >&2; exit 2; }

STREAM="$1"; SOURCE_LANG="${2:-en}"; TARGET_LANGS="${3:-}"; ENGINE="${ENGINE:-deepgram}"
API="https://bintu.nanocosmos.de"

# resolve a stream name to its id (the options route takes the id)
if [[ "$STREAM" =~ ^[0-9a-f]{8}-[0-9a-f]{4}- ]]; then
  ID="$STREAM"
else
  ID=$(curl --silent --max-time 15 "$API/stream/${STREAM}" --header "${BINTU_AUTH_HEADER}" | jq -r '.id // empty')
  [ -n "$ID" ] || { echo "error: stream ${STREAM} not found" >&2; exit 1; }
fi

if [ -n "$TARGET_LANGS" ]; then
  OPTS="{\"engine\":\"${ENGINE}\",\"sourceLanguage\":\"${SOURCE_LANG}\",\"targetLanguages\":\"${TARGET_LANGS}\"}"
else
  OPTS="{\"engine\":\"${ENGINE}\",\"sourceLanguage\":\"${SOURCE_LANG}\"}"
fi
BODY="{\"name\":\"captions\",\"options\":${OPTS}}"

R=$(curl --silent --max-time 20 -X POST "$API/stream/${ID}/options" \
  --header "${BINTU_AUTH_HEADER}" --header 'content-type: application/json' --data "$BODY")
if echo "$R" | jq -e '.error' >/dev/null 2>&1; then
  # "Stream options captions already exists" -> modify. PUT needs the existing
  # option GROUP in the body ("group":"captions-1", read from GET /options);
  # ?group= as query parameter or "optionGroup" in the body answer
  # "Parameter required" (verified 2026-10-22).
  GROUP=$(curl --silent --max-time 15 "$API/stream/${ID}/options" --header "${BINTU_AUTH_HEADER}" \
    | jq -r '[.[]? | select(.optionName == "captions" or (.optionGroup|startswith("captions")))][0].optionGroup // empty')
  if [ -z "$GROUP" ]; then
    echo "error: $(echo "$R" | jq -r .error.message)" >&2
    exit 1
  fi
  R2=$(curl --silent --max-time 20 -X PUT "$API/stream/${ID}/options" \
    --header "${BINTU_AUTH_HEADER}" --header 'content-type: application/json' \
    --data "{\"group\":\"${GROUP}\",\"name\":\"captions\",\"options\":${OPTS}}")
  if echo "$R2" | jq -e '.error' >/dev/null 2>&1; then
    echo "error: POST: $(echo "$R" | jq -r .error.message) / PUT: $(echo "$R2" | jq -r .error.message)" >&2
    exit 1
  fi
  R="$R2"
fi
echo "$R" | jq -c '{streamId, optionGroup, options}'
echo "note: settings apply on the next ingest session -- restart the encoder/relay" >&2
