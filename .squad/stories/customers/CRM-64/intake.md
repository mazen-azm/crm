> **Fetched from jira:** [CRM-64](https://mazen-al-nabarawy.atlassian.net/browse/CRM-64)  
> *Fetched 2026-08-30T02:51:37.846Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** CUSTOMERS-5-API system — an arriving request matches a customer by address, or creates one  
**Type:** Story  
**Status:** To Do  
**Labels:** backend, customers, pts-5, sprint-5, system

### Description

system — an arriving request matches a customer by address, or creates one

Story folder: .squad/stories/customers/CUSTOMERS-5-API-identity-resolution/

Rules this story owns:

	I-2 — Identity resolution creates a customer the moment a request arrives from a new address.

	I-4 — Email addresses identify customers.

Cannot ship before: CUSTOMERS-4-API

Points: 5 · Sprint: 5 · Layer: API

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/customers/CRM-64/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `customers`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-64` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `backend, customers, pts-5, sprint-5, system`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
CUSTOMERS-5-API system — an arriving request matches a customer by address, or creates one
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
system — an arriving request matches a customer by address, or creates one

Story folder: .squad/stories/customers/CUSTOMERS-5-API-identity-resolution/

Rules this story owns:

	I-2 — Identity resolution creates a customer the moment a request arrives from a new address.

	I-4 — Email addresses identify customers.

Cannot ship before: CUSTOMERS-4-API

Points: 5 · Sprint: 5 · Layer: API
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/customers.md, section CUSTOMERS-5-API (line 154):

An arriving request matches a customer by address, or creates one.

Written 2026-08-30. This is I-2 and I-4 made mechanical: *"Identity resolution
creates a customer the moment a request arrives from a new address"* and
*"Email addresses identify customers."*

*Acceptance criteria*
- Given an address already on a live customer, when a request arrives from it,
  then that customer is matched and no second row is written (I-4).
- Given an address that differs only in case, then it matches the same
  customer — the column is `COLLATE NOCASE` and two spellings of one address
  are one person.
- Given an address nobody has, when a request arrives from it, then a customer
  is created for it, then and there (I-2), and an audit row records the
  creation with the system as its actor — nobody was signed in, and "the seed"
  or a borrowed staff id would be an answer nobody can follow up (BR-2).
- Given a name arriving with the request, when the address already belongs to
  somebody, then the stored name is left alone. A stranger typing into a
  public form must not be able to rename a customer on file.
- Given an address belonging only to a soft-deleted customer, then a new
  customer is created rather than the removed one being revived. The partial
  unique index permits exactly this, and BR-1 says a removed row is kept for
  the trail, not for writing to.
- Given a request with no address at all, then it is refused naming the field:
  addresses identify customers, and a request that cannot be attributed cannot
  be resolved (I-4).
- Given resolution, then it never writes a `users` row — a customer who has
  been resolved has not signed in, and `user_id` stays null (I-1).

*Out of scope*
- Matching by phone number. Rule I-4 names the address, and a second key is a
  second answer to who somebody is.
- The route that calls this — CHANNELS-1-API.
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

- APIs, screens, services already discussed. Repos/roots: `api, web, android`. Primary language: `JavaScript`.

**This is a service method, not a route.** Nothing on the public internet calls
identity resolution directly; `CHANNELS-1-API (CRM-118)` calls it, and that
story arrives beside this one. Do not add a route for it.

**It lives in `api/src/features/customers/`**, beside `create`. Read
`customers.service.js` first — `create(actor, input)` at ~line 84 already does
half of this: it validates, checks `findLiveCustomerByEmail`, inserts inside
`transact`, and records an audit row. Resolution is the same shape with the
opposite answer on a hit.

**Reuse `findLiveCustomerByEmail(db, { email })`** from
`customers.repository.js` — it is the lookup `create` uses to refuse a
duplicate, and it already scopes to live rows. A second lookup would be a
second definition of "already on file".

**Do NOT reuse `validateCustomer`.** It deliberately accepts a customer with no
email address ("somebody who telephones may not have one"). Resolution requires
one, because the address is the key it resolves by (I-4). Two different rules,
so two validators — say why in a comment beside the new one.

**Case-insensitivity is the column's, not a query's.** `customers.email` is
`TEXT COLLATE NOCASE` (`api/src/platform/db/migrations/0001__customers.sql:4`).
A `LOWER()` in a WHERE clause would both duplicate that and defeat the index.

**A removed customer does not block a new one.** The unique index is partial —
`WHERE email IS NOT NULL AND deleted_at IS NULL` (same file, lines 14–16). That
is exactly why an address belonging only to a soft-deleted customer resolves to
a new row rather than reviving one.

**The actor is null, and `audit.record` already handles it.**
`api/src/features/audit/audit.service.js` writes `actor?.id ?? null` with the
comment "The system is null, never invented". Pass null; do not invent a seed
user.

**`transact(db, () => …)`** from `../audit/index.js` is the wrapper every
mutation here uses.


## Out of scope

- What this story explicitly does **not** cover:

- **Any route.** This is called by `CHANNELS-1-API (CRM-118)`.
- **Matching by phone number.** Rule I-4 names the address. A second key is a
  second answer to who somebody is.
- **Giving the resolved customer a sign-in.** That is `CUSTOMERS-6-API
  (CRM-65)`; `user_id` stays null here (I-1).
- **Any `web/` change.**

