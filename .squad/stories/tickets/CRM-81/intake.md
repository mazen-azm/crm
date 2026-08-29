> **Fetched from jira:** [CRM-81](https://mazen-al-nabarawy.atlassian.net/browse/CRM-81)  
> *Fetched 2026-08-29T15:49:38.175Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** TICKETS-5-WEB agent — resolving a ticket needs a note  
**Type:** Story  
**Status:** To Do  
**Labels:** agent, pts-2, sprint-3, tickets, web

### Description

agent — resolving a ticket needs a note

Story folder: .squad/stories/tickets/TICKETS-5-WEB-resolve-with-note/

Rules this story owns:

	T-4 — Resolving requires a resolution note.

Cannot ship before: TICKETS-4-API

Points: 2 · Sprint: 3 · Layer: WEB

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/tickets/CRM-81/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `tickets`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-81` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `agent, pts-2, sprint-3, tickets, web`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
TICKETS-5-WEB agent — resolving a ticket needs a note
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
agent — resolving a ticket needs a note

Story folder: .squad/stories/tickets/TICKETS-5-WEB-resolve-with-note/

Rules this story owns:

	T-4 — Resolving requires a resolution note.

Cannot ship before: TICKETS-4-API

Points: 2 · Sprint: 3 · Layer: WEB
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/tickets.md, section TICKETS-5-WEB:

- Given the resolve control, when it is pressed, then the screen asks for a note
  before it calls the API — the requirement is stated, not discovered by a 422.
- Given a note that is only whitespace, when resolve is pressed, then the screen
  refuses it the same way the API does, and says so on the field.
- Given a resolved ticket, when the screen renders it afterwards, then the note
  is readable on the ticket.
- Given a status the machine does not allow, when the screen offers the moves,
  then that status is not among them — the 409 is a backstop, not the interface.
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
`verify-i18n-parity.mjs` fails. Error text is keyed by the API's `code`
(`web/src/shared/api/errors.ts`), never composed from `fields`.

**A stub that returns the same `Response` twice fails on the second read** (L-30):
build a fresh `Response` per call in every fetch stub.

**The screen offers only the legal moves, and the API's 409 is the backstop.**
`TICKETS-4-API` (CRM-79) built the transition table and a refusal that answers
`{ code: 'ILLEGAL_TRANSITION', allowed: [...] }` — where `allowed` lists the
statuses that were legal from where the ticket is. **Read `allowed` from the
refusal rather than copying the transition table into the client**: a second
copy of a product rule in the web app is a rule that will disagree with the API
the first time either changes. The screen learns the legal moves from the
ticket's status the same way, by asking.

*(If offering the moves needs the table before a refusal has happened, say so
in the plan and propose how — an endpoint that returns them, or the `allowed`
array carried on the ticket. Do not silently hard-code the six statuses and
their edges into TypeScript.)*

**A whitespace note is refused on the client too, and the same way.** The API
trims and calls `'   '` empty (T-4). The screen must not send it and then
translate the 422 — it must say so on the field, because a round-trip to be
told what the screen already knew is a worse experience for the same answer.

**Half of this was done by CRM-77 — check what is left before writing.**
`ApiErrorCode` now names `ILLEGAL_TRANSITION` and `STATUS_UNCHANGED`, and both
have a sentence in `en.ts` and `ar.ts`. What is still missing is the `allowed`
array itself.

**The API client drops `allowed` today, and this story has to add it.**
`web/src/shared/api/client.ts` builds an `ApiError` from `code`, `requestId`
and `fields` only, and `web/src/shared/api/errors.ts:19–37` has no `allowed`
field at all — so the array the API sends never reaches a screen. Add it the
same way `fields` is added: parsed defensively (an array of strings or nothing),
optional on the class, and set only when present. **Keep undefined apart from
`[]`** for the reason the API keeps them apart — see the next paragraph.

**`allowed: []` is present and meaningful** on a closed ticket: it is the
answer "nothing", not a missing field. A screen that treats an empty array as
"unknown, show everything" would offer moves that cannot happen.

**The note is on the ticket as `resolutionNote`** (CRM-80), null until resolved.
It is read back from the ticket, not held in the form's state.

## Out of scope

- What this story explicitly does **not** cover:

- **The reopen window and auto-close** (T-5, T-6) — later stories.
- **Editing a note after the fact** — nothing asks for it, and the audit trail
  would need to say what changed.
- **The conversation** — a resolution note is a field on the ticket today; the
  migration comment says why.
- **Any `api/` change**: the status route, the note requirement and the
  `allowed` payload all exist.
