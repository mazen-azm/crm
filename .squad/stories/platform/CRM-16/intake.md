> **Fetched from jira:** [CRM-16](https://mazen-al-nabarawy.atlassian.net/browse/CRM-16)  
> *Fetched 2026-08-27T16:42:43.891Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** PLATFORM-1-ALL developer — the repository, its ignore rules and its branch conventions  
**Type:** Story  
**Status:** To Do  
**Labels:** developer, platform, pts-3, shared, sprint-0

### Description

developer — the repository, its ignore rules and its branch conventions

Story folder: .squad/stories/platform/PLATFORM-1-ALL-repo-conventions/

Owns no rule of its own.

No dependency.

Points: 3 · Sprint: 0 · Layer: ALL

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/platform/CRM-16/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):** Platform
- **Feature slug (folder under `plans/`):** `platform`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-16` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `developer, platform, pts-3, shared, sprint-0`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
PLATFORM-1-ALL developer — the repository, its ignore rules and its branch conventions
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
developer — the repository, its ignore rules and its branch conventions

Story folder: .squad/stories/platform/PLATFORM-1-ALL-repo-conventions/

Owns no rule of its own.

No dependency.

Points: 3 · Sprint: 0 · Layer: ALL
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
- [ ] git repository at the repo root, one repository for all three roots (api/, web/, android/)
- [ ] .gitignore ignores by shape: /*.md except /README.md, node_modules, build output,
      .env except .env.example, api/*.db and its WAL sidecars, .DS_Store, .idea, .gradle
- [ ] docs/git.md documents the branch model: main + sprint-N + <ID>-<slug> story branches,
      a tag per closed sprint, merged branches deleted
- [ ] docs/git.md documents the commit style: subject says what changed, body says why
      and what the alternative was
- [ ] README.md exists and describes what the repository IS today (three empty roots and
      the planning system) — no roadmap, no sprint numbers, nothing about what is coming
- [ ] each root (api/, web/, android/) contains a .gitkeep or minimal placeholder so the
      three-root shape is visible in a fresh clone
- [ ] `git log` on the story branch reads as a record of decisions
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

- **Blocked by / related ids:** none — CRM-16 is the first story; nothing depends on it and it depends on nothing
- **Depends on code areas or other stories:** none

## Extra notes (optional)

- The repository already exists with commits (the backlog system under scripts/ and docs/).
  This story CONVENTIONS the repository; it does not re-create it. Work on top of what is there.
- The workspace-wide rule: nothing committed may mention AI assistance — no such trailers
  in commits, no such sections in the README, and no note filename in .gitignore
  (that is why it ignores by shape: /*.md + !/README.md).

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

- Repos/roots: `api, web, android`. Primary language: `JavaScript` (api, web) and Kotlin (android, later).
- Read first: `docs/taxonomy.md` (the 15 feature names — branch names use them),
  `docs/architecture.md` (where code goes; this story creates only the three empty roots),
  `docs/git.md` if present (extend, do not replace), `scripts/backlog.txt` header comments.
- A .gitignore already exists at the root — verify it against the acceptance list and
  extend it rather than rewriting it.
- Branch for this story: `CRM-16-repo-conventions`.

## Out of scope

- What this story explicitly does **not** cover:
  - no application code in any root — no Express app, no React app, no Gradle project
  - no CI pipeline (that is PLATFORM-13-ALL, CRM-28)
  - no structure-rules script (that is PLATFORM-15-ALL, CRM-30)
  - no database schema, no seed (PLATFORM-2/8)
  - no changes to the backlog system under scripts/
