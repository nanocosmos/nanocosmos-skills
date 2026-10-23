#!/bin/bash

#Usage :
#Input arg - [stream name]
#Output json - {"type":"single"|"group"|"daisy","push":PUSH_URL,"stream":[...],"note":...}
#
#Bash entry point for get_stream_config.py -- same arguments, output, exit
#codes and warnings; the full documentation is in that file's docstring.
#Credentials are resolved by env.sh (own org API key BINTU_API_KEY or an
#access token NANO_API_TOKEN; keyless fallback to the public stream route
#with a warning when neither is set or the key belongs to another org) and
#handed to the Python implementation. Requires python3.

ENV_SH_PUBLIC_FALLBACK=1
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/env.sh" || exit 1

if ! command -v python3 >/dev/null 2>&1; then
  echo "error: python3 not found (get_stream_config.py needs it)" >&2
  exit 1
fi

exec python3 "${SCRIPT_DIR}/get_stream_config.py" "$@"
