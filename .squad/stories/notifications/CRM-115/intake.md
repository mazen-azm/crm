> **Fetched from jira:** [CRM-115](https://mazen-al-nabarawy.atlassian.net/browse/CRM-115)  
> *Fetched 2026-08-31T00:37:07.980Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** NOTIFICATIONS-1-API agent — I am told when a ticket becomes mine  
**Type:** Story  
**Status:** To Do  
**Labels:** agent, backend, notifications, pts-3, sprint-7

### Description

agent — I am told when a ticket becomes mine

Story folder: .squad/stories/notifications/NOTIFICATIONS-1-API-assigned-to-me/

Owns no rule of its own.

Cannot ship before: TICKETS-3-API

Points: 3 · Sprint: 7 · Layer: API

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/notifications/CRM-115/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `notifications`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-115` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `agent, backend, notifications, pts-3, sprint-7`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
NOTIFICATIONS-1-API agent — I am told when a ticket becomes mine
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
agent — I am told when a ticket becomes mine

Story folder: .squad/stories/notifications/NOTIFICATIONS-1-API-assigned-to-me/

Owns no rule of its own.

Cannot ship before: TICKETS-3-API

Points: 3 · Sprint: 7 · Layer: API
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/notifications.md, section NOTIFICATIONS-1-API (line 22):

An agent is told when a ticket becomes theirs.

*Acceptance criteria*
- Given a ticket assigned to an agent, then a notification exists for that
  agent naming the ticket, and it is unread.
- Given the agent who did the assigning, when they assign a ticket to
  themselves, then no notification is written. Telling somebody what they just
  did is noise, and noise is what makes a notification list stop being read.
- Given a ticket unassigned, or reassigned away from them, then nothing is
  written for the person who lost it. NOTIFICATIONS-1-API is "becomes mine",
  and no story says otherwise — stated here rather than left for somebody to
  wonder.
- Given the assignment and the notification, then they are written together or
  not at all. An assignment nobody is told about is the bug this story exists
  to fix, and a notification for an assignment that did not happen is worse.
- Given an agent reading their notifications, then they get their own and only
  their own, oldest first, paged with the API's window (BR-4) — and somebody
  else's are not reachable by any request they can make.
- Given a notification, then it carries the ticket's id rather than a copy of
  its subject. A subject copied at assignment time is a subject that goes
  stale, and the screen that shows it can resolve an id.
- Given the read, then marking one read is a write of its own: reading a list
  must not change what is in it, or an agent who glances at the screen has
  dismissed everything on it.
- Given a notification already read, then marking it read again is not a second
  event and writes no second row.
- Given the writes, then they are audited like any other mutation (BR-2).

*Out of scope*
- Any delivery channel — email, push, or a live connection. The brief puts
  those under Specified, and this story is the record they would each read.
- A screen. Nothing in this sprint draws one; the route is what the story asks
  for, and a route nothing calls is a stated gap rather than an oversight.
- Notifying anybody about anything else — a reply, a status move, a service
  level about to be missed. Each would be its own story, and none is written.
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
**This is the feature's first story and the directory does not exist.**
`docs/architecture.md` says where a feature goes: rules, repository, service,
routes, index — read one of the existing features rather than restating it. The
next migration is `0013`.

**The write belongs inside the assignment's transaction.** Tickets owns
assignment; notifications owns the row. That is the same seam
`IDENTITY-9-API (CRM-54)` uses, and the same rule: a method callable from inside
the caller's transaction opens none of its own, because SQLite refuses `BEGIN`
inside `BEGIN`.

**Four censuses will see the new routes.** A route that answers a customer must
be named in `staff-only.guarantee.test.js`'s `OPEN_TO_A_CUSTOMER` with a reason,
or refuse them; `audit.guarantee.test.js` will want the mutations audited; and
`openapi-contract.test.js` fails on a route that is served and not documented in
`api/openapi.json`.

**Paging is `readPagination`** — the shared ceiling, refusing rather than
clamping, naming the field (BR-4). Do not send or invent a page size.

**`assignees.test.js` and the assignment tests are where the trigger is
exercised.** Adding a notification must not change what those already assert.


## Out of scope

- **Any delivery channel** — email, push, or a live connection. The brief puts
  those under Specified, and this story is the record each of them would read.
- **A screen.** Nothing in this sprint draws one. A route nothing calls is a
  stated gap rather than an oversight.
- **Notifying about anything else** — a reply, a status move, a service level
  about to be missed. Each would be its own story and none is written.
- **Telling somebody a ticket stopped being theirs.** The story is "becomes
  mine"; `IDENTITY-9-API (CRM-54)` unassigns a disabled agent's queue and tells
  nobody, deliberately.
