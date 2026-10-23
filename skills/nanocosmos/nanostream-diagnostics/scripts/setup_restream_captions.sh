#!/bin/bash
# setup_restream_captions.sh -- restream one or more live streams into NEW
# streams of your organisation with Live Captions + translation, recording
# and replay enabled. (curl variant; setup_restream_captions.js is the same
# flow with fetch for Node.)
#
# Usage:
#   setup_restream_captions.sh <source-stream-name> [<source-stream-name> ...]
#
# Per source stream this script:
#   1. creates a new low-latency stream in your organisation (POST /stream)
#      with processing [rec, replay] -- same payload the captions-workflow
#      page uses. If the organisation's package has no recording (error code
#      1009 FeatureNotEnabled) the stream is created again without it.
#   2. enables Live Captions on it (POST /stream/{id}/options) -- must happen
#      BEFORE the first ingest; caption settings only apply on a new session
#   3. starts a self-restarting `ffmpeg -c copy` relay in the background via
#      relay_stream.sh:  rtmp://bintu-play.nanocosmos.de/play/<source>
#                     -> rtmp://bintu-stream.nanocosmos.de:1935/live/<new stream>
# and finally mints an orga-wide playback JWT (the target org is secure --
# Live Captions require it) for the demo player / multiplayer.
#
# Environment (all optional except the key):
#   BINTU_API_KEY   API key of the TARGET organisation (via env.sh / .env)
#   SOURCE_LANG     spoken language of the source audio      (default: en)
#   TARGET_LANGS    comma-separated translation targets        (default: de,pt-BR)
#                   -- keep this a STRING: the JSON-array form shown in the
#                   Live Captions API guide answers HTTP 500 (2026-10-21)
#   ENGINE          ASR engine                                 (default: deepgram)
#   NO_VOD=1        create without recording/replay
#   LOGDIR          relay logs + map.tsv                       (default: /tmp/restream)
#   TOKEN_HOURS     lifetime of the printed playback JWT       (default: 2)
#
# Requirements: curl, jq, ffmpeg. The source streams must be publicly playable
# (unsecured org); a token-secured source needs its own JWT on the pull URL.
# Output: one TSV line per stream  <source> <target id> <target name> <pid>,
# appended to $LOGDIR/map.tsv, then the playback token on the last line.
# After the session: replay at https://bintu-vod.nanocosmos.de/vod/replay/<name>.m3u8,
# transcripts at https://bintu-vod-eu-02-ak.nanocosmos.de/transcript/<org>/<name>/<name>.<src>-<tgt>.vtt
# Stop all relays: pkill -f relay_stream.sh
case "$1" in -h|--help|"") grep '^#' "$0" | sed '1d;s/^#//'; exit 0 ;; esac

ENV_SH_REQUIRE_KEY=1
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/env.sh" || exit 1

for TOOL in curl jq ffmpeg; do
  command -v "$TOOL" >/dev/null 2>&1 || { echo "error: $TOOL is required" >&2; exit 2; }
done

SOURCE_LANG="${SOURCE_LANG:-en}"
TARGET_LANGS="${TARGET_LANGS:-de,pt-BR}"
ENGINE="${ENGINE:-deepgram}"
LOGDIR="${LOGDIR:-/tmp/restream}"
TOKEN_HOURS="${TOKEN_HOURS:-2}"
API="https://bintu.nanocosmos.de"
mkdir -p "$LOGDIR"

create_stream() {  # create_stream SRC with|without -> JSON record
  local PROC=""
  [ "$2" = "with" ] && PROC=',"processing":[{"id":"rec"},{"id":"replay"}]'
  curl --silent --max-time 20 -X POST "$API/stream" \
    --header "x-bintu-apikey: ${BINTU_API_KEY}" --header 'content-type: application/json' \
    --data "{\"type\":\"low-latency\",\"tags\":[\"restream\",\"source-$1\",\"captions\"]${PROC}}"
}

FAILED=0
for SRC in "$@"; do
  # 1. create the target stream (with recording + replay unless NO_VOD)
  if [ -n "$NO_VOD" ]; then
    REC=$(create_stream "$SRC" without)
  else
    REC=$(create_stream "$SRC" with)
    if [ "$(echo "$REC" | jq -r '.error.code // empty')" = "1009" ]; then
      echo "note: recording/replay not in this organisation's package -- creating ${SRC}'s target without it" >&2
      REC=$(create_stream "$SRC" without)
    fi
  fi
  ID=$(echo "$REC" | jq -r '.id // empty')
  DST=$(echo "$REC" | jq -r '.ingest.rtmp.streamname // empty')
  if [ -z "$ID" ] || [ -z "$DST" ]; then
    echo "error: creating target stream for ${SRC} failed: $(echo "$REC" | jq -r '.error.message // .' 2>/dev/null)" >&2
    FAILED=1; continue
  fi
  PROCESSING=$(echo "$REC" | jq -r '[.processing[]?.id] | join("+")')

  # 2. captions + translation, before the first ingest
  OPT=$(curl --silent --max-time 20 -X POST "$API/stream/${ID}/options" \
    --header "x-bintu-apikey: ${BINTU_API_KEY}" --header 'content-type: application/json' \
    --data "{\"name\":\"captions\",\"options\":{\"engine\":\"${ENGINE}\",\"sourceLanguage\":\"${SOURCE_LANG}\",\"targetLanguages\":\"${TARGET_LANGS}\"}}")
  if echo "$OPT" | jq -e '.error' >/dev/null 2>&1; then
    echo "error: captions on ${DST} failed: $(echo "$OPT" | jq -r '.error.message') -- is Live Captions enabled for this organisation? (stream created, relay NOT started)" >&2
    FAILED=1; continue
  fi

  # 3. relay, detached
  nohup "${SCRIPT_DIR}/relay_stream.sh" "$SRC" "$DST" > "${LOGDIR}/${DST}.log" 2>&1 &
  printf '%s\t%s\t%s\t%s\t%s\n' "$SRC" "$ID" "$DST" "$!" "${PROCESSING:-no-vod}" | tee -a "${LOGDIR}/map.tsv"
done

# 4. orga-wide playback token for the (secure) target organisation
EXP=$(( $(date +%s) + TOKEN_HOURS * 3600 ))
TOKEN=$(curl --silent --max-time 20 "https://token.nanostream.cloud/api/v1/splay" \
  --header "x-bintu-apikey: ${BINTU_API_KEY}" --header 'content-type: application/json' \
  --data "{\"orgawide\":true,\"exp\":${EXP}}" | jq -r '.data.token // empty')
if [ -n "$TOKEN" ]; then
  echo "playback token (orga-wide, ${TOKEN_HOURS}h): ${TOKEN}"
else
  echo "note: no playback token minted (organisation not secure?) -- the new streams play without a token" >&2
fi
exit $FAILED
