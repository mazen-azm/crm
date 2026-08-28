> **Fetched from jira:** [CRM-44](https://mazen-al-nabarawy.atlassian.net/browse/CRM-44)  
> *Fetched 2026-08-28T03:19:32.003Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** IDENTITY-2-API admin — I create, disable and re-enable accounts, and set roles  
**Type:** Story  
**Status:** To Do  
**Labels:** admin, backend, identity, pts-5, sprint-1

### Description

admin — I create, disable and re-enable accounts, and set roles

Story folder: .squad/stories/identity/IDENTITY-2-API-manage-accounts/

Rules this story owns:

	I-3 — Staff accounts are created by an admin; the first admin comes from the seed.

	BR-2 — Every mutation is audited: actor, entity, action, before, after, timestamp.

Cannot ship before: IDENTITY-1-API

Points: 5 · Sprint: 1 · Layer: API

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/identity/CRM-44/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `identity`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-44` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `admin, backend, identity, pts-5, sprint-1`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
IDENTITY-2-API admin — I create, disable and re-enable accounts, and set roles
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
admin — I create, disable and re-enable accounts, and set roles

Story folder: .squad/stories/identity/IDENTITY-2-API-manage-accounts/

Rules this story owns:

	I-3 — Staff accounts are created by an admin; the first admin comes from the seed.

	BR-2 — Every mutation is audited: actor, entity, action, before, after, timestamp.

Cannot ship before: IDENTITY-1-API

Points: 5 · Sprint: 1 · Layer: API
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/identity.md, section ## IDENTITY-2-API — binding:

- Given an admin, when they create an account, then it exists with the role
  they chose and a password only the new person can use.
- Given a non-admin, when they attempt any of it, then the answer is 403 and
  the service never runs.
- Given a disabled account, when the same address is re-enabled, then it is
  the same row — nothing is hard-deleted (BR-2).
- Given an address that already belongs to a live account, when it is used
  again, then the answer is 409.

Rules owned: I-3 (staff accounts are created by an admin) and BR-2 (nothing is
hard-deleted; disabling sets a timestamp and the row survives).
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

- **The identity feature exists** — `api/src/features/identity/` with
  `index.js`, `identity.routes.js`, `identity.service.js`,
  `identity.repository.js`, `identity.rules.js`,
  `identity.subject-resolver.js`. This story adds routes and service methods
  to it. **Do not create a second feature folder.**
- **The guard already exists and must be used, not reinvented:**
  `requirePermission(policy)` from `api/src/platform/http/permission.js` takes
  `(subject, req) => boolean`. An admin-only route is
  `requirePermission((subject) => subject.role === 'admin')`. Its test already
  proves the service is never entered on a refusal — the second criterion is
  about exactly that, so assert it the same way (a flag the handler would set).
- **`users.deleted_at` is what disabling sets** (migration `0005__users.sql`).
  There is no separate `disabled` column and this story must not add one:
  `findLiveUserByEmail` already filters on `deleted_at IS NULL`, so a disabled
  account cannot sign in the moment it is disabled — that behaviour is already
  covered by an IDENTITY-1-API test and must keep passing.
  **Re-enabling is `deleted_at = NULL` on the same row.** The partial unique
  index means a disabled account's address is free while it is disabled, so
  re-enabling can collide — say what happens then rather than discovering it.
- **The 409 is `CONFLICT`**, which is in `DOCUMENTED`. Every status this story
  answers must be one of the eight (L-11).
- **Passwords:** `hashPassword` lives in `api/src/shared/password.js` and is
  used by the seed and by identity already. A created account needs a password
  the admin does not choose and does not keep — generate it, return it once in
  the creation response, store only the hash. Say plainly in the plan that
  returning it once is the deliberate trade and which story replaces it
  (IDENTITY-6-API sets a password properly).
- **Every list obeys BR-4.** If this story lists accounts, it uses
  `readPagination(req)` from `api/src/platform/http/pagination.js`, which
  refuses a limit above the ceiling rather than clamping.
- **The routes must be documented in the same commit** — `api/openapi.json`,
  or the contract test fails naming them. Add them to `api/requests.json` too.
- **The composition is `api/src/compose.js`**, which both `server.js` and the
  contract tests import. New routes mount inside the identity router.
- Node 26, SQLite via `node:sqlite`, no new dependency. 102 API tests pass and
  none may break. Read `.squad/plan-lessons.md` (18 lessons).
- APIs, screens, services already discussed. Repos/roots: `api, web, android`. Primary language: `JavaScript`.

## Out of scope

- What this story explicitly does **not** cover:
- The admin screens — IDENTITY-2-WEB, which is sprint 9.
- Throttling — IDENTITY-4-API (CRM-47), next in this sprint.
- The assignable-agents list — IDENTITY-5-API (CRM-48). If this story lists
  accounts at all, that list is the admin's, not the assignment picker.
- Setting or changing a password properly — IDENTITY-6-API and
  IDENTITY-7-API.
- Unassigning a disabled person's queue — IDENTITY-9-API, which needs tickets.
- Customers. Rule I-1 keeps users and customers as two tables; this story
  touches only `users`.
