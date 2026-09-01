> **Fetched from jira:** [CRM-111](https://mazen-al-nabarawy.atlassian.net/browse/CRM-111)  
> *Fetched 2026-08-31T11:07:23.482Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** SERVICE-LEVELS-3-WEB agent — a missed deadline is recorded once and shown on the queue  
**Type:** Story  
**Status:** To Do  
**Labels:** agent, pts-3, service-levels, sprint-8, web

### Description

agent — a missed deadline is recorded once and shown on the queue

Story folder: .squad/stories/service-levels/SERVICE-LEVELS-3-WEB-recorded-breach/

Rules this story owns:

	S-5 — A breach is a stored row, never recomputed on read.

Cannot ship before: SERVICE-LEVELS-2-API

Points: 3 · Sprint: 8 · Layer: WEB

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/service-levels/CRM-111/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `service-levels`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-111` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `agent, pts-3, service-levels, sprint-8, web`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
SERVICE-LEVELS-3-WEB agent — a missed deadline is recorded once and shown on the queue
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
agent — a missed deadline is recorded once and shown on the queue

Story folder: .squad/stories/service-levels/SERVICE-LEVELS-3-WEB-recorded-breach/

Rules this story owns:

	S-5 — A breach is a stored row, never recomputed on read.

Cannot ship before: SERVICE-LEVELS-2-API

Points: 3 · Sprint: 8 · Layer: WEB
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/service-levels.md, section SERVICE-LEVELS-3-WEB (line 136):

The queue shows which tickets are late, and which are about to be.

Written 2026-08-31, with the sprint 8 stories.

*Acceptance criteria*
- Given a ticket with a recorded breach, then the row says so — visibly, not
  only in a word somebody has to read, the same way an internal note is drawn
  differently from a reply.
- Given a ticket whose deadline has not passed, then the row does not claim it
  has. The screen shows what the API sent and computes no deadline of its own:
  a second place that decides what "late" means is a second answer to it.
- Given both a response breach and a resolution breach, then the row says
  which. They are different promises and an agent's next action differs.
- Given every string, then it came from a resource file, in both languages
  (BR-6), and no time is formatted by the screen without the reader's locale
  (BR-3).

*Out of scope*
- Filtering or sorting the queue by lateness. `TICKETS-2-WEB` owns the queue's
  filters and no story asks for this one.
- A dashboard, a chart, or a count of breaches — those are the reports
  feature's, and its stories are not in this sprint.
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
**Any `api/` change belongs to `SERVICE-LEVELS-3-API (CRM-110)`.**

**The queue row is `web/src/pages/tickets/TicketQueuePage.tsx`** and already
draws a status, a priority and a separator from `ticket-labels.ts`. Two kinds
of breach are two different promises — read how the desk's thread tells a note
from a reply (`TicketThread.css`): its own surface and edge, not only a
caption, and the caption kept for whoever cannot see the surface.

**`useFormatters` is BR-3**, and no time is written by a screen without it.

**`no-mirrored-styles.test.ts` exists** and fails a CSS transform used to
mirror for Arabic. Use logical properties.


## Out of scope

- **Any `api/` change** — `SERVICE-LEVELS-3-API (CRM-110)`.
- **Filtering or sorting the queue by lateness** — `TICKETS-2-WEB` owns the filters and no story asks.
- **A dashboard or a count** — the reports feature's, not this sprint's.
