> **Fetched from jira:** [CRM-74](https://mazen-al-nabarawy.atlassian.net/browse/CRM-74)  
> *Fetched 2026-08-29T15:49:37.308Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** TICKETS-2-WEB agent — I filter and sort the queue; an agent sees all of it  
**Type:** Story  
**Status:** To Do  
**Labels:** agent, pts-5, sprint-3, tickets, web

### Description

agent — I filter and sort the queue; an agent sees all of it

Story folder: .squad/stories/tickets/TICKETS-2-WEB-queue-filter-sort/

Rules this story owns:

	BR-4 — No unbounded list: paginated, filterable, sortable, with a maximum page size.

Cannot ship before: TICKETS-1-API

Points: 5 · Sprint: 3 · Layer: WEB

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/tickets/CRM-74/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `tickets`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-74` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `agent, pts-5, sprint-3, tickets, web`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
TICKETS-2-WEB agent — I filter and sort the queue; an agent sees all of it
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
agent — I filter and sort the queue; an agent sees all of it

Story folder: .squad/stories/tickets/TICKETS-2-WEB-queue-filter-sort/

Rules this story owns:

	BR-4 — No unbounded list: paginated, filterable, sortable, with a maximum page size.

Cannot ship before: TICKETS-1-API

Points: 5 · Sprint: 3 · Layer: WEB
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/tickets.md, section TICKETS-2-WEB:

- Given the filters, when one is applied, then the API is asked and the screen
  does not filter what it already holds.
- Given an empty result, when the screen renders, then the empty state says which
  filters produced it and offers to clear them (D-2).
- Given the queue, when it is paged, then the screen uses the API's paging and
  adds none of its own (BR-4).
- Given a filter and a page, when the screen is reloaded, then the same rows come
  back — the filter lives in the URL, not only in memory.
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

**The filter lives in the URL.** `useSearchParams` from `react-router`, not
`useState` — that is what makes a filtered queue a link an agent can send, and
what makes the reload criterion true. It also removes the "restore state on
back" problem rather than solving it.

**Filtering on the client is the failure this story is written to prevent.**
`GET /api/v1/tickets` already takes `status`, `priority`, `categoryId`,
`assigneeId`, `sort`, `limit` and `offset`, and refuses a limit above the
ceiling rather than clamping it. Every filter change is a new request. A screen
that filters the page it is holding shows the wrong `total` and silently drops
rows on page two.

**`assigneeId=none` is how the API says unassigned** (`UNASSIGNED` in
`api/src/features/tickets/tickets.rules.js`). It is not an empty string and not
a missing parameter — both of those mean "do not filter by assignee".

**The empty state has to name the filters.** D-2 asks for the next action, and
"no tickets" over a queue of two hundred, with a status filter the agent
forgot, is the exact case it exists for.

## Out of scope

- What this story explicitly does **not** cover:

- **Raising a ticket** — `TICKETS-1-WEB` (CRM-72).
- **Assigning from the queue** — `TICKETS-3-WEB` (CRM-77).
- **A ticket detail screen** — no story asks for one here.
- **Saved filters or a default view per agent** — nothing in the brief asks for
  it, and it needs a place to store it.
- **Any `api/` change**: the queue endpoint already takes every filter this
  screen needs.
