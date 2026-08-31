> **Fetched from jira:** [CRM-116](https://mazen-al-nabarawy.atlassian.net/browse/CRM-116)  
> *Fetched 2026-08-31T11:07:34.764Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** NOTIFICATIONS-2-API any — I read my notifications  
**Type:** Story  
**Status:** To Do  
**Labels:** any, backend, notifications, pts-2, sprint-8

### Description

any — I read my notifications

Story folder: .squad/stories/notifications/NOTIFICATIONS-2-API-read-notifications/

Rules this story owns:

	BR-4 — No unbounded list: paginated, filterable, sortable, with a maximum page size.

Cannot ship before: NOTIFICATIONS-1-API

Points: 2 · Sprint: 8 · Layer: API

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/notifications/CRM-116/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `notifications`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-116` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `any, backend, notifications, pts-2, sprint-8`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
NOTIFICATIONS-2-API any — I read my notifications
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
any — I read my notifications

Story folder: .squad/stories/notifications/NOTIFICATIONS-2-API-read-notifications/

Rules this story owns:

	BR-4 — No unbounded list: paginated, filterable, sortable, with a maximum page size.

Cannot ship before: NOTIFICATIONS-1-API

Points: 2 · Sprint: 8 · Layer: API
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/notifications.md, section NOTIFICATIONS-2-API (line 60):

Reading them, and the count that makes a screen worth opening.

Written 2026-08-31, with the sprint 8 stories.

**Most of this shipped with NOTIFICATIONS-1-API**, and saying so is part of the
story rather than a caveat on it. The list and the mark-read route were built
there because a feature that writes rows nothing can read is not a feature —
its criteria state the paging, the ownership and the idempotence, and the tests
that prove them are `told-when-mine.test.js`. What is left is what a screen
needs and could not get.

*Acceptance criteria*
- Given the list, then it can be narrowed to the unread ones. A person with
  four hundred read notifications and two new ones cannot find the two by
  paging, and the alternative — the screen fetching every page and filtering —
  is the client inventing a query the server can answer.
- Given any read of the list, then the number of unread ones comes back with
  it. A screen showing a badge should not have to ask twice, and a count
  derived from the page it happens to be holding is wrong on every page but
  the first.
- Given that count, then it is the number unread and not the number returned:
  the two differ the moment a window is applied, and a badge that changed when
  somebody turned the page would be reporting the page rather than the person.
- Given the filter, then a value that is not one of the two it allows is
  refused naming the field, the same way every other list here refuses a
  window it does not allow (BR-4).
- Given the ordering, then the unread view keeps it: oldest first, as the whole
  list is. A person clearing a backlog works from the oldest.
- Given a customer, then the route still refuses them. Nothing writes a
  notification for a customer, so an open route would offer an empty list
  forever; the backlog's actor column says `any` and the honest reading is
  "any staff member", because `any` cannot mean somebody the feature never
  writes for. When a story writes one for a customer, this opens with it.

*Out of scope*
- Marking everything read at once. Nothing asks for it, and a button that
  clears a list somebody has not read is the opposite of what the list is for.
- Deleting a notification. BR-1, and nothing asks.
- A screen — `NOTIFICATIONS-2-WEB`.
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
**Read `told-when-mine.test.js` first.** `NOTIFICATIONS-1-API (CRM-115)` built
`GET /me/notifications` and `POST /me/notifications/:id/read`, both staff-only,
both scoped to the reader, with paging, idempotent marking, and audit rows.
Its criteria state all of that. **This story is the unread filter and the
unread count**, and its own criteria say so on their face — do not re-plan what
is already there, and do not describe it as new.

**The list answers `{ items, total, limit, offset }`**, like every list in this
API. A count of unread is a fifth field, not a replacement for `total`, and the
two mean different things.

**`readPagination` refuses rather than clamps** and names the field (BR-4). A
filter parameter that is not one of the allowed values is refused the same way.

**The count is a `count(*)` with the same predicate the list uses**, not
`items.filter(…).length` — the page is a window and the badge is about the
person.


## Out of scope

- **Re-planning the list and the mark-read route** — `NOTIFICATIONS-1-API (CRM-115)` built both and its tests prove them.
- **Marking everything read at once**, and **deleting** a notification. Nothing asks, and BR-1.
- **The screen** — `NOTIFICATIONS-2-WEB (CRM-117)`.
