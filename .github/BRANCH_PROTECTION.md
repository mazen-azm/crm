# Branch protection — the half that is not a file

`ci.yml` makes the suites run and report. It cannot make a red run block a
merge. That comes from a branch-protection rule on `main`, which lives in the
repository's settings, needs admin rights on the repository, and cannot be
declared from inside it. Nothing committed here can turn it on.

So this file is the other half of PLATFORM-13-ALL's second criterion — *given a
failing test, when a merge is attempted, then it is blocked* — written down
rather than assumed, because a workflow file alone does not satisfy it.

## What to set

**Settings → Branches → Add branch ruleset** (or *Add rule*), targeting `main`:

- **Require a pull request before merging.**
- **Require status checks to pass before merging**, and require all three jobs:
  `api`, `web` and `checks`.

  **Pick them from the search box rather than typing them.** The names come
  from `jobs.<id>.name` in `.github/workflows/ci.yml`, but GitHub's own UI
  shows them in more than one form depending on where you are looking — bare
  (`api`) in the required-checks list, and prefixed with the workflow
  (`ci / api`) on the pull request. Choosing from the dropdown after the first
  run has completed picks whichever string GitHub is actually matching on. A
  typed name that does not match is silently not required, which looks exactly
  like being required and green.

  Renaming a job in the workflow un-requires it here, for the same reason.

- **Require branches to be up to date before merging**, so a check cannot pass
  against a base that has since moved.
- **Do not allow bypassing the above settings**, including for administrators.
  A rule an admin walks around is a rule that is on for other people.

## How to know it worked

Open a pull request from a branch with a deliberately failing test. The merge
button should be disabled and name which check is red. That is the criterion,
and it is the only way to see it — the workflow being green proves the suites
run, not that a red one stops anything.

## Why not automate it

It could be set through the GitHub API with a token carrying `administration:
write` on the repository. That is a strictly more powerful credential than
anything else this project uses, created to perform a one-time click. The
trade is not worth it, and the same reasoning keeps the Atlassian token out of
Actions secrets — see `docs/ai-usage.md` on where credentials are allowed to
live.
