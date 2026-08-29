> **Fetched from jira:** [CRM-62](https://mazen-al-nabarawy.atlassian.net/browse/CRM-62)  
> *Fetched 2026-08-29T16:58:43.564Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** CUSTOMERS-4-API agent — I add a customer while I am on the phone to them  
**Type:** Story  
**Status:** To Do  
**Labels:** agent, backend, customers, pts-3, sprint-4

### Description

agent — I add a customer while I am on the phone to them

Story folder: .squad/stories/customers/CUSTOMERS-4-API-add-customer/

Rules this story owns:

	I-1 — users and customers are two tables; customers.user_id is null until first sign-in.

Cannot ship before: CUSTOMERS-1-API

Points: 3 · Sprint: 4 · Layer: API

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/customers/CRM-62/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `customers`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-62` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `agent, backend, customers, pts-3, sprint-4`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
CUSTOMERS-4-API agent — I add a customer while I am on the phone to them
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
agent — I add a customer while I am on the phone to them

Story folder: .squad/stories/customers/CUSTOMERS-4-API-add-customer/

Rules this story owns:

	I-1 — users and customers are two tables; customers.user_id is null until first sign-in.

Cannot ship before: CUSTOMERS-1-API

Points: 3 · Sprint: 4 · Layer: API
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/customers.md, section CUSTOMERS-4-API:

- Given a new customer, when they are added, then a `customers` row is written
  and no `users` row is — the two are separate tables and `user_id` stays null
  until a first sign-in (I-1).
- Given an email address already on file, when a customer is added with it, then
  the request is refused naming the field rather than creating a second customer
  for one person (I-4).
- Given a customer added with no email address, then it is accepted — somebody
  who telephones may not have one, and the desk still needs them on file.
- Given a successful add, then an audit row records it (BR-2), and the answer is
  the customer that was created.
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

**There is no `POST /customers` today.** `customers.routes.js` serves the list
and the two note routes and nothing else, so this story adds the write. Copy the
shape `POST /tickets` established: `requireSubject()`, a `validate*` in the
rules layer returning field names, `transact` around the insert and the audit
row, and `publicShape` for the answer.

**The uniqueness the criterion asks for is already in the schema, and it is
partial.** `customers_email_uniq` is `ON customers(email) WHERE email IS NOT
NULL AND deleted_at IS NULL` (`0001__customers.sql:14-16`). Two consequences,
both of which need a test:

- A second live customer with the same address violates it. Left unhandled, the
  raw SQLite error escapes as a **500** — that is exactly what happened with
  `categoryId` in CRM-82, and E-2 says bad input is 422. Check for the existing
  address inside the transaction and refuse with `unprocessable(['email'])`.
- A **soft-deleted** customer does not block the address. That is deliberate,
  and a test should pin it so nobody "fixes" the partial index later.

**I-1 is the rule with teeth here.** `users` and `customers` are two tables, and
`customers.user_id` stays null until a first sign-in. So this route writes one
row in one table. A test that asserts the `users` count is unchanged is what
makes that a guarantee rather than a fact about today's code.

**Email is optional, and that is not the same as blank.** `email TEXT` is
nullable. Absent means "we do not have one"; `''` is not an address and must be
refused or normalised to null — pick one, say which, and pin it. Whatever the
customers rules layer already does for the search term is the precedent.

## Out of scope

- What this story explicitly does **not** cover:

- **Any screen** — `CUSTOMERS-4-WEB` (CRM-63).
- **Editing or removing a customer** — neither has a story yet, and BR-1 would
  make a removal a soft one with its own decisions.
- **Creating a sign-in for them** — `user_id` stays null; that is I-1, and the
  identity feature owns the other half.
- **Identity resolution from an arriving request** — that is `CUSTOMERS-5-API`
  (I-2), a different story.
