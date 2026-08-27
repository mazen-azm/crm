> **Fetched from jira:** [CRM-22](https://mazen-al-nabarawy.atlassian.net/browse/CRM-22)  
> *Fetched 2026-08-27T21:09:34.256Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** PLATFORM-7-API system — an API document checked against the routes actually served  
**Type:** Story  
**Status:** To Do  
**Labels:** backend, platform, pts-5, sprint-0, system

### Description

system — an API document checked against the routes actually served

Story folder: .squad/stories/platform/PLATFORM-7-API-openapi-contract/

Owns no rule of its own.

Cannot ship before: PLATFORM-6-API

Points: 5 · Sprint: 0 · Layer: API

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/platform/CRM-22/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `platform`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-22` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `backend, platform, pts-5, sprint-0, system`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
PLATFORM-7-API system — an API document checked against the routes actually served
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
system — an API document checked against the routes actually served

Story folder: .squad/stories/platform/PLATFORM-7-API-openapi-contract/

Owns no rule of its own.

Cannot ship before: PLATFORM-6-API

Points: 5 · Sprint: 0 · Layer: API
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/platform.md, section ## PLATFORM-7-API (lines 81-93) — binding:

- Given the running application, when the suite runs, then every served route
  appears in the OpenAPI document.
- Given a route added without documentation, when the suite runs, then it fails
  and names the route.
- Given a documented route that is no longer served, when the suite runs, then it
  fails and names it.
- Given the request collection, when it is imported into a client, then every
  request in it resolves against the running application.
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

- **What already exists (extend, do not re-create):** `api/src/app.js` builds
  the chain and mounts an `express.Router()` at `/api/v1`; today that router
  serves exactly one route, `GET /api/v1/health` (`platform/http/health.js`).
  `errors.js` owns `DOCUMENTED` — rule E-2's eight statuses. 65 tests pass.
- **The document is derived from the router, not hand-listed.** Walk the
  Express router stack of a built `createApp()` to collect (method, path)
  pairs, and compare that set against the document. A hand-kept list of routes
  is the drift this story exists to prevent — the same disease as a
  hand-maintained taxonomy.
- **Express 5's router stack, verified by inspection on this exact install
  (express 5.2.1) — do not design against Express 4 articles:**
  - The stack is `app.router.stack` (Express 4's `app._router` is gone).
  - A layer that holds a route has `layer.route.path` (a string, e.g.
    `/tickets/:id`) and `layer.route.methods` (an object, `{ post: true }`).
  - A layer that holds a mounted router has `layer.name === 'router'` and
    `layer.handle.stack` — recurse into it.
  - **The mount path is NOT readable from the layer.** `layer.path` is
    `undefined` and there is no `layer.regexp`; Express 5 compiles the mount
    into `layer.matchers`, an array of closures. Reverse-engineering `/api/v1`
    out of a closure is not possible.
  - **Therefore the prefix must be a value the code owns, not one the walker
    recovers.** Export the prefix as a constant from one module, have `app.js`
    mount with it, and have the route-table walker take it as its argument.
    One source of truth, and the walker is honest about what it cannot know.
    A test should assert the served table contains `GET /api/v1/health` — that
    is what proves the prefix and the walker agree.
- **Two failures, each naming what is wrong:** a served route absent from the
  document, and a documented route no longer served. Assert on the names, not
  just on a count — a count tells you something broke and nothing else.
- **The document lives in the repo as `api/openapi.json`** (or `.yaml` if
  preferred, but JSON needs no parser dependency and this project adds none).
  Serve it too, at `GET /api/v1/openapi.json`, so a client can fetch the
  contract from the running application — and that route documents itself.
- **The request collection** is the fourth criterion: a small JSON file of
  named requests (method + path) that a test replays against a live
  `app.listen(0)` and asserts each resolves — not 404, not 500. It is a
  smoke test of the document, not a Postman export.
- **No new dependency.** No swagger-ui, no express-openapi, no yaml parser.
  Node 26, `node --test`, `server.listen(0)` + built-in fetch.
- Read `.squad/plan-lessons.md` (12 lessons). L-11: every status the document
  names must be one of the eight in `DOCUMENTED`. L-12: if a mount moves,
  every test that reaches through the seam moves with it.
- APIs, screens, services already discussed. Repos/roots: `api, web, android`. Primary language: `JavaScript`.

## Out of scope

- What this story explicitly does **not** cover:
- Request and response *schemas* per route. This story documents which routes
  exist and which statuses they may answer; the body shapes arrive with the
  features that own them.
- The seed and its reference data — PLATFORM-8-API (CRM-23).
- Any feature route — each feature's own `-API` story adds its route and its
  entry in the document at the same time; that simultaneity is what the check
  enforces.
- A rendered documentation UI (swagger-ui or equivalent). The document is a
  contract for clients and a check for the suite, not a website.
- Authentication on the document route — it describes the shape of the API,
  which is not a secret. IDENTITY-1-API (CRM-41) owns what is.
- The structure checks that read source text — PLATFORM-15-ALL.
