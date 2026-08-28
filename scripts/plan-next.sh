#!/bin/zsh
# Generate the plan for the next story whose intake exists and whose plan does
# not. Run by a LaunchAgent so a quota window that opens while nobody is at the
# keyboard is not a window that is missed.
#
# It plans and stops. Reviewing the plan and building from it stay with a
# person and a session — those are the two gates, and every story so far has
# had something caught at one of them.
set -u
cd /Users/mazen/Developer/projects/learning/crm/support-desk || exit 1

# --dry says what WOULD be planned and stops. It exists because asking the
# question by running the script spends the quota answering it, which is what
# happened the first time somebody wanted to know.
DRY=0
[ "${1:-}" = "--dry" ] && DRY=1
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.local/bin:$PATH"

# One planner at a time. The three firing times are a retry, not a fan-out: a
# plan takes minutes, so 09:15 is still running when 09:45 arrives, and two
# runs of `squad new-plan` on one intake spend the quota twice to produce a
# duplicate. mkdir is the atomic test-and-set; a stale lock older than an hour
# is a crashed run, not a live one.
LOCK=/tmp/crm-plan.lock
if [ -d "$LOCK" ] && [ -z "$(find "$LOCK" -maxdepth 0 -mmin +60 2>/dev/null)" ]; then
  echo "[$(date '+%F %T')] another planner holds the lock — skipping"
  exit 0
fi
rmdir "$LOCK" 2>/dev/null
if ! mkdir "$LOCK" 2>/dev/null; then
  echo "[$(date '+%F %T')] lost the lock race — skipping"
  exit 0
fi
trap 'rmdir "$LOCK" 2>/dev/null' EXIT INT TERM

for intake in .squad/stories/*/CRM-*/intake.md; do
  key=$(basename "$(dirname "$intake")")            # CRM-47
  if ls .squad/plans/*/ 2>/dev/null | grep -qi "story-${key}.md"; then continue; fi
  if [ "$DRY" = "1" ]; then
    echo "[$(date '+%F %T')] would plan $key"
    exit 0
  fi
  echo "[$(date '+%F %T')] planning $key"
  squad new-plan --api -y "$intake" 2>&1 | tail -3
  if ls .squad/plans/*/ 2>/dev/null | grep -qi "story-${key}"; then
    # squad-kit lowercases the id; the console and its own lookup are
    # case-sensitive, so fix it here rather than leaving the story unplanned.
    for f in .squad/plans/*/*"$(echo "$key" | tr 'A-Z' 'a-z')"*.md(N); do
      mv "$f" "${f:h}/${${f:t}//$(echo "$key" | tr 'A-Z' 'a-z')/$key}"
    done
    echo "[$(date '+%F %T')] $key planned"
  else
    echo "[$(date '+%F %T')] $key not planned — quota or error"
  fi
  exit 0
done
echo "[$(date '+%F %T')] nothing to plan"
