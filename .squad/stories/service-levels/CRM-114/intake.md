> **Fetched from jira:** [CRM-114](https://mazen-al-nabarawy.atlassian.net/browse/CRM-114)  
> *Fetched 2026-08-31T11:07:24.933Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** SERVICE-LEVELS-5-API system — the seed runs the escalation once  
**Type:** Story  
**Status:** To Do  
**Labels:** backend, pts-2, service-levels, sprint-8, system

### Description

system — the seed runs the escalation once

Story folder: .squad/stories/service-levels/SERVICE-LEVELS-5-API-seed-escalation/

Rules this story owns:

	SC-3 — The demo database is generated; schema plus seed produces a working system.

Cannot ship before: SERVICE-LEVELS-4-API

Points: 2 · Sprint: 8 · Layer: API

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/service-levels/CRM-114/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `service-levels`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-114` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `backend, pts-2, service-levels, sprint-8, system`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
SERVICE-LEVELS-5-API system — the seed runs the escalation once
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
system — the seed runs the escalation once

Story folder: .squad/stories/service-levels/SERVICE-LEVELS-5-API-seed-escalation/

Rules this story owns:

	SC-3 — The demo database is generated; schema plus seed produces a working system.

Cannot ship before: SERVICE-LEVELS-4-API

Points: 2 · Sprint: 8 · Layer: API
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/service-levels.md, section SERVICE-LEVELS-5-API (line 194):

The seeded database is one where the escalation has already run.

Written 2026-08-31, with the sprint 8 stories.

*Acceptance criteria*
- Given a freshly seeded database, then it contains a ticket whose resolution
  deadline was missed, its recorded breach, its raised priority and the
  admin's notification — so that somebody opening the product sees the feature
  rather than an empty table (SC-3).
- Given the seed run twice, then there is still exactly one of each. The seed
  is idempotent everywhere else here and this is not the place to stop being.
- Given the seeded breach, then it was produced by the same code path a real
  breach uses, not written directly into the table. A fixture that bypasses the
  rule proves the fixture, and the demo would survive a bug that the product
  would not.
- Given the seed, then it does not move the clock or depend on the machine's
  date: the ticket's timestamps are relative to the seed's own `now`, so the
  demo looks the same on any day.

*Out of scope*
- Seeding a breach for every priority, or a realistic spread of them. One is
  what SC-3 asks for: a working system, not a populated one.
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
**The seed is `src/platform/db/seed.js` + `seed.data.js`**, and every insert
there is already idempotent — `ON CONFLICT … DO NOTHING`, keyed by email or by
a fixed id where a null email cannot arbitrate. Read `seedCustomers` for the
pattern and why it splits on which key can arbitrate.

**The seed takes `now` and `newId`.** Nothing there reads the machine's clock
directly, and the demo must look the same on any day.

**`verify-backlog.mjs` parses S-2 and compares it to `seed.data.js`** — the
targets are checked against the rule. A story that touches the seed must not
break that.

**Go through the code path, not the table.** A fixture written straight into
`sla_breaches` proves the fixture. The criteria say the seeded breach must be
produced the way a real one is.


## Out of scope

- **A realistic spread of breaches.** SC-3 asks for a working system, not a populated one.
- **Changing the seeded SLA targets.** `verify-backlog.mjs` checks them against S-2.
- **Anything that reads the machine's date.** The demo must look the same on any day.
