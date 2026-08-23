#!/bin/bash

#Usage :
#Input arg - [stream name]
#Output integer - [average key frame distance(gop length) in seconds]
#
#No API key needed -- probes the public playback endpoint directly.
#Requires ffprobe (set FFPROBE_PATH if not on PATH, or in .env; loaded via
#env.sh with the BINTU_API_KEY check skipped since none is needed here).

ENV_SH_OPTIONAL_KEY=1
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/env.sh"

if [ -z "$1" ]; then
  echo "error: Stream name not found"
  exit 1
fi

STREAM_NAME=$1

RAW=$(${FFPROBE_PATH} -v error -select_streams v:0 -skip_frame nokey -show_entries frame=pts_time,pict_type -of csv -read_intervals "%+10" rtmp://bintu-play.nanocosmos.de/play/${STREAM_NAME} 2>/dev/null)

if [ -z "$RAW" ]; then
  echo "error: no keyframe data received"
  exit 1
fi

AVG=$(echo "$RAW" | awk -F',' '
  /^frame,/ { pts=$2+0; if (prev != "") sum += pts - prev; prev = pts; count++ }
  END { if (count > 1) printf "%.2f\n", sum / (count - 1); else print "warning: GOP length is high - reduce keyframe interval to recommended 2s" }
')

echo "$AVG"
