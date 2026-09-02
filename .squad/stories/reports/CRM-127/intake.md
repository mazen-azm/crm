> **Fetched from jira:** [CRM-127](https://mazen-al-nabarawy.atlassian.net/browse/CRM-127)  
> *Fetched 2026-09-02T08:13:11.337Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** REPORTS-2-WEB admin — I see what share of tickets met their promise  
**Type:** Story  
**Status:** To Do  
**Labels:** admin, pts-2, reports, sprint-9, web

### Description

admin — I see what share of tickets met their promise

Story folder: .squad/stories/reports/REPORTS-2-WEB-promise-share/

Rules this story owns:

	S-5 — A breach is a stored row, never recomputed on read.

Cannot ship before: SERVICE-LEVELS-3-API

Points: 2 · Sprint: 9 · Layer: WEB

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/reports/CRM-127/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `reports`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-127` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `admin, pts-2, reports, sprint-9, web`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
REPORTS-2-WEB admin — I see what share of tickets met their promise
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
admin — I see what share of tickets met their promise

Story folder: .squad/stories/reports/REPORTS-2-WEB-promise-share/

Rules this story owns:

	S-5 — A breach is a stored row, never recomputed on read.

Cannot ship before: SERVICE-LEVELS-3-API

Points: 2 · Sprint: 9 · Layer: WEB
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/reports.md, section REPORTS-2-WEB (line 120):


An admin reads the share of promises met.

*Acceptance criteria*
- Given the two kinds, when they render, then each is labelled as what it is —
  a first response and a resolution are different promises to the same person.
- Given a share, when it is shown, then the counts it rests on are shown with
  it: "82% (41 of 50)". A bare percentage cannot be acted on, because 100% of
  two tickets and 100% of two hundred are different facts.
- Given a period with nothing settled, when it renders, then the screen says so
  in words, and shows no percentage at all.
- Given both languages, when the numbers render, then they are formatted for
  the reader's locale, and the sentence around them is built the way the other
  sentences with slots are — not by concatenation (L-51).
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

**Show the counts with the share.** "82% (41 of 50)" — a bare percentage cannot
be acted on, because 100% of two tickets and 100% of two hundred are different
facts and look identical.

**"No data" is words, not 0%.** When nothing settled in the period, say so and
render no percentage at all.

**A sentence with a slot is built the way this repository already builds one** —
`web/src/pages/tickets/history-sentence.ts` and `pager-sentence.ts`, with the
U+2068/U+2069 isolates around the slot. That is **L-51**; concatenation breaks
in Arabic and looks fine in English, which is how it ships.

**Percentages and counts go through `useFormatters()`** so digits follow the
locale (`format.ts:12`, `ar-EG` on purpose).

**Label each kind as the promise it is** — a first response and a resolution
are two different promises to the same person, and "SLA" is not a word for
either of them.

**`parity.test.ts`** fails a key present in `en.ts` and missing from `ar.ts`.
**`no-hardcoded-strings.test.ts`** will see the page.

**Admin-only route**, the way `/audit` (`routes.tsx:161`) already is, and **do
not fetch before the subject is known** (L-63).

## Out of scope

- **Anything in the API** — `REPORTS-2-API (CRM-126)`.
- **Computing met-or-missed on the client.** The share arrives computed.
- **A chart.** A number, its counts and a label.
- **The period picker** — `REPORTS-4-WEB (CRM-131)`.
