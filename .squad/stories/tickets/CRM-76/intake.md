> **Fetched from jira:** [CRM-76](https://mazen-al-nabarawy.atlassian.net/browse/CRM-76)  
> *Fetched 2026-08-29T14:54:52.048Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** TICKETS-3-API agent — I assign a ticket  
**Type:** Story  
**Status:** To Do  
**Labels:** agent, backend, pts-3, sprint-3, tickets

### Description

agent — I assign a ticket

Story folder: .squad/stories/tickets/TICKETS-3-API-assign-ticket/

Rules this story owns:

	BR-5 — No silent overwrite: a write carries the revision it read; a mismatch returns 409. Applies to status change, assignment, priority change, article edit.

	BR-2 — Every mutation is audited: actor, entity, action, before, after, timestamp.

Cannot ship before: TICKETS-1-API, IDENTITY-5-API

Points: 3 · Sprint: 3 · Layer: API

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/tickets/CRM-76/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `tickets`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-76` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `agent, backend, pts-3, sprint-3, tickets`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
TICKETS-3-API agent — I assign a ticket
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
agent — I assign a ticket

Story folder: .squad/stories/tickets/TICKETS-3-API-assign-ticket/

Rules this story owns:

	BR-5 — No silent overwrite: a write carries the revision it read; a mismatch returns 409. Applies to status change, assignment, priority change, article edit.

	BR-2 — Every mutation is audited: actor, entity, action, before, after, timestamp.

Cannot ship before: TICKETS-1-API, IDENTITY-5-API

Points: 3 · Sprint: 3 · Layer: API
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/tickets.md, section TICKETS-3-API:

- Given an assignment, when it succeeds, then the ticket names the assignee and
  an audit row records who changed it, from what, to what (BR-2).
- Given an assignee who is not live staff, then the answer is 422 naming
  `assigneeId`, and nothing is written.
- Given an assignment, when the caller did not send the revision it read, or
  sent a stale one, then the answer is 409 and nothing is written (BR-5).
- Given an unassignment, when it is asked for, then it is legal and audited the
  same way — a ticket may return to nobody.
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

- APIs, screens, services already discussed. Repos/roots: `api, web, android`. Primary language: `JavaScript`. **`api/` only** — the screen is `TICKETS-3-WEB` (CRM-77).

**This is the first write in the product to implement BR-5, so it sets the
shape three more will copy** — status change, priority change and article edit.
Get it right here and they are copies; get it wrong here and they are copies.

**The revision check goes in the WHERE clause. Not in JavaScript.** Read the
row, compare `revision` in code, then UPDATE — the obvious shape — is a
check-then-act race that permits exactly the overwrite BR-5 exists to forbid.
Measured on this engine:

```
read A -> revision 1 ; read B -> revision 1 ; both pass their check ; both write
  result: {"assignee":"agent-B","revision":3}   ← A's write vanished, silently

UPDATE … SET revision = revision + 1 WHERE id = ? AND revision = ?
  writer A: { changes: 1 }
  writer B: { changes: 0 }                      ← B is told, and writes nothing
```

So the statement is `UPDATE tickets SET assignee_id = ?, revision = revision + 1,
updated_at = ? WHERE id = ? AND revision = ? AND deleted_at IS NULL`, and
`changes === 0` is the refusal. **`changes === 0` does not say why**, so the
service then reads the ticket to tell the two apart: no live row → 404, a live
row → 409. Do that read inside the same transaction.

**`revision` is incremented by the statement itself**, never computed in
JavaScript and written back — `revision = revision + 1` is one atomic step and
`revision = ?` with a number worked out in code is the same race in a different
coat. Nothing increments it today; this story is the first, and the pattern it
writes is the one the next three read.

**Validate the assignee in the service, because the schema cannot.**
`0002__tickets.sql:13` says so in as many words: `assignee_id` has no foreign
key, because SQLite cannot add a constraint to an existing table, so "assignee
integrity is enforced by the service, not by a rebuild". Live staff means a row
in `users` with `deleted_at IS NULL`.

**Query `users` from this feature's own repository**, as CRM-71 does for
`customers`. `identity/index.js` publishes only the router and the subject
resolver — `createIdentityService`, which owns `listAssignees`, is not on it —
so importing that list would either fail `verify-architecture` or mean widening
another feature's public surface for one caller. One `SELECT`, with the same
comment CRM-71 carries.

**Unassigning is legal and is not a special case.** A ticket may return to
nobody: `assigneeId: null` clears it, bumps the revision and writes an audit row
like any other assignment. It is not a separate endpoint and not a delete.

**Audit from-and-to, not just to.** BR-2 wants before and after; an audit row
saying only who it went to cannot answer "who took it off me". `before` is the
previous `assignee_id`, which the transaction already has to read.

**409 is the brief's own code for this** — its error contract reads "409 |
Illegal state transition, or a stale write", and `errors.js` anticipates it:
"409 CONFLICT and 409 REVISION_MISMATCH are both honest answers".

## Out of scope

- What this story explicitly does **not** cover:

- **The screen** — `TICKETS-3-WEB` (CRM-77).
- **Changing status or priority**, which BR-5 also governs — `TICKETS-4-API`
  (CRM-79) and a later priority story. This story writes `assignee_id` and
  nothing else on the row besides `revision` and `updated_at`.
- **The list of who may be assigned** — `IDENTITY-5-API` (CRM-48) already
  serves it at `GET /api/v1/assignees`. This story validates one id; it does
  not offer a list.
- **Unassigning everything when somebody is disabled** — `IDENTITY-9-API`
  (CRM-54).
- **Auto-assignment**, which the brief records as deliberately not built.
- **Any migration.** `revision` arrived with `0007`, and `assignee_id` has been
  there since `0002`.
- **Adding a foreign key to `assignee_id`.** The schema explains why it has
  none; rebuilding the table to add one is not this story's business.
