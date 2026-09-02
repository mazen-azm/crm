> **Fetched from jira:** [CRM-129](https://mazen-al-nabarawy.atlassian.net/browse/CRM-129)  
> *Fetched 2026-09-02T08:13:12.730Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** REPORTS-3-WEB admin — I see load per agent, idle agents shown as zero  
**Type:** Story  
**Status:** To Do  
**Labels:** admin, pts-2, reports, sprint-9, web

### Description

admin — I see load per agent, idle agents shown as zero

Story folder: .squad/stories/reports/REPORTS-3-WEB-agent-load/

Owns no rule of its own.

Cannot ship before: TICKETS-3-API

Points: 2 · Sprint: 9 · Layer: WEB

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/reports/CRM-129/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `reports`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-129` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `admin, pts-2, reports, sprint-9, web`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
REPORTS-3-WEB admin — I see load per agent, idle agents shown as zero
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
admin — I see load per agent, idle agents shown as zero

Story folder: .squad/stories/reports/REPORTS-3-WEB-agent-load/

Owns no rule of its own.

Cannot ship before: TICKETS-3-API

Points: 2 · Sprint: 9 · Layer: WEB
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/reports.md, section REPORTS-3-WEB (line 158):


An admin reads load per agent.

*Acceptance criteria*
- Given the agents, when they render, then the idle ones are visible with zero,
  in the same list as the busy ones — sorting by load must not push them off.
- Given unassigned work, when it is shown, then it is visibly not an agent: it
  is a separate figure, not a row in the list called something like "nobody".
- Given a desk with one agent, when it renders, then the screen is still a
  report and not an error.
- Given both languages, when a name is displayed, then it is the person's own
  name, untranslated, and the label around it comes from the resource file.
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

**The idle agents must survive the sort.** If the list is ordered by load
descending, the zeros land at the bottom — that is fine, and cutting the list
to a "top N" is not. The person holding nothing is who the report is for.

**Unassigned work is not a row in the agent list.** Show it as its own figure,
visually separate, never as an agent called "nobody" or "unassigned" — a name
in the list of people is a person.

**A name is not translated.** The label around it comes from `en.ts`/`ar.ts`;
the person's own name is rendered as stored.

**Counts through `useFormatters().formatNumber`**, so the digits follow the
locale (`format.ts:12`).

**Same page shape as `web/src/pages/audit/`** — page component, hook, css —
and the same admin-only route treatment as `/audit` (`routes.tsx:161`).

**Do not fetch before the subject's role is known** — L-63.

**`parity.test.ts` and `no-hardcoded-strings.test.ts` will both see this.**

## Out of scope

- **Anything in the API** — `REPORTS-3-API (CRM-128)`.
- **Reassigning from this screen.** It reports; assignment lives with the
  ticket.
- **A chart, an avatar, or a capacity target.** None is asked for.
- **The period picker** — `REPORTS-4-WEB (CRM-131)`.
