# AI usage

How this project is actually built, and what the method costs.

## The three steps

```
1  intake     a person writes what the work must do          by hand
2  plan       an agent writes how it is built                squad-kit
3  build      a cheap agent follows the plan                 Claude Code
```

Only step 2 is the tool's. The intake is the input and a person writes it; the
build is a fresh, scoped agent session with **only the generated plan attached**.

**The intake says what the work was asked to do. The plan says how it is built** —
file paths, line ranges, symbol names, and the exact commands that prove it, so an
executor can act without re-reading the codebase. That is the whole point, and it
is why a plan may contain no "consider", no "might", and no invented path.

## The rules the method runs under

- **A plan is written only for work not yet done, and only once the code it
  describes exists.** A plan for shipped code is a description wearing a plan's
  clothes; a plan written ahead of the code spends its whole context hunting for
  something that is not there.
- **An intake is not a plan.** Every work item has an intake from the day it is
  known, including work scheduled years out. That is what makes the story list a
  map instead of a rumour.
- **A client half is planned only once its API half has merged.**
- **Never write "the only X" into a plan from memory.** Put the `grep` in the plan
  and let the executor run it.

## What the tool does not know

squad-kit models *unplanned* and *planned* and stops there. Nothing in it knows
whether anybody built the thing. `scripts/verify-plan.mjs:182` derives that from
the `## Done Criteria` checklist in each plan, which is what an implementer ticks
as they go — a fully ticked plan describes work that shipped, and its findings
are downgraded accordingly.

## What the gates catch

The method's value is not that a plan gets written. It is that two gates stand
between a plan and the code, and both of them stop things.

**GATE 1 — the intake.** A person writes what the work must do before an agent
writes how. It is where the acceptance criteria are argued, and the arguing is
the work: whether a resolved ticket outside its window should still show a reply
box, whether a deleted customer can still be read, whether ending sessions can
be decided by comparing times on a whole-second clock. None of those is a coding
question, and a plan asked to answer them invents an answer.

**GATE 2 — the plan review.** Every plan is read against the code before a line
is written, and every plan so far has contained at least one thing that is not
there. The recurring kinds, each now a rule in `.squad/plan-lessons.md`:

- **A route, field or file that does not exist.** `nextCursor` has been invented
  by four separate plans against an API that answers `{ items, total, limit,
  offset }`; `GET /tickets/:id/thread` was named three times for a route called
  `/messages`.
- **Another engine's dialect.** A plan described a column as `timestamptz` in a
  SQLite project. `verify-plan` failed it by name — the check exists because an
  earlier plan arrived written for Postgres.
- **An instruction that would break something argued elsewhere.** One plan said a
  deleted customer should read as 404. The repository says the opposite in a
  comment, and no test pinned it, so it would have changed silently.
- **A layer declared out of scope that cannot be.** Four stories arrived with
  their API half missing, each found by a screen that had nothing to call. The
  pattern is stable enough to name: *the missing piece is in the layer the story
  is not in*, because that is the layer the plan takes on trust.

**After the build, a mutation pass.** Every new guard is broken deliberately to
see whether a test fails. Three times the mutation passed, which is the useful
result: a uniqueness check that could not tell a customer from themselves on a
`COLLATE NOCASE` column, a repository allow-list nothing exercised because the
service filtered first, and an `ORDER BY` tiebreak that no test on SQLite can
fail. The first two became tests. The third is recorded as unpinned, because
claiming coverage that does not exist is worse than the gap.

## Configuration

`.squad/config.yaml` is **owned by the tool** — `squad auth login` and
`squad config set` rewrite it and strip any comment. Nothing is explained there;
the reasoning lives here.

- **`projectRoots: [api, web, android]`** — three roots, one workspace. A story
  that spans the API and a screen stays one piece of work with several halves.
- **`naming.globalSequence: false`** — plan numbering restarts inside each
  feature. Global numbering interleaves features and leaves gaps that read as
  missing work.
- **`planner.auth.anthropic: subscription`** — no per-token bill; planning draws
  on the same usage window as the agent.
- **`budget: 40 reads · 150 KB · 360s`, `scout.maxFiles: 24`** — raised from the
  defaults of 25/50 KB/180s and 12. A workspace this size starves a plan spanning
  two roots at the defaults. If a plan comes back thin, raise these before
  blaming the model.

**The keychain path is not trusted.** `squad doctor` can report
`credential resolved (none)` with a green tick while planning fails with
`Not logged in`. Run `squad auth login`, which stores an OAuth token in
`.squad/secrets.yaml` at mode `0600`, git-ignored.

**A token is a credential.** It does not go in a chat, an issue, a screenshot or a
commit. `squad auth status` reports the state without revealing it. If one is
exposed, revoke it at claude.com — `squad auth logout` only removes the local copy
and the token stays valid for its full year.

## No AI attribution in a commit

No `Co-Authored-By:` trailers, no tool name in a subject or body, ever. This file,
`.squad/` and `.claude/commands/` are committed deliberately because the method is
part of what is being delivered. The commit rule still holds absolutely.
