> **Fetched from jira:** [CRM-65](https://mazen-al-nabarawy.atlassian.net/browse/CRM-65)  
> *Fetched 2026-08-30T02:51:41.789Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** CUSTOMERS-6-API agent — I give a customer a sign-in  
**Type:** Story  
**Status:** To Do  
**Labels:** agent, backend, customers, pts-3, sprint-5

### Description

agent — I give a customer a sign-in

Story folder: .squad/stories/customers/CUSTOMERS-6-API-grant-sign-in/

Rules this story owns:

	I-1 — users and customers are two tables; customers.user_id is null until first sign-in.

Cannot ship before: CUSTOMERS-4-API, IDENTITY-2-API

Points: 3 · Sprint: 5 · Layer: API

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/customers/CRM-65/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `customers`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-65` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `agent, backend, customers, pts-3, sprint-5`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
CUSTOMERS-6-API agent — I give a customer a sign-in
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
agent — I give a customer a sign-in

Story folder: .squad/stories/customers/CUSTOMERS-6-API-grant-sign-in/

Rules this story owns:

	I-1 — users and customers are two tables; customers.user_id is null until first sign-in.

Cannot ship before: CUSTOMERS-4-API, IDENTITY-2-API

Points: 3 · Sprint: 5 · Layer: API
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/customers.md, section CUSTOMERS-6-API (line 190):

An agent gives a customer a sign-in.

*Acceptance criteria*
- Given a customer with an email address, when an agent grants them a sign-in,
  then a `users` row is created with the role `customer`, and
  `customers.user_id` points at it (I-1). The column arrives with this story;
  the migration is part of it.
- Given the grant, then the answer carries an initial password once, the way
  creating a staff account does, and nothing can read it back afterwards.
- Given a customer with no email address, then the grant is refused naming the
  field — the address is what they would sign in with (I-4).
- Given a customer who already has a sign-in, then a second grant is refused
  rather than creating a second account for one person.
- Given a soft-deleted customer, then the grant is refused (BR-1).
- Given the new user, then their role is `customer` and no permission an agent
  has comes with it — the queue, the staff list and other customers all refuse
  them.
- Given the link now existing, then TICKETS-8-API's ownership guard stops
  failing closed and becomes the comparison its own comment promises: a
  customer reaches their own ticket and gets the same 404 as a stranger for
  anybody else's. Both halves are pinned. A guard left refusing every customer
  would make the portal a set of screens that answer 404 to their own users.
- Given the grant, then an audit row records it, carrying no password (BR-2).

*Out of scope*
- The screen — CUSTOMERS-6-WEB.
- A customer choosing their own password afterwards — that is IDENTITY-7-API,
  and it already works for any role.
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

- APIs, screens, services already discussed. Repos/roots: `api, web, android`. Primary language: `JavaScript`.

**This story adds `customers.user_id`.** The column is not in
`0001__customers.sql` because nothing needed it; `scripts/criteria/customers.md`
records the decision, dated against `docs/product-brief.md` ("One person, two
rows"). The last migration is `0008__tickets_resolution_note.sql` — check the
number before writing the filename, because `CHANNELS-1-API (CRM-118)` also
adds one and whichever lands second takes the later number.

**Creating the `users` row reuses identity's account creation**, handed in at
composition the way the tickets service is handed to customers in
`api/src/compose.js`. Customers must not import identity's internals —
`scripts/verify-architecture.mjs` fails that on every push.

**The role is `customer`.** Read `api/src/features/identity/identity.rules.js`
for the role list; if `customer` is not in it, adding it is part of this story,
and every `adminOnly` and staff-only route must still refuse it.

**Then fix the guard that is waiting for this.**
`api/src/features/tickets/tickets.service.js` refuses every subject whose role
is `customer` — three paths, each with `if (actor?.role === 'customer') throw
new HttpError(404, 'NOT_FOUND')` — and the comment beside it says the refusal is
deliberate *because nothing linked a user to a customer*: "When the link lands
the check becomes one comparison in one place, and the line that says so sits
next to the code." This story is that link. The comparison replaces the blanket
refusal, and BOTH halves get a test: a customer reaches their own ticket, and
gets the same 404 as a stranger for anybody else's. `TICKETS-8-API`'s census
test reads the routes off the router — run it.

**The initial password comes back once**, the way account creation already
answers with `initialPassword`. The audit row carries neither it nor the hash.


## Out of scope

- What this story explicitly does **not** cover:

- **The screen** — `CUSTOMERS-6-WEB (CRM-66)`.
- **A customer changing their own password afterwards.** `IDENTITY-7-API
  (CRM-51)` already works for any role.
- **The portal screens** — `PORTAL-1-WEB (CRM-121)` and `PORTAL-2-WEB
  (CRM-122)`.

