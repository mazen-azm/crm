> **Fetched from jira:** [CRM-87](https://mazen-al-nabarawy.atlassian.net/browse/CRM-87)  
> *Fetched 2026-08-30T10:11:06.907Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** TICKETS-9-API admin — I add, rename and retire a category without touching the seed  
**Type:** Story  
**Status:** To Do  
**Labels:** admin, backend, pts-3, sprint-6, tickets

### Description

admin — I add, rename and retire a category without touching the seed

Story folder: .squad/stories/tickets/TICKETS-9-API-manage-categories/

Rules this story owns:

	BR-2 — Every mutation is audited: actor, entity, action, before, after, timestamp.

	BR-1 — Nothing is hard-deleted. Deletion sets deleted_at; the audit row survives.

Cannot ship before: TICKETS-6-API, IDENTITY-2-API

Points: 3 · Sprint: 6 · Layer: API

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/tickets/CRM-87/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `tickets`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-87` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `admin, backend, pts-3, sprint-6, tickets`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
TICKETS-9-API admin — I add, rename and retire a category without touching the seed
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
admin — I add, rename and retire a category without touching the seed

Story folder: .squad/stories/tickets/TICKETS-9-API-manage-categories/

Rules this story owns:

	BR-2 — Every mutation is audited: actor, entity, action, before, after, timestamp.

	BR-1 — Nothing is hard-deleted. Deletion sets deleted_at; the audit row survives.

Cannot ship before: TICKETS-6-API, IDENTITY-2-API

Points: 3 · Sprint: 6 · Layer: API
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/tickets.md, section TICKETS-9-API (line 223):

An admin adds, renames and retires a category without touching the seed.

Written 2026-08-30. The seed fills the reference data (SC-3) and that is where
categories come from today; this is the story that lets them change afterwards
without a migration or a re-seed.

*Acceptance criteria*
- Given an admin, when they add a category, then it exists and the ticket form
  offers it. A non-admin is refused 403 and the service never runs (SC-2).
- Given a name a live category already has, then the add is refused naming the
  field rather than creating a second category people cannot tell apart.
  Case-insensitively: two categories differing only in case are one category
  typed twice.
- Given a rename, then every ticket already carrying that category shows the
  new name — because a ticket references the category rather than copying its
  name, and that is what makes a rename possible at all.
- Given a retire, then the category is soft-deleted (BR-1): it leaves the list
  the ticket form offers, and the tickets that already have it keep it and
  still read back. A category that vanished from its tickets would rewrite
  history to tidy a list.
- Given a retired category, then a new ticket cannot be raised into it — which
  TICKETS-1-API already enforces by checking the category is live, and this
  story does not weaken.
- Given a retired category's name, then it may be used again for a new one: the
  uniqueness rule is about live categories, the same way a customer's address
  is.
- Given any of these, then an audit row records it with before and after
  (BR-2).

*Out of scope*
- The screen — TICKETS-9-WEB.
- Merging two categories, or moving tickets between them. Nothing asks for it,
  and it is a different verb from renaming.
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

**Categories already exist and are already read.** `ticket-categories` is
served by `api/src/features/tickets/tickets.routes.js` and filled by the seed
(`api/src/platform/db/seed.js`). `findLiveCategoryId` in
`tickets.repository.js` is what `raise` uses to refuse a retired one — reuse
it rather than writing a second liveness check.

**Retire is a soft delete**, the same `deleted_at` every other removal here
uses (BR-1). The tickets that carry the category keep it: a ticket references
the category by id, which is exactly what makes a rename possible and a retire
safe.

**Uniqueness is among LIVE categories, case-insensitively.** The customers
table solved the same problem with `COLLATE NOCASE` and a partial unique index
scoped to live rows (`0001__customers.sql:4,14-16`) — read it, and say in the
migration why the index is partial.

**Check the name before the index fires.** CRM-82's lesson: an index that fires
gives a raw SQLite error, which escapes as a 500 and tells the caller their
typo was our fault. The index stays as the second guard.

**`adminOnly` already exists** as `requirePermission((s) => s.role === 'admin')`
in `identity.routes.js`. Use the same shape; do not re-check the role inside
the service.


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

**Categories already exist and are already read.** `ticket-categories` is
served by `api/src/features/tickets/tickets.routes.js` and filled by the seed
(`api/src/platform/db/seed.js`). `findLiveCategoryId` in
`tickets.repository.js` is what `raise` uses to refuse a retired one — reuse
it rather than writing a second liveness check.

**Retire is a soft delete**, the same `deleted_at` every other removal here
uses (BR-1). The tickets that carry the category keep it: a ticket references
the category by id, which is exactly what makes a rename possible and a retire
safe.

**Uniqueness is among LIVE categories, case-insensitively.** The customers
table solved the same problem with `COLLATE NOCASE` and a partial unique index
scoped to live rows (`0001__customers.sql:4,14-16`) — read it, and say in the
migration why the index is partial.

**Check the name before the index fires.** CRM-82's lesson: an index that fires
gives a raw SQLite error, which escapes as a 500 and tells the caller their
typo was our fault. The index stays as the second guard.

**`adminOnly` already exists** as `requirePermission((s) => s.role === 'admin')`
in `identity.routes.js`. Use the same shape; do not re-check the role inside
the service.


## Out of scope

- What this story explicitly does **not** cover:

- **The screen** — `TICKETS-9-WEB (CRM-88)`.
- **Merging categories, or moving tickets between them.** A different verb, and
  nothing asks for it.
- **Any `web/` change.**


- **The screen** — `TICKETS-9-WEB (CRM-88)`.
- **Merging categories, or moving tickets between them.** A different verb, and
  nothing asks for it.
- **Any `web/` change.**

