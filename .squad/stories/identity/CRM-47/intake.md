> **Fetched from jira:** [CRM-47](https://mazen-al-nabarawy.atlassian.net/browse/CRM-47)  
> *Fetched 2026-08-28T03:30:22.240Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** IDENTITY-4-API system — failed sign-ins are throttled per account and per address  
**Type:** Story  
**Status:** To Do  
**Labels:** backend, identity, pts-3, sprint-1, system

### Description

system — failed sign-ins are throttled per account and per address

Story folder: .squad/stories/identity/IDENTITY-4-API-sign-in-throttle/

Rules this story owns:

	E-2 — Every failure returns its documented code: 400 401 403 404 409 422 429 500.

Cannot ship before: IDENTITY-1-API

Points: 3 · Sprint: 1 · Layer: API

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/identity/CRM-47/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `identity`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-47` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `backend, identity, pts-3, sprint-1, system`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
IDENTITY-4-API system — failed sign-ins are throttled per account and per address
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
system — failed sign-ins are throttled per account and per address

Story folder: .squad/stories/identity/IDENTITY-4-API-sign-in-throttle/

Rules this story owns:

	E-2 — Every failure returns its documented code: 400 401 403 404 409 422 429 500.

Cannot ship before: IDENTITY-1-API

Points: 3 · Sprint: 1 · Layer: API
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/identity.md, section ## IDENTITY-4-API — binding:

- Given repeated failures against one account, when the ceiling is passed,
  then further attempts answer 429 RATE_LIMITED even with the right password.
- Given repeated failures from one network address across many accounts, when
  the ceiling is passed, then that address is throttled too.
- Given the throttle, when it answers, then it says nothing about whether the
  account exists.
- Given time passing, when the window elapses, then the count resets without
  anybody clearing it by hand.

Rule owned: E-2 — every failure returns its documented code. 429 is
RATE_LIMITED in DOCUMENTED and this story is its first real use.
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

- **Where this goes:** `POST /api/v1/sign-in` in
  `api/src/features/identity/`. The service's `signIn` already answers 401 for
  a wrong password, an unknown address and a disabled account alike; the
  throttle sits in front of that decision and must preserve it.
- **429 is already in the catalogue** (`DOCUMENTED` in
  `api/src/platform/http/errors.js`) as `RATE_LIMITED`, and `HttpError`'s
  constructor accepts it. Nothing about the error chain changes.
- **Two counters, not one:** per normalised email and per network address.
  The second is what stops somebody trying one password against every account
  they can name. Say in the plan how the address is read (`req.ip`), and note
  honestly what that is worth behind a proxy — Express needs `trust proxy` to
  read a forwarded address and this project has not set it, so today `req.ip`
  is the socket's address. State that rather than pretending otherwise.
- **In memory, and say so.** A Map with a window is right for one process; a
  second instance would each keep their own count. Write that limitation into
  the plan and name what would replace it (a shared store) without building
  it. Do not add a dependency.
- **Time is injected**, like everywhere else in this feature — `now()` already
  flows into `createIdentityService`. A test must be able to move the clock
  forward rather than sleep, and the window must reset because time passed,
  not because something swept it.
- **The counter is cleared by a success**, so a person who mistypes twice and
  then signs in is not one failure away from being locked out tomorrow.
- **It must say nothing new.** A throttled request answers 429 whether or not
  the address exists — the same discipline the 401 already keeps. Assert that.
- Document the 429 on the sign-in route in `api/openapi.json` in the same
  commit, or the contract test fails.
- 111 API tests pass; none may break. Read `.squad/plan-lessons.md`
  (19 lessons). L-16: prove it fails.
- APIs, screens, services already discussed. Repos/roots: `api, web, android`. Primary language: `JavaScript`.

## Out of scope

- What this story explicitly does **not** cover:
- Throttling anything but sign-in. The public intake is CHANNELS-3-API and
  a general rate limit across the API is PLATFORM-19-ALL's sweep.
- A shared or persistent store for the counters. One process, one Map, and
  the plan says what that costs.
- Locking an account permanently, or telling anybody they were throttled by
  email — NOTIFICATIONS owns anything that tells a person something.
- The web's handling of a 429 — IDENTITY-1-WEB shipped the screen and a later
  story can give the code its own sentence.
