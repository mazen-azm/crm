> **Fetched from jira:** [CRM-21](https://mazen-al-nabarawy.atlassian.net/browse/CRM-21)  
> *Fetched 2026-08-27T21:01:11.068Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** PLATFORM-6-API system — /api/v1, a maximum page size, health, and structured logging  
**Type:** Story  
**Status:** To Do  
**Labels:** backend, platform, pts-3, sprint-0, system

### Description

system — /api/v1, a maximum page size, health, and structured logging

Story folder: .squad/stories/platform/PLATFORM-6-API-api-versioning/

Rules this story owns:

	BR-4 — No unbounded list: paginated, filterable, sortable, with a maximum page size.

Cannot ship before: PLATFORM-3-API

Points: 3 · Sprint: 0 · Layer: API

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/platform/CRM-21/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `platform`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-21` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `backend, platform, pts-3, sprint-0, system`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
PLATFORM-6-API system — /api/v1, a maximum page size, health, and structured logging
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
system — /api/v1, a maximum page size, health, and structured logging

Story folder: .squad/stories/platform/PLATFORM-6-API-api-versioning/

Rules this story owns:

	BR-4 — No unbounded list: paginated, filterable, sortable, with a maximum page size.

Cannot ship before: PLATFORM-3-API

Points: 3 · Sprint: 0 · Layer: API
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/platform.md, section ## PLATFORM-6-API (lines 64-79) — binding:

- Given any route, when it is called without the `/api/v1` prefix, then it is not
  found.
- Given a list endpoint, when it is called with a limit above the maximum, then
  it is refused rather than silently clamped.
- Given the health endpoint, when it is called by a stranger, then it answers
  without authentication.
- Given a request to `/api/v1/users`, when the log line is read, then the path it
  logs is `/api/v1/users` and not `/users`. Express restores `baseUrl` before the
  finish event, and a log field that is quietly wrong is worse than a missing one.
- Given a log line, when it is read, then it carries the request id that the
  client was given.

Plus the rule this story owns, BR-4 (scripts/rules.txt line 8): no unbounded
list — a page ceiling exists and is enforced, not clamped.
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

- **What already exists (extend, do not re-create):** the chain in
  `api/src/app.js` is `requestId` -> `securityHeaders` -> `express.json` ->
  `jsonBodyErrors` -> `attachSubject` -> mount seam -> `notFoundHandler` ->
  `errorHandler`. 54 tests pass. `api/src/platform/http/errors.js` owns
  `DOCUMENTED` (the eight statuses), `HttpError` (its constructor REFUSES any
  status outside the eight), `ValidationError`/`unprocessable`. This story adds
  a router mount, a health route, a pagination reader and a logger; it changes
  no existing middleware order.
- **The prefix is a mount, not a string in each route.** Build an
  `express.Router()`, mount it at `/api/v1`, and put the mount BEFORE
  `notFoundHandler` so anything off-prefix still falls to the documented 404.
  The mount seam (`deps.mountTestRoutes`) must move inside the versioned
  router, so a feature mounted by a test is reachable at `/api/v1/...` — say so
  explicitly and update the existing app tests that call unversioned paths.
- **The ceiling refuses, never clamps** (BR-4). A `limit` above the maximum is a
  client error: use `unprocessable(['limit'])` -> 422, which already exists.
  Silently clamping hides a caller's bug and makes two clients disagree about
  what one page means.
- **Health answers without authentication** — it must sit where `attachSubject`
  has run but no guard applies. It returns a fixed shape and nothing about the
  process a stranger should not know: no version string, no uptime, no paths.
- **Logging: one line per finished request, JSON, to stdout.** No pino, no
  morgan, no winston — `console.log(JSON.stringify(...))` on the response
  `finish` event. The criteria call out the trap: read the path in the finish
  handler via `req.originalUrl`, because Express restores `req.url`/`baseUrl`
  after a router unwinds and a quietly wrong field is worse than a missing one.
  Every line carries the request id the client was given.
- **Node 26, no experimental flags.** Tests are `node --test` from `api/`, files
  `*.test.js` beside their unit, `server.listen(0)` + built-in `fetch`, no new
  dependency.
- Cite `docs/architecture.md` for where files go, and `scripts/criteria/platform.md`
  lines 64-79 for the acceptance. Read `.squad/plan-lessons.md` (11 lessons)
  first; L-11 in particular: every status a plan promises must be one of the
  eight in `DOCUMENTED`.
- APIs, screens, services already discussed. Repos/roots: `api, web, android`. Primary language: `JavaScript`.

## Out of scope

- What this story explicitly does **not** cover:
- The OpenAPI document that lists the routes and their codes — PLATFORM-7-API (CRM-22).
- The seed and its reference data — PLATFORM-8-API (CRM-23).
- Any feature route, service or repository — each feature's own `-API` story.
- Real authentication behind the guard; health is public and everything else
  still 401s with no resolver wired — IDENTITY-1-API (CRM-41).
- Mapping an oversized body to a status: 413 is not in E-2's catalogue and this
  story does not add one. The body ceiling stays as it is (500) until a story
  that owns the answer changes it deliberately.
- Rate limiting and the 429 code's first real use — IDENTITY-4-API (CRM-47) and
  CHANNELS-3-API (CRM-120).
- Log shipping, rotation or a log store. This story prints one JSON line per
  request to stdout and stops there.
