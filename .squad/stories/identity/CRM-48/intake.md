> **Fetched from jira:** [CRM-48](https://mazen-al-nabarawy.atlassian.net/browse/CRM-48)  
> *Fetched 2026-08-28T13:45:43.215Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** IDENTITY-5-API agent — I read the list of people a ticket can be assigned to  
**Type:** Story  
**Status:** To Do  
**Labels:** agent, backend, identity, pts-2, sprint-1

### Description

agent — I read the list of people a ticket can be assigned to

Story folder: .squad/stories/identity/IDENTITY-5-API-assignable-agents/

Rules this story owns:

	BR-4 — No unbounded list: paginated, filterable, sortable, with a maximum page size.

Cannot ship before: IDENTITY-2-API

Points: 2 · Sprint: 1 · Layer: API

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/identity/CRM-48/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `identity`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-48` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `agent, backend, identity, pts-2, sprint-1`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
IDENTITY-5-API agent — I read the list of people a ticket can be assigned to
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
agent — I read the list of people a ticket can be assigned to

Story folder: .squad/stories/identity/IDENTITY-5-API-assignable-agents/

Rules this story owns:

	BR-4 — No unbounded list: paginated, filterable, sortable, with a maximum page size.

Cannot ship before: IDENTITY-2-API

Points: 2 · Sprint: 1 · Layer: API
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/identity.md, section IDENTITY-5-API:

- Given the list, when it is read, then it contains live staff only — no
  disabled account and no customer.
- Given the list, when it is read, then it is paginated with the ceiling every
  list obeys (BR-4).
- Given a person on the list, when the row is read, then it carries the id,
  the name and the role, and nothing about the password.

And, because this list is not the admin one:

- Given any signed-in staff member, when they read the list, then they get it.
  It is not admin-only: an agent who cannot see it cannot hand a ticket over.
- Given no token, or an unreadable one, then the answer is 401 — the same
  refusal every guarded route gives.
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

**The "no customer" criterion is already true, and must not be implemented as a
filter.** `users` (migration `0005__users.sql`) holds staff only; `role` is
`admin|agent` and `ROLES` in `api/src/features/identity/identity.rules.js:68`
freezes exactly those two. Customers live in their own table
(`0001__customers.sql`). So a `WHERE role != 'customer'` would be dead code
that tells a later reader the schema allows something it does not. Prove the
guarantee with a test that seeds a customer and shows it cannot appear; do not
add a predicate for it.

**Both roles are assignable.** An admin works tickets too. The list is "live
staff", not "role = agent" — do not narrow it.

**This is not `listAccounts`.** `identity.service.js:148` already lists users
and is admin-only, returns `publicShape` (id, email, name, role, and three
timestamps) and is reached at `GET /api/v1/accounts`. This story needs a
different guard and a different projection, in the same feature:
- guard `requireSubject()`, not the `adminOnly` permission
- row is **id, name, role and nothing else** — no email. An assignee picker
  does not need staff email addresses, and every field that travels is a field
  that has to keep being safe.
Reuse the repository layer; add a projection, do not widen the existing one.

**Suggested route: `GET /api/v1/assignees`.** Named for the question it answers
rather than for the table, and it will not be confused with `/accounts`. If the
plan prefers another name it must say why in one line.

**Pagination is already solved — reuse it.** `readPagination(req)` from
`api/src/platform/http/pagination.js` and the page ceiling that refuses rather
than clamps are PLATFORM-6-API's (CRM-21). BR-4 is satisfied by using them, not
by writing new ones. Return the same `{ items, total, limit, offset }` envelope
`listAccounts` returns.

**A read writes no audit row** — the same reasoning as the comment at
`identity.service.js:149`.

**Document the route in `api/openapi.json`.** Note that the contract test
checks routes in both directions but statuses in only one (see L-23), so the
response codes you document are not machine-checked — get them right by hand.

## Out of scope

- What this story explicitly does **not** cover:

- **Assigning a ticket to anybody.** This story returns a list and stops.
  Owned by `TICKETS-3-API` (CRM-76).
- **Any screen that shows the list.** Owned by `TICKETS-3-WEB` (CRM-77) and
  `TICKETS-3-MOB` (CRM-78). No `web/` or `android/` file changes here.
- **Unassigning the queue of somebody who gets disabled**, and reporting how
  much was moved. Owned by `IDENTITY-9-API` (CRM-54).
- **Ordering by workload, capacity or availability**, and anything that picks
  an assignee automatically. Auto-assignment is one of the eleven items the
  brief records as deliberately not built.
- **Changing `users`, `publicShape`, `listAccounts`, `/api/v1/accounts`, the
  permission middleware, or the sign-in path.** If the story seems to need one
  of these, stop — it does not.
- **A schema change.** No migration belongs to this story.
