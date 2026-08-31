> **Fetched from jira:** [CRM-69](https://mazen-al-nabarawy.atlassian.net/browse/CRM-69)  
> *Fetched 2026-08-31T00:36:56.531Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** CUSTOMERS-8-API admin — deleting a customer hides them and keeps the audit trail  
**Type:** Story  
**Status:** To Do  
**Labels:** admin, backend, customers, pts-3, sprint-7

### Description

admin — deleting a customer hides them and keeps the audit trail

Story folder: .squad/stories/customers/CUSTOMERS-8-API-soft-delete/

Rules this story owns:

	BR-1 — Nothing is hard-deleted. Deletion sets deleted_at; the audit row survives.

	BR-2 — Every mutation is audited: actor, entity, action, before, after, timestamp.

Cannot ship before: CUSTOMERS-7-API

Points: 3 · Sprint: 7 · Layer: API

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/customers/CRM-69/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `customers`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-69` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `admin, backend, customers, pts-3, sprint-7`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
CUSTOMERS-8-API admin — deleting a customer hides them and keeps the audit trail
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
admin — deleting a customer hides them and keeps the audit trail

Story folder: .squad/stories/customers/CUSTOMERS-8-API-soft-delete/

Rules this story owns:

	BR-1 — Nothing is hard-deleted. Deletion sets deleted_at; the audit row survives.

	BR-2 — Every mutation is audited: actor, entity, action, before, after, timestamp.

Cannot ship before: CUSTOMERS-7-API

Points: 3 · Sprint: 7 · Layer: API
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/customers.md, section CUSTOMERS-8-API (line 290):

Deleting a customer hides them and keeps the trail.

Written 2026-08-31, with the sprint 7 stories.

*Acceptance criteria*
- Given an admin and a live customer, when they delete them, then the customer
  stops appearing in the list and in search, and the row is still there with
  `deleted_at` set (BR-1). Nothing here is hard-deleted.
- Given their tickets, then those are left exactly as they are. A support
  history is what the desk is for, and deleting the person it is about must not
  quietly delete what happened.
- Given the audit trail, then every row that named them still names them, and
  the delete is one more row on it (BR-2).
- Given an agent rather than an admin, then it is refused and nothing is
  written. Deleting is an admin's, the way retiring a category is.
- Given a customer already deleted, then it is the same 404 a missing one gets,
  and no second audit row is written.
- Given the email a deleted customer held, then it can be used again by a new
  one. The uniqueness is about live customers, the same way a retired
  category's name goes back on the shelf.

*Out of scope*
- What happens to their sign-in account. Nothing in the backlog asks, and the
  honest answer is that this story does not touch it: the account remains, and
  says so here rather than being left for somebody to discover.
- Restoring a deleted customer. The row survives, so it is possible; no story
  asks for it and no route offers it.
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
**Soft delete already has a shape here** — `deleted_at` plus a partial unique
index scoped to live rows, built for ticket categories in `0005__users.sql` and
`manage-categories.test.js`. Read it before designing a second one. A migration
was once written for an index that already existed; the schema answers that
question faster than a guess does.

**`listLiveCustomers` and `countLiveCustomers` already exist** and already
exclude the deleted. Search does too. Check before adding a filter — filtering
twice is one product rule in two places.

**Admin-only is a `requirePermission` guard on the route, not a check inside
the service.** There is no `requireAdmin` — `tickets.routes.js:52` builds a local
`adminOnly = requirePermission((subject) => subject.role === 'admin')` and the
three category writes use it. See
how the category writes are guarded, and note that
`staff-only.guarantee.test.js` drives every route: a new one must either refuse
a customer or be named in `OPEN_TO_A_CUSTOMER` with the reason.

**A customer's tickets must not move.** The ticket rows reference the customer
id; nothing cascades, and nothing should.


## Out of scope

- **Anything that hard-deletes.** BR-1: `deleted_at` is set and the row stays.
- **The customer's sign-in account.** This story does not touch it, and says so
  rather than leaving it for somebody to discover: the account remains.
- **Their tickets.** They are left exactly as they are; nothing cascades.
- **Restoring a deleted customer.** The row survives so it is possible, and no
  story asks for it.
- **The screen** — `CUSTOMERS-8-WEB (CRM-70)`.
