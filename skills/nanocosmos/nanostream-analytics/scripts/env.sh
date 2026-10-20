#!/bin/bash

# Ensures ANALYTICS_EMAIL and ANALYTICS_PASSWORD are set, exports
# ANALYTICS_BASE, and locates a working Python 3 (exported as PY).
# Source this from other scripts:
#   source "$(dirname "${BASH_SOURCE[0]}")/env.sh"
#
# The Analytics API has no API-key auth — it takes the credentials of an
# Analytics dashboard account and issues a short-lived JWT. Use a READ-ONLY
# account: the scripts here only ever issue GET requests, but the credential
# itself may be able to do more.
#
# If the variables aren't already in the environment, they are loaded from the
# first .env found among: <script dir>/.env, <script dir>/../.env, the
# USER-LEVEL file ~/.config/nanocosmos/.env (RECOMMENDED; honours
# XDG_CONFIG_HOME; same path on macOS, Linux and Windows/Git Bash), $PWD/.env.
# NANOCOSMOS_ENV_FILE=<path> makes that file the only one read. The file is
# shared with the nanoStream diagnostics/support skill, whose
# scripts/init_env.sh creates it (pass this skill's scripts/.env.example to
# append the analytics block).
#
# The repo-root .env is gitignored and lies outside every skill folder, so it
# can never be committed or shipped in a skill-upload zip -- and it stays
# repo-relative, so non-Claude tools using this repo find it too. The
# user-level file survives plugin updates, which replace the install folder.
#
# Set ENV_SH_OPTIONAL_CREDS=1 before sourcing to skip the missing-credentials
# error -- for scripts that only need PY / the .env-provided PYTHON override
# and never talk to the API.

ENV_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# --- PY = the command that runs Python 3 -------------------------------------
# On Windows (Git Bash / MSYS / Cygwin), plain `python3` usually resolves to
# the Microsoft Store execution alias — on PATH but not an interpreter — so
# _python.sh probes candidates by actually executing them. Everywhere else,
# python3 (or a PYTHON= override from the environment / .env) just works.
case "$(uname -s)" in
  MINGW*|MSYS*|CYGWIN*)
    source "${ENV_SCRIPT_DIR}/_python.sh" || { return 1 2>/dev/null || exit 1; }
    ;;
  *)
    PY="${PY:-${PYTHON:-python3}}"
    export PY
    ;;
esac

# Force UTF-8 for file reads and stdio. On Windows the default locale encoding
# is cp1252, and the bundled spec (references/openapi_v2.json) contains UTF-8
# bytes it cannot decode — describe_endpoint.sh died with a UnicodeDecodeError
# before this. Harmless on macOS/Linux, where UTF-8 is already the default.
export PYTHONUTF8=1
export PYTHONIOENCODING=utf-8

# --- credentials -------------------------------------------------------------
# NANO_API_TOKEN (an access token minted via the Cloud Token Service, with
# the `metrics` audience) is accepted as an alternative to email/password —
# recommended best practice for services and automation, since it expires and
# carries no login. The same token drives the bintu API scripts too.
if [ -z "${NANO_API_TOKEN:-}" ] && { [ -z "${ANALYTICS_EMAIL:-}" ] || [ -z "${ANALYTICS_PASSWORD:-}" ]; }; then
  if [ -n "${NANOCOSMOS_ENV_FILE:-}" ]; then
    _ENV_CANDIDATES=("${NANOCOSMOS_ENV_FILE}")
  else
    _ENV_CANDIDATES=("${ENV_SCRIPT_DIR}/.env" "${ENV_SCRIPT_DIR}/../.env" "${XDG_CONFIG_HOME:-${HOME}/.config}/nanocosmos/.env" "${PWD}/.env")
  fi
  for CANDIDATE in "${_ENV_CANDIDATES[@]}"; do
    if [ -f "${CANDIDATE}" ]; then
      # set -a exports everything the .env defines, so child processes
      # (e.g. the Python steps in query.sh) see the values too
      set -a
      source "${CANDIDATE}"
      set +a
      break
    fi
  done
  unset _ENV_CANDIDATES
fi

# The .env may have pinned PYTHON= — honour it if the auto-detection above ran
# before the .env was read and the pin differs.
if [ -n "${PYTHON:-}" ] && [ "${PY}" != "${PYTHON}" ]; then
  PY="${PYTHON}"
  export PY
fi

# Guarantee the values are exported even when they came from the parent shell
# (plain `if` rather than `&&`, so a false test cannot trip `set -e`
# in a caller and skip the friendly error message below)
if [ -n "${ANALYTICS_EMAIL:-}" ]; then export ANALYTICS_EMAIL; fi
if [ -n "${ANALYTICS_PASSWORD:-}" ]; then export ANALYTICS_PASSWORD; fi
if [ -n "${NANO_API_TOKEN:-}" ]; then export NANO_API_TOKEN; fi

# The metrics API and bintu share one user database — the Analytics login IS
# the nanoStream (bintu dashboard) login. NANOSTREAM_EMAIL/NANOSTREAM_PASSWORD
# are the unified names and take precedence when both are set; ANALYTICS_*
# keeps working as the fallback for anyone who only has the older name set.
# (Matches nanostream-support/scripts/create_access_token.sh's
# ${NANOSTREAM_EMAIL:-${ANALYTICS_EMAIL}} precedence — the two used to
# disagree, which meant setting both could silently authenticate as two
# different accounts depending on which script ran.)
if [ -n "${NANOSTREAM_EMAIL:-}" ]; then
  ANALYTICS_EMAIL="${NANOSTREAM_EMAIL}"; export ANALYTICS_EMAIL
fi
if [ -n "${NANOSTREAM_PASSWORD:-}" ]; then
  ANALYTICS_PASSWORD="${NANOSTREAM_PASSWORD}"; export ANALYTICS_PASSWORD
fi

ANALYTICS_BASE="${ANALYTICS_BASE:-https://metrics-api.nanostream.cloud}"
export ANALYTICS_BASE

# Path of the JWT cache. get_token.sh writes it, and writes the account
# metadata reported by /authenticate to the same path plus '.tier'; whoami.sh
# reads that sidecar. Defined here, in the one file both of them source, so
# the two sides cannot drift apart — a mismatched path would silently fall
# back to JWT decoding.
analytics_token_cache_path() {
  printf '%s/nsc-analytics-token-%s-%s' \
    "${TMPDIR:-/tmp}" \
    "$(id -u)" \
    "$(printf '%s' "${ANALYTICS_EMAIL}${ANALYTICS_BASE}" | cksum | cut -d' ' -f1)"
}

if [ -z "${NANO_API_TOKEN:-}" ] && { [ -z "${ANALYTICS_EMAIL:-}" ] || [ -z "${ANALYTICS_PASSWORD:-}" ]; }; then
  if [ -z "${ENV_SH_OPTIONAL_CREDS:-}" ]; then
    echo "error: neither NANO_API_TOKEN nor ANALYTICS_EMAIL / ANALYTICS_PASSWORD set or found in any .env" >&2
    echo "hint: add them to ~/.config/nanocosmos/.env or a .env next to the scripts (see scripts/.env.example)" >&2
    return 1 2>/dev/null || exit 1
  fi
fi
