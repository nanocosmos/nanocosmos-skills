#!/bin/bash

#Usage :
#Input arg - [stream name]
#Output json - {"type":DEF_TYPE,
#               "push":PUSH_URL,
#               "stream":[{"index":0,"streamname":"XXXXX-YYYYY"},
#                         {"index":1,"streamname":"XXXXX-YYYYY","profile":{"bitrate":DEF_BITRATE,"fps":DEF_FPS,"width":DEF_WIDTH,"height":DEF_HEIGHT}},...],
#               "note":NOTE_STRING}
#Notes:
#stream name arg for DEF_TYPE="group" can be any of the streams in the set.
#DEF_TYPE="single" - a single stream; "stream" only has index 0.
#DEF_TYPE="group" - new-style ABR stream group; index 0 is the passthrough,
#indices 1+ carry a "profile" from each member's own "info" data.
#DEF_TYPE="daisy" - old-style setup chained via the pushUrl key with internal
#URL schema rtmp://127.0.0.1/TRANSCODE_PROFILE/STREAM_NAME; each hop's profile
#is resolved by matching the previous hop's TRANSCODE_PROFILE segment against
#the orga's transcoding profiles. Index 0 (source) never has a profile.
#PUSH_URL - where the (last) stream pushes to; null when no push is set.
#NOTE_STRING - added (never for "group") when the queried stream's tags contain
#"N. Transcoded"/"N. Transcode", meaning it may be an untraceable downstream
#daisy-chain member. Absence of a note is not proof the stream is standalone.
#
#Public API variant: uses your own organisation API key (BINTU_API_KEY) or
#an expiring access token (NANO_API_TOKEN, see create_access_token.sh).
#Requires python3.

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/env.sh" || exit 1

if [ -z "$1" ]; then
  echo "error: Stream name not found"
  exit 1
fi

STREAM_NAME="$1" python3 - <<'PYEOF'
import json, os, re, sys, urllib.request

API = "https://bintu.nanocosmos.de"
# "x-bintu-apikey: <key>" or "x-bintu-token: <token>" — env.sh decides
AUTH_NAME, AUTH_VALUE = os.environ["BINTU_AUTH_HEADER"].split(": ", 1)
NAME = os.environ["STREAM_NAME"]
MAX_HOPS = 20

def get(path):
    req = urllib.request.Request(API + path, headers={
        "content-type": "application/json", AUTH_NAME: AUTH_VALUE})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)

def rtmp_entries(doc):
    return (doc.get("playout") or {}).get("rtmp") or []

def entry_by_index(entries, idx):
    for e in entries:
        if e.get("index") == idx:
            return e
    return entries[0] if entries else {}

def find_profiles(node, out):
    # collect any named profile dict, wherever it sits in the response;
    # the bitrate/fps/width/height fields live nested under "vtrans"
    if isinstance(node, dict):
        if "name" in node and ("bitrate" in node or isinstance(node.get("vtrans"), dict)):
            out.append(node)
        for v in node.values():
            find_profiles(v, out)
    elif isinstance(node, list):
        for v in node:
            find_profiles(v, out)

def profile_named(profiles, name):
    for p in profiles:
        if p.get("name") == name:
            src = p if "bitrate" in p else (p.get("vtrans") or {})
            return {k: src.get(k) for k in ("bitrate", "fps", "width", "height")}
    return None

def push_segment(url):
    # rtmp://127.0.0.1[:port]/SEGMENT/STREAM_NAME -> SEGMENT
    m = re.match(r"^rtmp://127\.0\.0\.1(?::\d+)?/(.+)/[^/]+$", url or "")
    return m.group(1) if m else None

try:
    doc = get(f"/stream/{NAME}/group")
except Exception as e:
    print(f"error: request failed ({e})")
    sys.exit(1)

entries = rtmp_entries(doc)
if not entries:
    print("error: no rtmp playout entries in API response")
    sys.exit(1)

index0 = entry_by_index(entries, 0)
index0_push = index0.get("pushUrl") or ""

profiles = []
seg0 = push_segment(index0_push)
if seg0 is not None:
    prof_raw = []
    try:
        find_profiles(get("/transcoding_profiles"), prof_raw)
    except Exception:
        pass
    profiles = prof_raw

if seg0 is not None and profile_named(profiles, seg0):
    def_type = "daisy"
elif len(entries) <= 1:
    def_type = "single"
else:
    def_type = "group"

stream_json = []
if def_type == "daisy":
    chain_name, current_push, current_profile = NAME, index0_push, None
    push_url = current_push
    for _ in range(MAX_HOPS + 1):
        item = {"index": len(stream_json), "streamname": chain_name}
        prof = profile_named(profiles, current_profile) if current_profile else None
        if prof:
            item["profile"] = prof
        stream_json.append(item)

        next_seg = push_segment(current_push)
        if not (next_seg and profile_named(profiles, next_seg)):
            # not a transcode-profile hop (external URL, null, or internal
            # non-transcode push like .../live/...) -- terminal push setting
            push_url = current_push
            break
        current_profile = next_seg
        chain_name = current_push.rstrip("/").rsplit("/", 1)[-1]
        try:
            next_doc = get(f"/stream/{chain_name}/group")
        except Exception as e:
            print(f"error: chain hop request failed ({e})")
            sys.exit(1)
        current_push = entry_by_index(rtmp_entries(next_doc), 0).get("pushUrl") or ""
        push_url = current_push
else:
    for e in entries:
        item = {"index": e.get("index"), "streamname": e.get("streamname")}
        info = e.get("info") or {}
        if info:
            item["profile"] = {k: info.get(k) for k in ("bitrate", "fps", "width", "height")}
        stream_json.append(item)
    last_push = entries[-1].get("pushUrl") or ""
    push_url = last_push if last_push else index0_push

note = None
if def_type != "group":
    tags = index0.get("tags") or doc.get("tags") or []
    matched = next((t for t in tags if re.fullmatch(r"\d+\. Transcoded?", str(t))), None)
    if matched:
        note = (f"This stream is tagged '{matched}', indicating it may be a downstream "
                "transcode target within a daisy-chain group; the parent stream cannot "
                "be reliably traced from this query alone.")

result = {"type": def_type, "push": push_url or None, "stream": stream_json}
if note:
    result["note"] = note
print(json.dumps(result))
PYEOF
