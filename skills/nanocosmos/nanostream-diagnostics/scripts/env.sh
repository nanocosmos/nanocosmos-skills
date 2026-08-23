#!/bin/bash

# Ensures BINTU_API_KEY is set. Source this from other scripts:
#   source "$(dirname "${BASH_SOURCE[0]}")/env.sh"
#
# BINTU_API_KEY is YOUR organisation's bintu API key
# (Dashboard -> Organisation -> API Keys). It only grants access to
# streams of your own organisation -- this is the public API tier;
# no admin credentials are used anywhere in these scripts.
#
# If BINTU_API_KEY isn't already in the environment, it is loaded from the
# first .env found among: <script dir>/.env, <script dir>/../.env (the skill
# root), $PWD/.env. Never commit a .env.
#
# Set ENV_SH_OPTIONAL_KEY=1 before sourcing to skip the missing-BINTU_API_KEY
# error -- used by check_gop_unsecure.sh, which needs .env for FFPROBE_PATH
# but never touches BINTU_API_KEY.

ENV_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -z "${BINTU_API_KEY}" ] || [ -z "${FFPROBE_PATH}" ]; then
  for CANDIDATE in "${ENV_SCRIPT_DIR}/.env" "${ENV_SCRIPT_DIR}/../.env" "${PWD}/.env"; do
    if [ -f "${CANDIDATE}" ]; then
      ENV_FILE_DIR="$(cd "$(dirname "${CANDIDATE}")" && pwd)"
      # set -a exports everything the .env defines, so child processes
      # (e.g. the python3 step in get_stream_config.sh) see the keys too
      set -a
      source "${CANDIDATE}"
      set +a
      break
    fi
  done
fi

# Guarantee the key is exported even when it came from the parent shell
if [ -n "${BINTU_API_KEY}" ]; then
  export BINTU_API_KEY
fi

if [ -z "${BINTU_API_KEY}" ] && [ -z "${ENV_SH_OPTIONAL_KEY}" ]; then
  echo "error: BINTU_API_KEY not set and not found in any .env" >&2
  echo "hint: add BINTU_API_KEY=<your orga API key> to a .env next to the scripts (see scripts/.env.example)" >&2
  return 1 2>/dev/null || exit 1
fi

# ffprobe is needed by the GOP check scripts only. A relative FFPROBE_PATH
# (as commonly written in .env) is anchored to the directory .env was found
# in -- not the caller's $PWD -- so the GOP scripts work from any directory.
if [ -n "${FFPROBE_PATH}" ] && [ -n "${ENV_FILE_DIR}" ] && [[ "${FFPROBE_PATH}" != /* ]]; then
  FFPROBE_PATH="${ENV_FILE_DIR}/${FFPROBE_PATH}"
fi
FFPROBE_PATH="${FFPROBE_PATH:-ffprobe}"
export FFPROBE_PATH
