> **Fetched from jira:** [CRM-90](https://mazen-al-nabarawy.atlassian.net/browse/CRM-90)  
> *Fetched 2026-08-30T10:11:08.926Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** TICKETS-10-WEB agent — I change a ticket's category  
**Type:** Story  
**Status:** To Do  
**Labels:** agent, pts-2, sprint-6, tickets, web

### Description

agent — I change a ticket's category

Story folder: .squad/stories/tickets/TICKETS-10-WEB-change-category/

Rules this story owns:

	BR-2 — Every mutation is audited: actor, entity, action, before, after, timestamp.

	BR-5 — No silent overwrite: a write carries the revision it read; a mismatch returns 409. Applies to status change, assignment, priority change, article edit.

Cannot ship before: TICKETS-6-API

Points: 2 · Sprint: 6 · Layer: WEB

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/tickets/CRM-90/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `tickets`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-90` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `agent, pts-2, sprint-6, tickets, web`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
TICKETS-10-WEB agent — I change a ticket's category
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
agent — I change a ticket's category

Story folder: .squad/stories/tickets/TICKETS-10-WEB-change-category/

Rules this story owns:

	BR-2 — Every mutation is audited: actor, entity, action, before, after, timestamp.

	BR-5 — No silent overwrite: a write carries the revision it read; a mismatch returns 409. Applies to status change, assignment, priority change, article edit.

Cannot ship before: TICKETS-6-API

Points: 2 · Sprint: 6 · Layer: WEB
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/tickets.md, section TICKETS-10-WEB (line 297):

The same, on a screen.

*Acceptance criteria*
- Given the ticket in the queue, when its category is changed, then the row
  shows the new one without reloading the queue.
- Given a stale revision, then the screen says the ticket changed while it was
  being read, and offers to reload — the same shape assignment and status
  already use.
- Given the picker, then it offers live categories and "no category", and
  nothing else.
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
- **Ids:** cite other stories as FULL-NAME ids with the Jira key —
  `PLATFORM-13-ALL (CRM-28)`. The id comes from `scripts/backlog.txt` (or the
  generated `BACKLOG.md`); **the key comes from `scripts/story-keys.txt`, which
  lists every story's key and is generated from the tracker.** Do not work a key
  out by counting — two plans did, and both named the wrong story.
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

**The stack is Vite + React 19 + TypeScript, Vitest and Testing Library.**
`useTranslation()` returns `{ t }` where `t` is a plain object of strings —
there is **no** `useT()` and **no** interpolation function. The resource files
are nested objects one level deep with camelCase leaves, not dot paths.

**`useRequest` is the four-state hook** (`idle | loading | success | error`) and
its error carries `fields`. Do not invent a second shape for a request.

**`request(path)` already prefixes `/api/v1`** (`shared/api/base-url.ts:3`).

**BR-6:** keys go into `en.ts` and `ar.ts` in the same edit or
`shared/i18n/parity.test.ts` fails, and `pages/no-hardcoded-strings.test.ts`
catches a literal in JSX — including a separator typed between tags.

**`t.errors[code]` is a default, not a law.** It is keyed by what the API
answered, not by what the person was doing when it answered. Two screens have
already needed their own sentence for a code the map already had: a 401 on the
change-password screen (the shared one says the session ended, and it has not),
and a 429 on the public intake (the shared one says "too many attempts", told
to somebody who may have made one). Read the shared sentence before reusing it.

**Never a native validator.** No `type="email"`, `pattern`, `required`, `min`
or `max` on a form whose rules the API owns: the browser refuses to submit and
the API's rule never runs, and the sentence somebody reads is the browser's —
wrong language, unstyled, outside the resource files (L-55). `type="password"`
is fine; it changes display, not whether a value may be sent.

**A value interpolated into a translated sentence needs a bidi isolate**,
U+2068 … U+2069 (L-51) — see `pages/tickets/history-sentence.ts`.

**A fetch stub must build a fresh `Response` per call** (L-30).

**Anything rendering the desk shell must stub `/me`** — the shell asks who is
signed in, because a customer sees none of the desk's screens.
`src/testing/stub-me.ts` does it.

**`npm test` does not typecheck.** `npm run build` is `tsc -b && vite build`,
and it has caught what ten green tests could not.

**A route only its author can navigate to is a route that does not exist.**
Three screens have had to fix that; wire the way in with the screen.

**The queue row is where this goes.** `pages/tickets/TicketQueuePage.tsx` has
the assign picker and the status picker in a `Row` component; the category
picker is the third of the same shape, and `useAssignTicket` / `useChangeStatus`
are the hooks to model on — including how they carry the revision and how they
report a 409.

**`ticket-labels.ts` holds the words a ticket is shown with.** Categories come
from `useTicketCategories`, which the raise form already uses.

**A stale revision has an existing sentence and an existing shape** — see
`t.ticketStatus.staleTitle` and how the row renders it.


**The stack is Vite + React 19 + TypeScript, Vitest and Testing Library.**
`useTranslation()` returns `{ t }` where `t` is a plain object of strings —
there is **no** `useT()` and **no** interpolation function. The resource files
are nested objects one level deep with camelCase leaves, not dot paths.

**`useRequest` is the four-state hook** (`idle | loading | success | error`) and
its error carries `fields`. Do not invent a second shape for a request.

**`request(path)` already prefixes `/api/v1`** (`shared/api/base-url.ts:3`).

**BR-6:** keys go into `en.ts` and `ar.ts` in the same edit or
`shared/i18n/parity.test.ts` fails, and `pages/no-hardcoded-strings.test.ts`
catches a literal in JSX — including a separator typed between tags.

**`t.errors[code]` is a default, not a law.** It is keyed by what the API
answered, not by what the person was doing when it answered. Two screens have
already needed their own sentence for a code the map already had: a 401 on the
change-password screen (the shared one says the session ended, and it has not),
and a 429 on the public intake (the shared one says "too many attempts", told
to somebody who may have made one). Read the shared sentence before reusing it.

**Never a native validator.** No `type="email"`, `pattern`, `required`, `min`
or `max` on a form whose rules the API owns: the browser refuses to submit and
the API's rule never runs, and the sentence somebody reads is the browser's —
wrong language, unstyled, outside the resource files (L-55). `type="password"`
is fine; it changes display, not whether a value may be sent.

**A value interpolated into a translated sentence needs a bidi isolate**,
U+2068 … U+2069 (L-51) — see `pages/tickets/history-sentence.ts`.

**A fetch stub must build a fresh `Response` per call** (L-30).

**Anything rendering the desk shell must stub `/me`** — the shell asks who is
signed in, because a customer sees none of the desk's screens.
`src/testing/stub-me.ts` does it.

**`npm test` does not typecheck.** `npm run build` is `tsc -b && vite build`,
and it has caught what ten green tests could not.

**A route only its author can navigate to is a route that does not exist.**
Three screens have had to fix that; wire the way in with the screen.

**The queue row is where this goes.** `pages/tickets/TicketQueuePage.tsx` has
the assign picker and the status picker in a `Row` component; the category
picker is the third of the same shape, and `useAssignTicket` / `useChangeStatus`
are the hooks to model on — including how they carry the revision and how they
report a 409.

**`ticket-labels.ts` holds the words a ticket is shown with.** Categories come
from `useTicketCategories`, which the raise form already uses.

**A stale revision has an existing sentence and an existing shape** — see
`t.ticketStatus.staleTitle` and how the row renders it.


## Out of scope

- What this story explicitly does **not** cover:

- **Any `api/` change** — `TICKETS-10-API (CRM-89)`.


- **Any `api/` change** — `TICKETS-10-API (CRM-89)`.

