> **Fetched from jira:** [CRM-23](https://mazen-al-nabarawy.atlassian.net/browse/CRM-23)  
> *Fetched 2026-08-28T02:00:03.645Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** PLATFORM-8-API system — the seed fills reference data and can be run twice  
**Type:** Story  
**Status:** To Do  
**Labels:** backend, platform, pts-2, sprint-0, system

### Description

system — the seed fills reference data and can be run twice

Story folder: .squad/stories/platform/PLATFORM-8-API-seed-reference-data/

Rules this story owns:

	SC-3 — The demo database is generated; schema plus seed produces a working system.

Cannot ship before: PLATFORM-2-API

Points: 2 · Sprint: 0 · Layer: API

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/platform/CRM-23/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `platform`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-23` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `backend, platform, pts-2, sprint-0, system`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
PLATFORM-8-API system — the seed fills reference data and can be run twice
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
system — the seed fills reference data and can be run twice

Story folder: .squad/stories/platform/PLATFORM-8-API-seed-reference-data/

Rules this story owns:

	SC-3 — The demo database is generated; schema plus seed produces a working system.

Cannot ship before: PLATFORM-2-API

Points: 2 · Sprint: 0 · Layer: API
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/platform.md, section ## PLATFORM-8-API (lines 95-113) — binding:

- Given an empty database, when the seed runs, then staff, customers, categories
  and service-level targets exist.
- Given a seeded database, when the seed runs again, then no row is duplicated.
- Given the seed has run, when it finishes, then it prints the password it set,
  because an admin who cannot sign in has been handed nothing.
- Given the seed, when it is read, then it builds its own services rather than
  importing the application's. It is a second composition root, on purpose.
- Given `npm run seed`, when it is typed after any file move, then it runs.

Plus the rule this story owns, SC-3 (scripts/rules.txt line 38): the demo
database is generated — schema plus seed produces a working system.
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

- **A gap this story must close first, verified against the live database:**
  there is **no `users` table**. PLATFORM-2-API (CRM-17) shipped four
  migrations — `0001__customers`, `0002__tickets`, `0003__service_levels`,
  `0004__audit_events` — and identity's table was dropped when that plan was
  rewritten for SQLite. The criteria here require **staff** to exist after the
  seed, and `tickets.assignee_id` is already a bare column with no table
  behind it. So this story adds `api/src/platform/db/migrations/0005__users.sql`
  (id, email COLLATE NOCASE, password_hash, name, role, created_at,
  updated_at, deleted_at; partial unique index on email where deleted_at IS
  NULL, matching the customers pattern in `0001__customers.sql`). Sessions and
  everything about signing in stay with IDENTITY-1-API (CRM-41) — this story
  creates only the table it must seed into.
- **What already exists (extend, do not re-create):**
  `api/src/platform/db/migrate.js` (`runMigrations(db)`), `connection.js`
  (`openDatabase(dbPath)`), `config/index.js` (`config.dbPath`, `:memory:`
  under NODE_ENV=test). 75 tests pass. The API root has exactly one runtime
  dependency, `express`.
- **The seed is a second composition root, on purpose** (criteria, and
  `docs/architecture.md`). It must NOT import `createApp` or anything from
  `platform/http/`. It opens its own connection, runs migrations if needed,
  and writes rows. Two call sites for every future service signature is the
  point — a change that breaks one gets caught by the other.
- **Idempotence is by identity, not by counting.** Run twice, no duplicate
  row. Prefer `INSERT ... ON CONFLICT DO NOTHING` against the natural key that
  already has a unique index (customer email, user email, category name,
  sla_targets.priority) over "SELECT count then decide" — the constraint is
  the truth, and a check-then-insert races with itself.
- **The password:** hash with **`node:crypto`'s `scrypt`** — no bcrypt, no
  argon2, no new dependency. Store `salt:hash` hex in `password_hash`. The
  seed prints the plaintext it generated **once, to stdout, at the end**, and
  never writes it to a file. Generate it with `crypto.randomBytes`, do not
  hardcode one — a hardcoded demo password in a repository is a credential.
- **The data is written, not generated.** Real-sounding names and subjects, in
  a `seed.data.js` beside the seeder. Fifty rows of "Customer 37" fill the
  same screen and demonstrate nothing.
- **No tickets.** The criteria put them out of scope here because the deadline
  arithmetic would become a second copy of the SLA promise.
- **`npm run seed`** is added to `api/package.json` next to `migrate`, in the
  same `node --env-file-if-exists=.env` form.
- Read `.squad/plan-lessons.md` (12 lessons). L-5: the engine is SQLite via
  `node:sqlite`, `DatabaseSync`, `:memory:` in tests — no other dialect.
- APIs, screens, services already discussed. Repos/roots: `api, web, android`. Primary language: `JavaScript`.

## Out of scope

- What this story explicitly does **not** cover:
- Tickets and their SLA clocks — PLATFORM-17-API owns seeding those, because
  the deadline arithmetic belongs to the service that owns the promise.
- Signing in, sessions, tokens, roles as an enforced concept — IDENTITY-1-API
  (CRM-41). This story creates the users table and rows in it, nothing that
  authenticates.
- Any HTTP route or feature service. The seed is a script, not an endpoint.
- The React skeleton — PLATFORM-9-WEB (CRM-24).
- Checking that package scripts name files that exist — PLATFORM-15-ALL.
