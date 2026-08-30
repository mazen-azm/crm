> **Fetched from jira:** [CRM-50](https://mazen-al-nabarawy.atlassian.net/browse/CRM-50)  
> *Fetched 2026-08-30T02:51:40.454Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** IDENTITY-6-WEB admin — I set a user's password, so a locked-out person gets back in  
**Type:** Story  
**Status:** To Do  
**Labels:** admin, identity, pts-2, sprint-5, web

### Description

admin — I set a user's password, so a locked-out person gets back in

Story folder: .squad/stories/identity/IDENTITY-6-WEB-admin-set-password/

Rules this story owns:

	BR-2 — Every mutation is audited: actor, entity, action, before, after, timestamp.

Cannot ship before: IDENTITY-2-API

Points: 2 · Sprint: 5 · Layer: WEB

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/identity/CRM-50/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `identity`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-50` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `admin, identity, pts-2, sprint-5, web`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
IDENTITY-6-WEB admin — I set a user's password, so a locked-out person gets back in
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
admin — I set a user's password, so a locked-out person gets back in

Story folder: .squad/stories/identity/IDENTITY-6-WEB-admin-set-password/

Rules this story owns:

	BR-2 — Every mutation is audited: actor, entity, action, before, after, timestamp.

Cannot ship before: IDENTITY-2-API

Points: 2 · Sprint: 5 · Layer: WEB
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/identity.md, section IDENTITY-6-WEB (line 140):

The same, on a screen.

*Acceptance criteria*
- Given an admin on the people screen, when they set somebody's password, then
  the screen shows which account it was set for.
- Given the form, when the API refuses naming a field, then that field is
  marked and the sentence is the shared one for the code.
- Given a submission in flight, then the control cannot be pressed twice.
- Given a non-admin, then the control is not on their screen — and that is a
  courtesy, not the enforcement, which is the API's (SC-2).
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
- **Ids:** cite other stories only from `scripts/backlog.txt` (or the generated
  `BACKLOG.md`), as FULL-NAME ids with the Jira key: `PLATFORM-13-ALL (CRM-28)`.
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

**The stack is Vite + React 19 + TypeScript, Vitest and Testing Library.**
`web/src/pages/customers/AddCustomerPage.tsx` is the closest sibling — same
four beats: mark the field the API named, disable while in flight, show what
happened, every string from a resource file. Follow it.

**There is no people screen yet.** `IDENTITY-2-WEB` is a later block, so this
story either creates the smallest screen that can hold the control or mounts it
somewhere that already exists. Say which, and do not leave a component nothing
renders — a route only its author can reach is the defect `CUSTOMERS-2-WEB` and
`CUSTOMERS-4-WEB` both had to fix.

**`request(path)` already prefixes `/api/v1`** (`web/src/shared/api/base-url.ts:3`).

**BR-6:** keys go into both `en.ts` and `ar.ts` in the same edit or
`web/src/shared/i18n/parity.test.ts` fails, and `no-hardcoded-strings.test.ts`
catches a literal in JSX including a separator between tags.

**A value interpolated into a translated sentence needs a bidi isolate** —
U+2068 … U+2069 around it (L-51). An account name in an Arabic sentence drags
the following punctuation with it otherwise.

**A fetch stub must build a fresh `Response` per call** (L-30).


## Out of scope

- What this story explicitly does **not** cover:

- **The full people-management screen** — `IDENTITY-2-WEB`, a later block.
- **Any `api/` change.**

