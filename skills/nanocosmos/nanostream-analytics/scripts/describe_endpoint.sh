#!/bin/bash

# Print the parameters and description of an Analytics API route, read from the
# bundled OpenAPI spec. No network, no credentials needed.
#
#   bash scripts/describe_endpoint.sh /v2/h5live/playtime/timeseries
#   bash scripts/describe_endpoint.sh playtime            # substring search
#   bash scripts/describe_endpoint.sh --list              # all routes
#   bash scripts/describe_endpoint.sh <path> --example    # + full response example
#
# Prints parameters AND the response shape, so you can see what a route returns
# without spending a call to find out.
#
# Use this instead of guessing parameters — the spec is the source of truth and
# is versioned with the skill (references/openapi_v2.json). It covers the
# 77 customer-facing routes.

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Offline and credential-free: env.sh is sourced only for ${PY} (and a
# PYTHON= pin in .env, if any) — the missing-credentials error is skipped.
ENV_SH_OPTIONAL_CREDS=1
source "${SCRIPT_DIR}/env.sh"
SPEC="$(cd "${SCRIPT_DIR}/../references" && pwd)/openapi_v2.json"

if [ ! -f "${SPEC}" ]; then
  echo "error: spec not found at ${SPEC}" >&2
  exit 1
fi

if [ $# -lt 1 ]; then
  echo "usage: describe_endpoint.sh <path|substring|--list> [--example]" >&2
  exit 1
fi

# The route is handed over WITHOUT its leading slash, and in the environment.
#
# Git Bash (MSYS) rewrites anything that looks like an absolute POSIX path into
# a Windows path when it spawns a native binary — so '/v2/usage/bytes/timeseries'
# reached python.exe as 'C:/Program Files/Git/v2/usage/bytes/timeseries' and
# never matched. This applies to argv entries AND to environment values, and it
# happens at the python call, so normalising in bash beforehand does not help.
# A relative value is left alone, hence stripping the slash; python puts it back.
# SPEC stays in argv on purpose — it is a real path and does need converting.
#
# The case below is belt-and-braces for a value that arrived pre-mangled.
NEEDLE="$1"
case "${NEEDLE}" in
  /v2/*) ;;
  */v2/*) NEEDLE="/v2/${NEEDLE#*/v2/}" ;;
esac
NEEDLE="${NEEDLE#/}"

NEEDLE="${NEEDLE}" EXAMPLE_FLAG="${2:-}" "${PY}" - "${SPEC}" <<'PY'
import sys, os, json, signal

# allow piping into head/less without a BrokenPipeError traceback
try:
    signal.signal(signal.SIGPIPE, signal.SIG_DFL)
except (AttributeError, ValueError):
    pass

# encoding pinned: the default is cp1252 on Windows, which cannot decode the spec
spec = json.load(open(sys.argv[1], encoding='utf-8'))
needle = os.environ.get('NEEDLE', '')
# the caller stripped the leading slash so Git Bash would not rewrite the value
if needle.startswith('v2/'):
    needle = '/' + needle
show_example = os.environ.get('EXAMPLE_FLAG', '') == '--example'
comps = spec.get('components', {}).get('parameters', {})
schemas = spec.get('components', {}).get('schemas', {})


def deref(node, depth=0):
    if isinstance(node, dict) and '$ref' in node and depth < 12:
        name = node['$ref'].split('/')[-1]
        return deref(schemas.get(name, {}), depth + 1)
    return node or {}


def walk(node, indent=0, depth=0):
    """Flatten a response schema into readable field lines."""
    node = deref(node)
    out = []
    if depth > 6:
        return out
    t = node.get('type')
    if t == 'object' or 'properties' in node:
        for name, sub in (node.get('properties') or {}).items():
            sub = deref(sub)
            st = sub.get('type', 'object')
            desc = (sub.get('description') or '').strip().replace(chr(10), ' ')
            enum = sub.get('enum')
            suffix = ''
            if enum:
                suffix = ' enum=%s' % (enum[:6],)
            elif desc:
                suffix = '  # %s' % desc[:70]
            out.append('%s%s: %s%s' % ('  ' * indent, name, st, suffix))
            if st in ('object', 'array') or 'properties' in sub:
                out.extend(walk(sub, indent + 1, depth + 1))
    elif t == 'array':
        items = deref(node.get('items'))
        if items.get('properties'):
            out.append('%s[]' % ('  ' * indent))
            out.extend(walk(items, indent + 1, depth + 1))
        else:
            out.append('%s[] of %s' % ('  ' * indent, items.get('type', 'any')))
    return out


def resolve(p):
    return comps[p['$ref'].split('/')[-1]] if '$ref' in p else p


paths = spec['paths']

if needle == '--list':
    for p in sorted(paths):
        methods = ','.join(m.upper() for m in paths[p] if m in
                           ('get', 'post', 'put', 'delete', 'patch'))
        print('%-6s %s' % (methods, p))
    sys.exit(0)

matches = [p for p in paths if needle == p] or \
          [p for p in sorted(paths) if needle.lower() in p.lower()]

if not matches:
    print("no route matching '%s' — try --list" % needle)
    sys.exit(1)

for p in matches:
    for method, op in paths[p].items():
        if method not in ('get', 'post', 'put', 'delete', 'patch'):
            continue
        print('=' * 72)
        print('%s %s' % (method.upper(), p))
        if op.get('summary'):
            print('  %s' % op['summary'])
        desc = (op.get('description') or '').strip()
        if desc:
            for line in desc.splitlines():
                line = line.strip()
                if line and not line.startswith('```') and not line.startswith('http'):
                    print('  %s' % line)
        params = [resolve(x) for x in op.get('parameters', [])]
        if params:
            print('  parameters:')
            for pr in params:
                schema = pr.get('schema', {})
                flag = 'required' if pr.get('required') else 'optional'
                enum = schema.get('enum')
                extra = ' enum=%s' % enum if enum else ''
                print('    %-16s %-8s %-7s%s'
                      % (pr.get('name'), flag, schema.get('type', ''), extra))
                d = (pr.get('description') or '').strip().replace('\n', ' ')
                if d:
                    print('        %s' % d[:200])
        if op.get('requestBody'):
            print('  requestBody: yes (write route — not exposed by this skill)')

        # response shape — saves a call just to find out what comes back
        for code in sorted(op.get('responses') or {}):
            r = op['responses'][code]
            content = (r.get('content') or {}).get('application/json') or {}
            schema = content.get('schema')
            if not schema or not code.startswith('2'):
                continue
            print('  response %s:' % code)
            for line in walk(schema):
                print('    %s' % line)
            if show_example:
                ex = content.get('example')
                if ex is None:
                    exs = content.get('examples') or {}
                    ex = (list(exs.values())[0] or {}).get('value') if exs else None
                if ex is not None:
                    print('  example:')
                    for line in json.dumps(ex, indent=2).splitlines()[:60]:
                        print('    %s' % line)
        print()
PY
