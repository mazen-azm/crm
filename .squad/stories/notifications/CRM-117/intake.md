> **Fetched from jira:** [CRM-117](https://mazen-al-nabarawy.atlassian.net/browse/CRM-117)  
> *Fetched 2026-08-31T11:07:35.567Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** NOTIFICATIONS-2-WEB any — I read my notifications  
**Type:** Story  
**Status:** To Do  
**Labels:** any, notifications, pts-2, sprint-8, web

### Description

any — I read my notifications

Story folder: .squad/stories/notifications/NOTIFICATIONS-2-WEB-read-notifications/

Rules this story owns:

	BR-4 — No unbounded list: paginated, filterable, sortable, with a maximum page size.

Cannot ship before: NOTIFICATIONS-1-API

Points: 2 · Sprint: 8 · Layer: WEB

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/notifications/CRM-117/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `notifications`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-117` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `any, notifications, pts-2, sprint-8, web`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
NOTIFICATIONS-2-WEB any — I read my notifications
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
any — I read my notifications

Story folder: .squad/stories/notifications/NOTIFICATIONS-2-WEB-read-notifications/

Rules this story owns:

	BR-4 — No unbounded list: paginated, filterable, sortable, with a maximum page size.

Cannot ship before: NOTIFICATIONS-1-API

Points: 2 · Sprint: 8 · Layer: WEB
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/notifications.md, section NOTIFICATIONS-2-WEB (line 102):

Somewhere to read them.

Written 2026-08-31, with the sprint 8 stories.

*Acceptance criteria*
- Given a signed-in staff member with unread notifications, then the shell says
  how many, from wherever they are. A notification nobody can see from the
  screen they are on is a notification that waits until somebody goes looking.
- Given the screen, then each notification says what happened and which ticket
  it was about, and the ticket is one click away. The row carries an id and the
  screen resolves it — the same rule the ticket history follows for names.
- Given a notification, then reading it is deliberate: opening the list marks
  nothing. An agent who glances at the screen has not dismissed what is on it.
- Given one marked read, then the screen and the count follow without a
  reload, from the answer the write returned.
- Given none at all, then the screen says so rather than showing an empty
  frame, and the shell shows no count rather than a zero.
- Given every string, then it came from a resource file, in both languages
  (BR-6), and every time is in the reader's locale (BR-3).

*Out of scope*
- Any `api/` change — `NOTIFICATIONS-2-API` owns the route, the filter and the
  count.
- Live updates. The count is what the last read said; nothing polls and nothing
  subscribes, and no story asks for either.
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
**Any `api/` change belongs to `NOTIFICATIONS-2-API (CRM-116)`.**

**The shell is `web/src/app/desk-shell/DeskShell.tsx`** and already renders
navigation conditionally on `useMe()`'s `isAdmin` / `isStaff`, which are
`undefined` until `/me` answers — nothing role-dependent may be drawn on
`undefined` or it flashes.

**A route only its author can navigate to is a route that does not exist.**
Three screens have had to fix that; wire the way in with the screen.

**`useRequest` is the four-state hook** and holds ONE answer with no setter —
deliberately. A screen that changes a list in place holds it locally, the way
`TicketCategoriesPage` and `PortalTicketPage` do.

**A notification carries a ticket id and no subject.** Resolving it to
something readable is the screen's job; `useTicketQueue`'s row shape is what
the desk already uses.


## Out of scope

- **Any `api/` change** — `NOTIFICATIONS-2-API (CRM-116)`.
- **Live updates.** Nothing polls and nothing subscribes; the count is what the last read said.
