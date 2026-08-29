#!/usr/bin/env bash
# Read the Jira credentials out of .squad/secrets.yaml (gitignored) and call the
# REST API. The token is folded across two lines there, so this joins them
# rather than grepping a single line — an earlier one-liner silently produced an
# empty token and a 000 response.
set -euo pipefail
cd "$(dirname "$0")/.."
eval "$(python3 - <<'PY'
import re, shlex
raw = open('.squad/secrets.yaml').read()
block = raw.split('jira:', 1)[1]
def val(key):
    m = re.search(rf'^\s*{key}:\s*(.*?)(?=^\s*\w+:)', block, re.S | re.M)
    parts = m.group(1).split()
    # The token is written as a YAML folded scalar, so its first "word" is the
    # `>-` indicator rather than part of the value. Gluing that on produced a
    # token that authenticated as nobody: Jira answered 200 with an empty
    # search and "issue does not exist" rather than 401, which reads like a
    # permissions problem and is not one.
    if parts and parts[0] in ('>', '>-', '|', '|-', '>+', '|+'):
        parts = parts[1:]
    return ''.join(parts)
for k in ('host', 'email', 'token'):
    print(f'JIRA_{k.upper()}={shlex.quote(val(k))}')
PY
)"
method="$1"; path="$2"; shift 2
curl -sS -u "$JIRA_EMAIL:$JIRA_TOKEN" -X "$method" \
  -H 'Content-Type: application/json' "https://$JIRA_HOST/rest/api/3$path" "$@"
