> **Fetched from jira:** [CRM-95](https://mazen-al-nabarawy.atlassian.net/browse/CRM-95)  
> *Fetched 2026-08-31T00:37:06.848Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** TICKETS-13-WEB agent — my change is refused if somebody edited it while I read  
**Type:** Story  
**Status:** To Do  
**Labels:** agent, pts-3, sprint-7, tickets, web

### Description

agent — my change is refused if somebody edited it while I read

Story folder: .squad/stories/tickets/TICKETS-13-WEB-stale-write-guard/

Rules this story owns:

	BR-5 — No silent overwrite: a write carries the revision it read; a mismatch returns 409. Applies to status change, assignment, priority change, article edit.

Cannot ship before: TICKETS-3-API

Points: 3 · Sprint: 7 · Layer: WEB

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/tickets/CRM-95/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `tickets`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-95` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `agent, pts-3, sprint-7, tickets, web`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
TICKETS-13-WEB agent — my change is refused if somebody edited it while I read
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
agent — my change is refused if somebody edited it while I read

Story folder: .squad/stories/tickets/TICKETS-13-WEB-stale-write-guard/

Rules this story owns:

	BR-5 — No silent overwrite: a write carries the revision it read; a mismatch returns 409. Applies to status change, assignment, priority change, article edit.

Cannot ship before: TICKETS-3-API

Points: 3 · Sprint: 7 · Layer: WEB
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/tickets.md, section TICKETS-13-WEB (line 397):

The same, on a screen.

Written 2026-08-31, with the sprint 7 stories.

*Acceptance criteria*
- Given any control on the queue row that writes, when the write is refused as
  stale, then the screen says the ticket changed while it was being read and
  offers to look again — in the same words, whichever control it was. Three
  controls with three sentences for one cause teach somebody that it is three
  causes.
- Given that refusal, then it is not reported as a failure. Nothing went wrong:
  somebody else got there first, and the useful next action is to look.
- Given a successful write, then the row carries the new revision, so an
  agent's second change is not refused by their own first. This is already true
  of each control; the story is that it stays true when a new one is added.
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
**Three controls on the queue row already handle a 409**, each with its own
`staleTitle` string: `ticketAssign`, `ticketStatus`, `ticketCategory`. The
criterion is that they say the same thing. Reducing three strings to one is the
work; check `verify-i18n-parity` and the tests that name them.

**`window.location.reload()` is what the existing controls offer.** It is
blunt. If it is kept, keep it everywhere; if it is replaced, replace it
everywhere — the point of the story is that one cause has one answer.


## Out of scope

- What this story explicitly does **not** cover:
