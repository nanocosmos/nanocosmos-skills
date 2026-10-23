#!/usr/bin/env python3
"""Turn ffprobe's JSON (streams + frames) into the probe_stream_*.sh summary.

Usage:
    parse_probe_output.py <ffprobe-json-file>
    ffprobe ... -of json ... | parse_probe_output.py

Expects the output of
    ffprobe -show_entries "stream=codec_name,codec_type,profile,level,pix_fmt,
            width,height,bit_rate:frame=pts_time,pict_type" -of json ...

Prints exactly two lines:
  1. GOP:<avg seconds between keyframes>   (>= 2 keyframes seen)
     SPAN:<seconds covered by the frames>  (< 2 keyframes: no GOP yet)
     EMPTY                                 (no frames / unparsable input)
  2. <video_codec>,<profile>,<level>,<chroma>,<w>x<h>,<video_bitrate>,<audio_codec>,<audio_bitrate>
     (fields empty when unknown; ",,,,,,," when nothing was parsed)

Helper for probe_stream_secure.sh / probe_stream_unsecure.sh, which do the
ffprobe connection, retries and final CSV. Stdlib only, no API key.
"""

import json
import sys


def chroma_from_pix_fmt(pf):
    if not pf:
        return ""
    if "420" in pf:
        return "4:2:0"
    if "422" in pf:
        return "4:2:2"
    if "444" in pf:
        return "4:4:4"
    return pf


def level_str(lv):
    try:
        return "%.1f" % (float(lv) / 10)
    except (TypeError, ValueError):
        return ""


def summarize(data):
    """Return (gop_line, media_line) for a parsed ffprobe JSON document."""
    streams = data.get("streams", [])
    video = next((s for s in streams if s.get("codec_type") == "video"), None)
    audio = next((s for s in streams if s.get("codec_type") == "audio"), None)

    if video:
        width = video.get("width")
        height = video.get("height")
        res = "%sx%s" % (width, height) if width and height else ""
        video_fields = ",".join([
            (video.get("codec_name") or "").upper(),
            video.get("profile") or "",
            level_str(video.get("level")),
            chroma_from_pix_fmt(video.get("pix_fmt")),
            res,
            str(video.get("bit_rate") or ""),
        ])
    else:
        video_fields = ",,,,,"

    if audio:
        audio_fields = ",".join([
            (audio.get("codec_name") or "").upper(),
            str(audio.get("bit_rate") or ""),
        ])
    else:
        audio_fields = ","

    first = last = None
    keyframes = []
    for f in data.get("frames", []):
        if "pts_time" not in f:
            continue
        pts = float(f["pts_time"])
        if first is None:
            first = pts
        last = pts
        if f.get("pict_type") == "I":
            keyframes.append(pts)

    if len(keyframes) >= 2:
        diffs = [keyframes[i + 1] - keyframes[i] for i in range(len(keyframes) - 1)]
        gop_line = "GOP:%.2f" % (sum(diffs) / len(diffs))
    elif last is not None:
        gop_line = "SPAN:%.2f" % (last - (first or last))
    else:
        gop_line = "EMPTY"

    return gop_line, "%s,%s" % (video_fields, audio_fields)


def main():
    try:
        if len(sys.argv) > 1 and sys.argv[1] != "-":
            with open(sys.argv[1]) as fh:
                data = json.load(fh)
        else:
            data = json.load(sys.stdin)
    except Exception:
        print("EMPTY")
        print("")
        return 0
    gop_line, media_line = summarize(data)
    print(gop_line)
    print(media_line)
    return 0


if __name__ == "__main__":
    sys.exit(main())
