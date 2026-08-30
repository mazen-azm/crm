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
From scripts/criteria/tickets.md, section TICKETS-6-API — copied, not
paraphrased, because verify-plan compares the plan against that file:

- Given the categories, when they are read, then they are paginated with the
  ceiling every list obeys (BR-4).
- Given a retired category, then it is not in the list a form offers — but a
  ticket that already carries it still reads correctly.
- Given the list, when it is read, then it writes no audit row.
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
- **The package manager is npm**, and there is no workspace root. Commands run
  from the package directory: `cd api && npm test`, `cd web && npm run build`.
  Not pnpm, not yarn, no `--filter`, no `--prefix` — three plans in a row
  reached for pnpm, so every command in their verification steps was wrong.
- **The web suite does not typecheck.** `npm test` is vitest; `npm run build` is
  `tsc -b && vite build`. A change only vitest has seen is not verified.

- APIs, screens, services already discussed. Repos/roots: `api, web, android`. Primary language: `JavaScript`. **`api/` only.**

**Two defects were found by running the code, not by reading it, and they
belong to this story because it is the story about which categories are real:**

1. **A category id that does not exist returns 500 `INTERNAL`.** The FK is
   declared and `PRAGMA foreign_keys = ON` is set (`connection.js:19`), so
   SQLite refuses the insert — and the raw `FOREIGN KEY constraint failed`
   escapes the service as an unhandled error. That breaks E-2: a caller's bad
   input is being reported as a server fault, and it lands in the log as one.
   It should be 422 naming `categoryId`, the way an unknown `assigneeId`
   already is (`tickets.service.js`, the `findLiveAssigneeId` guard).
2. **A retired category is accepted when raising a ticket.** The FK only asks
   whether the row exists; `deleted_at` is what takes it off the list. So a
   ticket can be raised against a category no form offers — which is the exact
   thing the second acceptance criterion says must not be possible.

   The fix is the pattern already in this file: `findLiveCustomerId` at
   `tickets.repository.js:31` and `findLiveAssigneeId` at `:150` both select
   `WHERE id = ? AND deleted_at IS NULL`. A `findLiveCategoryId` alongside
   them, checked inside `raise`'s transaction, is the whole change.

**A retired category must still read back on the tickets that carry it.** The
second criterion says so in its second half, so do not join the list's
`deleted_at IS NULL` filter onto the ticket read — a ticket raised last month
against a category retired yesterday still shows that category.

**Read `0002__tickets.sql` before deciding anything.** `categories` is already
a table and the seed already fills it; `tickets.category_id` may already carry a
foreign key. This story is mostly about *exposing* what exists, and the amount
of new code should be small. If a check the criteria ask for is already enforced
by the schema, prove it with a test and say so in the commit rather than adding
a second enforcement in JavaScript.

**The table is `ticket_categories`, not `categories`** — name the route after
it. The brief has a knowledge base with articles, and a bare `/categories`
would be the obvious place to hang article categories later; a route that has
to be renamed once something else arrives was named for today only.

**The list is paginated like every other, which is BR-4 and not a nicety.**
`GET /api/v1/customers` and `GET /api/v1/tickets` already answer
`{ items, total, limit, offset }` with a ceiling that is refused rather than
clamped. Six seeded categories will never reach that ceiling — which is exactly
why it would be left out, and exactly why leaving it out makes this list the
one that is different. Copy the existing shape.

**And it goes in `api/openapi.json`.** The contract test
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
