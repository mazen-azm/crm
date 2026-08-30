> **Fetched from jira:** [CRM-30](https://mazen-al-nabarawy.atlassian.net/browse/CRM-30)  
> *Fetched 2026-08-28T16:40:48.824Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** PLATFORM-15-ALL developer — the structure rules are enforced by a script, in every root  
**Type:** Story  
**Status:** To Do  
**Labels:** developer, platform, pts-5, shared, sprint-2

### Description

developer — the structure rules are enforced by a script, in every root

Story folder: .squad/stories/platform/PLATFORM-15-ALL-structure-check/

Owns no rule of its own.

Cannot ship before: PLATFORM-13-ALL

Points: 5 · Sprint: 2 · Layer: ALL

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/platform/CRM-30/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `platform`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-30` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `developer, platform, pts-5, shared, sprint-2`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
PLATFORM-15-ALL developer — the structure rules are enforced by a script, in every root
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
developer — the structure rules are enforced by a script, in every root

Story folder: .squad/stories/platform/PLATFORM-15-ALL-structure-check/

Owns no rule of its own.

Cannot ship before: PLATFORM-13-ALL

Points: 5 · Sprint: 2 · Layer: ALL
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/platform.md, section PLATFORM-15-ALL:

- Given the API, when a feature imports another feature's internals, then the
  check fails and names both.
- Given the API, when `shared` or `platform` imports a feature, then it fails.
- Given a service or repository holding `req` or `res`, then it fails.
- Given SQL outside a repository, then it fails.
- Given the web, when a layer imports upward, then it fails.
- Given two sibling slices, when one imports the other outside `@x`, then it
  fails.
- Given Android, when model or data code imports Compose, then it fails.
- Given a screen taking a navigator, then it fails.
- Given a package script naming a file that does not exist, then it fails.
- Given a variable `.env.example` declares that nothing reads, then it fails.
- Given any check, when it passes, then it prints how many files it read. A
  check that passes over an empty set is worse than no check.
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
- **Ids:** cite other stories as FULL-NAME ids with the Jira key —
  `PLATFORM-13-ALL (CRM-28)`. The id comes from `scripts/backlog.txt` (or the
  generated `BACKLOG.md`); **the key comes from `scripts/story-keys.txt`, which
  lists every story's key and is generated from the tracker.** Do not work a key
  out by counting — three plans did, and each named the wrong story.
  Documents under `docs/` may lag; the backlog is the authority.
- **Structure:** `docs/taxonomy.md` (names), `docs/architecture.md` (where code
  goes), `docs/git.md` (branches and commits) — cite them, do not restate them.
- **Nothing committed may mention AI assistance** — commits, docs, or ignore-file
  entries. Verification steps must include the grep that proves it.

- APIs, screens, services already discussed. Repos/roots: `api, web, android`. Primary language: `JavaScript`.

**Four of these eleven rules have nothing to read today, and the last criterion
is about exactly that.** `android/` contains one file, `.gitkeep`. The web has
`app/`, `pages/`, `shared/`, `testing/` and no `entities/`, so there are no
sibling slices either. So:

- *model/data imports Compose* — 0 files
- *a screen takes a navigator* — 0 files
- *a sibling slice imported outside `@x`* — 0 files
- *a layer imports upward* — real, but only three layers exist

"A check that passes over an empty set is worse than no check" is the story
telling you what to do about this. **A rule that read zero files must not
report "passed".** Report per rule: the rule, the number of files it read, and
its verdict — and make a zero-file rule visibly *not in force* rather than
quietly green. Whether that is a distinct status, a warning, or a failure is
the decision to make and justify; what is not acceptable is a green tick that
means nothing. Do not delete the Android rules to avoid the problem: writing
them now is why the story says "from the first feature rather than after nine
violations".

**`@x` is a real convention here, not a placeholder.** `docs/architecture.md`
lines 88–89: two entity slices that relate declare the cross-import as
`entities/customer/@x/ticket` rather than moving code to `shared`. Cite that
document; do not invent a different meaning.

**Name the legitimate SQL exceptions before writing the rule, or it fires on
day one and gets relaxed until it catches nothing.** SQL correctly lives
outside a `*.repository.js` in: the migrations (`api/src/platform/db/migrations/*.sql`),
the migration runner (`migrate.js`), the seed (`seed.js`), every `*.test.js`
that sets up or asserts on rows, and `api/src/features/audit/audit.guard.js`,
whose whole job is classifying SQL and which therefore contains SQL keywords in
regexes. That last one is L-13 in miniature: a text scan cannot tell a rule
about SQL from SQL. Each exemption is a decision that gets written down with
its reason — an unexplained exemption list is where a check goes to die (L-6).

**The parser problem, and the precedent for solving it.** The check belongs in
`scripts/` and runs in CI with **no `npm install`** — see `.github/workflows/ci.yml`,
the `checks` job. There is no root `package.json` and adding one is out of
scope, so `@babel/parser` (a `web` devDependency) is not available. L-13 says a
source guard reads grammar, not prose — and an **import specifier is grammar a
narrow matcher can read honestly**, because `import … from '<string literal>'`
is a fixed shape. That is precisely the fix L-13 itself recorded for the seed
test. So: match import and re-export statements only, after stripping comments
and strings, and say in a comment why that is reading grammar rather than
scanning text. Do not extend the same trick to the `req`/`res` or SQL rules
without arguing it separately — those are not fixed grammar.

**Print counts even when green.** The last criterion is not decoration: every
run reports files read per rule. `verify-docs.mjs` already ends with a line of
this shape (`documents · citations · story ids · read N files`) — follow it.

**L-16 applies to all eleven.** For each rule, the verification steps must name
a concrete violation to introduce, the exact expected message, and the revert.
A structure check nobody has watched fail is a structure check nobody knows
works.

## Out of scope

- What this story explicitly does **not** cover:

- **Writing any Android source.** The rules that read `android/` are written and
  wired now; the code they will read arrives in sprint 10. Adding a Kotlin file
  to give the check something to read is not in scope and would be a fixture
  pretending to be a feature.
- **Creating `entities/` or any web slice.** The slice rules are written against
  the documented convention; the slices arrive with the features that need them.
- **Moving, renaming or restructuring any existing file to satisfy a new rule.**
  If a rule fails on today's tree, that is a finding to report — the rule may be
  wrong, or the tree may be, and which one is a decision, not a licence to
  reshape the repository inside this story.
- **A root `package.json`, or any new dependency in any package.**
- **The CI workflow.** `PLATFORM-13-ALL` (CRM-28) owns `.github/workflows/ci.yml`.
  Adding this script to the `checks` job is a one-line edit that belongs to this
  story; changing anything else in that file does not.
- **Documentation and citation checks** — owned by `PLATFORM-14-ALL` (CRM-29),
  already shipped as `verify-taxonomy.mjs` and `verify-docs.mjs`. Do not
  duplicate them.
