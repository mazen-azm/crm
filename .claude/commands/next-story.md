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

After approval: run `/squad-plan` on the intake (or `squad new-plan --api -y
<intake-path>`). Then, FIRST: **rename the generated plan file so the story id
keeps its capitals** — `git mv NN-story-crm-NN.md NN-story-CRM-NN.md`.
squad-kit lowercases the id when writing the filename but matches it
case-sensitively when reading (console "planned" badge, regenerate-overwrite),
so the lowercase name makes every story read as unplanned. Fix the tool's own
`00-overview.md` row to the renamed file.

Then run the mechanical half of the review:

```
node scripts/verify-plan.mjs .squad/plans/<feature>/<plan-file>
```

It enforces the lessons that a regular expression can decide: abbreviated or
invented story ids, tracker keys that disagree with Jira, another engine's
dialect, a status outside rule E-2's catalogue, `file:line` citations that do
not resolve, empty intake sections, a missing criteria section, a base branch
that does not exist, a duplicate plan, and the filename casing above. It must
exit 0 before a human reads the plan. Findings on an already-shipped plan are
warnings; on this one they are failures.

Then read the plan yourself for what the script cannot judge:

- [ ] Does the plan do THIS story and stop — nothing a later story owns?
- [ ] Every command it gives can run on THIS machine: `node --version` against
      any flags (experimental flags die), npm scripts run under `sh` (no `**`
      glob expansion), odd flag syntax checked against the tool's manual.
- [ ] No promise the platform cannot keep (SQLite cannot add a constraint to an
      existing table; a "we'll add the FK later" comment is a lie).
- [ ] Does a test it proposes pass for the right reason — and can it fail?
- [ ] Does it contradict a decision an earlier story made, or a rule?

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
