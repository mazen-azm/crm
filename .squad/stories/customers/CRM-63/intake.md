> **Fetched from jira:** [CRM-63](https://mazen-al-nabarawy.atlassian.net/browse/CRM-63)  
> *Fetched 2026-08-29T16:58:44.012Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** CUSTOMERS-4-WEB agent — I add a customer while I am on the phone to them  
**Type:** Story  
**Status:** To Do  
**Labels:** agent, customers, pts-2, sprint-4, web

### Description

agent — I add a customer while I am on the phone to them

Story folder: .squad/stories/customers/CUSTOMERS-4-WEB-add-customer/

Rules this story owns:

	I-1 — users and customers are two tables; customers.user_id is null until first sign-in.

Cannot ship before: CUSTOMERS-1-API

Points: 2 · Sprint: 4 · Layer: WEB

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/customers/CRM-63/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `customers`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-63` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `agent, customers, pts-2, sprint-4, web`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
CUSTOMERS-4-WEB agent — I add a customer while I am on the phone to them
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
agent — I add a customer while I am on the phone to them

Story folder: .squad/stories/customers/CUSTOMERS-4-WEB-add-customer/

Rules this story owns:

	I-1 — users and customers are two tables; customers.user_id is null until first sign-in.

Cannot ship before: CUSTOMERS-1-API

Points: 2 · Sprint: 4 · Layer: WEB
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/customers.md, section CUSTOMERS-4-WEB:

- Given the form, when a field the API named is refused, then that field is
  marked and the message is the shared one for the code.
- Given a submission in flight, then the control cannot be pressed twice — this
  request creates a row, so a second press is a second customer.
- Given a created customer, then the screen shows the customer it created,
  rather than a message saying it worked.
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
`verify-i18n-parity.mjs` fails, and `no-hardcoded-strings.test.ts` catches a
literal in JSX — **including a separator typed between tags**. Error sentences
come from the shared `t.errors` map keyed by the API's code, which now names the
three domain codes as well; never compose one from `fields`.

**`request(path)` already prefixes `/api/v1`** (`base-url.ts:3`). Writing it
again gives `/api/v1/api/v1/…`, which CRM-72's tests caught.

**A fetch stub must build a fresh `Response` per call** (L-30): a body can be
read once, and the symptom of getting this wrong is a test that times out
rather than one that mentions bodies.

**`RaiseTicketPage.tsx` is this screen's sibling and was written three stories
ago.** Same four criteria almost word for word: mark the named field, disable
while in flight, show the created thing. Follow it closely enough that a reader
of one recognises the other — and if something there was awkward, fix it in both
rather than diverging.

**Email is optional here.** Leaving it blank must reach the API as an absent
value, not `''` — the same distinction the ticket form draws between "no
category" and an empty string. An address already on file comes back as a 422
naming `email`; that marks the field and shows the shared sentence.

## Out of scope

- What this story explicitly does **not** cover:

- **Searching for a customer first** — the customers list already exists and
  this is the add form.
- **Editing a customer** — no story.
- **Any `api/` change**: the route arrives with `CUSTOMERS-4-API` (CRM-62), and
  this story waits on it.
