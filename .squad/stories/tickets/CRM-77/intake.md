> **Fetched from jira:** [CRM-77](https://mazen-al-nabarawy.atlassian.net/browse/CRM-77)  
> *Fetched 2026-08-29T15:49:37.754Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** TICKETS-3-WEB agent — I assign a ticket  
**Type:** Story  
**Status:** To Do  
**Labels:** agent, pts-3, sprint-3, tickets, web

### Description

agent — I assign a ticket

Story folder: .squad/stories/tickets/TICKETS-3-WEB-assign-ticket/

Rules this story owns:

	BR-5 — No silent overwrite: a write carries the revision it read; a mismatch returns 409. Applies to status change, assignment, priority change, article edit.

	BR-2 — Every mutation is audited: actor, entity, action, before, after, timestamp.

Cannot ship before: TICKETS-1-API, IDENTITY-5-API

Points: 3 · Sprint: 3 · Layer: WEB

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/tickets/CRM-77/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `tickets`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-77` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `agent, pts-3, sprint-3, tickets, web`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
TICKETS-3-WEB agent — I assign a ticket
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
agent — I assign a ticket

Story folder: .squad/stories/tickets/TICKETS-3-WEB-assign-ticket/

Rules this story owns:

	BR-5 — No silent overwrite: a write carries the revision it read; a mismatch returns 409. Applies to status change, assignment, priority change, article edit.

	BR-2 — Every mutation is audited: actor, entity, action, before, after, timestamp.

Cannot ship before: TICKETS-1-API, IDENTITY-5-API

Points: 3 · Sprint: 3 · Layer: WEB
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/tickets.md, section TICKETS-3-WEB:

- Given the assignee list, when the screen offers it, then it came from the API's
  live staff and includes the option of nobody.
- Given a stale revision, when the API refuses with 409, then the screen says the
  ticket changed underneath and offers to reload, rather than reporting a failure
  the agent cannot act on.
- Given a successful assignment, when the API answers, then the screen holds the
  new revision — a second assignment from the same screen must not be refused.
- Given every string on the screen, when it is read, then it came from a resource
  file, in both languages (BR-6).
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

- APIs, screens, services already discussed. Repos/roots: `api, web, android`. Primary language: `TypeScript`. **`web/` only — no `api/` file changes.**

**The web stack is Vite + React 19 + TypeScript, tested with Vitest and
Testing Library.** Read `web/src/pages/customers/CustomersPage.tsx` and follow
it; `web/src/shared/ui/` and `useRequest` already provide every state this
screen needs, and a second way of doing what that page does is the defect.

**BR-6: no string is written in a component.** Keys go into both
`web/src/shared/i18n/en.ts` and `ar.ts` in the same edit, or
`web/src/shared/i18n/parity.test.ts` fails — it is the vitest suite that compares the two objects, not `verify-i18n-parity.mjs`, which checks which roots carry resource files at all and says so in its own header. Error text is keyed by the API's `code`
(`web/src/shared/api/errors.ts`), never composed from `fields`.

**A stub that returns the same `Response` twice fails on the second read** (L-30):
build a fresh `Response` per call in every fetch stub.

**This is the screen where BR-5 becomes visible, and that is the point of the
story.** `PATCH /api/v1/tickets/:id/assignee` takes the revision the caller
read. Two things follow, and both are acceptance criteria:

1. **Hold the revision the response returns.** The API answers with the ticket
   at its new revision. A screen that keeps the revision it loaded with will
   refuse the agent's own second assignment — the bug looks like a race and is
   not one.
2. **A 409 is not "something went wrong".** It means somebody else changed the
   ticket, and the only useful next action is to reload it. Say that, and offer
   the reload. Mapping 409 onto the generic error sentence throws away the one
   piece of information the code carries.

**`assigneeId: null` is a real choice, not a cleared field.** Returning a ticket
to nobody is an ordinary assignment (`tickets.service.js` says so), so the
control needs an explicit "Unassigned" option that sends `null` — distinct from
sending nothing, which is a missing field and a 422.

**The list comes from `GET /api/v1/assignees`**, which already exists and is
already paginated. Each item is `{ id, name, role }`.

**The queue screen currently shows a raw assignee id, and this story is where
that gets fixed.** `TICKETS-2-WEB` shipped `TicketQueuePage.tsx` rendering
`ticket.assigneeId ?? 'Unassigned'` — and the ticket the API returns carries an
id and no name (`tickets.repository.js:3`, the PROJECTION). So a queue row
today reads a UUID where a person's name belongs. It was not caught there
because that story's criteria are about filtering and paging, and it is not
worth a story of its own: this is the story that loads the names.

Resolve ids to names **on the client, from the list this story already
fetches** — do not add a join to the queue endpoint. The API deliberately
returns ids, and the screen that needs names is the screen that has the list.
Where a name cannot be resolved (a page of assignees not loaded, or an agent
who has since left), fall back to the id rather than to a blank: a row that
shows nothing is worse than a row that shows something unhelpful.

## Out of scope

- What this story explicitly does **not** cover:

- **Changing status** — `TICKETS-5-WEB` (CRM-81) and the status stories.
- **Reassigning several tickets at once** — nothing asks for it.
- **A notification to the new assignee** — the channels feature, later.
- **Any `api/` change**: the assign route and the assignee list both exist.
