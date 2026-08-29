> **Fetched from jira:** [CRM-58](https://mazen-al-nabarawy.atlassian.net/browse/CRM-58)  
> *Fetched 2026-08-29T16:58:45.912Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** CUSTOMERS-2-WEB agent — contacts, open tickets and history in one screen  
**Type:** Story  
**Status:** To Do  
**Labels:** agent, customers, pts-5, sprint-4, web

### Description

agent — contacts, open tickets and history in one screen

Story folder: .squad/stories/customers/CUSTOMERS-2-WEB-customer-screen/

Owns no rule of its own.

Cannot ship before: CUSTOMERS-1-API, TICKETS-1-API

Points: 5 · Sprint: 4 · Layer: WEB

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/customers/CRM-58/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `customers`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-58` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `agent, customers, pts-5, sprint-4, web`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
CUSTOMERS-2-WEB agent — contacts, open tickets and history in one screen
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
agent — contacts, open tickets and history in one screen

Story folder: .squad/stories/customers/CUSTOMERS-2-WEB-customer-screen/

Owns no rule of its own.

Cannot ship before: CUSTOMERS-1-API, TICKETS-1-API

Points: 5 · Sprint: 4 · Layer: WEB
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/customers.md, section CUSTOMERS-2-WEB:

- Given the screen, when it loads, then the customer, their open tickets and
  their notes are one request, not four.
- Given a customer with no tickets, when the screen renders, then the empty
  state says so and offers to raise one (D-2).
- Given a ticket in the list, when it is read, then its status and priority are
  words from the resource files, not the API's raw values (BR-6).
- Given a failed load, when the screen renders, then it shows the documented
  code's meaning and offers retry.
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

**The stack is Vite + React 19 + TypeScript, Vitest and Testing Library.**
Read `web/src/pages/tickets/TicketQueuePage.tsx` and
`web/src/pages/customers/CustomersPage.tsx` first and follow them. Everything
this screen needs exists: `web/src/shared/ui/` has `Button, Card, EmptyState,
ErrorState, Field, Heading, Input, Select, Skeleton, Stack, Text, TextArea`,
and `useRequest` is the four-state hook every page uses. `Field` takes an
optional render prop for a control that is not a text input.

**BR-6.** Keys go into both `en.ts` and `ar.ts` in the same edit or
`verify-i18n-parity.mjs` fails, and `no-hardcoded-strings.test.ts` catches a
literal in JSX — **including a separator typed between tags**. Error sentences
come from the shared `t.errors` map keyed by the API's code, which now names the
three domain codes as well; never compose one from `fields`.

**`request(path)` already prefixes `/api/v1`** (`base-url.ts:3`). Writing it
again gives `/api/v1/api/v1/…`, which CRM-72's tests caught.

**A fetch stub must build a fresh `Response` per call** (L-30): a body can be
read once, and the symptom of getting this wrong is a test that times out
rather than one that mentions bodies.

**One request is an acceptance criterion, so a test has to be able to see it.**
Count the calls the screen makes on load and assert the count — a screen that
happens to make one today and four next month passes an assertion about content
and fails the criterion silently.

**The status and priority labels already exist.** `TicketQueuePage.tsx` has
`statusLabel` and `priorityLabel` reading `t.ticketQueue.status*` /
`priority*`. Two copies of that mapping will disagree the first time a word
changes, so move them somewhere both pages import rather than writing them
again — say where in the plan.

**The empty state offers to raise a ticket**, which is a real next action
because that screen exists at `/tickets/new` (CRM-72). D-2 asks for the next
action, not just the sentence.

## Out of scope

- What this story explicitly does **not** cover:

- **Editing the customer or their notes** — writing a note is
  `CUSTOMERS-3-WEB` (CRM-61); editing has no story.
- **The full ticket history** — `TICKETS-7-WEB` (CRM-84).
- **Any `api/` change**: the composite read arrives with `CUSTOMERS-2-API`
  (CRM-57).
