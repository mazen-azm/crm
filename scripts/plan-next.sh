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
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.local/bin:$PATH"

for intake in .squad/stories/*/CRM-*/intake.md; do
  key=$(basename "$(dirname "$intake")")            # CRM-47
  if ls .squad/plans/*/ 2>/dev/null | grep -qi "story-${key}.md"; then continue; fi
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
