#!/usr/bin/env bash
# Asks every skill its own test questions through `claude -p` and checks the
# answers. One format, two tiers:
#   <skill>/tests/questions.txt            public tier  — ships with the skill
#   <skill>/internal/tests/questions.txt   internal tier — team only, never shipped
#   tests/questions.txt, tests/internal/   cross-skill questions (routing, discovery)
# A question file is plain text, one case per line, TAB-separated:
#   id <TAB> prompt <TAB> expect (regex, case-insensitive, "-" = none) <TAB> never (regex, "-" = none)
# Verdicts: FAIL = "never" matched (or, in the public tier, internal content
# leaked), REVIEW = "expect" not found (read the answer; wording varies), PASS.
#
#   tests/run.sh                       # all questions of the tier found under this repo
#   tests/run.sh --only 02,support     # ids or skill names, comma-separated substrings
#   tests/run.sh --tier public         # public questions only (default: internal if any exist)
#   tests/run.sh --root /path/to/plugin --model haiku --list
#
# Needs: the `claude` CLI; the skills installed for it (plugin or skills root);
# your own credentials where a question runs a script. Each question is a fresh
# session started in a scratch directory. Answers: <out>/<skill>-<id>.md.

set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
MODEL="${SKILL_TEST_MODEL:-sonnet}"; TIMEOUT="${SKILL_TEST_TIMEOUT:-300}"
TIER="auto"; ONLY=""; LIST=""; OUT=""; CWD=""
while [ $# -gt 0 ]; do
  case "$1" in
    --root) ROOT="$(cd "$2" && pwd)"; shift 2 ;;
    --only) ONLY="$2"; shift 2 ;;
    --tier) TIER="$2"; shift 2 ;;
    --model) MODEL="$2"; shift 2 ;;
    --out) OUT="$2"; shift 2 ;;
    --cwd) CWD="$2"; shift 2 ;;
    --leak-file) LEAK_FILE="$2"; shift 2 ;;
    --list) LIST=1; shift ;;
    -h|--help) sed -n 2,21p "$0"; exit 0 ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
done

# Public tier only: a team-maintained list of terms that must never show up in a
# customer-facing answer (tests/internal/leak-patterns.txt in the private repo,
# one extended-regex per line; never shipped). Loaded when present or given.
LEAK_FILE="${LEAK_FILE:-$HERE/internal/leak-patterns.txt}"

FILES="$(find "$ROOT" -name questions.txt -path '*/tests/*' -not -path '*/node_modules/*' -not -path '*/publish/*' -not -path '*/dist/*' | sort)"
if [ "$TIER" = "auto" ]; then
  echo "$FILES" | grep -q '/internal/' && TIER="internal" || TIER="public"
fi
[ "$TIER" = "public" ] && FILES="$(echo "$FILES" | grep -v '/internal/')"
[ -n "$FILES" ] || { echo "error: no tests/questions.txt found under $ROOT" >&2; exit 1; }

skill_of() {  # path -> skill label
  local rel="${1#$ROOT/}"; rel="${rel%/questions.txt}"; rel="${rel%/tests}"
  # label = skill folder name (the public repo nests skills under skills/nanocosmos/)
  case "$rel" in tests) echo "all" ;; tests/internal) echo "all-internal" ;; */internal) echo "$(basename "${rel%/internal}")-internal" ;; *) echo "$(basename "$rel")" ;; esac
}
wanted() {  # id skill -> 0 if selected
  [ -z "$ONLY" ] && return 0
  local sel; IFS=',' read -ra sel <<< "$ONLY"
  for s in "${sel[@]}"; do [[ "$1" == *"$s"* || "$2" == *"$s"* ]] && return 0; done; return 1
}

if [ -n "$LIST" ]; then
  for f in $FILES; do sk="$(skill_of "$f")"; grep -v '^#' "$f" | grep -v '^\s*$' | awk -F'\t' -v s="$sk" '{printf "  %-28s %s  %s\n", s, $1, $2}'; done
  echo "tier: $TIER"; exit 0
fi

command -v claude >/dev/null || { echo "error: claude CLI not on PATH" >&2; exit 1; }
LEAK=""
if [ "$TIER" = "public" ] && [ -f "$LEAK_FILE" ]; then
  LEAK="$(grep -v '^#' "$LEAK_FILE" | grep -v '^\s*$' | paste -sd'|' -)"
fi
OUT="${OUT:-${TMPDIR:-/tmp}/nanocosmos-skill-tests/$(date -u +%Y%m%dT%H%M%SZ)}"; mkdir -p "$OUT"
CWD="${CWD:-$(mktemp -d)}"
SUMMARY="$OUT/summary.txt"
echo "skill tests  tier=$TIER  model=$MODEL  root=$ROOT  leak-scan=$([ -n "$LEAK" ] && echo on || echo off)  $(date -u +%FT%TZ)" | tee "$SUMMARY"; echo | tee -a "$SUMMARY"

N=0; FAILS=0; REVIEWS=0
for f in $FILES; do
  sk="$(skill_of "$f")"
  while IFS=$'\t' read -r id prompt expect never; do
    [ -z "$id" ] || [ "${id:0:1}" = "#" ] && continue
    wanted "$id" "$sk" || continue
    N=$((N+1)); label="$sk-$id"
    printf '%-34s %s\n' "$label" "$(printf '%s' "$prompt" | cut -c1-80)"
    md="$OUT/$label.md"
    { echo "# $label"; echo; echo "**prompt:** $prompt"; echo; echo "**expect:** \`$expect\`  **never:** \`$never\`  **tier:** $TIER"; echo; echo "---"; echo; } > "$md"
    start=$(date +%s)
    answer=$(cd "$CWD" && timeout "$TIMEOUT" claude -p "$prompt" --model "$MODEL" --allowedTools "Bash,Read,Glob,Grep,Skill" --output-format text 2>"$OUT/$label.stderr" || echo "[runner: claude -p failed or timed out after ${TIMEOUT}s — see $label.stderr]")
    secs=$(( $(date +%s) - start )); printf '%s\n' "$answer" >> "$md"
    verdict="PASS"; why=""
    if [ "$never" != "-" ] && hit=$(printf '%s' "$answer" | grep -oiE -e "$never" | head -1) && [ -n "$hit" ]; then
      verdict="FAIL"; why="never-pattern hit: '$hit'"
    elif [ -n "$LEAK" ] && hit=$(printf '%s' "$answer" | grep -oiE -e "$LEAK" | head -1) && [ -n "$hit" ]; then
      verdict="FAIL"; why="internal content in a public answer: '$hit'"
    elif [ "$expect" != "-" ] && ! printf '%s' "$answer" | grep -qiE -e "$expect"; then
      verdict="REVIEW"; why="expected pattern not found: $expect"
    fi
    [ "$verdict" = "FAIL" ] && FAILS=$((FAILS+1)); [ "$verdict" = "REVIEW" ] && REVIEWS=$((REVIEWS+1))
    printf '  [%s] %ss %s\n' "$verdict" "$secs" "$why" | tee -a "$SUMMARY"
    printf '%-34s %s\n' "$label" "$(printf '%s' "$prompt" | cut -c1-60)" >> "$SUMMARY"
    { echo; echo "---"; echo "**verdict:** $verdict ${why:+— $why} (${secs}s, $MODEL)"; } >> "$md"
  done < "$f"
done
echo | tee -a "$SUMMARY"
echo "questions: $N  fail: $FAILS  review: $REVIEWS  -> $OUT" | tee -a "$SUMMARY"
exit $(( FAILS > 0 ))
