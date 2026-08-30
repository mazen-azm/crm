> **Fetched from jira:** [CRM-57](https://mazen-al-nabarawy.atlassian.net/browse/CRM-57)  
> *Fetched 2026-08-29T16:58:45.489Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** CUSTOMERS-2-API agent — contacts, open tickets and history in one screen  
**Type:** Story  
**Status:** To Do  
**Labels:** agent, backend, customers, pts-5, sprint-4

### Description

agent — contacts, open tickets and history in one screen

Story folder: .squad/stories/customers/CUSTOMERS-2-API-customer-screen/

Owns no rule of its own.

Cannot ship before: CUSTOMERS-1-API, TICKETS-1-API

Points: 5 · Sprint: 4 · Layer: API

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/customers/CRM-57/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `customers`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-57` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `agent, backend, customers, pts-5, sprint-4`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
CUSTOMERS-2-API agent — contacts, open tickets and history in one screen
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
agent — contacts, open tickets and history in one screen

Story folder: .squad/stories/customers/CUSTOMERS-2-API-customer-screen/

Owns no rule of its own.

Cannot ship before: CUSTOMERS-1-API, TICKETS-1-API

Points: 5 · Sprint: 4 · Layer: API
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/customers.md, section CUSTOMERS-2-API:

- Given a customer id, when the screen's data is read, then contacts, open
  tickets and the notes come back together — a screen that assembles this from
  four requests shows four different moments as if they were one.
- Given a customer with many tickets, when they are read, then the tickets are
  paginated with the ceiling every list obeys (BR-4); the customer's own fields
  are not.
- Given a customer id that is not on file, then the answer is 404 rather than an
  empty shape that looks like a customer with nothing.
- Given a retired customer, when they are read, then they still read back — a
  removed customer is not a missing one, and their tickets did not stop existing.
- Given the read, then it writes no audit row.
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

**There is no `GET /customers/:id` either.** Only the list. So this story adds
a read, and the first decision is whether it is one route or two.

**Take one route.** The criterion says why in its own words: four requests show
four different moments as if they were one. `GET /customers/:id` answers
`{ customer, tickets: { items, total, limit, offset }, notes: [...] }`, read
inside a single transaction so the three parts agree with each other.

**"Open tickets" needs defining, and the brief does not define it.** The
statuses are `new open pending resolved closed reopened` (T-1). A ticket a desk
still owes something on is one that is not `resolved` and not `closed` — so
`new`, `open`, `pending`, `reopened`. Say that in the code as a named constant
with the reason, not as a status list inlined in a WHERE clause, because the
next reader will otherwise assume `open` means the status called `open`.

**Cross a feature boundary through its index, or not at all.**
`verify-architecture.mjs` fails a file that reaches into another feature at
anything but `index.js` (`scripts/verify-architecture.mjs:80-84`). Reading a
customer's tickets from the customers feature means `features/tickets/index.js`
exports something for it — a service function, not a repository. Decide what
that export is called and keep it narrow; a customers feature that learns the
tickets table is the boundary gone.

**A retired customer still reads back.** `deleted_at IS NULL` belongs on the
list a form offers, not on the read of one thing that is already known to
exist. The same distinction CRM-82 drew for categories, and for the same reason:
the list and the record answer two different questions.

**The notes are not paginated and the tickets are.** That is not an
inconsistency to tidy: BR-4 is about lists that grow without bound. Say in the
plan why the notes are exempt, or paginate them too — but do not leave it
unremarked either way.

## Out of scope

- What this story explicitly does **not** cover:

- **Any screen** — `CUSTOMERS-2-WEB` (CRM-58).
- **Writing anything.** This is a read, and a read writes no audit row.
- **The conversation on those tickets** — `messages` does not exist.
- **Changing the customers list route.** It stays as it is.
