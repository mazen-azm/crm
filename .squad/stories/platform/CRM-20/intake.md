> **Fetched from jira:** [CRM-20](https://mazen-al-nabarawy.atlassian.net/browse/CRM-20)  
> *Fetched 2026-08-27T20:39:13.193Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** PLATFORM-5-API client — every failure returns its documented code and one shape  
**Type:** Story  
**Status:** To Do  
**Labels:** backend, client, platform, pts-3, sprint-0

### Description

client — every failure returns its documented code and one shape

Story folder: .squad/stories/platform/PLATFORM-5-API-error-contract/

Rules this story owns:

	E-1 — One shape, every failure, no stack trace.

	E-2 — Every failure returns its documented code: 400 401 403 404 409 422 429 500.

Cannot ship before: PLATFORM-3-API

Points: 3 · Sprint: 0 · Layer: API

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/platform/CRM-20/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `platform`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-20` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `backend, client, platform, pts-3, sprint-0`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
PLATFORM-5-API client — every failure returns its documented code and one shape
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
client — every failure returns its documented code and one shape

Story folder: .squad/stories/platform/PLATFORM-5-API-error-contract/

Rules this story owns:

	E-1 — One shape, every failure, no stack trace.

	E-2 — Every failure returns its documented code: 400 401 403 404 409 422 429 500.

Cannot ship before: PLATFORM-3-API

Points: 3 · Sprint: 0 · Layer: API
```

---

## Acceptance criteria

*(From `scripts/criteria/platform.md` lines 272-286 — the section id matches this
story's backlog id after commit 6319ed1.)*

```
- A documented catalogue exists: one module names the eight statuses
  (400 401 403 404 409 422 429 500), each with a canonical `code` string.
  Constructing an HttpError with a status outside the eight throws at
  construction time. That constructor guard is the structural enforcement —
  one unit test on it is the whole proof; there is NO source-text scan of
  `new HttpError(` call sites (a file-content structure check is
  PLATFORM-15-ALL-structure-check / CRM-30's job). A comment carries a
  TODO(CHANNELS-2-API/CRM-119): 501 joins the catalogue in that story (it owns
  rule E-3) and hits this guard until then.
- Any failure reaching the client carries a status from the eight and a body
  of exactly { code, requestId } (plus `fields` only on 422). No stack,
  message, cause, or errno is ever serialised. (E-1)
- A malformed request body returns 400 with code MALFORMED_BODY, not 500.
  (Today express.json()'s SyntaxError falls through to 500/INTERNAL.)
- Well-formed but invalid input returns 422 with code VALIDATION_FAILED and a
  body that additionally carries `fields` — a list of field NAMES ONLY, never
  a submitted value (a value can be a password or personal data and must not
  return to the client or enter a log). This story ships the carrier (an
  unprocessable(fields) helper that keeps only strings); it validates no real
  endpoint.
- An error the catalogue never mapped returns 500 / INTERNAL with no internal
  detail. (Already true; a test pins it.)
- 429 has a code (RATE_LIMITED) in the catalogue; no limiter is implemented
  here.
- The no-AI-attribution grep over the branch prints nothing.
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

- **Blocked by / related ids:** PLATFORM-3-API (CRM-18, done) — the chain,
  `errors.js`, and `createApp` already exist.
- **Depends on code areas or other stories:** `api/src/platform/http/` (the
  error middleware, request id and permission seam CRM-18/CRM-19 shipped).

## Extra notes (optional)

- The *shape* and the 401/403/404/500 paths already exist from CRM-18/CRM-19.
  This story adds: the documented catalogue, the malformed-body 400 path
  (currently coerced to 500), a 422 field-carrier, the 429 code, and a suite
  check that no undocumented status escapes. Baseline: 40 API tests.
- Shape decision to state explicitly in the plan: E-1 "one shape" is read as
  `{ code, requestId }` always, plus `fields` only on 422 — do not smuggle the
  extra key in.

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

- APIs, screens, services already discussed. Repos/roots: `api, web, android`. Primary language: `JavaScript`.

### Story-specific hints

- This story touches HTTP only — **no database**. L-5's engine question does
  not arise; the plan should say so rather than name an engine.
- **Extend, do not re-create.** `api/src/platform/http/errors.js` already has
  `HttpError` + `errorHandler` + `notFoundHandler`. `api/src/app.js` composes
  the chain: `requestId` -> `securityHeaders` -> `express.json({ limit:
  '100kb' })` -> `attachSubject` -> routes -> `notFoundHandler` ->
  `errorHandler`. `api/src/platform/http/permission.js` throws
  `HttpError(401,'UNAUTHENTICATED')` / `HttpError(403,'FORBIDDEN')`.
  `api/src/app.test.js` mounts throwing routes via
  `createApp({ mountTestRoutes })` — reuse that seam for the new tests.
- **Codes already in the wild the catalogue must accommodate, not rename:**
  `NOT_FOUND` (404), `INTERNAL` (500), `UNAUTHENTICATED` (401), `FORBIDDEN`
  (403), `REVISION_MISMATCH` (409, test-only in `app.test.js`).
- **Malformed-body fix — prefer a small middleware** placed immediately after
  `express.json()` that catches the parser error (`err.type ===
  'entity.parse.failed'`) and re-throws `new HttpError(400, 'MALFORMED_BODY')`,
  keeping `errorHandler` a pure status-decider. If instead `errorHandler` is
  taught to recognise the parser error, the plan MUST also update the
  `TODO(PLATFORM-5-API/CRM-20)` comment in `errors.js` that currently says
  "this handler stays untouched".
- Cite `docs/architecture.md` line 30 (`http/` = error middleware) and
  `scripts/criteria/platform.md` lines 272-286. Do not restate them.
- Node is `v26.3.1` — no experimental flags; `npm test` runs under `sh` (no
  `**` glob expansion). Test command is `node --env-file-if-exists=.env
  --test` run from `api/`; test files sit beside their unit as `*.test.js`.

## Out of scope

- What this story explicitly does **not** cover:
  - Real subject/token loading behind the 401 — **IDENTITY-1-API (CRM-41)**.
  - Structured logging of `err.cause` / the 500's internal detail —
    **PLATFORM-6-API (CRM-21)**.
  - `/api/v1` prefix, a maximum page size, `/health` —
    **PLATFORM-6-API (CRM-21)**.
  - The OpenAPI document that lists each code per route —
    **PLATFORM-7-API (CRM-22)**.
  - 501 "named and deliberately not built" (rule E-3) —
    **CHANNELS-2-API (CRM-119)**.
  - Any actual rate-limiter that emits 429 — **IDENTITY-4-API (CRM-47)**,
    **CHANNELS-3-API (CRM-120)**, **PLATFORM-19-ALL (CRM-34)**.
  - Per-endpoint validation rules (which fields, which constraints) — each
    feature's own `-API` story; CRM-20 ships only the 422 carrier.
  - Web rendering of the documented code + retry affordance —
    **PLATFORM-16-WEB (CRM-31)**.
