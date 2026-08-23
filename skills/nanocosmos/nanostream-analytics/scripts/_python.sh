#!/bin/bash

# Sets and exports PY — the command that runs Python 3 on this machine.
# Sourced by env.sh on Windows (Git Bash / MSYS / Cygwin) only; on
# macOS/Linux env.sh uses plain python3 and this file is not needed.
#
# Why this exists: on Windows, `python3` usually resolves to the Microsoft
# Store execution alias in WindowsApps. It is on PATH and `command -v` finds
# it, but it is not an interpreter — it just prints an install hint and fails.
# So every candidate is *executed* rather than merely looked up.
#
# Override explicitly if the detection picks the wrong one:
#   PYTHON=/c/Python313/python.exe

if [ -z "${PY:-}" ]; then
  if [ -n "${PYTHON:-}" ]; then
    PY="${PYTHON}"
  else
    for CANDIDATE in python3 python py; do
      if command -v "${CANDIDATE}" >/dev/null 2>&1 &&
         "${CANDIDATE}" -c 'import sys; sys.exit(0 if sys.version_info[0] == 3 else 1)' >/dev/null 2>&1; then
        PY="${CANDIDATE}"
        break
      fi
    done
  fi
fi

if [ -z "${PY:-}" ]; then
  echo "error: no working Python 3 found (tried python3, python, py)" >&2
  echo "hint: install Python 3, or set PYTHON=/path/to/python.exe in .env" >&2
  echo "note: on Windows, 'python3' is often the Microsoft Store stub, not a real interpreter" >&2
  return 1 2>/dev/null || exit 1
fi

# Force UTF-8 for file reads and stdio. On Windows the default locale encoding
# is cp1252, and the bundled spec (references/openapi_v2.json) contains UTF-8
# bytes it cannot decode — describe_endpoint.sh died with a UnicodeDecodeError
# before this. Harmless on macOS/Linux, where UTF-8 is already the default.
export PYTHONUTF8=1
export PYTHONIOENCODING=utf-8

export PY
