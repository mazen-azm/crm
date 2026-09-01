> **Fetched from jira:** [CRM-113](https://mazen-al-nabarawy.atlassian.net/browse/CRM-113)  
> *Fetched 2026-08-31T11:07:24.173Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** SERVICE-LEVELS-4-API admin — a missed resolution deadline raises it and tells me, once  
**Type:** Story  
**Status:** To Do  
**Labels:** admin, backend, pts-8, service-levels, sprint-8

### Description

admin — a missed resolution deadline raises it and tells me, once

Story folder: .squad/stories/service-levels/SERVICE-LEVELS-4-API-escalation-once/

Rules this story owns:

	S-6 — A resolution breach raises priority one level and notifies an admin exactly once, enforced by a constraint.

Cannot ship before: SERVICE-LEVELS-3-API, NOTIFICATIONS-1-API

Points: 8 · Sprint: 8 · Layer: API

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/service-levels/CRM-113/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `service-levels`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-113` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `admin, backend, pts-8, service-levels, sprint-8`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
SERVICE-LEVELS-4-API admin — a missed resolution deadline raises it and tells me, once
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
admin — a missed resolution deadline raises it and tells me, once

Story folder: .squad/stories/service-levels/SERVICE-LEVELS-4-API-escalation-once/

Rules this story owns:

	S-6 — A resolution breach raises priority one level and notifies an admin exactly once, enforced by a constraint.

Cannot ship before: SERVICE-LEVELS-3-API, NOTIFICATIONS-1-API

Points: 8 · Sprint: 8 · Layer: API
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/service-levels.md, section SERVICE-LEVELS-4-API (line 161):

A missed resolution deadline raises the ticket and tells an admin — once.

Written 2026-08-31, with the sprint 8 stories.

*Acceptance criteria*
- Given a recorded resolution breach, then the ticket's priority rises one
  level and an admin is notified (S-6).
- Given the same breach again, then neither happens a second time. Once is
  enforced by a constraint, not by a check: two sweeps racing must not produce
  two escalations, and the only thing that can promise that is the database.
- Given an `urgent` ticket, then there is no level above it: the notification
  is still sent and the priority stays where it is. A rule that silently did
  nothing for the most urgent tickets would be worst exactly where it matters
  most.
- Given the priority change, then it is audited like any other (BR-2), with no
  human actor — the rule decided it, and the rule has no name.
- Given the new priority, then the deadlines follow it, because
  `SERVICE-LEVELS-1-API` says the promise is about the ticket as it is. A
  ticket escalated for missing a deadline must not thereby be given a later
  one: the breach that has already been recorded stays recorded.
- Given a **first-response** breach, then nothing is escalated. S-6 names the
  resolution deadline, and the two promises are not interchangeable.
- Given no admin exists, then the escalation still happens and the absence is
  not an error. Notifying nobody is a fact about the roster, not a failure of
  the rule.

*Out of scope*
- Escalating more than one level, or repeatedly as time passes. S-6 says one
  level, once.
- A screen for any of it. Nothing in this sprint draws one.
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
**`NOTIFICATIONS-1-API (CRM-115)` is the notification seam.** Its service
method takes the actor and decides whether to write; the kind is a plain
column with no CHECK, deliberately, so a second kind needs no migration. The
table is `notifications` (0014) and the route that reads them is
`/me/notifications`.

**"Enforced by a constraint" is the phrase to take literally.** Two sweeps
racing must not escalate twice, and only the database can promise that — the
breach row's uniqueness is what makes the escalation once, not a check before
it.

**Priority is an enum in `tickets.rules.js`** (`low|normal|high|urgent`).
There is no level above urgent, and the criteria say what happens then.

**A priority change must go through the same writer the desk's does**, so the
deadlines follow it (SERVICE-LEVELS-1-API) and BR-2 gets its row. A null actor
renders as the system in `history-sentence.ts`.


## Out of scope

- **Escalating more than one level, or again as more time passes.** S-6 says one level, once.
- **A screen.** Nothing in this sprint draws one.
- **Escalating a first-response breach.** S-6 names the resolution deadline.
