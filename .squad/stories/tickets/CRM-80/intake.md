> **Fetched from jira:** [CRM-80](https://mazen-al-nabarawy.atlassian.net/browse/CRM-80)  
> *Fetched 2026-08-29T15:14:27.724Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** TICKETS-5-API agent — resolving a ticket needs a note  
**Type:** Story  
**Status:** To Do  
**Labels:** agent, backend, pts-3, sprint-3, tickets

### Description

agent — resolving a ticket needs a note

Story folder: .squad/stories/tickets/TICKETS-5-API-resolve-with-note/

Rules this story owns:

	T-4 — Resolving requires a resolution note.

Cannot ship before: TICKETS-4-API

Points: 3 · Sprint: 3 · Layer: API

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/tickets/CRM-80/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `tickets`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-80` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `agent, backend, pts-3, sprint-3, tickets`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
TICKETS-5-API agent — resolving a ticket needs a note
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
agent — resolving a ticket needs a note

Story folder: .squad/stories/tickets/TICKETS-5-API-resolve-with-note/

Rules this story owns:

	T-4 — Resolving requires a resolution note.

Cannot ship before: TICKETS-4-API

Points: 3 · Sprint: 3 · Layer: API
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/tickets.md, section TICKETS-5-API:

- Given a move to `resolved` with no resolution note, then it is refused and
  the ticket stays where it was (T-4).
- Given a move to `resolved` with a note, then it succeeds and the note is
  readable afterwards — a requirement to write something that is then thrown
  away is theatre.
- Given a note that is only whitespace, then it is refused the same as a
  missing one.
- Given any other status change, then no note is required.
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

- APIs, screens, services already discussed. Repos/roots: `api, web, android`. Primary language: `JavaScript`. **`api/` only.**

**This story is a rider on CRM-79's machine, not a second machine.** The
transition table, the 409, and the revision check all exist by the time this
starts. What is added is one condition on one edge.

**Where the note lives is the decision.** Two shapes are open, and the second
is the one the brief points at:

1. a `resolution_note` column on `tickets` — one migration, trivially readable
2. the note as the first message of the resolution, in `messages`

The brief's own model has a `messages` table and T-5 says a *reply* to a
resolved ticket reopens it, which means the conversation is where resolution
lives. But `CONVERSATION-1-API` has not been built, `messages` does not exist
yet, and a story that has to build half of another feature to satisfy one rule
is a story that has swallowed its neighbour. **Take the column**, and write in
the migration comment that the note is a field on the ticket because the
conversation is a later feature — so the next reader knows it was a choice
with a date on it, not an oversight.

**Refuse with 422, not 409.** This is not an illegal transition — `→ resolved`
is perfectly legal — it is a missing field on a well-formed request, which is
what `ValidationError` and its `fields` key already say. The distinction is the
whole reason the brief has both codes, and getting it backwards here would make
CRM-79's 409 mean two different things.

**Whitespace is missing.** `'   '` is not a resolution note; trim before the
emptiness test, and store the trimmed value rather than what arrived.

**The refusal must not write.** The check belongs before the UPDATE, inside the
same transaction as the read, so a rejected resolve leaves no audit row, no
revision bump and no `updated_at` change.

## Out of scope

- What this story explicitly does **not** cover:

- **The 14-day reopen window** (T-5) and **the auto-close** (T-6) — later
  stories, and the reason the note has to survive being read back.
- **The conversation** — `CONVERSATION-1-API` owns `messages`. This story does
  not create that table, and does not pretend to.
- **Requiring a note on `closed`.** T-4 names resolving. Do not extend a rule
  the brief scoped narrowly.
- **Any screen.**
