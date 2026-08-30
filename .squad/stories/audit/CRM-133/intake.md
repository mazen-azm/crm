> **Fetched from jira:** [CRM-133](https://mazen-al-nabarawy.atlassian.net/browse/CRM-133)  
> *Fetched 2026-08-28T13:55:43.399Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** AUDIT-1-API system — every change writes an audit row  
**Type:** Story  
**Status:** To Do  
**Labels:** audit, backend, pts-5, sprint-1, system

### Description

system — every change writes an audit row

Story folder: .squad/stories/audit/AUDIT-1-API-every-change-audited/

Rules this story owns:

	BR-2 — Every mutation is audited: actor, entity, action, before, after, timestamp.

Cannot ship before: PLATFORM-3-API

Points: 5 · Sprint: 1 · Layer: API

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/audit/CRM-133/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `audit`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-133` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `audit, backend, pts-5, sprint-1, system`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
AUDIT-1-API system — every change writes an audit row
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
system — every change writes an audit row

Story folder: .squad/stories/audit/AUDIT-1-API-every-change-audited/

Rules this story owns:

	BR-2 — Every mutation is audited: actor, entity, action, before, after, timestamp.

Cannot ship before: PLATFORM-3-API

Points: 5 · Sprint: 1 · Layer: API
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/audit.md, section AUDIT-1-API:

- Given any mutation of a persisted thing, when it succeeds, then exactly one
  audit row exists for it, carrying the actor, the entity, the entity id, the
  verb, the time, and the before/after difference (BR-2).
- Given a mutation that fails, when the error leaves the service, then no audit
  row survives it — the row and the change are written in one transaction, so
  neither can exist without the other.
- Given a mutation the system performs with nobody signed in, when it is
  audited, then the actor is recorded as absent rather than invented.
- Given a new mutating route added later, when it does not write an audit row,
  then a check fails — the guarantee is enforced, not documented. A rule that
  relies on every future author remembering it is not a rule.
- Given an audit row, when anything tries to change or delete it, then it
  cannot: the rows are append-only, and BR-1 protects them.
- Given an audit row, when it is read, then it contains no password, no token
  and no secret — a diff records that a field changed, and names it, without
  carrying a value that must stay unreadable.
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

- APIs, screens, services already discussed. Repos/roots: `api, web, android`. Primary language: `JavaScript`.

**The table already exists and no migration belongs to this story.**
`api/src/platform/db/migrations/0004__audit_events.sql`, shipped by
PLATFORM-2-API (CRM-17): columns `id, actor_id, entity, entity_id, verb, at,
diff`, with `actor_id` nullable for "the system did it", no `deleted_at` and no
`updated_at` because audit rows are immutable.

**The writer is in the wrong feature, and moving it is the story.**
`insertAuditEvent` is at `api/src/features/identity/identity.repository.js:88`
and the `record(...)` helper that wraps it is at
`api/src/features/identity/identity.service.js:60`. A rule that is global
(BR-2) cannot be owned by one feature — the next feature to mutate anything
would either import from `identity` or quietly write its own. Give the `audit`
feature the writer, and have `identity` depend on it. Identity's three existing
call sites (`identity.service.js:142, 202, 225`) must keep behaving exactly as
they do, and `accounts.test.js` must stay green with no edits — if that test
needs changing, the move was not a move.

**The enforcement is the hard half, and a source scan is the wrong shape for
it.** L-10 and L-13: a guard that reads source text matches the comment
explaining the rule as readily as a breach of it, and this repository has been
bitten by that once already. Also note `api/package.json` declares exactly one
dependency (`express`) and **no** devDependencies, so an AST guard would mean
adding a parser to a package that has kept itself clean — a real cost the plan
must argue for rather than assume.

Prefer a **runtime** guard instead: exercise the app through its own routes with
a `db` handle the test harness has wrapped, and assert that any statement
mutating a non-`audit_events` table is accompanied, in the same transaction, by
an `audit_events` insert. That checks behaviour rather than spelling, it cannot
be fooled by a comment, and it catches a future route the author forgot — which
is the criterion. Whatever guard is chosen, L-16 applies: prove it goes red by
removing a real audit write, and say so in the verification steps.

**Ordering is by `rowid`, never by `at`.** L-19, bought by CRM-44: two rows
written in the same second have equal timestamps and the engine orders them as
it pleases. Any query or assertion that means "in the order it happened" says
`rowid`.

**One transaction.** The change and its audit row are written together or not
at all. `identity.service.js` already does this and its shape is the one to
generalise, not to reinvent.

**The diff names fields, never carries secrets.** Same discipline as the 422
body (`errors.js`): a field name is safe to store, a submitted value may be a
password. `password_hash` must never reach a `diff`, and a test should assert
it cannot.

**SQLite via `node:sqlite`** (`DatabaseSync`), per `docs/architecture.md` and
`api/src/platform/db/connection.js`. No ORM, no query builder, no other
dialect.

## Out of scope

- What this story explicitly does **not** cover:

- **Reading the audit log** — filtering by person, thing or date, and paging it.
  Owned by `AUDIT-2-API` (CRM-134); its screen is `AUDIT-2-WEB` (CRM-135). No
  read route, no query API, no `web/` or `android/` changes here.
- **Auditing mutations that do not exist yet.** Tickets, customers,
  conversations and service levels have no mutating code in the repository
  today. This story makes the guarantee hold for what exists and makes it
  *impossible to skip* for what comes; it does not write audit calls for
  unwritten features.
- **A schema change of any kind.** The table is already right.
- **Retention, archival or pruning of audit rows.** Nothing deletes them; BR-1
  is the whole policy.
- **Changing the sign-in path, the throttle, the permission middleware, the
  error catalogue, or `publicShape`.** If the story seems to need one, stop.
