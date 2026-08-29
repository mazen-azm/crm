> **Fetched from jira:** [CRM-60](https://mazen-al-nabarawy.atlassian.net/browse/CRM-60)  
> *Fetched 2026-08-29T01:24:23.061Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** CUSTOMERS-3-API agent — I write an internal note about a customer  
**Type:** Story  
**Status:** To Do  
**Labels:** agent, backend, customers, pts-3, sprint-2

### Description

agent — I write an internal note about a customer

Story folder: .squad/stories/customers/CUSTOMERS-3-API-internal-note/

Rules this story owns:

	BR-2 — Every mutation is audited: actor, entity, action, before, after, timestamp.

Cannot ship before: CUSTOMERS-1-API

Points: 3 · Sprint: 2 · Layer: API

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/customers/CRM-60/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `customers`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-60` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `agent, backend, customers, pts-3, sprint-2`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
CUSTOMERS-3-API agent — I write an internal note about a customer
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
agent — I write an internal note about a customer

Story folder: .squad/stories/customers/CUSTOMERS-3-API-internal-note/

Rules this story owns:

	BR-2 — Every mutation is audited: actor, entity, action, before, after, timestamp.

Cannot ship before: CUSTOMERS-1-API

Points: 3 · Sprint: 2 · Layer: API
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/customers.md, section CUSTOMERS-3-API:

- Given a note, when it is written, then it is attached to the customer and
  carries who wrote it and when.
- Given a note, when it is written, then an audit row is written in the same
  transaction (BR-2).
- Given a note on a customer who does not exist, or on a soft-deleted one, then
  the answer is 404 and nothing is written.
- Given an empty or whitespace-only note, then the answer is 422 naming the
  field, and nothing is written.
- Given the notes on a customer, when they are read, then they are in the order
  they were written — by `rowid`, because two notes can share a timestamp
  (L-19).
- Given a note, when it is read, then it is internal: nothing in the customer
  portal's own responses ever carries it.
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

- APIs, screens, services already discussed. Repos/roots: `api, web, android`. Primary language: `JavaScript`. **`api/` only** — no screen for these in this sprint.

**This story needs a migration, and it is the first one written since the
schema was laid down.** There is no notes table: `0001__customers.sql` through
`0005__users.sql` are all there is. Add `0006__customer_notes.sql`. The runner
(`api/src/platform/db/migrate.js`) is safe to run twice; follow the existing
files' shape exactly, including the comment style that says why each column
exists.

**A note about a CUSTOMER is not a note on a TICKET, and the difference is not
cosmetic.** `CONVERSATION-2-API` ("my internal note never reaches a customer,
in any response") is a note inside a ticket's thread, it owns rule SC-2, and it
is a sprint-6 story with no table yet either. Do **not** build a shared
`notes` table to serve both: it would be designing for criteria that have not
been written, against a story whose rules differ. Name the distinction in the
migration's comment so the next person does not merge them by accident.

**Audit it through the audit feature, not around it.** `AUDIT-1-API` (CRM-133)
put the writer in `api/src/features/audit/` and exposes `createAuditWriter` and
`transact` from its `index.js`. Import from there. The guard added by that
story fails any commit that mutates a non-`audit_events` table without an audit
row in the same transaction, so a note written outside `transact` will not land
— which is the point, and worth watching happen once.

**Deleted customers are 404, not 200 with an empty list.** `customers` carries
`deleted_at`; a note on a soft-deleted customer is a note on somebody who has
been removed, and BR-1 keeps their row for the audit trail rather than for
writing to. The repository's lookup filters `deleted_at IS NULL`, the same
shape `findLiveUserByEmail` uses.

**Order by `rowid`, never by the timestamp.** L-19, bought by CRM-44: two notes
written in the same second have equal `at` values and the engine orders them as
it pleases. `verify-architecture.mjs` does not check this — the discipline is
the comment and the test.

**"Internal" is a rule to state, not a thing to build.** There is no customer
portal yet (`portal` is a later feature), so nothing can leak. Write the rule
into the code's comments and the criteria; do not invent a visibility flag or a
filtering layer for a consumer that does not exist.

**The structure is enforced.** `verify-architecture.mjs` fails SQL outside a
`*.repository.js`, a service naming `req` or `res`, and a feature reaching past
another feature's `index.js`. Run it before committing.

## Out of scope

- What this story explicitly does **not** cover:

- **A screen for notes.** The backlog puts the web half at `WEB:4:2` — a later
  sprint. No `web/` change.
- **Notes on tickets** — `CONVERSATION-2-API`, sprint 6, different rules and a
  different table.
- **Editing or deleting a note.** Nothing in the criteria asks for either, and
  BR-1 would make deletion a soft one with its own decisions.
- **The customer portal, or any visibility filtering for it.** It does not
  exist.
- **Mentions, attachments, or formatting in a note.** It is text.
- **Changing `customers`, the audit feature, or the pagination reader.**
- **Paging the notes list**, unless reading notes is part of this story's
  endpoint surface — if it is, reuse `readPagination` and say so; if it is not,
  say that instead. Do not leave it ambiguous.
