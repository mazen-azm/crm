---
description: Pull the next To Do story from Jira and walk it through the loop, stopping at the two human gates
---

Walk ONE story through the squad loop. Stop at the two gates; never skip them.

## 1. Find the next story

Query Jira (project CRM) for Story issues with status "To Do", and pick the one
that comes first by sprint label (sprint-0 before sprint-1) and, inside a sprint,
by the order in `scripts/backlog.txt`. Tell the user which story you picked and
why, then continue.

## 2. Fetch and prepare the intake

```
squad new-story <feature-slug> --id <CRM-KEY>     # press nothing; title comes from Jira
node scripts/prepare-intake.mjs .squad/stories/<feature-slug>/<CRM-KEY>/intake.md
```

Move the story to "In Progress" in Jira.

## 3. GATE 1 — the intake's human sections

Draft the three sections yourself (Acceptance criteria if empty, Technical
hints, Out of scope — with the story ids that own each excluded piece, taken
from scripts/backlog.txt ONLY), then STOP and show them to the user for
approval before planning. These sections steer everything; they are the
user's call.

## 4. Plan

After approval: run `/squad-plan` on the intake. Then review the generated plan
against `.squad/plan-lessons.md` — every listed lesson is a rejection rule.
Also verify every cited story id against `scripts/backlog.txt`.

## 5. GATE 2 — plan review

Present the plan review to the user: what the plan gets right, every defect
found, and the fix. Apply fixes to the PLAN (never work around it in code).
Any new defect class becomes a new lesson in `.squad/plan-lessons.md` BEFORE
execution. STOP for the user's go.

## 6. Execute

On the user's go: create the story branch from the current sprint branch
(`<CRM-KEY>-<slug>`), implement the plan in full, commit as you go with
reasoned bodies, tick the Done Criteria boxes in the plan file as each is
verified. No AI attribution in any commit — grep before every push.

## 7. Verify and close

Run every Verification Step in the plan yourself and show the results.
If all green: merge the story branch into the sprint branch (--no-ff, delete
the story branch), move the Jira story to "Done", and report the story id,
what shipped, and the test delta. If anything fails: fix, re-verify, and add
the lesson if it was the plan's fault.
