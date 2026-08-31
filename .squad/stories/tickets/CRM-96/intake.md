> **Fetched from jira:** [CRM-96](https://mazen-al-nabarawy.atlassian.net/browse/CRM-96)  
> *Fetched 2026-08-31T00:37:07.414Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** TICKETS-14-API system — a resolved ticket closes itself once the window passes  
**Type:** Story  
**Status:** To Do  
**Labels:** backend, pts-3, sprint-7, system, tickets

### Description

system — a resolved ticket closes itself once the window passes

Story folder: .squad/stories/tickets/TICKETS-14-API-auto-close/

Rules this story owns:

	T-6 — A resolved ticket auto-closes after 14 days.

Cannot ship before: TICKETS-11-API

Points: 3 · Sprint: 7 · Layer: API

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/tickets/CRM-96/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `tickets`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-96` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `backend, pts-3, sprint-7, system, tickets`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
TICKETS-14-API system — a resolved ticket closes itself once the window passes
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
system — a resolved ticket closes itself once the window passes

Story folder: .squad/stories/tickets/TICKETS-14-API-auto-close/

Rules this story owns:

	T-6 — A resolved ticket auto-closes after 14 days.

Cannot ship before: TICKETS-11-API

Points: 3 · Sprint: 7 · Layer: API
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/tickets.md, section TICKETS-14-API (line 417):

A resolved ticket closes itself once the window passes.

Written 2026-08-31, with the sprint 7 stories.

*Acceptance criteria*
- Given a ticket resolved more than fourteen days ago, then it is closed (T-6)
  — the same fourteen days after which a customer can no longer reopen it by
  replying (T-5), read from the same rule rather than from a second constant.
- Given a ticket resolved inside the window, then it is left alone, and a
  customer replying still reopens it. The two rules meet exactly: there is no
  day on which a ticket is too old to reopen and not yet closed, and none on
  which it is closed and still reopenable.
- Given the close, then it is audited with no human actor (BR-2) — the trail
  already renders a null actor as the system, and a close attributed to
  whichever admin happened to call the route would be a false record.
- Given the close, then it obeys the state machine: only a resolved ticket
  closes this way, and a ticket already closed is not closed twice.
- Given this application has no scheduler, then how the sweep is triggered is
  stated in the plan and not invented in a comment. The honest options are a
  route an operator or a cron can call, and evaluating on read; the second
  makes every read a write and is refused for that reason. Whichever is built,
  a ticket that is never read must still close.
- Given a sweep that closes nothing, then it is not an error and writes no
  rows. Most sweeps will close nothing.

*Out of scope*
- Reopening a ticket the sweep closed. Closed is terminal — TICKETS-4-API's
  argument, which this does not weaken. After fourteen days there was nothing
  to reopen anyway.
- Telling anybody it happened. Nothing in the backlog asks, and a notification
  per auto-close would be one per resolved ticket a fortnight later.
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
**There is no scheduler in this application and nothing may add one silently.**
`now` is injected into every service and replaced in tests; there is no cron, no
timer, no background worker. The criteria say the trigger must be stated in the
plan. Evaluating on read is refused there and the reason is given — say which
option is built and why.

**`REOPEN_WINDOW_DAYS` in `tickets.rules.js` is the fourteen days**, and T-5
already uses it via `withinReopenWindow`. T-6 is the same fortnight; a second
constant would let the two rules drift apart, leaving a day on which a ticket is
neither reopenable nor closed.

**A null actor renders as the system** in the history sentence
(`history-sentence.ts`, `t.ticketHistory.systemActor`). An auto-close attributed
to whichever admin called the route would be a false record.

**The state machine lives in one place** and the refusal reads the same table
the answer does. Closing must go through it, not around it.


## Out of scope

- What this story explicitly does **not** cover:
