> **Fetched from jira:** [CRM-89](https://mazen-al-nabarawy.atlassian.net/browse/CRM-89)  
> *Fetched 2026-08-30T10:11:08.284Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** TICKETS-10-API agent — I change a ticket's category  
**Type:** Story  
**Status:** To Do  
**Labels:** agent, backend, pts-2, sprint-6, tickets

### Description

agent — I change a ticket's category

Story folder: .squad/stories/tickets/TICKETS-10-API-change-category/

Rules this story owns:

	BR-2 — Every mutation is audited: actor, entity, action, before, after, timestamp.

	BR-5 — No silent overwrite: a write carries the revision it read; a mismatch returns 409. Applies to status change, assignment, priority change, article edit.

Cannot ship before: TICKETS-6-API

Points: 2 · Sprint: 6 · Layer: API

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/tickets/CRM-89/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `tickets`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-89` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `agent, backend, pts-2, sprint-6, tickets`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
TICKETS-10-API agent — I change a ticket's category
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
agent — I change a ticket's category

Story folder: .squad/stories/tickets/TICKETS-10-API-change-category/

Rules this story owns:

	BR-2 — Every mutation is audited: actor, entity, action, before, after, timestamp.

	BR-5 — No silent overwrite: a write carries the revision it read; a mismatch returns 409. Applies to status change, assignment, priority change, article edit.

Cannot ship before: TICKETS-6-API

Points: 2 · Sprint: 6 · Layer: API
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/tickets.md, section TICKETS-10-API (line 275):

An agent changes a ticket's category.

*Acceptance criteria*
- Given a ticket and a live category, when an agent changes it, then the ticket
  carries the new one and an audit row records both sides (BR-2).
- Given a revision that is not the ticket's, then the change is refused 409
  (BR-5) — the same guard assignment and status changes already carry, for the
  same reason.
- Given a retired category, then the change is refused: what may not be chosen
  for a new ticket may not be chosen for an old one.
- Given `null`, then it is accepted and means no category — the column allows
  it and a ticket may legitimately have none.
- Given a category id that does not exist, then the answer names the field
  rather than letting the foreign key fire, which would be a 500 telling the
  caller their mistake was ours.

*Out of scope*
- The screen — TICKETS-10-WEB.
- Changing several tickets at once.
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

**The engine is SQLite** through node 26's `node:sqlite` `DatabaseSync` —
synchronous, no driver, no pool. Migrations are plain `.sql` files under
`api/src/platform/db/migrations/`, applied in order by `migrate.js`. **Re-list
that directory before naming a new one**; the last is `0010__customers_user_id.sql`
and another sprint-6 story may land first.

**Two censuses will fail if this story adds a route and forgets them**, and
both read the route table off the router rather than a list:
`api/src/features/audit/audit.guarantee.test.js` (every mutating route writes
its audit rows) and `api/src/platform/http/staff-only.guarantee.test.js` (every
route refuses a customer or is named with the reason it does not). A third,
`ticket-ownership.guarantee.test.js`, covers everything under `/tickets/:id`.

**`api/openapi.json` is checked against the router.** A route served and not
documented fails the suite.

**Errors:** `HttpError(status, code, cause)` — the third argument is `cause`,
never a payload. `unprocessable(['field'])` is the 422 with field names.
Validators return arrays of field names, not objects. The catalogue is frozen
in `api/src/platform/http/errors.js` and mirrored in
`web/src/shared/api/errors.ts`; adding a code means both, plus a sentence in
`en.ts` and `ar.ts`, in the same commit.

**Transactions do not nest.** SQLite refuses `BEGIN` inside `BEGIN`, so a
service method that opens one cannot be called from inside another's — read the
note above `resolveByEmail` in `customers.service.js`, and `makeUser` in
`identity.service.js`, which exists precisely to be callable from within a
caller's transaction.

**A repository function that selects some columns is a trap for its next
caller.** `findLiveCustomerById` selected `id, name` and `findAnyUserById`
omits the password hash — both were correct and both bit a later story that
read a field they did not select. Check the projection before reading a field
off a row.

**This is the fourth write under `/tickets/:id`**, and the three before it —
assign, status, and the history read — set the shape exactly: the revision in
the `WHERE`, `revision = revision + 1` in the `SET`, and `changes === 0` as the
refusal (BR-5). Read `assign` in `tickets.service.js` and follow it.

**The ownership census will fail the moment the route is mounted** unless it
answers a customer the same 404 a missing ticket gets.
`ticket-ownership.guarantee.test.js` reads `/tickets/:id/*` off the router.

**`findLiveCategoryId` refuses a retired category** and `raise` already uses it
— the same check, for the reason its comment gives: a foreign key can see that
a row exists and cannot see that it was taken off the list.

**`null` is a real value here**, meaning no category, and `''` is not. The
ticket form draws that distinction already (`useRaiseTicket.ts`).


**The engine is SQLite** through node 26's `node:sqlite` `DatabaseSync` —
synchronous, no driver, no pool. Migrations are plain `.sql` files under
`api/src/platform/db/migrations/`, applied in order by `migrate.js`. **Re-list
that directory before naming a new one**; the last is `0010__customers_user_id.sql`
and another sprint-6 story may land first.

**Two censuses will fail if this story adds a route and forgets them**, and
both read the route table off the router rather than a list:
`api/src/features/audit/audit.guarantee.test.js` (every mutating route writes
its audit rows) and `api/src/platform/http/staff-only.guarantee.test.js` (every
route refuses a customer or is named with the reason it does not). A third,
`ticket-ownership.guarantee.test.js`, covers everything under `/tickets/:id`.

**`api/openapi.json` is checked against the router.** A route served and not
documented fails the suite.

**Errors:** `HttpError(status, code, cause)` — the third argument is `cause`,
never a payload. `unprocessable(['field'])` is the 422 with field names.
Validators return arrays of field names, not objects. The catalogue is frozen
in `api/src/platform/http/errors.js` and mirrored in
`web/src/shared/api/errors.ts`; adding a code means both, plus a sentence in
`en.ts` and `ar.ts`, in the same commit.

**Transactions do not nest.** SQLite refuses `BEGIN` inside `BEGIN`, so a
service method that opens one cannot be called from inside another's — read the
note above `resolveByEmail` in `customers.service.js`, and `makeUser` in
`identity.service.js`, which exists precisely to be callable from within a
caller's transaction.

**A repository function that selects some columns is a trap for its next
caller.** `findLiveCustomerById` selected `id, name` and `findAnyUserById`
omits the password hash — both were correct and both bit a later story that
read a field they did not select. Check the projection before reading a field
off a row.

**This is the fourth write under `/tickets/:id`**, and the three before it —
assign, status, and the history read — set the shape exactly: the revision in
the `WHERE`, `revision = revision + 1` in the `SET`, and `changes === 0` as the
refusal (BR-5). Read `assign` in `tickets.service.js` and follow it.

**The ownership census will fail the moment the route is mounted** unless it
answers a customer the same 404 a missing ticket gets.
`ticket-ownership.guarantee.test.js` reads `/tickets/:id/*` off the router.

**`findLiveCategoryId` refuses a retired category** and `raise` already uses it
— the same check, for the reason its comment gives: a foreign key can see that
a row exists and cannot see that it was taken off the list.

**`null` is a real value here**, meaning no category, and `''` is not. The
ticket form draws that distinction already (`useRaiseTicket.ts`).


## Out of scope

- What this story explicitly does **not** cover:

- **The screen** — `TICKETS-10-WEB (CRM-90)`.
- **Changing several tickets at once.**


- **The screen** — `TICKETS-10-WEB (CRM-90)`.
- **Changing several tickets at once.**

