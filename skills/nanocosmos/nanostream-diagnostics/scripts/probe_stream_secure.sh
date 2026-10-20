#!/bin/bash

#Usage :
#Input arg - [stream name]
#Output csv - [gop_seconds],[video_codec],[profile],[level],[chroma],
#             [width]x[height],[video_bitrate_bps],[audio_codec],[audio_bitrate_bps]
#e.g. 2.00,H264,High,4.0,4:2:0,1920x1080,3200000,AAC,128000
#
#Secure (JWT) playback variant -- generates an orga-wide JWT via
#get_jwt_token.sh (needs BINTU_API_KEY). Requires ffprobe and python3
#(for parse_probe_output.py).
#
#This is the real end-to-end playback probe used across this skill as the
#"does it actually work" check (see check-stream-live.md, slow-stream-start.md)
#-- not just a GOP measurement. It pulls real frames from the live secure
#playback endpoint and reports the actual
#keyframe interval alongside what the encoder is really sending: codec,
#profile, level, chroma subsampling, resolution and bitrate for both video
#and audio. Any of these can reveal an unnoticed encoder-config drift (wrong
#profile/level for the target player, unexpected chroma format, resolution/
#bitrate mismatch) that a platform-side state check can never see, since
#that only reflects what was configured, not what is actually arriving.
#
#Full-frame-dump + retry approach. Confirmed empirically against two real
#streams with different encoder profiles: an RTMP live source's own
#demuxer-close behavior is NOT consistent across streams -- one
#(I/P-frame-only, Constrained Baseline) had ffprobe voluntarily finish and
#close ("Deleting stream..." in -v debug output) after about one GOP's
#worth of frames regardless of -read_intervals/-analyzeduration/-probesize;
#another (B-frame-using, higher profile) never stopped on its own at
#all -- ffprobe just kept demuxing indefinitely and, without a bound, hung
#the script forever. So both defenses are needed, not just one:
#-read_intervals caps how much of a continuously-flowing connection gets
#processed (the fix for the second case); -rw_timeout independently caps
#true I/O silence -- a connect/handshake that never delivers any data at
#all, which -read_intervals cannot catch since it has no frame timeline to
#bound yet. Landing on 0-1 keyframes within the (now bounded) window is
#connection-timing luck, not evidence of a long GOP by itself -- for a
#healthy ~2-2.5s GOP against a ~15s window this is rare but not
#impossible, so still retry before concluding anything. Keep the full
#(unfiltered) frame dump throughout: it lets the real keyframe-to-keyframe
#gap be read directly off actual pict_type values instead of inferred from
#a filtered subset.
#
#Video/audio codec metadata (codec_name, profile, level, pix_fmt, width,
#height, bit_rate) is read from ffprobe's own -show_streams output in the
#same connection/window as the frame dump -- confirmed empirically to be
#populated directly from the RTMP stream header (no need to sum packet
#sizes to estimate bitrate). It does not depend on how many keyframes
#landed in the window, so a SPAN-only attempt (couldn't confirm a full GOP
#yet) can still carry good codec metadata -- kept and reported even if
#every attempt fails to confirm a GOP.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/env.sh"

if [ -z "$1" ]; then
  echo "error: Stream name not found"
  exit 1
fi

if ! command -v "${FFPROBE_PATH}" >/dev/null 2>&1; then
  echo "error: ffprobe not found (checked FFPROBE_PATH='${FFPROBE_PATH}')" >&2
  echo "hint: install ffmpeg (macOS: brew install ffmpeg; Debian/Ubuntu: apt install ffmpeg) or set FFPROBE_PATH in .env to its full path" >&2
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "error: python3 not found (needed by parse_probe_output.py to parse ffprobe's JSON output)" >&2
  exit 1
fi

STREAM_NAME=$1
MAX_ATTEMPTS=3
READ_WINDOW_S=15
LONGEST_SPAN="0"
LAST_MEDIA_INFO=""

parse_probe_json() {
  # ffprobe JSON (file path in arg 1) -> two lines: GOP:/SPAN:/EMPTY and the
  # media CSV -- see parse_probe_output.py for the format
  python3 "${SCRIPT_DIR}/parse_probe_output.py" "$1"
}

for ATTEMPT in $(seq 1 ${MAX_ATTEMPTS}); do
  JWT_TOKEN=$(bash "${SCRIPT_DIR}/get_jwt_token.sh" "${STREAM_NAME}")

  if [ -z "$JWT_TOKEN" ] || echo "$JWT_TOKEN" | grep -q "^error"; then
    echo "error: failed to retrieve JWT token"
    exit 1
  fi

  RAW=$(${FFPROBE_PATH} -v error -rw_timeout 20000000 -show_entries "stream=codec_name,codec_type,profile,level,pix_fmt,width,height,bit_rate:frame=pts_time,pict_type" -of json -read_intervals "%+${READ_WINDOW_S}" "rtmp://bintu-splay.nanocosmos.de/splayrtmp/${STREAM_NAME}?jwtoken=${JWT_TOKEN}" 2>/dev/null)

  if [ -z "$RAW" ]; then
    [ "$ATTEMPT" -eq "$MAX_ATTEMPTS" ] && { echo "error: no frame data received after ${MAX_ATTEMPTS} attempts"; exit 1; }
    continue
  fi

  RAW_FILE=$(mktemp "${TMPDIR:-/tmp}/nsc-probe.XXXXXX")
  echo "$RAW" > "$RAW_FILE"
  PARSED=$(parse_probe_json "$RAW_FILE")
  rm -f "$RAW_FILE"
  GOP_LINE=$(echo "$PARSED" | sed -n '1p')
  MEDIA_INFO=$(echo "$PARSED" | sed -n '2p')

  [ -n "$MEDIA_INFO" ] && [ "$MEDIA_INFO" != ",,,,,,," ] && LAST_MEDIA_INFO="$MEDIA_INFO"

  case "$GOP_LINE" in
    GOP:*)
      echo "${GOP_LINE#GOP:},${MEDIA_INFO}"
      exit 0
      ;;
    SPAN:*)
      SPAN="${GOP_LINE#SPAN:}"
      if awk -v a="$SPAN" -v b="$LONGEST_SPAN" 'BEGIN{exit !(a>b)}'; then
        LONGEST_SPAN="$SPAN"
      fi
      ;;
  esac
done

echo "warning: could not capture 2 keyframes in ${MAX_ATTEMPTS} connection attempts (longest single capture spanned ${LONGEST_SPAN}s) -- GOP appears to exceed that span; reduce keyframe interval to recommended 2s if confirmed"
[ -n "$LAST_MEDIA_INFO" ] && echo "last captured stream info (from an incomplete window): ${LAST_MEDIA_INFO}"
