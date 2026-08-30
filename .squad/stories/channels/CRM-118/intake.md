> **Fetched from jira:** [CRM-118](https://mazen-al-nabarawy.atlassian.net/browse/CRM-118)  
> *Fetched 2026-08-30T02:51:38.296Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** CHANNELS-1-API customer — a ticket enters through the channel interface, not around it  
**Type:** Story  
**Status:** To Do  
**Labels:** backend, channels, customer, pts-5, sprint-5

### Description

customer — a ticket enters through the channel interface, not around it

Story folder: .squad/stories/channels/CHANNELS-1-API-channel-interface/

Rules this story owns:

	SC-2 — Every rule is enforced in the API; no client enforces anything.

Cannot ship before: TICKETS-1-API, CUSTOMERS-5-API

Points: 5 · Sprint: 5 · Layer: API

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/channels/CRM-118/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `channels`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-118` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `backend, channels, customer, pts-5, sprint-5`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
CHANNELS-1-API customer — a ticket enters through the channel interface, not around it
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
customer — a ticket enters through the channel interface, not around it

Story folder: .squad/stories/channels/CHANNELS-1-API-channel-interface/

Rules this story owns:

	SC-2 — Every rule is enforced in the API; no client enforces anything.

Cannot ship before: TICKETS-1-API, CUSTOMERS-5-API

Points: 5 · Sprint: 5 · Layer: API
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/channels.md, section CHANNELS-1-API (line 28):

A ticket enters through the channel interface, not around it.

*Acceptance criteria*
- Given a request arriving on the public intake, when it is accepted, then the
  ticket it produces is written by the same tickets service the desk uses —
  not a second insert (SC-2). Bypassing the service must fail a test.
- Given the intake, then it is unauthenticated: the caller is a stranger with
  no token, which is the point of it.
- Given an arriving request, when it carries an email address, then the
  customer is resolved or created by identity resolution (CUSTOMERS-5-API)
  before the ticket is raised, and the ticket belongs to that customer.
- Given the ticket that results, then it records which channel it arrived
  through, and the audit row for its creation says so too (BR-2).
- Given the intake, when nobody is signed in, then the audit row's actor is
  the system rather than a person — an absent actor is an answer, not a gap.
- Given a request missing what a ticket needs, then it is refused 422 naming
  the fields, in the shape every other refusal uses (E-1).
- Given the resulting ticket, then it is `new` and unassigned, like any other
  new ticket. Arriving from outside is not a priority.

*Out of scope*
- The screen that posts to it — PORTAL-1-WEB.
- Throttling it — CHANNELS-3-API.
- Answering for a channel that is not built — CHANNELS-2-API.
- Replying back out through a channel. Nothing sends email.
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

- APIs, screens, services already discussed. Repos/roots: `api, web, android`. Primary language: `JavaScript`.

**A new feature directory, `api/src/features/channels/`.** Read
`docs/architecture.md` for what goes in a feature, and copy the shape of
`api/src/features/customers/` — `index.js`, `*.routes.js`, `*.service.js`,
`*.rules.js`. `scripts/verify-architecture.mjs` runs on every push and will
fail a feature that imports another feature's internals.

**Composition, not import.** `api/src/compose.js` already shows the pattern:
customers gets the tickets service handed to it because "a feature reaches
another only through its index". Channels needs both the customers service (for
resolution) and the tickets service (to raise), so both are built in
`compose.js` and passed in.

**The ticket is raised by `ticketsService.raise(actor, input)`** — that is the
method's name; there is no `create` on tickets. Read
`api/src/features/tickets/tickets.service.js:73`. It validates, checks the
category exists, inserts, starts both SLA clocks and writes the audit row. Call
it. Do not insert a ticket.

**The route is deliberately public.** `requireSubject()` is what every other
route places before its handler
(`api/src/platform/http/permission.js`); this one places nothing, and
`req.subject` is null. A comment saying so is worth more than the code.

**There is no `channel` column on `tickets`.** The last migration is
`0008__tickets_resolution_note.sql`; this story adds the next one. Check the
number before writing the filename — another sprint-5 story also adds a
migration and whichever lands second takes the later number.

**The audit actor is null**, and `audit.record` already writes `actor?.id ??
null` with the reasoning beside it.

**`api/src/platform/http/openapi.js` and its contract test**: a route served
and not documented fails the suite. Document the intake with the route.


## Out of scope

- What this story explicitly does **not** cover:

- **The screen that posts to it** — `PORTAL-1-WEB (CRM-121)`.
- **Throttling** — `CHANNELS-3-API (CRM-120)`.
- **Answering for an unbuilt channel** — `CHANNELS-2-API (CRM-119)`.
- **Sending anything back out.** Nothing in this product sends email.
- **Any `web/` change.**

