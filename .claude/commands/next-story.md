---
description: Pull the next To Do story from Jira and walk it through the loop, stopping at the two human gates
---

Walk ONE story through the squad loop. Everything is automatic EXCEPT the two
gates — each gate has already caught defects automation would have shipped, so
never skip or merge them. The loop must leave the planner smarter than it found
it: step 8 is as mandatory as the merge.

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

## 4. Plan, then review it mechanically

After approval: run `/squad-plan` on the intake. Then review the generated plan
with this checklist — each item is a rejection rule, not a suggestion. The
checklist exists because every item has already caught a real defect:

- [ ] Every lesson in `.squad/plan-lessons.md` is obeyed (read them all first).
- [ ] Every `file:line` citation opened and compared against the real file —
      the cited lines must say what the plan claims they say.
- [ ] Every story id grepped in `scripts/backlog.txt`. Ids from prose are wrong.
- [ ] The plan names the engine and cites where `docs/architecture.md` declares
      it (L-5). Grep the plan for another engine's dialect.
- [ ] Every command in the plan can run on THIS machine: check `node --version`
      against any flags (experimental flags die), remember npm scripts run
      under `sh` (no `**` glob expansion), and check odd flag syntax against
      the tool's manual (`git log --grep` takes `=pattern`).
- [ ] No two created files claim the same name or ordinal.
- [ ] No promise the platform cannot keep (SQLite cannot add a constraint to
      an existing table; a "we'll add the FK later" comment is a lie).
- [ ] Exactly ONE plan file exists for this story — delete any superseded
      sibling so the executor cannot attach the wrong one.

Apply fixes to the PLAN file directly (never plan-around in code later).

## 5. GATE 2 — plan review

Present to the user: what the plan gets right, every defect the checklist
caught, and the fix applied for each. Any NEW defect class becomes a lesson in
`.squad/plan-lessons.md` BEFORE execution — and if the defect traces back to a
document that misled the planner, fix the DOCUMENT too; a patched plan with a
stale doc reproduces the bug next story. STOP for the user's go.

## 6. Execute

On the user's go: create the story branch from the current sprint branch
(`<CRM-KEY>-<slug>`), implement the plan in full, commit as you go with
reasoned bodies — do not stop to ask for approval mid-plan. Tick the Done
Criteria boxes in the plan file as each is verified. No AI attribution in any
commit. If executing in a separate session: work INSIDE this repo, attach ONLY
the plan file, and confirm the plan file exists before starting.

## 7. Verify independently, then close

Do not only re-run the plan's Verification Steps — verify from sources the
code did not write:

- Run the full test suite yourself and read the pass/fail counts.
- Exercise the claims by hand: run the idempotent thing twice, insert the row
  the constraint must refuse, read schema from `sqlite_master` (the artifact),
  not from the migration files (the intent).
- `git log --format='%B' <story-branch> ^<sprint-branch> | grep -iE
  'co-authored-by|generated with|claude|anthropic|copilot|chatgpt|🤖'`
  must print nothing.
- Confirm scope: nothing shipped that a later story owns.

If all green: merge the story branch into the sprint branch (`--no-ff`, delete
the story branch), move the Jira story to "Done", and report the story id,
what shipped, and the test delta. If anything fails: fix, re-verify.

## 8. The loop learns — mandatory before reporting done

List every defect found at ANY step of this cycle (gate 1, plan review,
execution, verification). For each, ask: is its defect CLASS already a lesson
in `.squad/plan-lessons.md`? If not, write the lesson now — rule plus the
defect that paid for it — and commit it with the story. A cycle that found a
defect and wrote no lesson has thrown the tuition away. If the cycle found
nothing new, say so explicitly in the report.
