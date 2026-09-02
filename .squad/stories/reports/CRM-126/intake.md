> **Fetched from jira:** [CRM-126](https://mazen-al-nabarawy.atlassian.net/browse/CRM-126)  
> *Fetched 2026-09-02T08:13:10.759Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** REPORTS-2-API admin — I see what share of tickets met their promise  
**Type:** Story  
**Status:** To Do  
**Labels:** admin, backend, pts-5, reports, sprint-9

### Description

admin — I see what share of tickets met their promise

Story folder: .squad/stories/reports/REPORTS-2-API-promise-share/

Rules this story owns:

	S-5 — A breach is a stored row, never recomputed on read.

Cannot ship before: SERVICE-LEVELS-3-API

Points: 5 · Sprint: 9 · Layer: API

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/reports/CRM-126/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `reports`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-126` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `admin, backend, pts-5, reports, sprint-9`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
REPORTS-2-API admin — I see what share of tickets met their promise
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
admin — I see what share of tickets met their promise

Story folder: .squad/stories/reports/REPORTS-2-API-promise-share/

Rules this story owns:

	S-5 — A breach is a stored row, never recomputed on read.

Cannot ship before: SERVICE-LEVELS-3-API

Points: 5 · Sprint: 9 · Layer: API
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/reports.md, section REPORTS-2-API (line 90):


An admin sees what share of tickets met their promise.

This is the report that is easiest to get wrong in a way that flatters the
desk, so its criteria are about the denominator.

*Acceptance criteria*
- Given the two kinds of clock (S-1, line 20 — first response and resolution),
  when the share is reported, then there is a share **per kind**. One number
  mixing them answers no question anybody has.
- Given a ticket whose clock is still running and whose deadline has not
  passed, when the share is computed, then that ticket is in neither the
  numerator nor the denominator: it has not met its promise, it has simply not
  broken it yet. `met = total − breached` is the wrong formula, and it reads
  best on the day the desk opens.
- Given a clock, when it is counted as settled, then it is settled because it
  stopped or because a breach row exists for it — the two ways a promise
  finishes.
- Given a breach, when it is counted, then it is counted from `sla_breaches`
  and never by comparing a deadline to the clock (S-5, line 24). A report that
  recomputes will disagree with the queue whenever the sweep is behind.
- Given a period in which nothing settled, when the share is read, then the
  answer says there is no data — not zero per cent, which is the same shape as
  a desk that missed everything.
- Given the counts and the share, when both are returned, then the share is
  derived from those exact counts, so a reader can check the arithmetic and a
  rounded percentage never contradicts the numbers beside it.
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

**The denominator is the whole story.** `met = total − breached` counts every
still-running clock as met, reads best on the desk's first day, and is wrong.
A clock that has not stopped and has no breach row has not finished; it belongs
in neither number.

**A breach is a stored row, never recomputed** — S-5, `scripts/rules.txt` line
24. `api/src/platform/db/migrations/0003__service_levels.sql` defines
`sla_breaches` with `UNIQUE (ticket_id, kind)` and `sla_clocks` with
`stopped_at` and `paused_ms`. Count rows. **Do not** call
`deadlineMsFor(...)` in `service-levels.service.js` to decide met or missed
here: that is the read path, and a report computing its own answer will
disagree with the queue whenever the sweep is behind, with no way to tell which
is lying.

**A report must never run the sweep.** `POST /tickets/sweep-breaches` exists
and is a write. A GET that quietly writes breach rows so its own number looks
current is the failure this hint exists to prevent.

**Two kinds, two shares.** `kind` is `first_response` or `resolution` (S-1).
One number averaging them answers nobody's question.

**No settled clocks is not zero per cent.** Return the counts and let the
absence of data be visible as absence — zero per cent is the shape of a desk
that missed everything.

**Return the counts alongside the share**, so the arithmetic can be checked and
a rounded percentage never contradicts the numbers beside it.

**Admin-only, in middleware** (`identity.routes.js:38`), seen by
`staff-only.guarantee.test.js`. **Documented in `api/openapi.json`**, or
`openapi-contract.test.js` fails.

**SQL in the repository only** (`api-sql-only-in-repository`).

## Out of scope

- **Recording breaches.** `SERVICE-LEVELS-3-API (CRM-110)` shipped the sweep
  and the rows; this story counts them.
- **Running the sweep from a report.** A read never writes.
- **The screen** — `REPORTS-2-WEB (CRM-127)`.
- **A date window** — `REPORTS-4-API (CRM-130)`.
- **Per-agent or per-priority breakdowns.** Not asked for; agent load is
  `REPORTS-3-API (CRM-128)`.
