#!/bin/bash

# Send a live test stream to nanoStream with ffmpeg (RTMP ingest).
#
# Usage: send_test_stream.sh [options] [stream name]
#
#   -s NAME    stream name XXXXX-YYYYY (or pass it as the last argument;
#              asked for interactively when missing)
#   -i INPUT   what to send (default: testsrc). One of the presets below,
#              a local file, or any http(s)/rtmp/srt URL ffmpeg can read.
#   -H HOST    ingest host: vtrans (default, live transcoding / ABR) or
#              stream (standard ingest, passthrough)
#   -u URL     full RTMP ingest URL (overrides -H and the stream name in the
#              URL), e.g. the exact URL from the Dashboard
#   -S SIZE    video size (default 1280x720)
#   -r FPS     frame rate (default 30; GOP is fixed at 2 seconds)
#   -b RATE    video bitrate (default 1000k)
#   -l         loop a file/URL input endlessly
#   -t SECS    stop after SECS seconds
#   -n         dry run: print the ffmpeg command, don't send
#   -h         show this help
#
# Input presets:
#   testsrc       ffmpeg test pattern with a 150 Hz beep (no download)
#   cnn           CNN news, American English (captioning/translation tests)
#   tagesschau    tagesschau24 news, German (captioning/translation tests)
#   greenscreen   chromakey green screen
#   bluescreen    chromakey blue screen
#   bluescreen-bad  chromakey blue screen, bad lighting (despill tests)
#
# Examples:
#   send_test_stream.sh XXXXX-YYYYY
#   send_test_stream.sh -i cnn -l XXXXX-YYYYY
#   send_test_stream.sh -i tagesschau -t 300 -s XXXXX-YYYYY
#   send_test_stream.sh -i ./my-video.mp4 -H stream XXXXX-YYYYY
#
# Stop with Ctrl-C.

VOD=https://bintu-vod-eu-02-ak.nanocosmos.de/testvideos

usage() { awk 'NR > 2 && !/^#/ { exit } NR > 2 { sub(/^# ?/, ""); print }' "$0"; }

STREAM=""
INPUT=testsrc
HOST=vtrans
OUT=""
SIZE=1280x720
FPS=30
BITRATE=1000k
LOOP=0
DURATION=""
DRYRUN=0

while getopts "s:i:H:u:S:r:b:lt:nh" opt; do
  case $opt in
    s) STREAM=$OPTARG ;;
    i) INPUT=$OPTARG ;;
    H) HOST=$OPTARG ;;
    u) OUT=$OPTARG ;;
    S) SIZE=$OPTARG ;;
    r) FPS=$OPTARG ;;
    b) BITRATE=$OPTARG ;;
    l) LOOP=1 ;;
    t) DURATION=$OPTARG ;;
    n) DRYRUN=1 ;;
    h) usage; exit 0 ;;
    *) usage >&2; exit 1 ;;
  esac
done
shift $((OPTIND - 1))
[ -z "$STREAM" ] && STREAM=$1

if [ -z "$OUT" ]; then
  if [ -z "$STREAM" ]; then
    if [ -t 0 ]; then
      read -r -p "Stream name (XXXXX-YYYYY): " STREAM
    fi
    if [ -z "$STREAM" ]; then
      echo "error: stream name missing (use -s XXXXX-YYYYY)" >&2
      exit 1
    fi
  fi
  case $HOST in
    vtrans) OUT="rtmp://bintu-vtrans.nanocosmos.de/live/$STREAM" ;;
    stream) OUT="rtmp://bintu-stream.nanocosmos.de/live/$STREAM" ;;
    *) echo "error: unknown host '$HOST' (use vtrans or stream, or -u URL)" >&2; exit 1 ;;
  esac
fi

case $INPUT in
  cnn)            SRC="$VOD/news/cnn-rep-720.mp4" ;;
  tagesschau)     SRC="$VOD/news/tagesschau24.mp4" ;;
  greenscreen)    SRC="$VOD/chromakey/nano/Foreground/Green_Female_Red_New_Nano_Key1.mp4" ;;
  bluescreen)     SRC="$VOD/chromakey/nano/Foreground/Blue_Male_White_New_Nano_Key4.mp4" ;;
  bluescreen-bad) SRC="$VOD/chromakey/nano/Foreground/fg.mp4" ;;
  *)              SRC=$INPUT ;;
esac

if [ "$SRC" = testsrc ]; then
  IN_ARGS=(-f lavfi -i "testsrc=rate=$FPS:size=$SIZE,format=yuv420p"
           -f lavfi -i "sine=frequency=150:sample_rate=48000:beep_factor=2")
else
  if [[ ! "$SRC" =~ ^[a-z]+:// ]] && [ ! -f "$SRC" ]; then
    echo "error: input '$SRC' is neither a preset, a URL nor an existing file" >&2
    exit 1
  fi
  IN_ARGS=()
  [ "$LOOP" = 1 ] && IN_ARGS+=(-stream_loop -1)
  IN_ARGS+=(-i "$SRC")
fi

GOP=$((FPS * 2))
CMD=(ffmpeg -hide_banner -re "${IN_ARGS[@]}")
[ -n "$DURATION" ] && CMD+=(-t "$DURATION")
CMD+=(-s "$SIZE" -r "$FPS"
      -c:v libx264 -preset ultrafast -pix_fmt yuv420p -profile:v baseline
      -b:v "$BITRATE" -maxrate "$BITRATE" -bufsize "$BITRATE"
      -g "$GOP" -keyint_min "$GOP" -sc_threshold 0
      -c:a aac -b:a 64k -ac 2 -ar 48000
      -f flv "$OUT")

if [ "$DRYRUN" = 1 ]; then
  printf '%q ' "${CMD[@]}"; echo
  exit 0
fi

command -v ffmpeg >/dev/null || { echo "error: ffmpeg not found in PATH" >&2; exit 1; }
echo "Sending '$INPUT' to $OUT (Ctrl-C to stop)" >&2
exec "${CMD[@]}"
