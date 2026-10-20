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
# root), the USER-LEVEL file ~/.config/nanocosmos/.env (RECOMMENDED; honours
# XDG_CONFIG_HOME; same path on macOS, Linux and Windows/Git Bash), $PWD/.env.
# NANOCOSMOS_ENV_FILE=<path> makes that file the only one read (CI, services,
# switching organisations). scripts/init_env.sh creates the user-level file,
# which survives plugin updates. Never commit a .env.
#
# Set ENV_SH_OPTIONAL_KEY=1 before sourcing to skip the missing-BINTU_API_KEY
# error -- used by probe_stream_unsecure.sh (needs .env for FFPROBE_PATH but
# never touches BINTU_API_KEY) and get_stream_info.sh (public route only).
#
# Set ENV_SH_PUBLIC_FALLBACK=1 before sourcing for scripts that can fall back
# to the public, keyless bintu stream routes (GET /stream/<name> and
# GET /stream/<name>/group): a missing credential then only prints a WARNING
# on stderr and leaves BINTU_AUTH_HEADER empty -- the script must cope with
# an empty header. Used by get_stream_config.sh.
#
# Python scripts use env.py, which mirrors this file; when a bash wrapper has
# already sourced env.sh, env.py picks up the exported BINTU_AUTH_HEADER and
# does not repeat the lookup or the warning.

ENV_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -z "${BINTU_API_KEY}" ] || [ -z "${FFPROBE_PATH}" ]; then
  # a credential the caller already set wins over the .env file -- e.g.
  # BINTU_API_KEY="$KEY" bash scripts/get_stream_config.sh ... or a wrapper
  # that sets the key per call must not be overridden by the repo-root .env
  _PRESET_BINTU_API_KEY="${BINTU_API_KEY}"
  _PRESET_NANO_API_TOKEN="${NANO_API_TOKEN}"
  if [ -n "${NANOCOSMOS_ENV_FILE}" ]; then
    _ENV_CANDIDATES=("${NANOCOSMOS_ENV_FILE}")
  else
    _ENV_CANDIDATES=("${ENV_SCRIPT_DIR}/.env" "${ENV_SCRIPT_DIR}/../.env" "${XDG_CONFIG_HOME:-${HOME}/.config}/nanocosmos/.env" "${PWD}/.env")
  fi
  for CANDIDATE in "${_ENV_CANDIDATES[@]}"; do
    if [ -f "${CANDIDATE}" ]; then
      ENV_FILE_DIR="$(cd "$(dirname "${CANDIDATE}")" && pwd)"
      # set -a exports everything the .env defines, so child processes
      # (e.g. get_stream_config.py / parse_probe_output.py) see the keys too
      set -a
      source "${CANDIDATE}"
      set +a
      break
    fi
  done
  [ -n "${_PRESET_BINTU_API_KEY}" ] && BINTU_API_KEY="${_PRESET_BINTU_API_KEY}"
  [ -n "${_PRESET_NANO_API_TOKEN}" ] && NANO_API_TOKEN="${_PRESET_NANO_API_TOKEN}"
  unset _PRESET_BINTU_API_KEY _PRESET_NANO_API_TOKEN _ENV_CANDIDATES
fi

# Guarantee the values are exported even when they came from the parent shell
if [ -n "${BINTU_API_KEY}" ]; then
  export BINTU_API_KEY
fi
if [ -n "${NANO_API_TOKEN}" ]; then
  export NANO_API_TOKEN
fi

# NANO_API_TOKEN — an expiring access token minted via the Cloud Token
# Service (scripts/create_access_token.sh; aud must include `bintu`) — is
# accepted as an alternative to the raw API key on all bintu read routes,
# and is the recommended best practice wherever the credential leaves your
# shell. BINTU_AUTH_HEADER carries whichever credential is available, as a
# complete header line for curl:  --header "${BINTU_AUTH_HEADER}"
# The raw API key wins when both are set (it can do strictly more).
#
# Set ENV_SH_REQUIRE_KEY=1 before sourcing for scripts that need the real
# API key even when a token exists — e.g. minting tokens via CTS, which
# authenticates with x-bintu-apikey only.
if [ -n "${BINTU_API_KEY}" ]; then
  BINTU_AUTH_HEADER="x-bintu-apikey: ${BINTU_API_KEY}"
elif [ -n "${NANO_API_TOKEN}" ]; then
  BINTU_AUTH_HEADER="x-bintu-token: ${NANO_API_TOKEN}"
else
  BINTU_AUTH_HEADER=""
fi
export BINTU_AUTH_HEADER

if [ -n "${ENV_SH_REQUIRE_KEY}" ] && [ -z "${BINTU_API_KEY}" ]; then
  echo "error: this script needs the real org API key (a NANO_API_TOKEN is not enough here)" >&2
  echo "hint: add BINTU_API_KEY=<your orga API key> to ~/.config/nanocosmos/.env or a .env next to the scripts (see scripts/.env.example; scripts/init_env.sh creates it)" >&2
  return 1 2>/dev/null || exit 1
fi

if [ -z "${BINTU_API_KEY}" ] && [ -z "${NANO_API_TOKEN}" ] && [ -z "${ENV_SH_OPTIONAL_KEY}" ]; then
  if [ -n "${ENV_SH_PUBLIC_FALLBACK}" ]; then
    echo "warning: neither BINTU_API_KEY nor NANO_API_TOKEN set or found in any .env -- falling back to the public (keyless) bintu stream route" >&2
    echo "hint: add BINTU_API_KEY=<your orga API key> to ~/.config/nanocosmos/.env or a .env next to the scripts (see scripts/.env.example; scripts/init_env.sh creates it) for the authenticated lookup" >&2
  else
    echo "error: neither BINTU_API_KEY nor NANO_API_TOKEN set or found in any .env" >&2
    echo "hint: add BINTU_API_KEY=<your orga API key> to ~/.config/nanocosmos/.env or a .env next to the scripts (see scripts/.env.example; scripts/init_env.sh creates it)" >&2
    return 1 2>/dev/null || exit 1
  fi
fi

# ffprobe is needed by the probe_stream_*.sh scripts only. A relative
# FFPROBE_PATH (as commonly written in .env) is anchored to the directory
# .env was found in -- not the caller's $PWD -- so those scripts work from
# any directory.
if [ -n "${FFPROBE_PATH}" ] && [ -n "${ENV_FILE_DIR}" ] && [[ "${FFPROBE_PATH}" != /* ]]; then
  FFPROBE_PATH="${ENV_FILE_DIR}/${FFPROBE_PATH}"
fi
FFPROBE_PATH="${FFPROBE_PATH:-ffprobe}"
export FFPROBE_PATH
