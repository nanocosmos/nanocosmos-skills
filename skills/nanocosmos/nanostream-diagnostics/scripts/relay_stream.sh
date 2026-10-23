#!/bin/bash
# relay_stream.sh -- restream a live nanoStream stream into another stream
# with ffmpeg (no re-encoding), restarting automatically on any exit.
#
# Usage:
#   relay_stream.sh <source-stream-name> <target-stream-name> [--once]
#
#   source   stream to pull: rtmp://bintu-play.nanocosmos.de/play/<source>
#            (must be publicly playable; a token-secured source needs its own
#            JWT -- set SRC_URL to a full pull URL instead)
#   target   stream to push: rtmp://bintu-stream.nanocosmos.de:1935/live/<target>
#            (use DST_URL for a different ingest host, e.g. bintu-vtrans)
#   --once   run a single ffmpeg session and exit instead of looping
#
# Environment:
#   SRC_URL / DST_URL   full input / output URLs (override the defaults above)
#   RW_TIMEOUT          socket read/write timeout in microseconds (default 15000000
#                       = 15 s). Without it ffmpeg blocks forever on a dead TCP
#                       connection -- seen after the relay host slept: the target
#                       streams showed "ended" while ffmpeg sat in a read (2026-10-22).
#   RESTART_DELAY       seconds between restarts (default 5)
#
# Run it in the background and keep the log:
#   nohup scripts/relay_stream.sh XXXXX-SRC01 XXXXX-DST01 > /tmp/relay-XXXXX-DST01.log 2>&1 &
# Stop:  pkill -f "relay_stream.sh XXXXX-SRC01"
#
# `-c copy` passes video and audio through untouched, so Live Captions on the
# target stream transcribe the original audio.
case "$1" in -h|--help|"") grep '^#' "$0" | sed '1d;s/^#//'; exit 0 ;; esac

SRC="$1"; DST="$2"; ONCE="$3"
if [ -z "$DST" ]; then
  echo "usage: $(basename "$0") <source-stream-name> <target-stream-name> [--once]" >&2
  exit 1
fi
command -v ffmpeg >/dev/null 2>&1 || { echo "error: ffmpeg is required (macOS: brew install ffmpeg)" >&2; exit 2; }

SRC_URL="${SRC_URL:-rtmp://bintu-play.nanocosmos.de/play/${SRC}}"
DST_URL="${DST_URL:-rtmp://bintu-stream.nanocosmos.de:1935/live/${DST}}"
RW_TIMEOUT="${RW_TIMEOUT:-15000000}"
RESTART_DELAY="${RESTART_DELAY:-5}"

while true; do
  echo "$(date -u +%FT%TZ) relay ${SRC} -> ${DST} starting"
  ffmpeg -hide_banner -loglevel warning -rtmp_live live -rw_timeout "${RW_TIMEOUT}" \
    -i "${SRC_URL}" \
    -c copy -rw_timeout "${RW_TIMEOUT}" -f flv "${DST_URL}"
  RC=$?
  [ "$ONCE" = "--once" ] && exit $RC
  echo "$(date -u +%FT%TZ) relay ${SRC} -> ${DST} exited (${RC}), restarting in ${RESTART_DELAY}s"
  sleep "${RESTART_DELAY}"
done
