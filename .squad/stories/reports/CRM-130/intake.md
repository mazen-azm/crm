> **Fetched from jira:** [CRM-130](https://mazen-al-nabarawy.atlassian.net/browse/CRM-130)  
> *Fetched 2026-09-02T08:13:13.182Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** REPORTS-4-API admin — today means today where I am, not in UTC  
**Type:** Story  
**Status:** To Do  
**Labels:** admin, backend, pts-3, reports, sprint-9

### Description

admin — today means today where I am, not in UTC

Story folder: .squad/stories/reports/REPORTS-4-API-reader-timezone/

Rules this story owns:

	BR-3 — Time is UTC in storage, the reader's locale on display.

Cannot ship before: REPORTS-1-API

Points: 3 · Sprint: 9 · Layer: API

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/reports/CRM-130/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `reports`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-130` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `admin, backend, pts-3, reports, sprint-9`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
REPORTS-4-API admin — today means today where I am, not in UTC
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
admin — today means today where I am, not in UTC

Story folder: .squad/stories/reports/REPORTS-4-API-reader-timezone/

Rules this story owns:

	BR-3 — Time is UTC in storage, the reader's locale on display.

Cannot ship before: REPORTS-1-API

Points: 3 · Sprint: 9 · Layer: API
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/reports.md, section REPORTS-4-API (line 172):


Today means today where the reader is, not in UTC.

BR-3 (`scripts/rules.txt` line 7): time is UTC in storage, the reader's locale
on display. A day boundary is where that rule stops being about formatting and
starts being about which rows are counted.

*Acceptance criteria*
- Given a reader in a zone ahead of UTC, when they ask for today, then a ticket
  raised at 01:30 their time is in the answer — even though it is stored as
  22:30 on the previous UTC day. This is the concrete failure the story exists
  to prevent, and a report built on `date(created_at)` has it.
- Given a reader in a zone behind UTC, when they ask for today, then a ticket
  stored at 02:00 UTC is **not** in their today if it is still yesterday
  evening where they are.
- Given the window, when it is computed, then it is computed once and used by
  every report — one boundary, not one per endpoint.
- Given a zone the runtime does not know, when it is passed, then the answer is
  422 naming the field (E-2, line 28), and never a silent fall back to UTC: a
  report quietly answering about the wrong day is worse than one refusing.
- Given no zone at all, when a report is read, then the behaviour is stated in
  the contract rather than assumed — the document says what the default is, and
  the test proves it.
- Given a stored timestamp, when it is compared to the window, then storage is
  still UTC: the zone moves the boundary, it never rewrites a row (BR-3).
- Given a range longer than a day, when it is asked for, then it is bounded —
  the input has a maximum, which is BR-4 applied where it belongs on an
  aggregate.
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

**This is the day boundary, not the display.** BR-3 is already satisfied for
formatting — `web/src/shared/i18n/format.ts:17-21` says so in a comment, and
notes that the zone question was deliberately left open. This story closes it,
on the query side: which rows are counted.

**The concrete failure to write a test for:** a reader at UTC+3 asks for today
at 01:30 their time. The ticket is stored `22:30Z` on the *previous* day.
`date(created_at)` puts it in yesterday and the reader sees a report that is
missing the morning. The mirror case matters too — a reader behind UTC must not
be shown tomorrow's early hours as today.

**Deriving a zone's local day in Node without a dependency:** `Intl` knows the
zones — `Intl.DateTimeFormat('en-CA', { timeZone })` and `formatToParts`, or
`Intl.supportedValuesOf('timeZone')`. Do not add a date library; do not store
an offset in a column. An offset is not a zone, because a zone changes offset
twice a year.

**An unknown zone is 422 naming the field** (E-2, `scripts/rules.txt` line 28),
never a quiet fall back to UTC. A report confidently answering about the wrong
day is worse than one that refuses.

**One window, used by all three reports.** REPORTS-1, 2 and 3 all take it. A
second implementation is the defect this story exists to prevent — and the
plan must say which module owns it and that the other three call it.

**Storage stays UTC.** Every stamp in this database is
`new Date(now() * 1000).toISOString()` — whole seconds, ending `.000Z`. The
zone moves the boundary; it never rewrites a row.

**Bound the range** — BR-4 applied where it belongs on an aggregate: the input
has a maximum span, and a longer one is refused.

**Say what "no zone given" does** in `api/openapi.json`, and prove it with a
test. A default nobody wrote down is a default somebody will discover.

## Out of scope

- **Per-user zone preferences, or a column to store one.** The zone arrives
  with the request.
- **Working hours or a calendar.** S-3 says clocks run 24/7, by decision.
- **Changing how anything is stored or displayed.** Storage is UTC and display
  already follows the reader (`format.ts`).
- **The screen** — `REPORTS-4-WEB (CRM-131)`.
- **A date library.** `Intl` is in the runtime.
