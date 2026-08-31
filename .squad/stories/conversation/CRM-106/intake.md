> **Fetched from jira:** [CRM-106](https://mazen-al-nabarawy.atlassian.net/browse/CRM-106)  
> *Fetched 2026-08-30T10:11:13.235Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** CONVERSATION-4-API agent — a long thread pages rather than arriving whole  
**Type:** Story  
**Status:** To Do  
**Labels:** agent, backend, conversation, pts-3, sprint-6

### Description

agent — a long thread pages rather than arriving whole

Story folder: .squad/stories/conversation/CONVERSATION-4-API-thread-pages/

Rules this story owns:

	BR-4 — No unbounded list: paginated, filterable, sortable, with a maximum page size.

Cannot ship before: CONVERSATION-1-API

Points: 3 · Sprint: 6 · Layer: API

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/conversation/CRM-106/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `conversation`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-106` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `agent, backend, conversation, pts-3, sprint-6`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
CONVERSATION-4-API agent — a long thread pages rather than arriving whole
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
agent — a long thread pages rather than arriving whole

Story folder: .squad/stories/conversation/CONVERSATION-4-API-thread-pages/

Rules this story owns:

	BR-4 — No unbounded list: paginated, filterable, sortable, with a maximum page size.

Cannot ship before: CONVERSATION-1-API

Points: 3 · Sprint: 6 · Layer: API
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/conversation.md, section CONVERSATION-4-API (line 136):

A long thread pages rather than arriving whole.

*Acceptance criteria*
- Given a thread, when it is read, then it is paginated with the ceiling every
  list obeys, and the answer says what it gave and from where (BR-4).
- Given the order, then it is oldest first and stable: two messages written in
  the same second do not swap between two reads. The audit trail had this
  problem and solved it the same way.
- Given a page, then its total is the number of messages the reader may see —
  the same rule CONVERSATION-2-API states, applied to the count.
- Given a page window the rules refuse, then it is refused rather than clamped,
  and the field is named.
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

**Oldest first and STABLE.** Two messages written in the same second share a
timestamp — the clock is whole seconds — so the order needs a tiebreak that
does not move. The audit feed had exactly this and solved it with
`ORDER BY at ASC, rowid ASC`; read `listAuditEvents` in
`api/src/features/audit/audit.repository.js`.

**`readPagination(req)` is the shared window** and `MAX_LIMIT` the shared
ceiling, exported from `api/src/platform/http/pagination.js`. BR-4 refuses
rather than clamps.

**The total counts what the reader may see** — the same rule
`CONVERSATION-2-API (CRM-102)` states, applied to the count, and it is the same
predicate in both places or it is two answers.


## Out of scope

- What this story explicitly does **not** cover:

- **The screen** — `CONVERSATION-4-WEB (CRM-107)`.
- **Any `web/` change.**

