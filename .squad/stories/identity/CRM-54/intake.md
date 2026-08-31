> **Fetched from jira:** [CRM-54](https://mazen-al-nabarawy.atlassian.net/browse/CRM-54)  
> *Fetched 2026-08-31T00:36:54.437Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** IDENTITY-9-API admin — disabling somebody unassigns their queue and tells me how much  
**Type:** Story  
**Status:** To Do  
**Labels:** admin, backend, identity, pts-5, sprint-7

### Description

admin — disabling somebody unassigns their queue and tells me how much

Story folder: .squad/stories/identity/IDENTITY-9-API-disable-unassigns/

Rules this story owns:

	BR-2 — Every mutation is audited: actor, entity, action, before, after, timestamp.

Cannot ship before: IDENTITY-2-API, TICKETS-3-API

Points: 5 · Sprint: 7 · Layer: API

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/identity/CRM-54/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `identity`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-54` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `admin, backend, identity, pts-5, sprint-7`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
IDENTITY-9-API admin — disabling somebody unassigns their queue and tells me how much
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
admin — disabling somebody unassigns their queue and tells me how much

Story folder: .squad/stories/identity/IDENTITY-9-API-disable-unassigns/

Rules this story owns:

	BR-2 — Every mutation is audited: actor, entity, action, before, after, timestamp.

Cannot ship before: IDENTITY-2-API, TICKETS-3-API

Points: 5 · Sprint: 7 · Layer: API
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/identity.md, section IDENTITY-9-API (line 229):

Disabling somebody hands their queue back, and says how much of it there was.

Written 2026-08-31, with the sprint 7 stories.

*Acceptance criteria*
- Given an agent with tickets assigned to them, when an admin disables the
  account, then those tickets are unassigned and the answer says how many. An
  admin deciding whether to disable somebody is deciding what happens to their
  work, and a number they have to go and count is a number they will not
  count.
- Given the tickets that were unassigned, then each is audited as an
  assignment change like any other (BR-2), with the disabling admin as the
  actor. The trail must not show tickets that moved with nobody moving them.
- Given a closed ticket of theirs, then it is left alone. Unassigning is about
  work somebody still has to do, and rewriting who finished a closed ticket
  would make the record wrong to tidy a queue.
- Given the disable and the unassignments, then they happen together or not at
  all. An account disabled with its queue still assigned to it is worse than
  either outcome alone: the work is invisible and its owner cannot sign in.
- Given an agent with no tickets, then the count is zero and the disable is
  the same disable. Zero is an answer, not an error.
- Given somebody already disabled, then the answer is the one IDENTITY-2-API
  already gives, and no tickets move. Disabling twice is not two events.

*Out of scope*
- Choosing who the tickets go to instead. They go to nobody, which the queue
  already renders and TICKETS-3-API already allows; assigning them onward is a
  decision an admin makes afterwards with the screen that exists for it.
- Telling the disabled person anything. NOTIFICATIONS-1-API tells an agent
  when a ticket becomes theirs, and nothing tells anybody when one stops being.
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
**This is a cross-feature write and the seam already exists.** Disabling is
identity's; unassigning is tickets'. Identity must not write to the tickets
table — `verify-architecture.mjs` checks the direction, and the established
pattern is a method on the tickets service that is callable from inside the
caller's transaction: `stopClock`, `openOnFirstReply`, `reopenOnReply`,
`readForActor`, `publicById`. Read one of them before writing another.

**Transactions do not nest.** SQLite refuses `BEGIN` inside `BEGIN`. A method
meant to be called from inside somebody else's transaction opens none of its
own, and says so in its comment. Every one of the five above does.

**Assignment is audited by the tickets feature**, with the verb it already
uses. The actor is the admin who disabled the account, not the agent losing the
tickets, and not null — this is something a person did.

**`GET /assignees` is the live staff list** and already excludes disabled
users, so nothing on the web side needs changing for the queue's picker.


## Out of scope

- **Choosing who the tickets go to instead.** They go to nobody, which the
  queue renders and `TICKETS-3-API` allows; assigning them onward is a decision
  an admin makes afterwards on the screen that exists for it.
- **Telling the disabled person, or anybody else.** `NOTIFICATIONS-1-API
  (CRM-115)` tells an agent when a ticket becomes theirs, and nothing tells
  anybody when one stops being.
- **Closed tickets.** Left alone: unassigning is about work somebody still has
  to do.
- **Re-enabling.** It does not give the tickets back, and no story says it
  should.
