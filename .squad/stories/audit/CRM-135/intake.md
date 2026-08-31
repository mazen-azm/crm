> **Fetched from jira:** [CRM-135](https://mazen-al-nabarawy.atlassian.net/browse/CRM-135)  
> *Fetched 2026-08-31T11:07:37.042Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** AUDIT-2-WEB admin — I read the audit log filtered by person, thing or date  
**Type:** Story  
**Status:** To Do  
**Labels:** admin, audit, pts-3, sprint-8, web

### Description

admin — I read the audit log filtered by person, thing or date

Story folder: .squad/stories/audit/AUDIT-2-WEB-read-audit-log/

Rules this story owns:

	BR-4 — No unbounded list: paginated, filterable, sortable, with a maximum page size.

Cannot ship before: AUDIT-1-API

Points: 3 · Sprint: 8 · Layer: WEB

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/audit/CRM-135/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `audit`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-135` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `admin, audit, pts-3, sprint-8, web`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
AUDIT-2-WEB admin — I read the audit log filtered by person, thing or date
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
admin — I read the audit log filtered by person, thing or date

Story folder: .squad/stories/audit/AUDIT-2-WEB-read-audit-log/

Rules this story owns:

	BR-4 — No unbounded list: paginated, filterable, sortable, with a maximum page size.

Cannot ship before: AUDIT-1-API

Points: 3 · Sprint: 8 · Layer: WEB
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/audit.md, section AUDIT-2-WEB (line 53):

An admin reads the audit log on a screen.

*Acceptance criteria*
- Given the screen, when it loads, then it shows the log through the API's own
  filters and paging, and adds none of its own.
- Given every string on the screen, when it is read, then it came from a
  resource file, in both languages (BR-6).
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
**Any `api/` change belongs to `AUDIT-2-API (CRM-134)`.**

**`history-sentence.ts` already turns an audit row into a sentence** for the
ticket history, with U+2068/U+2069 isolates around every interpolated value
(L-51) and a whole sentence per language per verb. Reuse it rather than writing
a second mapping; if a verb has no sentence, it already has a fallback that
names the verb rather than rendering blank.

**The filters belong in the address**, the way the queue's do — a view somebody
can send to a colleague and the back button returns to. `useSearchParams` is
what the queue uses.

**Every string from the resource files, both languages (BR-6)**, and every time
through `useFormatters` (BR-3).


## Out of scope

- **Any `api/` change** — `AUDIT-2-API (CRM-134)`.
- **A second sentence mapping.** `history-sentence.ts` exists and is the one.
