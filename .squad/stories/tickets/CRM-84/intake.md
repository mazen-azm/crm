> **Fetched from jira:** [CRM-84](https://mazen-al-nabarawy.atlassian.net/browse/CRM-84)  
> *Fetched 2026-08-29T16:58:45.055Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** TICKETS-7-WEB agent — I read the whole history in order  
**Type:** Story  
**Status:** To Do  
**Labels:** agent, pts-3, sprint-4, tickets, web

### Description

agent — I read the whole history in order

Story folder: .squad/stories/tickets/TICKETS-7-WEB-ticket-history/

Owns no rule of its own.

Cannot ship before: TICKETS-1-API

Points: 3 · Sprint: 4 · Layer: WEB

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/tickets/CRM-84/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `tickets`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-84` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `agent, pts-3, sprint-4, tickets, web`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
TICKETS-7-WEB agent — I read the whole history in order
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
agent — I read the whole history in order

Story folder: .squad/stories/tickets/TICKETS-7-WEB-ticket-history/

Owns no rule of its own.

Cannot ship before: TICKETS-1-API

Points: 3 · Sprint: 4 · Layer: WEB
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/tickets.md, section TICKETS-7-WEB:

- Given the history, when it renders, then each entry reads as a sentence a
  person can follow, built from resource strings rather than the raw verb (BR-6).
- Given a timestamp, when it is shown, then it is in the reader's locale, not the
  stored UTC string (BR-3).
- Given a ticket with no history yet, then the empty state says so (D-2).
- Given the history, when it is paged, then the screen uses the API's paging and
  adds none of its own (BR-4).
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

**"Reads as a sentence" is the whole design problem.** The API returns a verb
(`ticket.status`, `ticket.assign`) and a before/after pair. A screen that prints
those is showing its database. What a person needs is *"Sofia moved this from
New to Open"* — so there is a mapping from verb to a sentence with slots, and
the slots are filled with values that are themselves translated (a status is a
word from the resource file, not `pending`).

**That mapping is the thing to get right, and Arabic is where a naive one
breaks.** A sentence assembled by concatenating fragments works in English and
produces nonsense in Arabic, where the order differs. So each verb gets a
**whole sentence per language** with placeholders — not a noun glued to a verb
glued to a value. Say in the plan how the placeholders are substituted; there is
no i18n library here, so it is a small function, and it belongs next to the
resource files rather than in the page.

**An unknown verb must render as something.** A verb the screen has no sentence
for should still produce a legible line rather than a blank or a crash — history
is append-only and a future story will add verbs before it adds sentences.

**The actor may be absent.** `audit_events.actor_id` is null when the system
acted, deliberately and never invented. That reads as a named actor in the
sentence, not as an empty space.

## Out of scope

- What this story explicitly does **not** cover:

- **Filtering the history** — nothing asks for it.
- **A history for a customer or an article** — this screen is a ticket's.
- **Any `api/` change**: the route arrives with `TICKETS-7-API` (CRM-83).
