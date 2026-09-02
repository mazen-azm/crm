> **Fetched from jira:** [CRM-125](https://mazen-al-nabarawy.atlassian.net/browse/CRM-125)  
> *Fetched 2026-09-02T08:13:10.064Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** REPORTS-1-WEB admin — I see the queue by status  
**Type:** Story  
**Status:** To Do  
**Labels:** admin, pts-3, reports, sprint-9, web

### Description

admin — I see the queue by status

Story folder: .squad/stories/reports/REPORTS-1-WEB-queue-by-status/

Owns no rule of its own.

Cannot ship before: TICKETS-2-API

Points: 3 · Sprint: 9 · Layer: WEB

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/reports/CRM-125/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `reports`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-125` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `admin, pts-3, reports, sprint-9, web`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
REPORTS-1-WEB admin — I see the queue by status
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
admin — I see the queue by status

Story folder: .squad/stories/reports/REPORTS-1-WEB-queue-by-status/

Owns no rule of its own.

Cannot ship before: TICKETS-2-API

Points: 3 · Sprint: 9 · Layer: WEB
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/reports.md, section REPORTS-1-WEB (line 72):


An admin reads the queue by status on a screen.

*Acceptance criteria*
- Given the report, when it renders, then every status is shown with its count,
  including the zeros — the screen does not filter out what the API was careful
  to include.
- Given a status name, when it is displayed, then it comes from the resource
  file in the reader's language and is never a raw `pending` (BR-6, line 10).
- Given the screen, when it is loading, when it is empty and when it failed,
  then each of those states is designed rather than accidental (D-2), matching
  the states the rest of the desk already uses.
- Given a reader who is not an admin, when they reach the address directly,
  then they do not see the screen, and the navigation never offered it.
- Given both languages, when the screen is read in Arabic, then the layout is
  the mirror of the English one and no number is reversed by the direction.
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

**This opens `web/src/pages/reports/`.** The shape to copy is
`web/src/pages/audit/` — `AuditLogPage.tsx`, `useAuditLog.ts`, a `.css` beside
them. Read those three before writing a fourth arrangement.

**The route is admin-only, and two routes already do this.** `/audit`
(`web/src/app/routes.tsx:161`) and `/ticket-categories` (line 147) each guard
an admin screen and say so on the screen for a non-admin who arrives. Read
them; do not invent a third guard.

**Do not fetch before you know who is asking.** Two screens shipped a request
that went out before the subject's role was known, which put refusals in the
audit log for people who had done nothing wrong. That is **L-63** in
`.squad/plan-lessons.md` and it is the defect most likely to be repeated here.

**i18n:** `t` is a plain object **one level deep** with camelCase leaves, in
`web/src/shared/i18n/en.ts` and `ar.ts`. `parity.test.ts` fails a key that
exists in one and not the other. There is no `useT()` and no interpolation
function — a sentence with a slot is built the way `history-sentence.ts` and
`pager-sentence.ts` build one.

**Numbers go through `useFormatters().formatNumber`**, not `String(n)`. The
Arabic locale here is `ar-EG`, deliberately, so digits and grouping follow the
reader — `web/src/shared/i18n/format.ts:12` explains why and says not to
simplify it.

**`web/src/pages/no-hardcoded-strings.test.ts` will see this page.**

**Colours come from the tokens file only** (D-1). No literal in a `.css` here.

**The web suite does not typecheck.** `cd web && npm test` is vitest;
`npm run build` is `tsc -b && vite build`. A default in a destructuring
pattern that references a sibling passes vitest and fails `tsc` — that has
happened twice.

## Out of scope

- **Anything in the API.** `REPORTS-1-API (CRM-124)` is the endpoint; this is
  the screen that reads it.
- **The other three reports' screens** — `REPORTS-2-WEB (CRM-127)`,
  `REPORTS-3-WEB (CRM-129)`, `REPORTS-4-WEB (CRM-131)`.
- **A date picker.** The period arrives with `REPORTS-4-WEB (CRM-131)`.
- **A chart library.** Numbers and labels; nothing here needs a dependency.
- **Deriving a count on the client.** The API answers; the screen displays.
