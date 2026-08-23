#!/usr/bin/env python3
"""Decode and validate a nanoStream playback JWT.

Usage:
    check_jwt_token.py <jwt>

Decodes the token payload (no signature check -- that requires the server
key) and validates its time claims. Prints the decoded claims plus a
VALID / EXPIRED / NOT-YET-VALID verdict with human-readable UTC dates.

Exit codes: 0 = valid, 1 = expired or not yet valid, 2 = malformed input.

Needs no API key, stdlib only. Bash variant with identical behavior:
check_jwt_token.sh.
"""

import base64
import json
import sys
import time
from datetime import datetime, timezone


def ts_to_date(ts: int) -> str:
    return datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")


def main() -> int:
    if len(sys.argv) != 2:
        print(f"usage: {sys.argv[0]} <jwt>", file=sys.stderr)
        return 2

    parts = sys.argv[1].split(".")
    if len(parts) != 3:
        print("error: not a JWT (expected three dot-separated base64url parts)", file=sys.stderr)
        return 2

    try:
        payload = parts[1]
        claims = json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))
    except (ValueError, json.JSONDecodeError):
        print("error: payload is not valid base64url JSON", file=sys.stderr)
        return 2

    print(json.dumps(claims, indent=2))
    print("---")

    now = int(time.time())
    nbf = claims.get("nbf")
    exp = claims.get("exp")

    if nbf is not None and now < nbf:
        print(f"NOT-YET-VALID: nbf is {ts_to_date(nbf)}")
        return 1

    if exp is None:
        print("WARNING: no exp claim found")
        return 2

    if now >= exp:
        print(f"EXPIRED: exp was {ts_to_date(exp)}")
        return 1

    left = exp - now
    print(f"VALID: expires {ts_to_date(exp)} ({left // 3600}h {left % 3600 // 60}m left)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
