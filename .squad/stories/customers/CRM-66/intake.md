> **Fetched from jira:** [CRM-66](https://mazen-al-nabarawy.atlassian.net/browse/CRM-66)  
> *Fetched 2026-08-30T02:51:42.235Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** CUSTOMERS-6-WEB agent — I give a customer a sign-in  
**Type:** Story  
**Status:** To Do  
**Labels:** agent, customers, pts-2, sprint-5, web

### Description

agent — I give a customer a sign-in

Story folder: .squad/stories/customers/CUSTOMERS-6-WEB-grant-sign-in/

Rules this story owns:

	I-1 — users and customers are two tables; customers.user_id is null until first sign-in.

Cannot ship before: CUSTOMERS-4-API, IDENTITY-2-API

Points: 2 · Sprint: 5 · Layer: WEB

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/customers/CRM-66/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `customers`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-66` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `agent, customers, pts-2, sprint-5, web`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
CUSTOMERS-6-WEB agent — I give a customer a sign-in
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
agent — I give a customer a sign-in

Story folder: .squad/stories/customers/CUSTOMERS-6-WEB-grant-sign-in/

Rules this story owns:

	I-1 — users and customers are two tables; customers.user_id is null until first sign-in.

Cannot ship before: CUSTOMERS-4-API, IDENTITY-2-API

Points: 2 · Sprint: 5 · Layer: WEB
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/customers.md, section CUSTOMERS-6-WEB (line 221):

The same, on a screen.

*Acceptance criteria*
- Given a customer with no sign-in, when an agent grants one from the customer
  screen, then the initial password is shown once, plainly, because the agent
  has to read it to them.
- Given a customer who already has one, then the control says so rather than
  offering an action that will be refused.
- Given a refusal naming a field, then that field is marked and the sentence
  is the shared one for the code.
- Given a submission in flight, then the control cannot be pressed twice —
  this creates an account.
- Given every string, then it came from a resource file, in both languages
  (BR-6).
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

**It belongs on `web/src/pages/customers/CustomerScreenPage.tsx`**, which
already shows one customer whole — contacts, open tickets and notes. Read it
first; the note form on it is the closest sibling for a control that writes and
shows the result without reloading the screen.

**The initial password is shown once, plainly.** The agent has to read it out
loud over the phone. Do not mask it, and do not put it anywhere it can be
re-read after the screen changes.

**A customer who already has a sign-in gets a statement, not a control.** An
action that will certainly be refused is worse than no action.

**`request(path)` already prefixes `/api/v1`.** BR-6 needs both `en.ts` and
`ar.ts` in one edit; `no-hardcoded-strings.test.ts` catches a literal in JSX,
including a separator between tags. A fresh `Response` per fetch call (L-30).

**`CustomerScreenPage.test.tsx` counts the requests the screen makes** — the
criterion for that screen is one request, and a test asserts the customer is
fetched once and its notes and tickets are not fetched separately. A new call
added here must not break that count; read the assertion before adding a fetch.


## Out of scope

- What this story explicitly does **not** cover:

- **Any `api/` change** — `CUSTOMERS-6-API (CRM-65)`.
- **A screen for the customer to use.** That is the portal.

