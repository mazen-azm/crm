> **Fetched from jira:** [CRM-67](https://mazen-al-nabarawy.atlassian.net/browse/CRM-67)  
> *Fetched 2026-08-31T00:36:55.123Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** CUSTOMERS-7-API agent — I correct a customer's contact details  
**Type:** Story  
**Status:** To Do  
**Labels:** agent, backend, customers, pts-3, sprint-7

### Description

agent — I correct a customer's contact details

Story folder: .squad/stories/customers/CUSTOMERS-7-API-correct-contacts/

Rules this story owns:

	BR-2 — Every mutation is audited: actor, entity, action, before, after, timestamp.

Cannot ship before: CUSTOMERS-4-API

Points: 3 · Sprint: 7 · Layer: API

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/customers/CRM-67/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `customers`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-67` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `agent, backend, customers, pts-3, sprint-7`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
CUSTOMERS-7-API agent — I correct a customer's contact details
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
agent — I correct a customer's contact details

Story folder: .squad/stories/customers/CUSTOMERS-7-API-correct-contacts/

Rules this story owns:

	BR-2 — Every mutation is audited: actor, entity, action, before, after, timestamp.

Cannot ship before: CUSTOMERS-4-API

Points: 3 · Sprint: 7 · Layer: API
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/customers.md, section CUSTOMERS-7-API (line 238):

An agent corrects a customer's contact details.

Written 2026-08-31, with the sprint 7 stories.

*Acceptance criteria*
- Given a live customer, when an agent sends a name, an email or a phone
  number, then the ones sent are changed and the ones not sent are left alone.
  A correction is usually one field, and a screen that had to send all three
  to change one would overwrite the other two with whatever it last read.
- Given a value that is not acceptable, then it is refused naming the field —
  the same rules CUSTOMERS-1-API applies when the customer is created, from the
  same place. Two sets of rules for one field disagree the first time either
  is edited.
- Given an email another live customer already has, then it is refused naming
  the field. The uniqueness that holds at creation holds here, and a partial
  index that ignores the deleted keeps a removed customer's address available.
- Given a request that changes nothing — the same values, or no fields at all
  — then it is refused naming what was missing rather than writing an audit row
  saying nothing happened.
- Given the change, then an audit row records the before and the after (BR-2),
  and carries only the fields that changed. A diff listing every field as
  changed is a diff nobody can read.
- Given a customer who has been deleted, then it is the same 404 a customer
  who never existed gets.

*Out of scope*
- A revision on the write. BR-5 names the writes it applies to and this is not
  one of them; adding one here would be a rule this story invented.
- Changing which sign-in account a customer has. That is CUSTOMERS-6-API's,
  and a contact correction is not a way to reach it.
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
**The customer's public shape is `id, name, email, phone, hasSignIn, createdAt,
updatedAt`** — `api/src/features/customers/customers.service.js:32`. There is
**no revision column**, and BR-5 does not name customer writes; the criteria say
so explicitly. Do not add one.

**The `address` column exists and nothing writes it.** `insertCustomer` never
has. A plan once invented a form field for it and the story was built with
three fields instead (L-49). It is still not part of this story: correcting
contact details means the fields the API actually carries.

**The validation rules live in `customers.rules.js` and are shared with
creation.** Reuse them rather than writing a second set — two sets for one
field disagree the first time either is edited.

**Email uniqueness is a partial unique index scoped to live rows**, the same
shape the ticket categories use. A deleted customer's address is free again,
and that is deliberate.


## Out of scope

- **Any `revision` on a customer write.** BR-5 names the writes it covers and
  this is not one of them. Adding one here would be a rule this story invented.
- **The `address` column.** It exists, `PROJECTION` does not return it and no
  route has ever written it (L-49). Correcting contact details means the fields
  the API actually carries.
- **Changing which sign-in account a customer has** — `CUSTOMERS-6-API`.
- **The screen** — `CUSTOMERS-7-WEB (CRM-68)`.
