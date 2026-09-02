> **Fetched from jira:** [CRM-131](https://mazen-al-nabarawy.atlassian.net/browse/CRM-131)  
> *Fetched 2026-09-02T08:13:13.932Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** REPORTS-4-WEB admin — today means today where I am, not in UTC  
**Type:** Story  
**Status:** To Do  
**Labels:** admin, pts-2, reports, sprint-9, web

### Description

admin — today means today where I am, not in UTC

Story folder: .squad/stories/reports/REPORTS-4-WEB-reader-timezone/

Rules this story owns:

	BR-3 — Time is UTC in storage, the reader's locale on display.

Cannot ship before: REPORTS-1-API

Points: 2 · Sprint: 9 · Layer: WEB

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/reports/CRM-131/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `reports`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-131` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `admin, pts-2, reports, sprint-9, web`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
REPORTS-4-WEB admin — today means today where I am, not in UTC
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
admin — today means today where I am, not in UTC

Story folder: .squad/stories/reports/REPORTS-4-WEB-reader-timezone/

Rules this story owns:

	BR-3 — Time is UTC in storage, the reader's locale on display.

Cannot ship before: REPORTS-1-API

Points: 2 · Sprint: 9 · Layer: WEB
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/reports.md, section REPORTS-4-WEB (line 202):


The reader's day, on the screen.

*Acceptance criteria*
- Given a reader, when a report loads, then the zone sent is the one their
  browser is actually in, read from the runtime rather than typed into a
  constant.
- Given the report, when it renders, then the period it covers is stated on the
  screen. A number with no period beside it cannot be acted on and cannot be
  checked.
- Given a reader who changes the period, when the new report arrives, then the
  stated period changes with it, and a stale number is never shown under a new
  label.
- Given both languages, when the period renders, then its dates are formatted
  for the reader's locale (BR-3), and the sentence carrying them is built with
  the isolate-wrapped slot pattern the rest of the desk uses (L-51).
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

**Read the reader's real zone from the runtime** —
`Intl.DateTimeFormat().resolvedOptions().timeZone` — not a constant, and not a
guess from the language. Arabic does not mean Cairo.

**State the period on the screen.** A number with no period beside it cannot be
acted on and cannot be checked. When the period changes, the stated period and
the numbers change together — never a stale number under a new label.

**The period sentence has slots**, so build it the way
`web/src/pages/tickets/history-sentence.ts` and `pager-sentence.ts` build one,
with the U+2068/U+2069 isolates (L-51). Concatenation reads fine in English and
breaks in Arabic.

**Dates through `useFormatters().formatDate`** so they are formatted for the
reader's locale (BR-3).

**A stale number under a fresh label is the bug to test for**: change the
period, and assert the screen does not show the old figures while the new
request is in flight.

**`parity.test.ts` and `no-hardcoded-strings.test.ts` will see this**, and the
route stays admin-only the way `/audit` is (`routes.tsx:161`).

## Out of scope

- **Anything in the API** — `REPORTS-4-API (CRM-130)`.
- **A zone picker.** The reader's browser knows where they are; choosing a
  different one is not asked for.
- **Computing a day boundary on the client.** The client sends its zone; the
  API decides which rows are in it.
- **A calendar component or a date library.**
