> **Fetched from jira:** [CRM-70](https://mazen-al-nabarawy.atlassian.net/browse/CRM-70)  
> *Fetched 2026-08-31T00:36:57.368Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** CUSTOMERS-8-WEB admin — deleting a customer hides them and keeps the audit trail  
**Type:** Story  
**Status:** To Do  
**Labels:** admin, customers, pts-2, sprint-7, web

### Description

admin — deleting a customer hides them and keeps the audit trail

Story folder: .squad/stories/customers/CUSTOMERS-8-WEB-soft-delete/

Rules this story owns:

	BR-1 — Nothing is hard-deleted. Deletion sets deleted_at; the audit row survives.

	BR-2 — Every mutation is audited: actor, entity, action, before, after, timestamp.

Cannot ship before: CUSTOMERS-7-API

Points: 2 · Sprint: 7 · Layer: WEB

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/customers/CRM-70/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `customers`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-70` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `admin, customers, pts-2, sprint-7, web`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
CUSTOMERS-8-WEB admin — deleting a customer hides them and keeps the audit trail
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
admin — deleting a customer hides them and keeps the audit trail

Story folder: .squad/stories/customers/CUSTOMERS-8-WEB-soft-delete/

Rules this story owns:

	BR-1 — Nothing is hard-deleted. Deletion sets deleted_at; the audit row survives.

	BR-2 — Every mutation is audited: actor, entity, action, before, after, timestamp.

Cannot ship before: CUSTOMERS-7-API

Points: 2 · Sprint: 7 · Layer: WEB
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/customers.md, section CUSTOMERS-8-WEB (line 320):

The same, on a screen.

Written 2026-08-31, with the sprint 7 stories.

*Acceptance criteria*
- Given an admin on the customer screen, when they delete the customer, then it
  asks first. It is the one action there that changes what everybody else sees
  and that the screen cannot undo.
- Given the deletion, then the screen goes somewhere that still exists — the
  customer list — rather than staying on a screen whose subject is gone.
- Given a non-admin, then the control is not drawn and the screen says why.
  Courtesy, not enforcement: the API refuses them whatever is drawn (SC-2).
- Given a refusal, then the sentence is the shared one for the code.
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
**`useMe()` gives `isAdmin`, and it is `undefined` until `/me` answers** —
render nothing role-dependent on `undefined`, or the control flashes into view
and back out. `TicketCategoriesPage.tsx` shows the shape.

**Ask before doing.** The confirm-in-place pattern (a sentence and two buttons,
no browser dialog) is on the categories screen; `window.confirm` is not used
anywhere in this codebase and would be untranslatable.

**After deleting, go to `/customers`.** Staying on a screen whose subject no
longer exists leaves the reader looking at a 404 they caused.


## Out of scope

- **Any `api/` change** — `CUSTOMERS-8-API (CRM-69)` owns the route and the
  rule about who may call it.
- **A role gate in the router.** The screen says so for a non-admin who
  arrives; the refusal that matters is the API's (SC-2), and a second gate here
  would be one rule in two places.
