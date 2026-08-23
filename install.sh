#!/usr/bin/env bash
# Install skills into an AI assistant's skills directory (Claude Code layout).
#
# Usage:
#   ./install.sh                          # interactive
#   ./install.sh --all --user             # all skills -> ~/.claude/skills/
#   ./install.sh nanostream --project     # one skill  -> ./.claude/skills/
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
SRC="$HERE/skills"
# Skills are organized under skills/nanocosmos/<name>/ in this repo, but the
# assistant discovers skills only directly under its skills root — so the
# install FLATTENS: each skill lands at <skills-root>/<name>/.
ALL_SKILLS=()
SKILL_PATHS=()
while IFS= read -r f; do
  d="$(dirname "$f")"
  ALL_SKILLS+=("$(basename "$d")")
  SKILL_PATHS+=("$d")
done < <(find "$SRC" -mindepth 2 -maxdepth 3 -name SKILL.md | sort)

path_for_skill() {
  local i
  for i in "${!ALL_SKILLS[@]}"; do
    if [ "${ALL_SKILLS[$i]}" = "$1" ]; then printf '%s' "${SKILL_PATHS[$i]}"; return 0; fi
  done
  return 1
}

SCOPE=""
CHOSEN=()
for arg in "$@"; do
  case "$arg" in
    --user) SCOPE="$HOME/.claude/skills" ;;
    --project) SCOPE="$PWD/.claude/skills" ;;
    --all) CHOSEN=("${ALL_SKILLS[@]}") ;;
    -h|--help) sed -n "2,7p" "$0"; exit 0 ;;
    *) CHOSEN+=("$arg") ;;
  esac
done

if [ ${#CHOSEN[@]} -eq 0 ]; then
  echo "Available skills:"
  printf '  %s\n' "${ALL_SKILLS[@]}"
  read -r -p "Install which skills? (space-separated, or 'all'): " ans
  if [ "$ans" = "all" ]; then CHOSEN=("${ALL_SKILLS[@]}"); else read -r -a CHOSEN <<<"$ans"; fi
fi
if [ -z "$SCOPE" ]; then
  read -r -p "Install for [u]ser (~/.claude/skills) or [p]roject (./.claude/skills)? " s
  case "$s" in p*) SCOPE="$PWD/.claude/skills" ;; *) SCOPE="$HOME/.claude/skills" ;; esac
fi

mkdir -p "$SCOPE"
for skill in "${CHOSEN[@]}"; do
  if ! SKILL_DIR="$(path_for_skill "$skill")"; then
    echo "error: unknown skill '$skill'" >&2; exit 1
  fi
  rm -rf "${SCOPE:?}/$skill"
  cp -R "$SKILL_DIR" "$SCOPE/$skill"
  echo "installed $skill -> $SCOPE/$skill"
done
echo "done. Restart your assistant session to pick up new skills."
echo "note: a .env with credentials is NOT copied — set one up per the skill's SKILL.md."
