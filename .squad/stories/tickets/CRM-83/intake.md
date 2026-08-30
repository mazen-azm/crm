> **Fetched from jira:** [CRM-83](https://mazen-al-nabarawy.atlassian.net/browse/CRM-83)  
> *Fetched 2026-08-29T16:58:44.447Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** TICKETS-7-API agent — I read the whole history in order  
**Type:** Story  
**Status:** To Do  
**Labels:** agent, backend, pts-3, sprint-4, tickets

### Description

agent — I read the whole history in order

Story folder: .squad/stories/tickets/TICKETS-7-API-ticket-history/

Owns no rule of its own.

Cannot ship before: TICKETS-1-API

Points: 3 · Sprint: 4 · Layer: API

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/tickets/CRM-83/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `tickets`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-83` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `agent, backend, pts-3, sprint-4, tickets`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
TICKETS-7-API agent — I read the whole history in order
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
agent — I read the whole history in order

Story folder: .squad/stories/tickets/TICKETS-7-API-ticket-history/

Owns no rule of its own.

Cannot ship before: TICKETS-1-API

Points: 3 · Sprint: 4 · Layer: API
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/tickets.md, section TICKETS-7-API:

- Given a ticket, when its history is read, then every audited change to it is
  returned oldest first, and the order does not depend on two rows having
  different timestamps.
- Given a history entry, when it is read, then it says who, what changed, and
  from what to what — an entry that records only the new value cannot answer
  "who took it off me".
- Given a ticket with a long history, when it is read, then it is paginated with
  the ceiling every list obeys (BR-4).
- Given a ticket that is not on file, then the answer is 404 rather than an empty
  history.
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

- APIs, screens, services already discussed. Repos/roots: `api, web, android`. Primary language: `JavaScript`. **`api/` only.**

**The audit feature has no read path at all.** `features/audit/index.js`
exports `createAuditWriter`, `transact`, `insertAuditEvent` and
`wrapDbWithAuditGuard` — four ways to write and none to read. This story builds
the first read, and where it lives is the decision: a `listAuditEvents` in the
audit repository exported through its `index.js`, called by the tickets
feature. Not a query written inside `tickets.repository.js` against
`audit_events` — that would put one table in two features and
`verify-architecture` would be right to complain.

**The ordering criterion is the one that will be got wrong.** `audit_events.at`
is an ISO-8601 string, and the clock is whole seconds: `stamp()` is
`new Date(now() * 1000).toISOString()`, so every stamp ends `.000Z`. Two changes
in the same second carry **identical** `at` values, and `ORDER BY at ASC` alone
leaves their order to SQLite. Add `rowid ASC` as the tiebreaker — and note
honestly whether removing it actually reddens a test, because SQLite tends to
return equal keys in rowid order anyway and a proof that cannot fail is not a
proof (L-37 records exactly this trap).

**The index that exists is `(entity, entity_id, at DESC)`**
(`0004__audit_events.sql:12-13`), which is the wrong direction for oldest-first.
Read it and decide: either the read is DESC and reversed, or the index gains an
ASC sibling, or the planner uses it backwards perfectly well. Say which, with
the reason — do not add an index without checking whether SQLite already walks
this one in reverse.

**"From what to what" is already stored, in one column.** `diff` is JSON —
SQLite has no JSONB — holding `{ before, after }`. So the shape returned to a
client is a decision: parse it here into `{ before, after }`, or hand the string
over. Parse it. A client parsing our storage format is our storage format
becoming a contract.

**404 when the ticket is not there.** An empty history and a missing ticket are
different answers, and only one of them is an error.

## Out of scope

- What this story explicitly does **not** cover:

- **Any screen** — `TICKETS-7-WEB` (CRM-84).
- **A history for anything other than a ticket.** Customers and articles have
  audit rows too; a general audit browser is `AUDIT-2-API`'s problem if it
  exists, not this story's.
- **Redacting anything.** What the audit stored is what the trail says. BR-1
  protects those rows and nothing here edits them.
- **Who may read it.** Staff-only follows whatever `GET /tickets` requires; a
  customer reading their own ticket's history is `TICKETS-8-API`'s question.
