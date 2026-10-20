#!/bin/bash

# Creates the USER-LEVEL credential file the nanocosmos skill scripts read:
#   ${XDG_CONFIG_HOME:-$HOME/.config}/nanocosmos/.env
# One path on macOS, Linux and Windows (Git Bash resolves $HOME to the user
# profile, so it is C:\Users\<you>\.config\nanocosmos\.env there). The file
# survives plugin updates, which replace the plugin's install folder.
#
#   bash scripts/init_env.sh                       # seed from scripts/.env.example
#   bash scripts/init_env.sh <other.env.example>…  # also append those blocks,
#       e.g. the analytics skill's scripts/.env.example, or any further
#       .env.example you have been given for the same file
#
# Idempotent: creates the folder and file if missing (mode 600), appends an
# example block only when none of its variables is present yet, never
# overwrites a value, never prints one. Then open the file and fill it in.
#
# Override: NANOCOSMOS_ENV_FILE=<path> targets that file instead (the same
# variable makes the scripts read only that file).

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET="${NANOCOSMOS_ENV_FILE:-${XDG_CONFIG_HOME:-${HOME}/.config}/nanocosmos/.env}"

EXAMPLES=("${SCRIPT_DIR}/.env.example" "$@")
for ex in "${EXAMPLES[@]}"; do
  [ -f "${ex}" ] || { echo "error: example file not found: ${ex}" >&2; exit 1; }
done

if [ ! -f "${TARGET}" ]; then
  mkdir -p "$(dirname "${TARGET}")"
  : > "${TARGET}"
  chmod 600 "${TARGET}" 2>/dev/null || true
  echo "created ${TARGET}"
else
  echo "exists  ${TARGET} (keeping it; only missing blocks are appended)"
fi

for ex in "${EXAMPLES[@]}"; do
  # marker = the example's first required (uncommented) variable, else its
  # first optional one. Shared variables (NANO_API_TOKEN appears in several
  # examples) are deliberately not used as the marker.
  marker="$( { grep -oE '^[A-Z][A-Z0-9_]*=' "${ex}" || true; } | head -1 | tr -d '=')"
  [ -n "${marker}" ] || marker="$( { grep -oE '^#[A-Z][A-Z0-9_]*=' "${ex}" || true; } | head -1 | tr -d '#=')"
  if [ -n "${marker}" ] && grep -qE "^#?${marker}=" "${TARGET}"; then
    echo "skip    ${ex} — ${marker} already present"
    continue
  fi
  {
    [ -s "${TARGET}" ] && printf '\n'
    printf '# ---- from %s ----\n' "${ex}"
    cat "${ex}"
  } >> "${TARGET}"
  echo "added   ${ex}"
done

echo
echo "next: edit ${TARGET} and fill in your values. Never commit or share it."
