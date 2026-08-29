> **Fetched from jira:** [CRM-71](https://mazen-al-nabarawy.atlassian.net/browse/CRM-71)  
> *Fetched 2026-08-29T14:24:59.615Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** TICKETS-1-API agent — I raise a ticket for a customer  
**Type:** Story  
**Status:** To Do  
**Labels:** agent, backend, pts-5, sprint-3, tickets

### Description

agent — I raise a ticket for a customer

Story folder: .squad/stories/tickets/TICKETS-1-API-raise-ticket/

Rules this story owns:

	T-1 — Statuses: new open pending resolved closed reopened. Priorities: low normal high urgent.

	SC-1 — One organisation, one queue.

Cannot ship before: CUSTOMERS-1-API, SERVICE-LEVELS-1-API

Points: 5 · Sprint: 3 · Layer: API

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/tickets/CRM-71/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `tickets`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-71` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `agent, backend, pts-5, sprint-3, tickets`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
TICKETS-1-API agent — I raise a ticket for a customer
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
agent — I raise a ticket for a customer

Story folder: .squad/stories/tickets/TICKETS-1-API-raise-ticket/

Rules this story owns:

	T-1 — Statuses: new open pending resolved closed reopened. Priorities: low normal high urgent.

	SC-1 — One organisation, one queue.

Cannot ship before: CUSTOMERS-1-API, SERVICE-LEVELS-1-API

Points: 5 · Sprint: 3 · Layer: API
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/tickets.md, section TICKETS-1-API:

- Given a ticket is raised, when it is stored, then it carries the customer, a
  subject, a body, a priority and a status of `new` (T-1).
- Given a priority that is not one of low, normal, high or urgent, then the
  answer is 422 naming the field, and nothing is written (T-1).
- Given a customer who does not exist or has been removed, then the answer is
  404 and nothing is written.
- Given a ticket is raised, when it succeeds, then an audit row is written in
  the same transaction (BR-2).
- Given a raised ticket, when it is read back, then it belongs to one queue —
  there is no organisation or team to choose (SC-1).
- Given a ticket is raised, when it is stored, then its service-level clocks
  start from that moment (S-1).
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

- APIs, screens, services already discussed. Repos/roots: `api, web, android`. Primary language: `JavaScript`. **`api/` only** — the screen is `TICKETS-1-WEB` (CRM-72).

**Add the `revision` column in this story, and here is the evidence for why.**
`tickets` has no revision column. BR-5 — "a write carries the revision it read;
a mismatch returns 409" — names status change, assignment and priority change,
which are `TICKETS-3-API` and `TICKETS-4-API`, both later in **this** sprint.

The first attempt (`../support-crm`) shipped tickets without one, used
`updated_at` as the token, and its own migration records what happened:

```
-- The no-silent-overwrite rule first used `updated_at` as the token a caller
-- sends back. It is written to millisecond precision, and two writes inside one
-- millisecond produce the same value — so a stale write whose version happened
-- to equal the current one was accepted. It showed up as a test that passed
-- alone and failed about one run in five.
```

The brief carries the same warning as a footnote to BR-5. So: a migration in
**this** story adding `revision INTEGER NOT NULL DEFAULT 1`, and the created
ticket returns it. Doing it here means every ticket has one from birth; doing it
in `TICKETS-3-API` means migrating rows that already exist and a story doing
archaeology on why.

**Do not port two things from the first attempt's schema.**

- **No human-readable ticket `number`.** The first attempt added a sequential
  one ("ticket ten forty-two is a thing somebody says on a phone call"). It is
  a nicety, it is **not in the brief**, and `0002__tickets.sql` has no column
  for it. Adding it is scope this story was not given.
- **No `response_due_at` / `resolution_due_at` columns.** The first attempt
  froze both deadlines on the row. This repository derives them —
  `SERVICE-LEVELS-1-API` (CRM-108) shipped that yesterday, deliberately, so an
  escalated ticket carries an escalated promise. A stored deadline would be a
  second answer to the same question.

**Start the clocks through the service-levels feature, inside the same
transaction.** `createServiceLevels({ db, now }).startClocks({ ticketId,
startedAt })` — imported from `../service-levels/index.js`, which is that
feature's only door. It has no route by design; this is its first caller. Note
it throws on a second call for one ticket, which is intended: the constraint on
`(ticket_id, kind)` is the guarantee.

**Priority: default to `normal`, and refuse a stated one that is not a
priority.** A ticket raised with nothing said about urgency is a normal ticket,
and requiring the field would force `CHANNELS-1-API` — a web form a customer
fills — to invent an urgency it cannot know. But a *stated* value outside T-1's
four is 422 naming the field, never silently coerced. Say this in a comment;
the difference between "absent" and "wrong" is the whole decision.

**Category is optional.** `0002__tickets.sql` makes `category_id` nullable, and
`TICKETS-6-API` (CRM-82) — which makes the categories readable so a form has
something to offer — is later in this sprint. A ticket raised before that story
exists cannot be asked for one.

**Status is `new`, always, and the service enforces the enum.**
`0002__tickets.sql:14` says so in a comment: the column is TEXT and "T-1,
enforced by service". There is no CHECK constraint to lean on, unlike the first
attempt's schema.

**Audit in the same transaction** through `../audit/index.js` — `transact` and
`createAuditWriter`. The guard fails any commit that mutates a non-audit table
without an audit row, so a ticket written outside `transact` will not land. The
verb is namespaced by its entity, as identity and customers write theirs:
`ticket.create`, not `create`.

**The audit census will fail the moment this route exists**, and that is it
working. `api/src/features/audit/audit.guarantee.test.js` derives the mutating
routes from the router; add the new one to what that file drives, and **drive
it** — adding it to the covered list without exercising it satisfies the census
with a claim.

## Out of scope

- What this story explicitly does **not** cover:

- **The screen** — `TICKETS-1-WEB` (CRM-72).
- **Reading the queue, filtering or sorting it** — `TICKETS-2-API` (CRM-73).
  This story raises a ticket and returns it; a list endpoint is that story's.
- **Assigning** — `TICKETS-3-API` (CRM-76). `assignee_id` stays null at
  creation.
- **Changing status, and the state machine's legality rules** —
  `TICKETS-4-API` (CRM-79). This story writes `new` and never moves it.
- **Resolution notes** — `TICKETS-5-API` (CRM-80).
- **Reading the categories** — `TICKETS-6-API` (CRM-82).
- **Stopping either clock.** T-2 (first public reply stops the response clock)
  belongs to `CONVERSATION-1-API`. This story starts them.
- **Breaches, pausing, escalation** — the later service-levels stories.
- **A ticket number, stored deadlines, a CHECK constraint on status or
  priority** — none are in this repository's schema or the brief.
- **Changing `sla_targets`, `rules.txt`, the seed, or the service-levels
  feature.**
