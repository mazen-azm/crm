> **Fetched from jira:** [CRM-110](https://mazen-al-nabarawy.atlassian.net/browse/CRM-110)  
> *Fetched 2026-08-31T11:07:22.928Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** SERVICE-LEVELS-3-API agent — a missed deadline is recorded once and shown on the queue  
**Type:** Story  
**Status:** To Do  
**Labels:** agent, backend, pts-5, service-levels, sprint-8

### Description

agent — a missed deadline is recorded once and shown on the queue

Story folder: .squad/stories/service-levels/SERVICE-LEVELS-3-API-recorded-breach/

Rules this story owns:

	S-5 — A breach is a stored row, never recomputed on read.

Cannot ship before: SERVICE-LEVELS-2-API

Points: 5 · Sprint: 8 · Layer: API

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/service-levels/CRM-110/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `service-levels`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-110` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `agent, backend, pts-5, service-levels, sprint-8`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
SERVICE-LEVELS-3-API agent — a missed deadline is recorded once and shown on the queue
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
agent — a missed deadline is recorded once and shown on the queue

Story folder: .squad/stories/service-levels/SERVICE-LEVELS-3-API-recorded-breach/

Rules this story owns:

	S-5 — A breach is a stored row, never recomputed on read.

Cannot ship before: SERVICE-LEVELS-2-API

Points: 5 · Sprint: 8 · Layer: API
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/service-levels.md, section SERVICE-LEVELS-3-API (line 101):

A missed deadline is recorded once, as a fact rather than a calculation.

Written 2026-08-31, with the sprint 8 stories.

*Acceptance criteria*
- Given a clock whose deadline has passed and which has not stopped, when the
  breach is recorded, then a row exists saying which ticket, which clock, and
  when it was missed (S-5).
- Given the same clock a second time, then no second row is written. Once is
  enforced by a unique constraint on the ticket and the kind, not by a check
  that ran first — a check is a race and a constraint is not.
- Given a clock that stopped before its deadline, then nothing is recorded.
  The desk answered in time; there is nothing to say.
- Given the paused time, then it counts: a resolution deadline is missed only
  when the time actually owed has passed (S-4). A breach recorded against a
  ticket that spent a week waiting on the customer would be the product
  blaming the desk for the customer's silence.
- Given a read of a ticket or of the queue, then the breach comes from the
  stored row and is never recomputed (S-5). A number computed on read is a
  number that changes when nobody changed anything.
- Given this application has no scheduler, then the sweep that records breaches
  is triggered the way `TICKETS-14-API`'s already is — a route an operator or a
  cron calls — and the plan says so rather than inventing a runtime.
- Given a sweep that finds nothing, then it writes nothing and is not an
  error. Most sweeps will find nothing.

*Out of scope*
- Raising the priority, or telling anybody — `SERVICE-LEVELS-4-API`. This story
  records the fact; that one acts on it.
- Un-recording a breach. A deadline that was missed stays missed; resolving the
  ticket afterwards does not unmake it (BR-1's spirit, applied to a fact
  rather than a row).
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
**`TICKETS-14-API (CRM-96)` shipped the sweep pattern** this story needs —
`POST /tickets/sweep-auto-close`, admin-only, one transaction per row, a null
audit actor, and a `{ closed, at }` report. Read it before designing a second
shape, and note that it is named in **two** censuses:
`stale-write.guarantee.test.js` (with the reason it carries no revision) and
`audit.guarantee.test.js`. A new sweep route will be caught by both.

**A breach is a row, and once is a constraint.** `sla_clocks` already has a
unique constraint per ticket and kind (0003); a breaches table wants the same
shape rather than a `SELECT` that runs first. A check is a race and a
constraint is not.

**The deadline is computed on read today** —
`service-levels.repository.js:4` says so, from `started_at`, `paused_ms` and
the target row. Recording a breach must use that same computation rather than a
second one; a number worked out twice is two numbers.

**The queue's rows come from `publicShape`** in `tickets.service.js`. Whatever
the queue must show about a breach travels there, and the four censuses see any
new route.


## Out of scope

- **Raising the priority or telling anybody** — `SERVICE-LEVELS-4-API (CRM-113)`.
- **Un-recording a breach.** A missed deadline stays missed.
- **The screen** — `SERVICE-LEVELS-3-WEB (CRM-111)`.
- **Adding a scheduler, timer or worker.** The sweep is a route, as `TICKETS-14-API` established.
