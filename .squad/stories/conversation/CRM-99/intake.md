> **Fetched from jira:** [CRM-99](https://mazen-al-nabarawy.atlassian.net/browse/CRM-99)  
> *Fetched 2026-08-30T10:11:10.603Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** CONVERSATION-1-API agent — I reply; the first public reply opens the ticket and stops the clock, once  
**Type:** Story  
**Status:** To Do  
**Labels:** agent, backend, conversation, pts-5, sprint-6

### Description

agent — I reply; the first public reply opens the ticket and stops the clock, once

Story folder: .squad/stories/conversation/CONVERSATION-1-API-reply-stops-clock/

Rules this story owns:

	T-2 — The first public agent reply moves new to open and stops the response clock, once.

	S-1 — Two clocks from creation: response and resolution.

Cannot ship before: TICKETS-7-API, SERVICE-LEVELS-1-API

Points: 5 · Sprint: 6 · Layer: API

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/conversation/CRM-99/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `conversation`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-99` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `agent, backend, conversation, pts-5, sprint-6`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
CONVERSATION-1-API agent — I reply; the first public reply opens the ticket and stops the clock, once
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
agent — I reply; the first public reply opens the ticket and stops the clock, once

Story folder: .squad/stories/conversation/CONVERSATION-1-API-reply-stops-clock/

Rules this story owns:

	T-2 — The first public agent reply moves new to open and stops the response clock, once.

	S-1 — Two clocks from creation: response and resolution.

Cannot ship before: TICKETS-7-API, SERVICE-LEVELS-1-API

Points: 5 · Sprint: 6 · Layer: API
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/conversation.md, section CONVERSATION-1-API (line 30):

An agent replies, and the first public reply opens the ticket and stops the
response clock — once.

*Acceptance criteria*
- Given an agent and a ticket, when they post a public reply, then a message is
  stored with the author, the body, the time and its kind, and an audit row
  records it (BR-2).
- Given a ticket whose status is `new`, when the first **public** reply is
  posted, then the ticket moves to `open` (T-2) and the `first_response` clock
  stops at the reply's own timestamp — not at whenever the stopping code ran.
- Given a second public reply, then neither happens again: the status is not
  moved and the clock is not re-stopped. "Once" is a property of the clock
  already being stopped, not of counting replies.
- Given an **internal note**, then it stops no clock and moves no status, at
  any point. A note is the desk talking to itself, and the promise T-2 makes is
  about answering the customer.
- Given a ticket that is not `new` — one already `open`, or `pending` — when a
  public reply is posted, then the status is left alone. T-2 names one
  transition and this route does not invent others.
- Given a reply, then it is refused with an empty or whitespace-only body, the
  way a customer note is, and the field is named.
- Given a ticket nobody has, then the answer is 404 — the same one every other
  route under a ticket gives.

*Out of scope*
- A customer replying — CONVERSATION-3-API.
- Keeping notes away from a customer — CONVERSATION-2-API. Until it ships, no
  route returns messages to a customer at all, which is a narrower gap than a
  leak and is stated rather than assumed.
- Paging the thread — CONVERSATION-4-API.
- Sending the reply anywhere. Nothing in this product sends email.
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

**The engine is SQLite** through node 26's `node:sqlite` `DatabaseSync` —
synchronous, no driver, no pool. Migrations are plain `.sql` files under
`api/src/platform/db/migrations/`, applied in order by `migrate.js`. **Re-list
that directory before naming a new one**; the last is `0010__customers_user_id.sql`
and another sprint-6 story may land first.

**Two censuses will fail if this story adds a route and forgets them**, and
both read the route table off the router rather than a list:
`api/src/features/audit/audit.guarantee.test.js` (every mutating route writes
its audit rows) and `api/src/platform/http/staff-only.guarantee.test.js` (every
route refuses a customer or is named with the reason it does not). A third,
`ticket-ownership.guarantee.test.js`, covers everything under `/tickets/:id`.

**`api/openapi.json` is checked against the router.** A route served and not
documented fails the suite.

**Errors:** `HttpError(status, code, cause)` — the third argument is `cause`,
never a payload. `unprocessable(['field'])` is the 422 with field names.
Validators return arrays of field names, not objects. The catalogue is frozen
in `api/src/platform/http/errors.js` and mirrored in
`web/src/shared/api/errors.ts`; adding a code means both, plus a sentence in
`en.ts` and `ar.ts`, in the same commit.

**Transactions do not nest.** SQLite refuses `BEGIN` inside `BEGIN`, so a
service method that opens one cannot be called from inside another's — read the
note above `resolveByEmail` in `customers.service.js`, and `makeUser` in
`identity.service.js`, which exists precisely to be callable from within a
caller's transaction.

**A repository function that selects some columns is a trap for its next
caller.** `findLiveCustomerById` selected `id, name` and `findAnyUserById`
omits the password hash — both were correct and both bit a later story that
read a field they did not select. Check the projection before reading a field
off a row.

**A new feature directory**, `api/src/features/conversation/`. Copy the shape
of `api/src/features/channels/` — `index.js`, `*.routes.js`, `*.service.js`,
`*.rules.js`. `verify-architecture.mjs` fails a feature that imports a
sibling's non-index file, and `compose.js` is where services are built and
handed over.

**It needs the tickets service and the service-levels one.** Read
`api/src/compose.js` for how customers is handed tickets, and
`api/src/features/service-levels/service-levels.service.js` — which today has
`startClocks` and `readDeadlines` and **no way to stop a clock**. Stopping one
is part of this story and belongs in that feature, not in this one.

**A clock stops at the reply's timestamp**, not at whenever the stopping code
ran. `sla_clocks.stopped_at` is the column (`0003__service_levels.sql`), and
`UNIQUE (ticket_id, kind)` is what guarantees one of each.

**"Once" is a property of the clock, not a count.** A second public reply
changes nothing because `stopped_at` is already set — do not count replies.

**Moving the status is the tickets feature's job**, and `changeStatus` in
`tickets.service.js` owns the transitions table and the audit row. Calling it
from inside this feature's transaction will throw — `transact` does not nest —
so read the note above `resolveByEmail` in `customers.service.js` and decide
the order deliberately.

**`customer_notes` is not this.** It belongs to customers and is about a
person. These messages are about a ticket.


**The engine is SQLite** through node 26's `node:sqlite` `DatabaseSync` —
synchronous, no driver, no pool. Migrations are plain `.sql` files under
`api/src/platform/db/migrations/`, applied in order by `migrate.js`. **Re-list
that directory before naming a new one**; the last is `0010__customers_user_id.sql`
and another sprint-6 story may land first.

**Two censuses will fail if this story adds a route and forgets them**, and
both read the route table off the router rather than a list:
`api/src/features/audit/audit.guarantee.test.js` (every mutating route writes
its audit rows) and `api/src/platform/http/staff-only.guarantee.test.js` (every
route refuses a customer or is named with the reason it does not). A third,
`ticket-ownership.guarantee.test.js`, covers everything under `/tickets/:id`.

**`api/openapi.json` is checked against the router.** A route served and not
documented fails the suite.

**Errors:** `HttpError(status, code, cause)` — the third argument is `cause`,
never a payload. `unprocessable(['field'])` is the 422 with field names.
Validators return arrays of field names, not objects. The catalogue is frozen
in `api/src/platform/http/errors.js` and mirrored in
`web/src/shared/api/errors.ts`; adding a code means both, plus a sentence in
`en.ts` and `ar.ts`, in the same commit.

**Transactions do not nest.** SQLite refuses `BEGIN` inside `BEGIN`, so a
service method that opens one cannot be called from inside another's — read the
note above `resolveByEmail` in `customers.service.js`, and `makeUser` in
`identity.service.js`, which exists precisely to be callable from within a
caller's transaction.

**A repository function that selects some columns is a trap for its next
caller.** `findLiveCustomerById` selected `id, name` and `findAnyUserById`
omits the password hash — both were correct and both bit a later story that
read a field they did not select. Check the projection before reading a field
off a row.

**A new feature directory**, `api/src/features/conversation/`. Copy the shape
of `api/src/features/channels/` — `index.js`, `*.routes.js`, `*.service.js`,
`*.rules.js`. `verify-architecture.mjs` fails a feature that imports a
sibling's non-index file, and `compose.js` is where services are built and
handed over.

**It needs the tickets service and the service-levels one.** Read
`api/src/compose.js` for how customers is handed tickets, and
`api/src/features/service-levels/service-levels.service.js` — which today has
`startClocks` and `readDeadlines` and **no way to stop a clock**. Stopping one
is part of this story and belongs in that feature, not in this one.

**A clock stops at the reply's timestamp**, not at whenever the stopping code
ran. `sla_clocks.stopped_at` is the column (`0003__service_levels.sql`), and
`UNIQUE (ticket_id, kind)` is what guarantees one of each.

**"Once" is a property of the clock, not a count.** A second public reply
changes nothing because `stopped_at` is already set — do not count replies.

**Moving the status is the tickets feature's job**, and `changeStatus` in
`tickets.service.js` owns the transitions table and the audit row. Calling it
from inside this feature's transaction will throw — `transact` does not nest —
so read the note above `resolveByEmail` in `customers.service.js` and decide
the order deliberately.

**`customer_notes` is not this.** It belongs to customers and is about a
person. These messages are about a ticket.


## Out of scope

- What this story explicitly does **not** cover:

- **A customer replying** — `CONVERSATION-3-API (CRM-104)`.
- **Keeping notes from a customer** — `CONVERSATION-2-API (CRM-102)`. Until it
  ships, no route returns messages to a customer at all; say so rather than
  half-building it.
- **Paging the thread** — `CONVERSATION-4-API (CRM-106)`.
- **Sending anything anywhere.** Nothing in this product sends email.
- **Any `web/` change.**


- **A customer replying** — `CONVERSATION-3-API (CRM-104)`.
- **Keeping notes from a customer** — `CONVERSATION-2-API (CRM-102)`. Until it
  ships, no route returns messages to a customer at all; say so rather than
  half-building it.
- **Paging the thread** — `CONVERSATION-4-API (CRM-106)`.
- **Sending anything anywhere.** Nothing in this product sends email.
- **Any `web/` change.**

