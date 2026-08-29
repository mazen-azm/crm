#!/bin/zsh
# Generate plans for stories whose intake exists and whose plan does not. Run by
# a LaunchAgent so a quota window that opens while nobody is at the keyboard is
# not a window that is missed.
#
# The schedule is five firings five hours apart — 02:15, 07:15, 12:15, 17:15,
# 22:15 — and each may plan up to four stories.
#
# Five hours because that is what the plan page says the session window is, not
# because of anything inferred here: a first guess of six hours was wrong and
# was corrected by reading it. Five FIRINGS rather than four because 24 hours
# does not divide by five — four firings at five-hour spacing leave a
# nine-hour hole once a day, which is a whole window nobody uses.
#
# A firing that arrives inside a shut window costs one refused request and
# stops, so being slightly out of phase is cheap.
#
# It plans and stops. Reviewing the plan and building from it stay with a
# person and a session — those are the two gates, and every story so far has
# had something caught at one of them.
set -u
cd /Users/mazen/Developer/projects/learning/crm/support-desk || exit 1

# --dry says what WOULD be planned and stops. It exists because asking the
# question by running the script spends the quota answering it, which is what
# happened the first time somebody wanted to know.
# --dry may come before or after the intake path: a caller asking "which story
# would this plan?" should not have to remember an order.
DRY=0
ARGS=""
for a in "$@"; do
  if [ "$a" = "--dry" ]; then DRY=1; else ARGS="$a"; fi
done

# An explicit intake path plans THAT story and nothing else. Without this the
# script globs and takes the first unplanned intake it finds, which is
# alphabetical and has nothing to do with dependency order — so a caller who
# passed a path and believed they had chosen a story had in fact chosen
# nothing. That happened: nine sprint-4 intakes were created at once and a
# request to plan platform/CRM-32 planned customers/CRM-57 instead.
ONLY=""
if [ -n "$ARGS" ]; then
  if [ ! -f "$ARGS" ]; then
    echo "[$(date '+%F %T')] no such intake: $ARGS"
    exit 1
  fi
  ONLY="$ARGS"
fi
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.local/bin:$PATH"

# One planner at a time. The three firing times are a retry, not a fan-out: a
# plan takes minutes, so 09:15 is still running when 09:45 arrives, and two
# runs of `squad new-plan` on one intake spend the quota twice to produce a
# duplicate. mkdir is the atomic test-and-set; a stale lock older than an hour
# is a crashed run, not a live one.
# How many stories one firing may plan. A run used to stop after the first,
# which spends four minutes of a fresh five-hour window and leaves the rest of
# it unused — the schedule fires four times a day, so that was four plans a day
# against a backlog of nine per sprint.
#
# It stops early on a usage limit rather than working through the list
# discovering the window is shut, and the lock still means two firings cannot
# overlap.
MAX_PLANS=${CRM_MAX_PLANS:-4}
planned=0

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

for intake in ${ONLY:-.squad/stories/*/CRM-*/intake.md}; do
  key=$(basename "$(dirname "$intake")")            # CRM-47
  if ls .squad/plans/*/ 2>/dev/null | grep -qi "story-${key}.md"; then continue; fi
  if [ "$DRY" = "1" ]; then
    echo "[$(date '+%F %T')] would plan $key"
    exit 0
  fi
  echo "[$(date '+%F %T')] planning $key"
  # squad-kit caps the planner at 40 model turns. An INTERACTIVE run is offered
  # "continue — extend limits for this run" and carries on; a run started with
  # -y gets decideOnLimit = undefined and returns with no plan at all
  # (cli.js: `const interactive = !opts.yes && Boolean(process.stdin.isTTY)`).
  # Unattended planning has to pass -y, so it cannot be offered that choice —
  # it can only be given another go. Whether a run hits the ceiling varies:
  # CRM-27 died at it once and finished the next time with no change at all.
  #
  # Retry only the ceiling. Retrying a usage limit just spends the next window
  # discovering the window is still closed.
  attempt=1
  while : ; do
    out=$(squad new-plan --api -y "$intake" 2>&1)
    echo "$out" | tail -3
    case "$out" in
      *"maximum number of turns"*)
        if [ "$attempt" -ge 2 ]; then break; fi
        attempt=$((attempt + 1))
        echo "[$(date '+%F %T')] $key hit the turn ceiling — attempt $attempt"
        ;;
      *) break ;;
    esac
  done
  if ls .squad/plans/*/ 2>/dev/null | grep -qi "story-${key}"; then
    # squad-kit lowercases the id; the console and its own lookup are
    # case-sensitive, so fix it here rather than leaving the story unplanned.
    for f in .squad/plans/*/*"$(echo "$key" | tr 'A-Z' 'a-z')"*.md(N); do
      mv "$f" "${f:h}/${${f:t}//$(echo "$key" | tr 'A-Z' 'a-z')/$key}"
    done
    echo "[$(date '+%F %T')] $key planned"
  else
    # Say which. "quota or error" sent somebody looking at a usage limit for
    # a run that had actually hit squad-kit's hardcoded 40-turn ceiling
    # (DEFAULT_PLANNER_MAX_ITERATIONS), which no flag or config key exposes.
    case "$out" in
      *"hit your limit"*|*"usage limit"*)  why="usage limit — retry after it resets" ;;
      *"maximum number of turns"*)         why="hit the 40-turn planner ceiling — retry, or lower planner.budget.maxFileReads so fewer turns go on reading" ;;
      *)                                   why="see the output above" ;;
    esac
    echo "[$(date '+%F %T')] $key not planned — $why"
    # A shut window will answer the same way for every remaining story, so
    # stop rather than spend the run proving it nine times. A turn-ceiling or
    # an unexplained failure is about THAT story, so the run carries on.
    case "$out" in
      *"hit your limit"*|*"usage limit"*)
        echo "[$(date '+%F %T')] stopping — the window is shut"
        break
        ;;
    esac
  fi

  planned=$((planned + 1))
  if [ "$planned" -ge "$MAX_PLANS" ]; then
    echo "[$(date '+%F %T')] planned $planned this run — the cap for one firing"
    break
  fi
  # An explicit intake means "plan that one", so a caller who named a story
  # gets exactly it and nothing else.
  [ -n "$ONLY" ] && break
done
# Only when the run really did nothing. A break out of the loop — the
# per-run cap, a named intake, a shut window — used to fall through to this
# line and report "nothing to plan" immediately after saying what it planned.
if [ "$planned" -eq 0 ]; then
  echo "[$(date '+%F %T')] nothing to plan"
fi
