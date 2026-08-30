> **Fetched from jira:** [CRM-73](https://mazen-al-nabarawy.atlassian.net/browse/CRM-73)  
> *Fetched 2026-08-29T14:39:17.736Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** TICKETS-2-API agent — I filter and sort the queue; an agent sees all of it  
**Type:** Story  
**Status:** To Do  
**Labels:** agent, backend, pts-5, sprint-3, tickets

### Description

agent — I filter and sort the queue; an agent sees all of it

Story folder: .squad/stories/tickets/TICKETS-2-API-queue-filter-sort/

Rules this story owns:

	BR-4 — No unbounded list: paginated, filterable, sortable, with a maximum page size.

Cannot ship before: TICKETS-1-API

Points: 5 · Sprint: 3 · Layer: API

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/tickets/CRM-73/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `tickets`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-73` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `agent, backend, pts-5, sprint-3, tickets`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
TICKETS-2-API agent — I filter and sort the queue; an agent sees all of it
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
agent — I filter and sort the queue; an agent sees all of it

Story folder: .squad/stories/tickets/TICKETS-2-API-queue-filter-sort/

Rules this story owns:

	BR-4 — No unbounded list: paginated, filterable, sortable, with a maximum page size.

Cannot ship before: TICKETS-1-API

Points: 5 · Sprint: 3 · Layer: API
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/tickets.md, section TICKETS-2-API:

- Given the queue, when it is read, then it is paginated with the ceiling every
  list obeys, refused rather than clamped above it (BR-4).
- Given a filter by status, by assignee, by priority or by category, when it is
  applied, then only matching tickets are returned, and the filters combine.
- Given a sort, when it is asked for, then it is one the API names; an unknown
  sort is refused rather than silently ignored, because a queue in an order
  nobody asked for looks like data loss.
- Given an agent, when they read the queue, then they see every ticket in it —
  not only their own. "An agent sees all of it" is the story's title and the
  point: this is one shared queue (SC-1).
- Given a soft-deleted ticket, then it is never in the queue.
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

- APIs, screens, services already discussed. Repos/roots: `api, web, android`. Primary language: `JavaScript`. **`api/` only** — the screen is `TICKETS-2-WEB` (CRM-74).

**The schema built four indexes for this story, and they were measured before
this was written.** `0002__tickets.sql` ends with four partial indexes, each
`(column, created_at DESC) WHERE deleted_at IS NULL`, and its comment names this
story. `EXPLAIN QUERY PLAN` on the real schema:

```
one filter        SEARCH tickets USING INDEX tickets_status_created_at_idx (status=?)
two filters       SEARCH tickets USING INDEX tickets_priority_created_at_idx (priority=?)
assignee IS NULL  SEARCH tickets USING INDEX tickets_assignee_created_at_idx (assignee_id=?)
NO filter         SCAN tickets USING INDEX tickets_category_created_at_idx
                  | USE TEMP B-TREE FOR ORDER BY
```

Three things follow, and none of them should be discovered mid-plan:

1. **A combined filter uses one index and tests the rest.** That is SQLite doing
   the ordinary thing; it is not a defect and needs no fix.
2. **The unfiltered queue sorts.** None of the four is `(created_at DESC)`
   alone, so the most common read — an agent opening the queue — cannot be
   served in order by any of them. At this scale that is fine, and **do not add
   a fifth index in this story**: PLATFORM-2-API chose those four deliberately,
   and a schema change belongs to a story with evidence of need rather than to
   one that noticed a query plan. Put the measurement in a comment so the next
   reader inherits the fact instead of rediscovering it.
3. **`assignee_id IS NULL` uses its index**, so "unassigned" is a filter the
   schema already supports. Whether to expose it is a decision — say which.

**"An agent sees all of it" is a criterion, not a nicety.** SC-1 is one
organisation, one queue. Do **not** scope the queue to the caller, and do not
add a `mine=true` shortcut here — `TICKETS-12-WEB` ("my own tickets are one
click away") is a *web* story that filters by assignee using what this endpoint
already returns.

**An unknown sort is refused, not ignored.** The criterion says so and gives the
reason: a queue in an order nobody asked for looks like data loss. Name the
sorts the API accepts, refuse anything else with 422 naming the parameter, and
keep the list short — `created_at` is the only one any criterion needs, so
adding more is a decision that needs its own argument.

**Reuse `readPagination`.** `api/src/platform/http/pagination.js` refuses above
the ceiling rather than clamping, which *is* BR-4, and returns `{ limit, offset }`.
The envelope is `{ items, total, limit, offset }` like every other list here,
and `total` counts the matches rather than the page.

**One predicate, two statements.** The page query and the count must share the
filter clause — CRM-55 shipped that pattern in `customers.repository.js` after
the plan had written it twice, and two copies drift: a fifth filter gets added
to one and missed in the other, and `total` starts disagreeing with `items` in a
way a test that reads only `items` never sees.

**A read writes no audit row**, and the ticket shape is the one CRM-71 already
returns — including `revision`, because a screen that lists tickets is where a
caller gets the token it later sends back on a write (BR-5).

## Out of scope

- What this story explicitly does **not** cover:

- **The screen** — `TICKETS-2-WEB` (CRM-74).
- **Reading one ticket by its id.** Nothing in the criteria asks for it; if the
  plan believes the queue needs it, that is an argument to make, not an
  endpoint to add quietly.
- **Assigning, changing status, resolving** — `TICKETS-3-API`, `TICKETS-4-API`,
  `TICKETS-5-API`, all later in this sprint.
- **Searching tickets by their text** — `TICKETS-15-API`, sprint 11. A filter
  is not a search.
- **A fifth index, or any migration.**
- **Deadlines or breach state on the queue rows.** Showing "past its promise"
  on the queue is `SERVICE-LEVELS-3-WEB`'s, and it needs the breach rows
  `SERVICE-LEVELS-3-API` writes. This story returns tickets.
- **Scoping the queue to the caller**, or a `mine` shortcut (SC-1).
