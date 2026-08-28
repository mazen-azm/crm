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
whether anybody built the thing. `scripts/plan-status.mjs` (planned) derives that from the
`## Done Criteria` checklist in each plan, which is what an implementer ticks as
they go.

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
