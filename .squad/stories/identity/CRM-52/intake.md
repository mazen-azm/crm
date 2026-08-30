> **Fetched from jira:** [CRM-52](https://mazen-al-nabarawy.atlassian.net/browse/CRM-52)  
> *Fetched 2026-08-30T02:51:41.249Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** IDENTITY-7-WEB any — I change my own password, knowing the current one  
**Type:** Story  
**Status:** To Do  
**Labels:** any, identity, pts-2, sprint-5, web

### Description

any — I change my own password, knowing the current one

Story folder: .squad/stories/identity/IDENTITY-7-WEB-change-own-password/

Rules this story owns:

	BR-2 — Every mutation is audited: actor, entity, action, before, after, timestamp.

Cannot ship before: IDENTITY-1-API

Points: 2 · Sprint: 5 · Layer: WEB

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/identity/CRM-52/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `identity`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-52` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `any, identity, pts-2, sprint-5, web`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
IDENTITY-7-WEB any — I change my own password, knowing the current one
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
any — I change my own password, knowing the current one

Story folder: .squad/stories/identity/IDENTITY-7-WEB-change-own-password/

Rules this story owns:

	BR-2 — Every mutation is audited: actor, entity, action, before, after, timestamp.

Cannot ship before: IDENTITY-1-API

Points: 2 · Sprint: 5 · Layer: WEB
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/identity.md, section IDENTITY-7-WEB (line 180):

The same, on a screen.

*Acceptance criteria*
- Given a signed-in person, when they change their password, then the screen
  confirms it and does not sign them out.
- Given a wrong current password, then the current-password field is marked
  and the sentence is the shared one for 401.
- Given a submission in flight, then the control cannot be pressed twice.
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

**The person must not be signed out by their own change.** The token they hold
was issued before it; leaving them on the screen with a confirmation is the
behaviour, and a test should pin that the session survives.

**`web/src/pages/customers/AddCustomerPage.tsx`** is the closest sibling for the
form's four beats. `web/src/app/auth-context.tsx` owns the session — read how
the token is held before touching anything near it; its effect ordering has
already caused one bug where every request on a fresh load carried no token.

**Mark the current-password field on a 401**, which is not a `fields` refusal —
the API answers 401 with no field names, so the screen decides which input
wears the mark from the code rather than from a list. Say so in a comment; every
other screen marks from `fields` and a reader will assume this one does too.

**BR-6, L-30, L-51** apply as everywhere: both language files in one edit, a
fresh `Response` per fetch call, and a bidi isolate around any value
interpolated into a translated sentence.


## Out of scope

- What this story explicitly does **not** cover:

- **Any `api/` change.**
- **A "forgot my password" flow.** There is none — the brief puts password reset
  by email under Specified only, which is why `IDENTITY-6-API` exists.

