> **Fetched from jira:** [CRM-68](https://mazen-al-nabarawy.atlassian.net/browse/CRM-68)  
> *Fetched 2026-08-31T00:36:55.883Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** CUSTOMERS-7-WEB agent — I correct a customer's contact details  
**Type:** Story  
**Status:** To Do  
**Labels:** agent, customers, pts-2, sprint-7, web

### Description

agent — I correct a customer's contact details

Story folder: .squad/stories/customers/CUSTOMERS-7-WEB-correct-contacts/

Rules this story owns:

	BR-2 — Every mutation is audited: actor, entity, action, before, after, timestamp.

Cannot ship before: CUSTOMERS-4-API

Points: 2 · Sprint: 7 · Layer: WEB

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/customers/CRM-68/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `customers`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-68` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `agent, customers, pts-2, sprint-7, web`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
CUSTOMERS-7-WEB agent — I correct a customer's contact details
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
agent — I correct a customer's contact details

Story folder: .squad/stories/customers/CUSTOMERS-7-WEB-correct-contacts/

Rules this story owns:

	BR-2 — Every mutation is audited: actor, entity, action, before, after, timestamp.

Cannot ship before: CUSTOMERS-4-API

Points: 2 · Sprint: 7 · Layer: WEB
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/customers.md, section CUSTOMERS-7-WEB (line 271):

The same, on a screen.

Written 2026-08-31, with the sprint 7 stories.

*Acceptance criteria*
- Given the customer screen, when a detail is corrected, then the screen shows
  the new one without a reload — the write answers with the customer, the way
  every other write here answers with what it changed.
- Given a field left untouched, then it is not sent. What the screen sends is
  what somebody edited, which is also what makes the audit trail readable.
- Given a refusal naming a field, then that field is marked and the sentence is
  the shared one for the code.
- Given no change made, then the control is not offered. A button that writes
  nothing invites somebody to press it and wonder.
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
**The screen is `web/src/pages/customers/CustomerScreenPage.tsx`**, which
already resolves an id from the address and already holds the customer. It has
a note composer beside it — read how `useWriteNote` reports a refusal before
adding a second write to the same screen.

**Send only what changed.** The API leaves absent fields alone, and the audit
diff is readable only if the screen does not send all three every time.

**`useRequest` is the four-state hook** and its error carries `fields`. One
request state per action: a rename failing on one row and an add failing under
a form cannot share a state, which the categories screen learned.

**No native validator** (L-55) — no `type="email"`, no `required`. The browser
refuses to submit and the API's rule never runs; the sentence somebody reads is
the browser's, in the wrong language and outside the resource files.


## Out of scope

- **Any `api/` change** — `CUSTOMERS-7-API (CRM-67)` owns the route.
- **Deleting a customer**, and the confirm that goes with it —
  `CUSTOMERS-8-WEB (CRM-70)`.
- **A revision on the write.** The API takes none; a screen that sent one would
  be inventing a rule the server does not have.
