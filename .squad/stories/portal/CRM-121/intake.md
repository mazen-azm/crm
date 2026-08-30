> **Fetched from jira:** [CRM-121](https://mazen-al-nabarawy.atlassian.net/browse/CRM-121)  
> *Fetched 2026-08-30T02:51:42.648Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** PORTAL-1-WEB customer — I raise a ticket without an account  
**Type:** Story  
**Status:** To Do  
**Labels:** customer, portal, pts-5, sprint-5, web

### Description

customer — I raise a ticket without an account

Story folder: .squad/stories/portal/PORTAL-1-WEB-raise-without-account/

Owns no rule of its own.

Cannot ship before: CHANNELS-1-API

Points: 5 · Sprint: 5 · Layer: WEB

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/portal/CRM-121/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `portal`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-121` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `customer, portal, pts-5, sprint-5, web`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
PORTAL-1-WEB customer — I raise a ticket without an account
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
customer — I raise a ticket without an account

Story folder: .squad/stories/portal/PORTAL-1-WEB-raise-without-account/

Owns no rule of its own.

Cannot ship before: CHANNELS-1-API

Points: 5 · Sprint: 5 · Layer: WEB
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/portal.md, section PORTAL-1-WEB (line 24):

A customer raises a ticket without an account.

*Acceptance criteria*
- Given somebody with no account, when they open the public form, then it
  renders without a sign-in and without the desk's navigation — nothing on it
  leads anywhere they cannot go.
- Given the form, when it is submitted, then it posts to the channel intake
  (CHANNELS-1-API) and to nothing else. A screen that wrote a ticket by
  another route would be the second write path the seam exists to prevent.
- Given a submitted request, when it succeeds, then the screen shows the
  reference the API returned, so the person has something to quote. Not a
  message saying it worked.
- Given a submission in flight, then the control cannot be pressed twice —
  this creates a ticket, so a second press is a second ticket.
- Given a refusal that names fields, then those fields are marked and the
  sentence is the shared one for the code, never composed from the names.
- Given 429 from the intake, then the screen says the request was refused for
  arriving too often, in words, rather than showing the same failure as a
  server error.
- Given every string on the screen, then it came from a resource file, in both
  languages, and the page reads in both directions (BR-6).

*Out of scope*
- Following the ticket afterwards — PORTAL-2-WEB.
- Attachments. The brief puts them under Specified only.
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
  out by counting — three plans did, and each named the wrong story.
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

**Not inside `DeskShell`.** Read `web/src/app/routes.tsx`: every authenticated
route is wrapped in `RequireAuth` and then `DeskShell`, and sign-in is
deliberately outside both because "it has nothing to navigate to and nobody to
greet". This page is the same case — public, and with none of the desk's
navigation.

**It posts to the channel intake and to nothing else.** `CHANNELS-1-API
(CRM-118)` is the route. A screen that wrote a ticket by any other path would be
the second write path the seam exists to prevent (SC-2).

**`web/src/pages/tickets/RaiseTicketPage.tsx` is the shape to follow** — mark
the field the API named, disable while in flight, show the created thing rather
than a message saying it worked. It is a staff screen and this one is not, so
take its structure and not its navigation.

**429 needs its own sentence.** `t.errors` is keyed by the API's code and
`RATE_LIMITED` is already in the union
(`web/src/shared/api/errors.ts`); check whether `en.ts`/`ar.ts` already carry a
sentence for it before adding one. Showing the generic failure for a throttle
tells somebody their own retry was a server fault.

**BR-6, D-2, L-30, L-51** all apply: both language files in one edit, designed
empty/loading/error states, a fresh `Response` per fetch call, and a bidi
isolate around any value interpolated into a translated sentence.


## Out of scope

- What this story explicitly does **not** cover:

- **Following the ticket afterwards** — `PORTAL-2-WEB (CRM-122)`.
- **Attachments.** The brief puts them under Specified only.
- **Any `api/` change.**

