> **Fetched from jira:** [CRM-72](https://mazen-al-nabarawy.atlassian.net/browse/CRM-72)  
> *Fetched 2026-08-29T15:49:36.738Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** TICKETS-1-WEB agent — I raise a ticket for a customer  
**Type:** Story  
**Status:** To Do  
**Labels:** agent, pts-5, sprint-3, tickets, web

### Description

agent — I raise a ticket for a customer

Story folder: .squad/stories/tickets/TICKETS-1-WEB-raise-ticket/

Rules this story owns:

	T-1 — Statuses: new open pending resolved closed reopened. Priorities: low normal high urgent.

	SC-1 — One organisation, one queue.

Cannot ship before: CUSTOMERS-1-API, SERVICE-LEVELS-1-API

Points: 5 · Sprint: 3 · Layer: WEB

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/tickets/CRM-72/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `tickets`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-72` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `agent, pts-5, sprint-3, tickets, web`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
TICKETS-1-WEB agent — I raise a ticket for a customer
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
agent — I raise a ticket for a customer

Story folder: .squad/stories/tickets/TICKETS-1-WEB-raise-ticket/

Rules this story owns:

	T-1 — Statuses: new open pending resolved closed reopened. Priorities: low normal high urgent.

	SC-1 — One organisation, one queue.

Cannot ship before: CUSTOMERS-1-API, SERVICE-LEVELS-1-API

Points: 5 · Sprint: 3 · Layer: WEB
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/tickets.md, section TICKETS-1-WEB:

- Given the form, when a required field is missing, then the field the API named
  is the field the screen marks — the message is not invented on the client.
- Given a category, when the form offers one, then the list came from the API and
  a retired category is not among the choices.
- Given a submission in flight, when the screen renders, then the submit control
  cannot be pressed twice and the shared loading state is shown.
- Given a raised ticket, when the API answers, then the screen shows the ticket
  it created rather than a message saying it worked.
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
Testing Library.** Not Next, not CRA, no router other than the `react-router`
already in `web/src/app/routes.tsx`.

**Everything this screen needs already exists as a primitive.** `web/src/shared/ui/`
has `Button, Card, EmptyState, ErrorState, Field, Heading, Input, Skeleton,
Stack, Text`, and `web/src/shared/hooks/useRequest.ts` is the four-state
(idle / loading / error / success) request hook every page uses. Read
`web/src/pages/customers/CustomersPage.tsx` first and follow it — a second way
of doing what that page already does is the defect, not the feature.

**BR-6: no string is written in a component.** Both `web/src/shared/i18n/en.ts`
and `ar.ts` carry every user-facing string, and `web/src/shared/i18n/parity.test.ts` fails — it is the vitest suite that compares the two objects, not `verify-i18n-parity.mjs`, which checks which roots carry resource files at all and says so in its own header
on a key present in one file and missing from the other. Add keys to both in
the same edit, and keep the Arabic a real translation rather than the English
copied across — the check tests for parity of keys, and a human reads the rest.

**Error text is keyed by the API's `code`.** `web/src/shared/api/errors.ts`
defines `ApiErrorCode`, and the sign-in page's `errorUnauthenticated` /
`errorValidationFailed` / `errorInternal` keys are the shape to copy. Do not
compose an English sentence from the `fields` array — map the code, and use
`fields` only to decide which input to mark.

**A stub that returns the same `Response` twice fails on the second read** (L-30):
a body can be read once. Build a fresh `Response` per call in every fetch stub.

**The category list comes from `GET /api/v1/ticket-categories`**, which
`TICKETS-6-API` (CRM-82) builds. It is paginated like every other list, so read
`items` and do not assume the first page is all of them — six seeded categories
fit today, and a screen that silently shows only the first page is the kind of
thing that is correct until it is not.

**The API names the field; the screen marks it.** A 422 answers
`{ code: 'VALIDATION_FAILED', fields: ['subject'] }`. Mark `subject`, and show
the one keyed sentence for `VALIDATION_FAILED`. Inventing per-field English on
the client puts the contract in two places, and they drift.

**Double submit is a real failure here, not a nicety**: this POST creates a row.
Disable the control while the request is in flight — `useRequest`'s status is
already the thing to read.

## Out of scope

- What this story explicitly does **not** cover:

- **Editing a ticket**, any status change, or assignment — separate stories.
- **The queue screen** — `TICKETS-2-WEB` (CRM-74).
- **Any `api/` change.** If the categories route is missing, that is CRM-82's
  work and this story waits on it rather than adding a route.
- **Choosing a customer by searching** — the customers screen already exists;
  this form takes a customer id.
