#!/bin/bash
# set_stream_processing.sh -- enable Live Processing (recording / replay /
# thumbnails / motionclip) on an existing stream of your organisation.
#
# Usage:
#   set_stream_processing.sh <stream-name|stream-id> [features]
#
#   features   comma-separated processing ids (default: rec,replay)
#              rec       MP4 recording   -> https://bintu-vod.nanocosmos.de/vod/rec/<name>.mp4
#              replay    HLS replay      -> https://bintu-vod.nanocosmos.de/vod/replay/<name>.m3u8
#              thumbs    thumbnails, motionclip  GIF  (see references/live-processing.md)
#
# Wire format (verified 2026-10-22): PUT /stream/{id}/processing with
#   {"processing":[{"id":"rec"},{"id":"replay"}]}
# POST on that route answers "Access denied", a bare array "Parameter required",
# and PUT /stream/{id}/opcode "Invalid Value" -- only this shape works. The same
# `processing` array can also be passed to POST /stream at creation time.
# Per stream only: for an ABR group call it once per member.
# Needs the feature in the organisation's package (error code 1009
# FeatureNotEnabled otherwise). Takes effect on the next ingest session.
# Prints the stream's resulting processing list as JSON.
case "$1" in -h|--help|"") grep '^#' "$0" | sed '1d;s/^#//'; exit 0 ;; esac

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/env.sh" || exit 1
command -v jq >/dev/null 2>&1 || { echo "error: jq is required" >&2; exit 2; }

STREAM="$1"; FEATURES="${2:-rec,replay}"
API="https://bintu.nanocosmos.de"

if [[ "$STREAM" =~ ^[0-9a-f]{8}-[0-9a-f]{4}- ]]; then
  ID="$STREAM"
else
  ID=$(curl --silent --max-time 15 "$API/stream/${STREAM}" --header "${BINTU_AUTH_HEADER}" | jq -r '.id // empty')
  [ -n "$ID" ] || { echo "error: stream ${STREAM} not found" >&2; exit 1; }
fi

BODY=$(echo "$FEATURES" | jq -Rc 'split(",") | map(select(length>0) | {id: .}) | {processing: .}')
R=$(curl --silent --max-time 20 -X PUT "$API/stream/${ID}/processing" \
  --header "${BINTU_AUTH_HEADER}" --header 'content-type: application/json' --data "$BODY")
if echo "$R" | jq -e '.error' >/dev/null 2>&1; then
  echo "error: $(echo "$R" | jq -r '.error.message') (code $(echo "$R" | jq -r '.error.code'))" >&2
  exit 1
fi
echo "$R" | jq -c '{id, state, processing: [.processing[].id], opcode}'
echo "note: takes effect on the next ingest session -- restart the encoder/relay" >&2
