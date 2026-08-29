> **Fetched from jira:** [CRM-82](https://mazen-al-nabarawy.atlassian.net/browse/CRM-82)  
> *Fetched 2026-08-29T15:14:28.149Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** TICKETS-6-API agent — the categories are readable, so a form has something to offer  
**Type:** Story  
**Status:** To Do  
**Labels:** agent, backend, pts-2, sprint-3, tickets

### Description

agent — the categories are readable, so a form has something to offer

Story folder: .squad/stories/tickets/TICKETS-6-API-category-list/

Rules this story owns:

	BR-4 — No unbounded list: paginated, filterable, sortable, with a maximum page size.

Cannot ship before: PLATFORM-8-API

Points: 2 · Sprint: 3 · Layer: API

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/tickets/CRM-82/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `tickets`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-82` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `agent, backend, pts-2, sprint-3, tickets`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
TICKETS-6-API agent — the categories are readable, so a form has something to offer
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
agent — the categories are readable, so a form has something to offer

Story folder: .squad/stories/tickets/TICKETS-6-API-category-list/

Rules this story owns:

	BR-4 — No unbounded list: paginated, filterable, sortable, with a maximum page size.

Cannot ship before: PLATFORM-8-API

Points: 2 · Sprint: 3 · Layer: API
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/tickets.md, section TICKETS-6-API:

- Given a request for the categories, then the answer lists them, and a ticket
  can be raised against any id in that list (BR-4).
- Given a category id that is not in the list, when a ticket is raised with it,
  then the ticket is refused rather than stored against a category that does
  not exist.
- Given the list, then it comes from the database rather than a constant in the
  code — the seed is where categories are defined.
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
- **The package manager is npm**, and there is no workspace root. Commands run
  from the package directory: `cd api && npm test`, `cd web && npm run build`.
  Not pnpm, not yarn, no `--filter`, no `--prefix` — three plans in a row
  reached for pnpm, so every command in their verification steps was wrong.
- **The web suite does not typecheck.** `npm test` is vitest; `npm run build` is
  `tsc -b && vite build`. A change only vitest has seen is not verified.

- APIs, screens, services already discussed. Repos/roots: `api, web, android`. Primary language: `JavaScript`. **`api/` only.**

**Read `0002__tickets.sql` before deciding anything.** `categories` is already
a table and the seed already fills it; `tickets.category_id` may already carry a
foreign key. This story is mostly about *exposing* what exists, and the amount
of new code should be small. If a check the criteria ask for is already enforced
by the schema, prove it with a test and say so in the commit rather than adding
a second enforcement in JavaScript.

**GET /api/categories, and it goes in `api/openapi.json`.** The contract test
fails on a route that is served and not documented, so the OpenAPI entry is not
optional bookkeeping — it is what makes the test pass.

**Who may read it.** Raising a ticket needs a category, and a customer raises
tickets, so this list cannot be staff-only. Follow whatever `POST /api/tickets`
already requires; do not invent a third answer.

**Categories are read-only here.** There is no create, no rename, no delete —
S-2's pattern for reference data is that the seed defines it and no screen
edits it.

## Out of scope

- What this story explicitly does **not** cover:

- **Creating, renaming or deleting a category** — no story asks for it, and
  the seed is the definition.
- **Any screen.**
- **A new migration**, unless reading the existing schema proves one is
  genuinely missing. Check first; do not add a table that is already there.
