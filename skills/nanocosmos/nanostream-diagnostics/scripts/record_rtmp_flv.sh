#!/usr/bin/env bash
# record-rtmp-flv.sh — dump a nanoStream live stream via RTMP pull (FLV) with
# stream copy (no re-encoding), logging everything to a .log file.
#
# Usage: ./record-rtmp-flv.sh [STREAMNAME] [SECONDS] [OUTDIR]
#   STREAMNAME  default yPleE-upAjS   (playout 933f1242-7ce7-4313-9b2e-bf8d6044ef0c)
#   SECONDS     default 60
#   OUTDIR      default ~/Downloads
#
# KNOWN FAILURE (2026-09-13, Homebrew ffmpeg on macOS): this RTMP/FLV pull
# aborted after ~0.46 s with
#   [flv] OnTextData packet is not implemented. Update your FFmpeg version ...
#   [in#0/flv] Error during demuxing: Invalid data found when processing input
# The stream carries an FLV "onTextData" script tag that this ffmpeg build's
# FLV demuxer rejects. Workaround: pull the emulated HTTPS MP4 instead
# (see record-https-mp4 command at the bottom), which worked.

set -uo pipefail

STREAM="${1:-yPleE-upAjS}"
SECONDS_TO_RECORD="${2:-60}"
OUTDIR="${3:-$HOME/Downloads}"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="${OUTDIR}/${STREAM}_${STAMP}_rtmp.mp4"
LOG="${OUTDIR}/${STREAM}_${STAMP}_rtmp.log"
INPUT="rtmp://bintu-play.nanocosmos.de/play/${STREAM}"

mkdir -p "${OUTDIR}"

{
  echo "=== $(date -u +%FT%TZ) start"
  echo "ffmpeg: $(command -v ffmpeg) / $(ffmpeg -version | head -1)"
  echo "input : ${INPUT}"
  echo "output: ${OUT}"
  echo "length: ${SECONDS_TO_RECORD}s"
  echo "cmd   : ffmpeg -hide_banner -loglevel info -stats -rtmp_live live -i \"${INPUT}\" -t ${SECONDS_TO_RECORD} -c copy -movflags +faststart \"${OUT}\""
  echo "==="
} | tee "${LOG}"

# --- the exact command that failed on the FLV OnTextData packet ---
ffmpeg -hide_banner -loglevel info -stats \
  -rtmp_live live \
  -i "${INPUT}" \
  -t "${SECONDS_TO_RECORD}" \
  -c copy -movflags +faststart \
  "${OUT}" 2>&1 | tee -a "${LOG}"
RC=${PIPESTATUS[0]}

{
  echo "=== $(date -u +%FT%TZ) ffmpeg exit code: ${RC}"
  if [ -f "${OUT}" ]; then
    echo "--- ffprobe"
    ffprobe -v error -show_entries format=duration,size:stream=codec_type,codec_name,width,height,r_frame_rate -of compact "${OUT}" 2>&1
  else
    echo "no output file written"
  fi
  if grep -q "OnTextData packet is not implemented" "${LOG}"; then
    echo "!!! FLV demuxer hit OnTextData -> use the HTTPS MP4 fallback:"
    echo "ffmpeg -hide_banner -i \"https://bintu-play.nanocosmos.de/h5live/http/stream.mp4?url=rtmp://localhost/play&stream=${STREAM}\" -t ${SECONDS_TO_RECORD} -c copy -movflags +faststart \"${OUTDIR}/${STREAM}_${STAMP}_https.mp4\""
  fi
  echo "=== log: ${LOG}"
} | tee -a "${LOG}"

exit "${RC}"
