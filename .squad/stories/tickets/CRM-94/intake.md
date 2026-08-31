> **Fetched from jira:** [CRM-94](https://mazen-al-nabarawy.atlassian.net/browse/CRM-94)  
> *Fetched 2026-08-31T00:37:06.308Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** TICKETS-13-API agent — my change is refused if somebody edited it while I read  
**Type:** Story  
**Status:** To Do  
**Labels:** agent, backend, pts-5, sprint-7, tickets

### Description

agent — my change is refused if somebody edited it while I read

Story folder: .squad/stories/tickets/TICKETS-13-API-stale-write-guard/

Rules this story owns:

	BR-5 — No silent overwrite: a write carries the revision it read; a mismatch returns 409. Applies to status change, assignment, priority change, article edit.

Cannot ship before: TICKETS-3-API

Points: 5 · Sprint: 7 · Layer: API

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/tickets/CRM-94/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `tickets`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-94` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `agent, backend, pts-5, sprint-7, tickets`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
TICKETS-13-API agent — my change is refused if somebody edited it while I read
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
agent — my change is refused if somebody edited it while I read

Story folder: .squad/stories/tickets/TICKETS-13-API-stale-write-guard/

Rules this story owns:

	BR-5 — No silent overwrite: a write carries the revision it read; a mismatch returns 409. Applies to status change, assignment, priority change, article edit.

Cannot ship before: TICKETS-3-API

Points: 5 · Sprint: 7 · Layer: API
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/tickets.md, section TICKETS-13-API (line 362):

A write is refused if somebody edited the ticket while it was being read, on
every path that writes.

Written 2026-08-31, with the sprint 7 stories.

*Acceptance criteria*
- Given a ticket read at one revision, when a write carries that revision and
  the ticket has since changed, then it is refused 409 REVISION_MISMATCH and
  nothing is written (BR-5). The status move, the assignment and the category
  change already do this; this story is about the word *every*.
- Given every route that writes to a ticket, read off the router rather than
  listed, then each either carries a revision or is named as not needing one,
  with the reason. A rule enforced on three paths out of four protects nothing
  — the same argument the ownership, audit, staff-only and note-leak censuses
  already make, and the fourth census of that shape.
- Given a write with no revision, then it is refused naming the field, not
  accepted as "no opinion". A caller that forgot the revision is a caller whose
  read was stale and does not know it.
- Given a write carrying a revision that is not a number, or one from the
  future, then it is refused the same way. A revision nobody issued cannot
  match, and pretending it might is worse than saying so.
- Given a successful write, then the answer carries the ticket at its new
  revision, so the next write from the same screen is not refused by the
  first.
- Given a refusal, then the audit trail has no row for it. A refused write did
  not happen.

*Out of scope*
- Applying BR-5 outside tickets. The rule names the writes it covers, and a
  customer's contact details are not among them (CUSTOMERS-7-API says so).
- Telling the caller what changed, or who changed it. The refusal says the
  ticket moved; the history says the rest, and it is one request away.
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
**This is a census story, and there are four of this shape already**:
`audit.guarantee.test.js`, `ticket-ownership.guarantee.test.js`,
`staff-only.guarantee.test.js`, `note-leak.guarantee.test.js`. Each reads the
routes off the router with `collectRoutes(app, API_V1_PREFIX)` rather than
listing them, and each fails naming the route. Copy that shape; do not invent a
fifth.

**BR-5 is already implemented three times** — status, assignee, category — as
`revision` in the WHERE and `revision = revision + 1` in the SET, with
`changes === 0` as the refusal. Read `tickets.service.js` before deciding what
is missing; the story may be mostly the census, and if it is, say so rather
than inventing work.

**`POST /tickets/:id/replies` writes to a ticket and carries no revision.** That
is deliberate — a reply is not an edit of a field somebody read — but the census
will find it, so it needs a named exemption with the reason rather than a
revision bolted on.


## Out of scope

- What this story explicitly does **not** cover:
