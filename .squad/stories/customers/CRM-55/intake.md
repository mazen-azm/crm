> **Fetched from jira:** [CRM-55](https://mazen-al-nabarawy.atlassian.net/browse/CRM-55)  
> *Fetched 2026-08-29T01:08:27.898Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** CUSTOMERS-1-API agent — I search by name, address or number  
**Type:** Story  
**Status:** To Do  
**Labels:** agent, backend, customers, pts-3, sprint-2

### Description

agent — I search by name, address or number

Story folder: .squad/stories/customers/CUSTOMERS-1-API-customer-search/

Rules this story owns:

	BR-4 — No unbounded list: paginated, filterable, sortable, with a maximum page size.

Cannot ship before: PLATFORM-2-API

Points: 3 · Sprint: 2 · Layer: API

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/customers/CRM-55/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `customers`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-55` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `agent, backend, customers, pts-3, sprint-2`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
CUSTOMERS-1-API agent — I search by name, address or number
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
agent — I search by name, address or number

Story folder: .squad/stories/customers/CUSTOMERS-1-API-customer-search/

Rules this story owns:

	BR-4 — No unbounded list: paginated, filterable, sortable, with a maximum page size.

Cannot ship before: PLATFORM-2-API

Points: 3 · Sprint: 2 · Layer: API
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/customers.md, section CUSTOMERS-1-API:

- Given a search term, when it matches a name, an email address or a phone
  number, then the customer is returned — one search, not three parameters.
- Given the results, when they are read, then they are paginated with the
  ceiling every list obeys, and refused rather than clamped above it (BR-4).
- Given a soft-deleted customer, when a search would otherwise match them, then
  they are not returned.
- Given a term that matches nothing, when the search runs, then the answer is
  an empty page with a total of zero — not a 404. Nothing was missing; nothing
  matched.
- Given no search term at all, when the list is read, then it is the customers
  themselves, paginated, rather than an error.
- Given a search, when it runs, then it writes no audit row: a read is not a
  mutation.
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

- APIs, screens, services already discussed. Repos/roots: `api, web, android`. Primary language: `JavaScript`. **`api/` only** — the screen is `CUSTOMERS-1-WEB` (CRM-56).

**This is the first feature that is not identity, so it sets the shape twelve
more will copy.** `api/src/features/` holds `audit` and `identity` today.
Follow `identity` exactly: `index.js` as the only public surface,
`customers.routes.js` holding `req`/`res` and nothing else,
`customers.service.js` taking and returning values, `customers.repository.js`
as the only file with SQL, `customers.rules.js` for validation. This is not
style preference — `scripts/verify-architecture.mjs` (CRM-30) fails a service
or repository that names `req` or `res`, SQL outside a `*.repository.js`, and
a feature reaching past another feature's `index.js`. Run it before committing.

**Phone search has a real problem, measured rather than guessed.** The column
holds whatever was typed. On SQLite here:

```
stored '+20 100 123 4567',  searched '1001234567'  → NOT found
stored '01001234567',       searched '1001234567'  → found
```

A `LIKE '%term%'` on the raw column therefore finds a customer only when the
caller happens to punctuate the number the same way the record does. Decide
this explicitly — normalise digits on both sides for the phone comparison, or
accept the limitation and write it down. **Do not leave it undecided**; an
agent on the phone typing a number and getting "no results" for a customer who
is right there is the failure this story exists to prevent.

**Case and Arabic are already fine, so do not add machinery for them.**
Measured on this SQLite: `LIKE` is case-insensitive for ASCII in both
directions, and an Arabic substring matches exactly. `email` is additionally
`COLLATE NOCASE`. What is *not* handled is Arabic orthographic variation —
أحمد and احمد are different strings. Name that as a known limitation rather
than solving it here; it is a real problem and a different story.

**`LIKE '%term%'` cannot use an index, and the table has none for this.**
`0001__customers.sql` carries only the partial unique index on `email`. At
demo scale a scan is correct and adding an index that the query cannot use
would be theatre. Say so in a comment rather than leaving a reader to wonder.

**Reuse `readPagination`, do not write a second pager.**
`api/src/platform/http/pagination.js` refuses above the ceiling rather than
clamping — that *is* BR-4 — and returns `{ limit, offset }`. The envelope is
`{ items, total, limit, offset }`, the same one `listAccounts` and
`listAssignees` return. `total` is the count of matches, not of the page.

**Who may search?** Any signed-in staff member — `requireSubject()`, not
`adminOnly`. An agent who cannot find a customer cannot answer the phone.

**The engine is SQLite via `node:sqlite`** (`DatabaseSync`), parameterised
statements only. A search term is user input going into a query; it is bound,
never interpolated, and `%` and `_` in a term are literal characters to a
person typing them.

## Out of scope

- What this story explicitly does **not** cover:

- **The screen** — `CUSTOMERS-1-WEB` (CRM-56). No `web/` change.
- **Creating, editing or deleting a customer** — `CUSTOMERS-4-API`,
  `CUSTOMERS-7-API` and `CUSTOMERS-8-API`, none of them built. This story
  reads.
- **Internal notes** — `CUSTOMERS-3-API` (CRM-60), the next customers story.
- **Identity resolution** — matching an arriving request to a customer or
  creating one — `CUSTOMERS-5-API`.
- **Arabic orthographic normalisation** (أ/ا/إ folding). Name it, do not build
  it.
- **A migration.** The table exists and this story reads it.
- **Full-text search, ranking, or fuzzy matching.** A substring match is what
  the criterion asks for.
- **Sorting options.** BR-4 mentions sortable; the criteria for this story do
  not ask for a sort parameter, so pick one stable order, say why, and leave
  the parameter to the story that needs it.
