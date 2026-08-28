> **Fetched from jira:** [CRM-28](https://mazen-al-nabarawy.atlassian.net/browse/CRM-28)  
> *Fetched 2026-08-28T14:08:37.887Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** PLATFORM-13-ALL developer — the suite runs on every push and a red suite blocks a merge  
**Type:** Story  
**Status:** To Do  
**Labels:** developer, platform, pts-3, shared, sprint-1

### Description

developer — the suite runs on every push and a red suite blocks a merge

Story folder: .squad/stories/platform/PLATFORM-13-ALL-ci-pipeline/

Owns no rule of its own.

Cannot ship before: PLATFORM-11-WEB

Points: 3 · Sprint: 1 · Layer: ALL

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/platform/CRM-28/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `platform`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-28` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `developer, platform, pts-3, shared, sprint-1`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
PLATFORM-13-ALL developer — the suite runs on every push and a red suite blocks a merge
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
developer — the suite runs on every push and a red suite blocks a merge

Story folder: .squad/stories/platform/PLATFORM-13-ALL-ci-pipeline/

Owns no rule of its own.

Cannot ship before: PLATFORM-11-WEB

Points: 3 · Sprint: 1 · Layer: ALL
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/platform.md, section PLATFORM-13-ALL:

- Given a push, when it lands, then the API suite, the web suite and every
  check script run.
- Given a failing test, when a merge is attempted, then it is blocked.
- Given a run, when it finishes, then the duration of each suite is reported.
  An intermittent test is a report, not noise, and the duration is the first
  thing read.
- Given a hanging test, when the ceiling is reached, then it reports itself
  rather than stopping the run.
```

---

## Attachments

Place files in `attachments/` next to this `intake.md`, then list them here so the planner knows what to open.

| File (relative to this folder) | What it is |
| ------------------------------ | ---------- |
| *(e.g. `attachments/flow.png`)* | *(e.g. UX flow)* |

*(Add rows per file. If none, write "None.")*

---

## Dependencies

- **Blocked by / related ids:** (tracker ids only; optional short note)
- **Depends on code areas or other stories:**

## Extra notes (optional)

- Anything not captured above (e.g. chat context) — keep short.

## Technical hints (optional)

<!-- standing-hints -->
- **Read first, before anything else:** `.squad/plan-lessons.md` — one rule per
  defect an earlier plan review found. A plan that repeats a listed defect is
  rejected in review.
- **Ids:** cite other stories only from `scripts/backlog.txt` (or the generated
  `BACKLOG.md`), as FULL-NAME ids with the Jira key: `PLATFORM-13-ALL (CRM-28)`.
  Documents under `docs/` may lag; the backlog is the authority.
- **Structure:** `docs/taxonomy.md` (names), `docs/architecture.md` (where code
  goes), `docs/git.md` (branches and commits) — cite them, do not restate them.
- **Nothing committed may mention AI assistance** — commits, docs, or ignore-file
  entries. Verification steps must include the grep that proves it.

- APIs, screens, services already discussed. Repos/roots: `api, web, android`. Primary language: `JavaScript`.

**The runner is GitHub Actions.** The remote is `git@github.com-azm:mazen-azm/crm`,
private. There is no `.github/` directory yet — this story creates it. Do not
propose a runner the repository is not on.

**Pin Node to 26.** Local is v26.3.1 and `node:sqlite`'s `DatabaseSync` — the
only database access in the API — is young enough that a different major is a
different product. `api/package.json` says `>=22.13`, which is a floor, not the
version the suite has ever been run on. Pin `26.x` in `setup-node` and say why
in a comment. Node 26 is also the version whose `localStorage` global the web
test setup was written against.

**Two packages, no workspace root.** `api/` and `web/` each have their own
`package.json`; there is none at the repository root and this story does not
add one. `web` has a lockfile and dependencies; `api` has one dependency
(`express`) and no dev ones. Use `npm ci` per package, cache per lockfile.

**The full set of commands, and there is no wrapper script to hide behind:**
- `api`: `npm ci` then `npm test` (`node --test`)
- `web`: `npm ci`, `npm test` (`vitest run`), and **`npm run build`** — L-15 was
  bought by a green web suite sitting on top of five type errors, so the build
  is not optional and is not the same check as the tests.
- root: `node scripts/verify-backlog.mjs`, `verify-taxonomy.mjs`,
  `verify-docs.mjs`, `verify-plan.mjs`. These need no `npm install` — they are
  plain Node with no imports outside the standard library.

**Do NOT put the Atlassian token in GitHub Actions secrets.**
`verify-plan.mjs` looks Jira keys up when `.squad/secrets.yaml` exists and
**warns rather than failing when it does not** (see its comment at line 13).
That file is gitignored and stays out of CI. Every other check in it — ids,
citations, dialect, statuses, casing, duplicates, the heading number — runs
without any credential. Spreading a live token into a second system to
strengthen one check inside a third is the wrong trade, and this particular
token is being rotated.

**"A red suite blocks a merge" is half a workflow file and half a repository
setting.** The workflow makes the checks run and report; the blocking comes
from a branch-protection rule on `main` requiring those checks — which is
configured in the repository's settings, needs admin rights, and **cannot be
done from a file in the repository.** The plan must say this plainly, name the
exact check names to require, and leave that step to a person. A Done Criteria
box that claims merges are blocked when only the workflow exists would be
false.

**Report per-suite duration, and let a hung test report itself.** `node --test`
prints `duration_ms` and `vitest run` prints its own summary — surface both
rather than swallowing output. The hang criterion is about a **per-test**
ceiling (`node --test --test-timeout=…`, vitest `testTimeout`), which fails the
one test and lets the run finish. A job-level `timeout-minutes` is a different
thing — it kills the run and reports nothing, which is what the criterion asks
us not to do. Set both, and say which does what.

**Every check must run even when an earlier one fails**, or the first red hides
the rest and a push costs several round trips to learn what a single run could
have said. Use `if: always()` on the steps after the first, or separate jobs.

## Out of scope

- What this story explicitly does **not** cover:

- **The structure checks** — feature isolation, no SQL outside a repository, no
  `req`/`res` in a service, no Compose import in model code. Owned by
  `PLATFORM-15-ALL` (CRM-30). CI must run the check scripts that exist today;
  it does not write new ones.
- **Deploying anything.** No build artefact is published, no environment is
  touched. This story proves the code, it does not ship it.
- **Android.** There is no `android/` source yet; adding a Gradle job now would
  be a job that passes over an empty set.
- **Coverage thresholds, linting, or formatting.** None exist in this repository
  and this story does not introduce them.
- **Changing any test, any check script, or any package.json script.** If CI
  needs a command that does not exist, that is a finding to report, not a
  licence to add one here.
