> **Fetched from jira:** [CRM-61](https://mazen-al-nabarawy.atlassian.net/browse/CRM-61)  
> *Fetched 2026-08-29T16:58:46.342Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** CUSTOMERS-3-WEB agent — I write an internal note about a customer  
**Type:** Story  
**Status:** To Do  
**Labels:** agent, customers, pts-2, sprint-4, web

### Description

agent — I write an internal note about a customer

Story folder: .squad/stories/customers/CUSTOMERS-3-WEB-internal-note/

Rules this story owns:

	BR-2 — Every mutation is audited: actor, entity, action, before, after, timestamp.

Cannot ship before: CUSTOMERS-1-API

Points: 2 · Sprint: 4 · Layer: WEB

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/customers/CRM-61/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `customers`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-61` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `agent, customers, pts-2, sprint-4, web`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
CUSTOMERS-3-WEB agent — I write an internal note about a customer
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
agent — I write an internal note about a customer

Story folder: .squad/stories/customers/CUSTOMERS-3-WEB-internal-note/

Rules this story owns:

	BR-2 — Every mutation is audited: actor, entity, action, before, after, timestamp.

Cannot ship before: CUSTOMERS-1-API

Points: 2 · Sprint: 4 · Layer: WEB
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/customers.md, section CUSTOMERS-3-WEB:

- Given a note, when it is written, then it appears in the customer's notes
  without the screen reloading everything it already had.
- Given a blank or whitespace-only note, when it is submitted, then the screen
  refuses it the way the API does and says so on the field.
- Given the notes, when they are read, then the author and the time are shown,
  because a note nobody can attribute is a note nobody trusts (BR-2, BR-3).
- Given every string on the screen, then it came from a resource file, in both
  languages (BR-6).
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
`web/src/shared/i18n/parity.test.ts` fails — it is the vitest suite that compares the two objects, not `verify-i18n-parity.mjs`, which checks which roots carry resource files at all and says so in its own header, and `no-hardcoded-strings.test.ts` catches a
literal in JSX — **including a separator typed between tags**. Error sentences
come from the shared `t.errors` map keyed by the API's code, which now names the
three domain codes as well; never compose one from `fields`.

**`request(path)` already prefixes `/api/v1`** (`base-url.ts:3`). Writing it
again gives `/api/v1/api/v1/…`, which CRM-72's tests caught.

**A fetch stub must build a fresh `Response` per call** (L-30): a body can be
read once, and the symptom of getting this wrong is a test that times out
rather than one that mentions bodies.

**Both routes already exist**: `GET /customers/:id/notes` and
`POST /customers/:id/notes` (`customers.routes.js:26,35`). Nothing in `api/`
changes.

**"Without reloading everything it already had" is the criterion with teeth.**
The POST answers with the note it created, so append that to the list in hand
rather than re-fetching the customer screen. A test can see the difference: count
the requests after a successful write.

**The whitespace test is applied before the request, and the API applies it
again.** Same reasoning as the resolution note in CRM-81 — a round-trip to be
told what the screen already knew is a worse experience for the same answer, and
`customer_notes.body` is `TEXT NOT NULL` with the rules layer refusing empty
before it (`0006__customer_notes.sql:24`).

**The author is an id and the screen needs a name.** `customer_notes.author_id`
is a user id, and `author_id` is null when the system wrote it — which must read
as something, not as a blank. The assignee list (`GET /assignees`) is the same
problem CRM-77 solved by resolving ids on the client; check whether the notes
route already returns a name before adding a second fetch, and say what you
found.

**The time is shown in the reader's locale** (BR-3). `useFormatters` is the
existing way; the stored value is UTC and must not be rendered raw.

## Out of scope

- What this story explicitly does **not** cover:

- **Editing or deleting a note.** The schema deliberately has no `updated_at`
  and no `deleted_at` on notes, and its comment says why: those are decisions
  nobody has written criteria for.
- **Notes on a ticket** — these are notes about a customer. An internal note on
  a conversation is `CONVERSATION-2-*`.
- **Any `api/` change.**
