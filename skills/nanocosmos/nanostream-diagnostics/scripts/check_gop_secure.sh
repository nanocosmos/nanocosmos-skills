#!/bin/bash

#Usage :
#Input arg - [stream name]
#Output integer - [average key frame distance(gop length) in seconds]
#
#Secure (JWT) playback variant -- generates an orga-wide JWT via
#get_jwt_token.sh (needs BINTU_API_KEY). Requires ffprobe.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/env.sh"

if [ -z "$1" ]; then
  echo "error: Stream name not found"
  exit 1
fi

STREAM_NAME=$1

JWT_TOKEN=$(bash "${SCRIPT_DIR}/get_jwt_token.sh" "${STREAM_NAME}")

if [ -z "$JWT_TOKEN" ] || echo "$JWT_TOKEN" | grep -q "^error"; then
  echo "error: failed to retrieve JWT token"
  exit 1
fi

RAW=$(${FFPROBE_PATH} -v error -select_streams v:0 -skip_frame nokey -show_entries frame=pts_time,pict_type -of csv -read_intervals "%+10" "rtmp://bintu-splay.nanocosmos.de/splayrtmp/${STREAM_NAME}?jwtoken=${JWT_TOKEN}" 2>/dev/null)

if [ -z "$RAW" ]; then
  echo "error: no keyframe data received"
  exit 1
fi

AVG=$(echo "$RAW" | awk -F',' '
  /^frame,/ { pts=$2+0; if (prev != "") sum += pts - prev; prev = pts; count++ }
  END { if (count > 1) printf "%.2f\n", sum / (count - 1); else print "warning: GOP length is high - reduce keyframe interval to recommended 2s" }
')

echo "$AVG"
