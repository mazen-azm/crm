> **Fetched from jira:** [CRM-109](https://mazen-al-nabarawy.atlassian.net/browse/CRM-109)  
> *Fetched 2026-08-31T11:07:22.358Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** SERVICE-LEVELS-2-API agent — time waiting on the customer is not counted against me  
**Type:** Story  
**Status:** To Do  
**Labels:** agent, backend, pts-5, service-levels, sprint-8

### Description

agent — time waiting on the customer is not counted against me

Story folder: .squad/stories/service-levels/SERVICE-LEVELS-2-API-paused-time/

Rules this story owns:

	S-4 — Time spent pending is not counted against the resolution clock.

Cannot ship before: SERVICE-LEVELS-1-API, TICKETS-4-API

Points: 5 · Sprint: 8 · Layer: API

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/service-levels/CRM-109/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `service-levels`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-109` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `agent, backend, pts-5, service-levels, sprint-8`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
SERVICE-LEVELS-2-API agent — time waiting on the customer is not counted against me
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
agent — time waiting on the customer is not counted against me

Story folder: .squad/stories/service-levels/SERVICE-LEVELS-2-API-paused-time/

Rules this story owns:

	S-4 — Time spent pending is not counted against the resolution clock.

Cannot ship before: SERVICE-LEVELS-1-API, TICKETS-4-API

Points: 5 · Sprint: 8 · Layer: API
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/service-levels.md, section SERVICE-LEVELS-2-API (line 64):

Time spent waiting on the customer is not counted against the desk.

Written 2026-08-31, with the sprint 8 stories.

*Acceptance criteria*
- Given a ticket moved to `pending`, then the resolution clock stops
  accumulating from that moment; given it leaves `pending`, then the time in
  between is added to what the clock has already been paused for (S-4).
- Given the first-response clock, then it does **not** pause. Pending means
  waiting on the customer, which can only happen after somebody answered them —
  and a promise about answering that could be paused by the answer is not a
  promise. S-4 names the resolution clock and means it.
- Given a ticket resolved while still pending, then the pause is closed at that
  moment and counted. A clock stopped mid-pause with the pause never added
  would make the resolution look slower than it was, which is the opposite of
  what S-4 is for.
- Given a ticket that goes to `pending` twice, then both pauses count. The
  column is a total, not a single interval, and a second visit that overwrote
  the first would quietly give the time back.
- Given the paused total, then it is stored as it accrues rather than derived
  from the history at read time. Deriving it would make every read of a queue
  a walk of the audit trail, and would produce a different answer the first
  time a status row was added for any other reason.
- Given the clock's own unit, then the pause is recorded in the same one it
  is. The column is named `paused_ms` and the application clock is whole
  seconds; whichever survives, the two must agree, and a test must say which
  it is rather than leaving a factor of a thousand to be discovered.

*Out of scope*
- Pausing for anything other than `pending` — a weekend, an out-of-hours
  window, a public holiday. S-3 says the clocks run continuously and that is a
  decision, not an omission.
- Showing the pause anywhere. What the queue displays is
  SERVICE-LEVELS-3-WEB's.
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
**`paused_ms` already exists** — `0003__service_levels.sql:17`, `INTEGER NOT
NULL DEFAULT 0` on `sla_clocks`. Nothing writes it. The column is named in
**milliseconds** and the application clock is `Math.floor(Date.now()/1000)` —
whole **seconds**, injected everywhere and replaced in tests. Decide which unit
wins, make the code and the column agree, and say so in a test. A factor of a
thousand discovered later is a factor of a thousand in a promise about time.

**The feature serves no HTTP path** — `service-levels/index.js` says so and
gives its reason: deadlines are properties of a ticket and travel on the
ticket's responses. Pausing is called by tickets when a status moves, the way
`stopClock` already is from the conversation feature.

**`stopClock` is the shape to copy** (`service-levels.service.js:59`): a method
callable from inside the caller's transaction, opening none of its own.
SQLite refuses `BEGIN` inside `BEGIN`.

**The status move happens in `tickets.service.js` `changeStatus`.** That is
where pending is entered and left, and it already holds a transaction.


## Out of scope

- **Pausing for anything but `pending`** — no weekends, no working hours (S-3).
- **Pausing the first-response clock.** S-4 names the resolution clock.
- **Showing the pause** — `SERVICE-LEVELS-3-WEB (CRM-111)`.
