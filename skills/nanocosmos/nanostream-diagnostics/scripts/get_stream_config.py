#!/usr/bin/env python3
"""Resolve how a nanoStream stream is set up: single, ABR group or daisy chain.

Usage:
    get_stream_config.py <stream name>

Output (one JSON object on stdout):
    {"type": DEF_TYPE,
     "push": PUSH_URL,
     "stream": [{"index": 0, "streamname": "XXXXX-YYYYY"},
                {"index": 1, "streamname": "XXXXX-YYYYY",
                 "profile": {"bitrate": .., "fps": .., "width": .., "height": ..}}, ...],
     "note": NOTE_STRING}

Notes:
- The stream name for DEF_TYPE="group" can be any of the streams in the set.
- DEF_TYPE="single" - a single stream; "stream" only has index 0.
- DEF_TYPE="group"  - new-style ABR stream group; index 0 is the passthrough,
  indices 1+ carry a "profile" from each member's own "info" data.
- DEF_TYPE="daisy"  - old-style setup chained via the pushUrl key with the
  internal URL schema rtmp://127.0.0.1/TRANSCODE_PROFILE/STREAM_NAME; each
  hop's profile is resolved by matching the previous hop's TRANSCODE_PROFILE
  segment against the orga's transcoding profiles. Index 0 (source) never
  has a profile.
- PUSH_URL - where the (last) stream pushes to; null when no push is set.
- NOTE_STRING - added (never for "group") when the queried stream's tags
  contain "N. Transcoded"/"N. Transcode", meaning it may be an untraceable
  downstream daisy-chain member. Absence of a note is not proof the stream
  is standalone.

Credentials: your own organisation API key (BINTU_API_KEY) or an expiring
access token (NANO_API_TOKEN, see create_access_token.sh), resolved by env.py
(same .env lookup as env.sh). Keyless fallback: GET /stream/<name>/group is
public, so without a credential the script still resolves "single"/"group"
setups (with member profiles) and the push URL, and prints a warning on
stderr. Note this leans on current API behaviour, not a contract: keyless,
the route strips ingest/tags/top-level pushUrl for a standalone stream but
returns the full record for an ABR group member, and the per-entry
playout.rtmp[].pushUrl is present either way (verified 2026-10-12). If
the backend tightens that, the keyless fallback degrades to "single" with
push=null. GET /transcoding_profiles is NOT public, so old-style daisy chains
cannot be identified keyless -- such a stream is then reported as "single"
with its internal rtmp://127.0.0.1/... push URL, plus a second stderr
warning. The same fallback kicks in when a credential IS set but bintu
answers 403 on the stream route -- that is what happens when the key belongs
to a different organisation than the stream (a foreign-org key is rejected
where an anonymous request succeeds).

Warnings go to stderr only; stdout is always either the JSON or an
"error: ..." line (exit 1). Stdlib only. Bash entry point with identical
behavior: get_stream_config.sh.
"""

import json
import os
import re
import sys
import urllib.error
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import env  # noqa: E402

API = "https://bintu.nanocosmos.de"
MAX_HOPS = 20


def warn(msg):
    print(f"warning: {msg}", file=sys.stderr)


class Bintu:
    """Minimal bintu client with the keyless fallback on 403."""

    def __init__(self, auth_header):
        self.headers = env.headers(auth_header)
        self.keyless = not auth_header

    def get(self, path):
        req = urllib.request.Request(API + path, headers=self.headers)
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.load(r)

    def stream_group(self, name):
        # /stream/<name>/group is public. A valid key for ANOTHER organisation
        # is rejected with 403 where the anonymous request succeeds -- on that
        # signal drop the credential for the rest of the run and retry keyless.
        try:
            return self.get(f"/stream/{name}/group")
        except urllib.error.HTTPError as e:
            if e.code != 403 or self.keyless:
                raise
            hdr = next(k for k in self.headers if k != "content-type")
            warn(f"bintu rejected the request with the configured {hdr} (HTTP 403) "
                 "-- the key most likely belongs to a different organisation than "
                 "this stream; retrying via the public (keyless) route")
            del self.headers[hdr]
            self.keyless = True
            return self.get(f"/stream/{name}/group")


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


def fail(msg):
    print(f"error: {msg}")
    sys.exit(1)


def main():
    if len(sys.argv) < 2 or not sys.argv[1]:
        fail("Stream name not found")
    name = sys.argv[1]

    api = Bintu(env.load(public_fallback=True))

    try:
        doc = api.stream_group(name)
    except Exception as e:
        code = getattr(e, "code", None)
        if api.keyless and code == 404:
            # well-formed but unknown stream name or UUID
            warn("the public route answered 404 -- the stream name is unknown")
        elif api.keyless and code == 403:
            # 403 keyless means a malformed name, or a route that needs a key
            warn("the public route answered 403 -- the stream name is malformed, "
                 "or this lookup needs an API key")
        fail(f"request failed ({e})")

    entries = rtmp_entries(doc)
    if not entries:
        fail("no rtmp playout entries in API response")

    index0 = entry_by_index(entries, 0)
    index0_push = index0.get("pushUrl") or ""

    profiles = []
    seg0 = push_segment(index0_push)
    if seg0 is not None:
        if api.keyless:
            # /transcoding_profiles needs a credential; without it an internal
            # push URL cannot be matched against a transcode profile
            warn(f"stream pushes to an internal URL ({index0_push}) but the "
                 "transcoding profiles are not readable without an API key -- "
                 "daisy-chain detection skipped; 'type' may be reported as "
                 "'single' although this is an old-style transcoding chain")
        else:
            try:
                find_profiles(api.get("/transcoding_profiles"), profiles)
            except Exception:
                pass

    if seg0 is not None and profile_named(profiles, seg0):
        def_type = "daisy"
    elif len(entries) <= 1:
        def_type = "single"
    else:
        def_type = "group"

    stream_json = []
    if def_type == "daisy":
        chain_name, current_push, current_profile = name, index0_push, None
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
                next_doc = api.stream_group(chain_name)
            except Exception as e:
                fail(f"chain hop request failed ({e})")
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


if __name__ == "__main__":
    main()
