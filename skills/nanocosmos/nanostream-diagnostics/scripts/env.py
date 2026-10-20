#!/usr/bin/env python3
"""Credential / .env resolution for the Python scripts -- mirrors env.sh.

Import from a sibling script:

    import env
    AUTH = env.load(public_fallback=True)   # "" or "x-bintu-apikey: <key>" ...

Resolution order (same as env.sh):

1. If a bash wrapper already sourced env.sh, BINTU_AUTH_HEADER is in the
   environment (possibly empty) and is returned as-is -- env.sh has done the
   lookup and printed any warning, so nothing is repeated here.
2. Otherwise, if BINTU_API_KEY or FFPROBE_PATH is not set in the environment,
   the first .env found among <script dir>/.env, <script dir>/../.env
   (the skill root), $PWD/.env is read. Values
   already present in the environment are never overridden by the file.
3. The auth header is built from BINTU_API_KEY (x-bintu-apikey) or, failing
   that, NANO_API_TOKEN (x-bintu-token). The raw key wins when both are set.

Options:
    public_fallback  no credential -> print a warning, return "" (for scripts
                     that can use the public, keyless bintu stream routes)
    optional_key     no credential -> silently return "" (scripts that never
                     need one, e.g. ffprobe-only probes)
    require_key      insist on the real BINTU_API_KEY (token not enough)
Without any option a missing credential is an error (exit 1), as in env.sh.

The .env parser understands KEY=VALUE lines, optional `export `, single or
double quotes around the value, blank lines and # comments. It does not run
shell code, so a value that env.sh would expand (e.g. $HOME) stays literal.
"""

import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_CANDIDATES = [
    os.path.join(SCRIPT_DIR, ".env"),
    os.path.join(SCRIPT_DIR, "..", ".env"),
    os.path.join(os.getcwd(), ".env"),
]
HINT = "hint: add BINTU_API_KEY=<your orga API key> to a .env next to the scripts (see scripts/.env.example)"

ENV_FILE_DIR = None  # directory the .env was found in (anchors a relative FFPROBE_PATH)


def parse_env_file(path):
    """Return {KEY: VALUE} for a shell-style .env file (no code execution)."""
    values = {}
    with open(path, encoding="utf-8") as fh:
        for raw in fh:
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            if line.startswith("export "):
                line = line[len("export "):].lstrip()
            key, _, value = line.partition("=")
            key = key.strip()
            if not key.replace("_", "").isalnum():
                continue
            value = value.strip()
            if len(value) >= 2 and value[0] == value[-1] and value[0] in ("'", '"'):
                value = value[1:-1]
            elif " #" in value:
                value = value.split(" #", 1)[0].rstrip()
            values[key] = value
    return values


def _load_env_file():
    global ENV_FILE_DIR
    for candidate in ENV_CANDIDATES:
        if os.path.isfile(candidate):
            ENV_FILE_DIR = os.path.dirname(os.path.abspath(candidate))
            for key, value in parse_env_file(candidate).items():
                if not os.environ.get(key):   # empty counts as unset, as in env.sh
                    os.environ[key] = value
            return candidate
    return None


def load(public_fallback=False, optional_key=False, require_key=False):
    """Resolve credentials; return the auth header line ("" when keyless)."""
    if "BINTU_AUTH_HEADER" in os.environ:
        # a bash wrapper already ran env.sh: respect its result and warnings
        return os.environ["BINTU_AUTH_HEADER"]

    if not os.environ.get("BINTU_API_KEY") or not os.environ.get("FFPROBE_PATH"):
        _load_env_file()

    key = os.environ.get("BINTU_API_KEY", "")
    token = os.environ.get("NANO_API_TOKEN", "")

    if require_key and not key:
        print("error: this script needs the real org API key (a NANO_API_TOKEN is not enough here)", file=sys.stderr)
        print(HINT, file=sys.stderr)
        sys.exit(1)

    if key:
        header = f"x-bintu-apikey: {key}"
    elif token:
        header = f"x-bintu-token: {token}"
    else:
        header = ""
        if public_fallback:
            print("warning: neither BINTU_API_KEY nor NANO_API_TOKEN set or found in any .env -- falling back to the public (keyless) bintu stream route", file=sys.stderr)
            print(HINT + " for the authenticated lookup", file=sys.stderr)
        elif not optional_key:
            print("error: neither BINTU_API_KEY nor NANO_API_TOKEN set or found in any .env", file=sys.stderr)
            print(HINT, file=sys.stderr)
            sys.exit(1)

    # ffprobe: a relative FFPROBE_PATH written in .env is anchored to the
    # directory the .env was found in, not the caller's cwd
    ffprobe = os.environ.get("FFPROBE_PATH", "")
    if ffprobe and ENV_FILE_DIR and not os.path.isabs(ffprobe):
        ffprobe = os.path.join(ENV_FILE_DIR, ffprobe)
    os.environ["FFPROBE_PATH"] = ffprobe or "ffprobe"

    os.environ["BINTU_AUTH_HEADER"] = header
    return header


def headers(auth_header):
    """HTTP headers dict for urllib from an auth header line ("" = none)."""
    out = {"content-type": "application/json"}
    if auth_header:
        name, value = auth_header.split(": ", 1)
        out[name] = value
    return out


if __name__ == "__main__":
    # `python3 env.py` -- show what would be resolved, without printing secrets
    hdr = load(optional_key=True)
    print("credential:", hdr.split(":", 1)[0] if hdr else "none")
    print("ffprobe:", os.environ.get("FFPROBE_PATH"))
