> **Fetched from jira:** [CRM-32](https://mazen-al-nabarawy.atlassian.net/browse/CRM-32)  
> *Fetched 2026-08-29T16:58:42.994Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** PLATFORM-17-API system — the seed walks tickets through the real state machine  
**Type:** Story  
**Status:** To Do  
**Labels:** backend, platform, pts-3, sprint-4, system

### Description

system — the seed walks tickets through the real state machine

Story folder: .squad/stories/platform/PLATFORM-17-API-seed-tickets/

Rules this story owns:

	SC-3 — The demo database is generated; schema plus seed produces a working system.

Cannot ship before: TICKETS-4-API

Points: 3 · Sprint: 4 · Layer: API

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/platform/CRM-32/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `platform`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-32` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `backend, platform, pts-3, sprint-4, system`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
PLATFORM-17-API system — the seed walks tickets through the real state machine
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
system — the seed walks tickets through the real state machine

Story folder: .squad/stories/platform/PLATFORM-17-API-seed-tickets/

Rules this story owns:

	SC-3 — The demo database is generated; schema plus seed produces a working system.

Cannot ship before: TICKETS-4-API

Points: 3 · Sprint: 4 · Layer: API
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/platform.md, section PLATFORM-17-API:

- Given the seed, when tickets are created, then each moved through the real
  state machine rather than being written directly at its final status.
- Given the seeded queue, when it is read, then every status and every priority
  appears at least once.
- Given the seeded queue, when it is read, then some tickets are unassigned and
  some are already past their promise — otherwise the service-level screens have
  nothing to show.
- Given the seeded tickets, when their text is read, then they are written, not
  generated.
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
- **Ids:** cite other stories only from `scripts/backlog.txt` (or the generated
  `BACKLOG.md`), as FULL-NAME ids with the Jira key: `PLATFORM-13-ALL (CRM-28)`.
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

**The first criterion cannot be met inside `platform/db/seed.js`, and that is
the decision this story makes.** `verify-architecture.mjs` enforces
`api-shared-platform-no-feature` — "shared and platform never import a feature"
(`scripts/verify-architecture.mjs:90-100`) — so the seed cannot import
`features/tickets/`. And walking a ticket "through the real state machine"
means calling that service: writing the transitions again in the seed is one
product rule in two places, which is the failure the criterion is worded to
prevent.

**Proposal: split the seed in two along the line the architecture already
draws.**

- `platform/db/seed.js` keeps the **reference data** — staff, customers,
  categories, SLA targets. It needs no feature and stays where it is.
- A **demo seed** lives where features are allowed to be seen. `compose.js` is
  already the only file that gathers them, and its comment says so: "What the
  production application is, in one place… app.js stays platform-only and
  learns no feature's name". A sibling of it — `api/src/seed-demo.js`, or
  `api/src/features/tickets/tickets.demo.js` invoked from a root seeder — is
  where a ticket may legally be raised through `createTicketsService`.
- `npm run seed` runs both, in that order.

Say in the plan which of those two shapes you take and why. What is not open is
importing a feature from `platform/`, or re-implementing the transitions.

**Idempotence is the trap here.** `seed.js`'s own comment says it: "Idempotence
is by identity, not by counting… a count-then-decide check races with itself
and lies under concurrency." Every reference insert names a unique index and
does nothing on conflict. **Tickets have no natural unique key** — two tickets
with the same subject are two tickets — so the same trick does not transfer,
and a second `npm run seed` would double the queue. Decide the identity
deliberately: a deterministic id derived from the fixture (so the conflict
clause still works), or a guard that seeds tickets only into an empty queue and
says so when it skips. Do not leave it to run twice.

**The clock is a parameter, and this story needs it.** `createTicketsService`
takes `now`, and `seed()` already takes one. "Some tickets are already past
their promise" is only reachable by raising them with a `now` in the past —
`SERVICE-LEVELS-1-API` starts the clocks from it. A ticket inserted with a
backdated `created_at` after the fact would not have gone through the machine,
which is the first criterion again.

**Every status and every priority, at least once — including `closed` and
`reopened`.** Those two are only reachable through `resolved`, and reaching
`resolved` requires a note (T-4). So the fixture has to carry resolution notes,
and the walk has to be a real sequence of moves rather than a target status per
ticket.

**Written, not generated.** No lorem, no "Ticket 7". The subjects and bodies
are a support desk's actual traffic — a billing question, a password nobody can
reset, a device that arrived broken. They are read by whoever demonstrates this,
and by whoever grades it.

## Out of scope

- What this story explicitly does **not** cover:

- **Any screen.** The queue and the customer screens already read whatever is
  there.
- **Seeding the conversation** — `messages` does not exist yet.
- **Running the escalation** — `SERVICE-LEVELS-5-API` (CRM-114) owns that, and
  it is a different sprint. This story produces tickets that are past their
  promise; it does not act on the breach.
- **Changing what the reference seed writes.** Staff, customers, categories and
  the SLA targets are settled and tested.
- **Making the seed configurable** — no flag for how many tickets. A fixture
  file is the knob.
