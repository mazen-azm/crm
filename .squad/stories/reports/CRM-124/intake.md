> **Fetched from jira:** [CRM-124](https://mazen-al-nabarawy.atlassian.net/browse/CRM-124)  
> *Fetched 2026-09-02T08:13:09.380Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** REPORTS-1-API admin — I see the queue by status  
**Type:** Story  
**Status:** To Do  
**Labels:** admin, backend, pts-3, reports, sprint-9

### Description

admin — I see the queue by status

Story folder: .squad/stories/reports/REPORTS-1-API-queue-by-status/

Owns no rule of its own.

Cannot ship before: TICKETS-2-API

Points: 3 · Sprint: 9 · Layer: API

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/reports/CRM-124/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `reports`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-124` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `admin, backend, pts-3, reports, sprint-9`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
REPORTS-1-API admin — I see the queue by status
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
admin — I see the queue by status

Story folder: .squad/stories/reports/REPORTS-1-API-queue-by-status/

Owns no rule of its own.

Cannot ship before: TICKETS-2-API

Points: 3 · Sprint: 9 · Layer: API
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/reports.md, section REPORTS-1-API (line 52):


An admin sees how many tickets are in each status.

*Acceptance criteria*
- Given the six statuses (T-1, `scripts/rules.txt` line 12), when the report is
  read, then all six appear, and a status no ticket is in appears with a count
  of zero rather than being absent.
- Given a soft-deleted ticket, when the report is read, then it is in no count —
  nothing is hard-deleted (BR-1, line 5), so `deleted_at IS NULL` is what makes
  the report agree with the queue.
- Given the report, when its counts are added up, then the total equals the
  number of live tickets: no ticket is counted twice and none is dropped.
- Given a non-admin, when they read it, then the answer is 403 and the service
  never runs (SC-2).
- Given the six statuses in code, when a seventh is added to `STATUSES`, then
  the report carries it without being edited — the set is read, not retyped.
- Given a desk with no tickets at all, when the report is read, then it answers
  six zeros and 200, not an empty body and not 404.
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
  out by counting — two plans did, and both named the wrong story.
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

- APIs, screens, services already discussed. Repos/roots: `api, web, android`. Primary language: `JavaScript`.

**This opens a new feature.** `api/src/features/reports/` — repository, a read
service, routes, `index.js`. The closest shape already here is **audit**: it
owns no table either, and `compose.js:83` wires it as
`auditRouter({ reader: createTrailReader({ db }) })`. Read `audit/index.js`,
`audit.read.js` and `audit.routes.js` before inventing a layout.

**Reports owns no table and needs no migration.** Every number it returns is
already stored. A plan that adds a migration here has misread the story.

**SQL lives in a repository** — `verify-architecture.mjs` rule
`api-sql-only-in-repository` fails it anywhere else.

**The six statuses are `STATUSES` in
`api/src/features/tickets/tickets.rules.js:3`**, and a feature reaches another
only through its index (rule `api-feature-internals`). If
`api/src/features/tickets/index.js` does not export it yet, export it there.
Do **not** retype the six names into reports — the criterion "a seventh status
is carried without this file being edited" is only true if the set is read.

**The zeros are the story.** A `GROUP BY status` returns rows only for statuses
that have tickets. Build the answer from the known set and fill it from the
query, so `pending: 0` is a value rather than an absence.

**`deleted_at IS NULL`**, or the report and the queue will disagree (BR-1).

**Admin-only, decided in middleware.** `identity.routes.js:38` is the shape:
`requirePermission((subject) => subject.role === 'admin')`.
`staff-only.guarantee.test.js` reads the routes off the router and will see
this one — a route that forgets the gate fails a test nobody wrote for it.

**Every served route must be in `api/openapi.json`** —
`api/src/platform/http/openapi-contract.test.js` fails a route that is served
and not documented.

**It is an aggregate, not a list.** BR-4's page ceiling is about lists; the
body here is six numbers whose size does not grow with the desk. Do not bolt
`readPagination` onto it.

## Out of scope

- **The screen** — `REPORTS-1-WEB (CRM-125)`.
- **The other three reports** — promises met, agent load, and the reader's day
  are `REPORTS-2-API (CRM-126)`, `REPORTS-3-API (CRM-128)` and
  `REPORTS-4-API (CRM-130)`. This story is the queue by status and the feature
  it opens.
- **A date window.** Every report gains one in `REPORTS-4-API (CRM-130)`, and
  building half of it here means building it twice.
- **Any new table or migration.** Nothing here is stored that is not stored.
- **Export, scheduling or a chart.** None is asked for.
