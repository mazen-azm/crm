> **Fetched from jira:** [CRM-128](https://mazen-al-nabarawy.atlassian.net/browse/CRM-128)  
> *Fetched 2026-09-02T08:13:12.086Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** REPORTS-3-API admin — I see load per agent, idle agents shown as zero  
**Type:** Story  
**Status:** To Do  
**Labels:** admin, backend, pts-3, reports, sprint-9

### Description

admin — I see load per agent, idle agents shown as zero

Story folder: .squad/stories/reports/REPORTS-3-API-agent-load/

Owns no rule of its own.

Cannot ship before: TICKETS-3-API

Points: 3 · Sprint: 9 · Layer: API

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/reports/CRM-128/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `reports`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-128` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `admin, backend, pts-3, reports, sprint-9`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
REPORTS-3-API admin — I see load per agent, idle agents shown as zero
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
admin — I see load per agent, idle agents shown as zero

Story folder: .squad/stories/reports/REPORTS-3-API-agent-load/

Owns no rule of its own.

Cannot ship before: TICKETS-3-API

Points: 3 · Sprint: 9 · Layer: API
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/reports.md, section REPORTS-3-API (line 136):


An admin sees load per agent, with idle agents shown as zero.

*Acceptance criteria*
- Given the live staff, when the report is read, then every one of them has a
  row, and an agent holding nothing appears with zero rather than being absent.
  This is the story's whole point; see *The zero problem* above.
- Given a disabled account, when the report is read, then it has no row — the
  question is who can take work now, and a disabled account cannot.
- Given a customer, when the report is read, then they never appear: only staff
  roles hold tickets (`STAFF_ROLES`,
  `api/src/features/identity/identity.rules.js:106`).
- Given load, when it is counted, then it means work still on the person:
  tickets assigned to them that are not resolved and not closed. A count of
  everything they have ever touched is a career total, not a workload.
- Given tickets nobody is assigned, when the report is read, then they are not
  attributed to any agent, and their number is reported as its own figure —
  unassigned work is the thing an admin most needs to see, and hiding it inside
  nobody's row is how it goes unnoticed.
- Given a non-admin, when they read it, then 403, decided before the service.
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

**Idle agents shown as zero is not a display detail — it is the query.** A
`GROUP BY tickets.assignee_id` can only return people who have tickets, and the
person an admin opened this report to find is precisely the one holding none.
The rows come from **users**, with the ticket counts joined onto them.

**Live staff only.** `users.deleted_at IS NULL`, and the role in `STAFF_ROLES`
(`api/src/features/identity/identity.rules.js:106`). A disabled account cannot
take work, so it is not part of the answer — and a customer never holds a
ticket.

**Reach identity through its index** (`api-feature-internals`), or take the
staff rows from a repository in `reports/` that reads the `users` table
directly — decide which, say why in the plan, and do not import
`identity.rules.js` by path from another feature.

**Load means work still on the person**: assigned, and not `resolved` and not
`closed`. A count of everything they have ever touched is a career total.
`STATUSES` is at `tickets.rules.js:3`; derive the terminal pair from it rather
than hard-coding two strings in a SQL literal if that is expressible.

**Unassigned tickets are not an agent.** Report them as their own figure —
unassigned work is what an admin most needs to see, and folding it into a row
called "nobody" is how it goes unnoticed.

**Admin-only in middleware** (`identity.routes.js:38`), seen by
`staff-only.guarantee.test.js`; **documented in `api/openapi.json`**;
**SQL in the repository**.

## Out of scope

- **The screen** — `REPORTS-3-WEB (CRM-129)`.
- **Assignment itself** — `TICKETS-3-API (CRM-76)` shipped it.
- **A date window** — `REPORTS-4-API (CRM-130)`.
- **Ranking, targets or a "capacity" number.** The report counts; it does not
  judge.
- **Anything about disabled accounts' old work.** `IDENTITY-9-API (CRM-54)`
  already hands their tickets back on disable.
