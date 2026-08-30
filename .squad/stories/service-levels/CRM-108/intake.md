> **Fetched from jira:** [CRM-108](https://mazen-al-nabarawy.atlassian.net/browse/CRM-108)  
> *Fetched 2026-08-29T14:11:07.556Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** SERVICE-LEVELS-1-API system — a ticket carries both deadlines, from its priority  
**Type:** Story  
**Status:** To Do  
**Labels:** backend, pts-5, service-levels, sprint-3, system

### Description

system — a ticket carries both deadlines, from its priority

Story folder: .squad/stories/service-levels/SERVICE-LEVELS-1-API-deadlines-from-priority/

Rules this story owns:

	S-1 — Two clocks from creation: response and resolution.

	S-2 — Targets by priority: urgent 1h/4h, high 4h/24h, normal 8h/72h, low 24h/168h — fixed by the seed, by decision.

	S-3 — Clocks run 24/7; there is no working-hours calendar, by decision.

Cannot ship before: PLATFORM-2-API

Points: 5 · Sprint: 3 · Layer: API

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/service-levels/CRM-108/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `service-levels`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-108` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `backend, pts-5, service-levels, sprint-3, system`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
SERVICE-LEVELS-1-API system — a ticket carries both deadlines, from its priority
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
system — a ticket carries both deadlines, from its priority

Story folder: .squad/stories/service-levels/SERVICE-LEVELS-1-API-deadlines-from-priority/

Rules this story owns:

	S-1 — Two clocks from creation: response and resolution.

	S-2 — Targets by priority: urgent 1h/4h, high 4h/24h, normal 8h/72h, low 24h/168h — fixed by the seed, by decision.

	S-3 — Clocks run 24/7; there is no working-hours calendar, by decision.

Cannot ship before: PLATFORM-2-API

Points: 5 · Sprint: 3 · Layer: API
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/service-levels.md, section SERVICE-LEVELS-1-API:

- Given a ticket is raised, when it is stored, then two clocks exist for it —
  first response and resolution — both started at its creation (S-1).
- Given a clock, when its deadline is computed, then it comes from the target
  row for that ticket's priority, read from the database rather than from a
  constant in code (S-2).
- Given a ticket whose priority changes, when the deadlines are read again,
  then they follow the new priority — the promise is about the ticket as it is,
  not as it was raised.
- Given a clock, when time passes, then it runs continuously: there is no
  working-hours calendar and no weekend (S-3, by decision).
- Given a ticket, when clocks are created, then there is exactly one of each
  kind for it — enforced by the unique constraint, not by hoping.
- Given the clocks, when they are read, then a deadline that has passed is
  visible as such without a breach row being written: recording a breach is
  SERVICE-LEVELS-3-API's job, and S-5 says a breach is stored, never
  recomputed on read.
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
- **The package manager is npm**, and there is no workspace root. Commands run
  from the package directory: `cd api && npm test`, `cd web && npm run build`.
  Not pnpm, not yarn, no `--filter`, no `--prefix` — three plans in a row
  reached for pnpm, so every command in their verification steps was wrong.
- **The web suite does not typecheck.** `npm test` is vitest; `npm run build` is
  `tsc -b && vite build`. A change only vitest has seen is not verified.

- APIs, screens, services already discussed. Repos/roots: `api, web, android`. Primary language: `JavaScript`. **`api/` only.**

**This story owns no route, and that is the finding to state rather than
discover.** Its title is "a ticket carries both deadlines" — the deadlines are
properties of a ticket, surfaced by the ticket's own endpoints, which
`TICKETS-1-API` builds next. So this ships a **service** the tickets feature
calls, not an HTTP surface. Nothing to add to `api/openapi.json`, and the
contract test has nothing to say about it. If the plan concludes a route is
needed anyway, it must argue for it — do not add one to have something to test.

**It therefore has no production caller yet.** `TICKETS-1-API` is the caller and
comes after it — `verify-backlog.mjs` prints `TICKETS-1-API waits on
SERVICE-LEVELS-1-API` under "ordering inside a block". This is the same honest
position `PLATFORM-16-WEB` and `LANGUAGES-3-WEB` shipped in: say so, and let
the tests be the only thing standing behind it. Do not invent a caller.

**No column stores a deadline, and none should.** `0003__service_levels.sql`
gives `sla_clocks` a `started_at`, a `stopped_at` and a `paused_ms` — no
deadline, no due date. The deadline is **derived**: `started_at` plus the
target minutes for the ticket's **current** priority, read from `sla_targets`.
That is what makes the third criterion work at all.

**And the consequence needs stating, because it looks like a bug the first time
somebody meets it.** A ticket raised `low` (168h to resolve) that is escalated
to `urgent` (4h) after two days has a resolution deadline of creation + 4h,
which is already past. That is the literal reading of "targets by priority" plus
"two clocks from creation", it is what S-6 implies when a breach *raises* a
priority, and the alternative — freezing the deadline at the priority it was
raised with — would mean an urgent ticket carrying a week-long promise. Take
the literal reading, and put this paragraph's reasoning in a comment.

**The targets come from the database, never from a constant.** `sla_targets` is
seeded and rule S-2's numbers now match it exactly — that agreement is checked
by `verify-backlog.mjs`, which parses S-2 and compares it to `seed.data.js`. A
second copy of those numbers in feature code would be a third statement of one
fact, and the two that already exist disagreed for a day and a half.

**`paused_ms` is not this story's.** The column exists and defaults to 0.
S-4 — time spent pending is not counted — is `SERVICE-LEVELS-2-API`, a later
sprint. Read the column, add nothing to it, and do not implement pausing.

**Nor is a breach row.** S-5 says a breach is stored, never recomputed on read,
and `SERVICE-LEVELS-3-API` stores it. A deadline that has passed is a fact this
story can *report*; writing `sla_breaches` is not this story's job, and the
unique constraint there is that story's proof, not this one's.

**`kind` is `first_response` or `resolution`** — the schema comment says so at
`0003__service_levels.sql:14`. Not `response`; the brief calls the clock
"response" in prose and the column stores `first_response`, and the column
wins.

**Clocks run 24/7.** No calendar, no weekend, no business hours (S-3). It is a
recorded decision, not an omission — a plan that adds a calendar is adding a
feature nobody asked for.

## Out of scope

- What this story explicitly does **not** cover:

- **Raising a ticket** — `TICKETS-1-API` (CRM-71), which comes next and is the
  caller. This story does not create tickets except in its own tests.
- **Pausing the resolution clock while a ticket is pending** —
  `SERVICE-LEVELS-2-API`, S-4, a later sprint.
- **Recording a breach** — `SERVICE-LEVELS-3-API`, S-5. A passed deadline is
  reported here; nothing is written to `sla_breaches`.
- **Escalating on breach, or notifying an admin** — `SERVICE-LEVELS-4-API`, S-6.
- **Stopping the response clock on the first public reply** — that is T-2, and
  it belongs to `CONVERSATION-1-API`. This story starts clocks; it does not
  decide what stops them.
- **Any screen.** The web half of service levels arrives with
  `SERVICE-LEVELS-3-WEB`.
- **A migration.** `0003__service_levels.sql` already has both tables.
- **Changing `sla_targets`' values, `rules.txt`, or the seed.** They agree now,
  and `verify-backlog.mjs` checks that they keep agreeing.
