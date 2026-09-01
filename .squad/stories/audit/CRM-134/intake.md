> **Fetched from jira:** [CRM-134](https://mazen-al-nabarawy.atlassian.net/browse/CRM-134)  
> *Fetched 2026-08-31T11:07:36.293Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** AUDIT-2-API admin — I read the audit log filtered by person, thing or date  
**Type:** Story  
**Status:** To Do  
**Labels:** admin, audit, backend, pts-3, sprint-8

### Description

admin — I read the audit log filtered by person, thing or date

Story folder: .squad/stories/audit/AUDIT-2-API-read-audit-log/

Rules this story owns:

	BR-4 — No unbounded list: paginated, filterable, sortable, with a maximum page size.

Cannot ship before: AUDIT-1-API

Points: 3 · Sprint: 8 · Layer: API

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/audit/CRM-134/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `audit`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-134` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `admin, audit, backend, pts-3, sprint-8`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
AUDIT-2-API admin — I read the audit log filtered by person, thing or date
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
admin — I read the audit log filtered by person, thing or date

Story folder: .squad/stories/audit/AUDIT-2-API-read-audit-log/

Rules this story owns:

	BR-4 — No unbounded list: paginated, filterable, sortable, with a maximum page size.

Cannot ship before: AUDIT-1-API

Points: 3 · Sprint: 8 · Layer: API
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/audit.md, section AUDIT-2-API (line 38):

An admin reads the audit log, filtered by person, thing or date.

*Acceptance criteria*
- Given the log, when it is read, then it is paginated with the ceiling every
  list obeys (BR-4).
- Given a filter by actor, by entity and id, or by a date range, when it is
  applied, then only matching rows are returned, and the filters combine.
- Given two rows written in the same second, when the log is read in order,
  then their order is the order they were written — the timestamp does not
  decide it (L-19).
- Given anybody who is not an admin, when they read the log, then the answer is
  403 and no row travels.
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
**`AUDIT-1-API` shipped the trail and its reader**; read
`audit.repository.js` and the ticket-history route before adding a filter, and
check what `listAuditEvents` already accepts. This story is the filters, not
the feed.

**`audit.guarantee.test.js` drives every mutating route** and asserts one row
each. A filter must not change what is written, only what is returned.

**BR-4 applies**: paged, and a window it does not allow is refused naming the
field. `readPagination` is the shared helper.

**A filter by person is a filter by actor id**, and the trail stores a null
actor for the system — a filter that could not express "the system" would hide
exactly the rows nobody else can explain.

**Admin-only, and `staff-only.guarantee.test.js` will see the route.**


## Out of scope

- **Changing what is written.** This story filters what is returned.
- **A retention or export story.** Neither is asked for.
- **The screen** — `AUDIT-2-WEB (CRM-135)`.
