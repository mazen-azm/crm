> **Fetched from jira:** [CRM-18](https://mazen-al-nabarawy.atlassian.net/browse/CRM-18)  
> *Fetched 2026-08-27T19:51:55.021Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** PLATFORM-3-API system — the chain: wiring, one error middleware, a request id, security headers  
**Type:** Story  
**Status:** To Do  
**Labels:** backend, platform, pts-5, sprint-0, system

### Description

system — the chain: wiring, one error middleware, a request id, security headers

Story folder: .squad/stories/platform/PLATFORM-3-API-request-chain/

Rules this story owns:

	E-1 — One shape, every failure, no stack trace.

Cannot ship before: PLATFORM-2-API

Points: 5 · Sprint: 0 · Layer: API

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/platform/CRM-18/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `platform`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-18` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `backend, platform, pts-5, sprint-0, system`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
PLATFORM-3-API system — the chain: wiring, one error middleware, a request id, security headers
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
system — the chain: wiring, one error middleware, a request id, security headers

Story folder: .squad/stories/platform/PLATFORM-3-API-request-chain/

Rules this story owns:

	E-1 — One shape, every failure, no stack trace.

Cannot ship before: PLATFORM-2-API

Points: 5 · Sprint: 0 · Layer: API
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/platform.md, section ## PLT-3-API (lines 42-59) — binding:

- Given any error, when it reaches the client, then the body carries a code, a
  request id, and no stack trace.
- Given an unknown route, when it is called, then the response is the same
  documented shape as every other error.
- Given a request with no id, when it is handled, then one is generated and
  returned in the response headers.
- Given a request that carries an id, when it is handled, then that id is used
  rather than a new one.
- Given a thrown error anywhere in a service, when it surfaces, then exactly one
  middleware decided its status code.
- Given the response, when its security headers are read, then the standard set
  is present.
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

- **Blocked by / related ids:** PLATFORM-2-API (CRM-17) — done, merged into sprint-0.
- **Depends on code areas or other stories:** extends the `api/` root CRM-17
  created; must not touch `api/src/platform/db/` beyond importing from it.

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

- APIs, screens, services already discussed. Repos/roots: `api, web, android`. Primary language: `JavaScript`.
- **What already exists (extend, do not re-create):** CRM-17 shipped the `api/`
  root — `api/package.json` (`"type": "module"`, zero dependencies so far,
  scripts use `node --env-file-if-exists=.env`, bare `node --test` with no
  glob), `api/src/platform/config/index.js` (env read once at load),
  `api/src/platform/db/` (connection factory, migration runner, 4 migrations,
  5 test files — 8 passing tests). This story adds `api/src/app.js` and
  `api/src/platform/http/`; it changes nothing under `platform/db/`.
- **Express is this story's job:** the first dependency enters here (the first
  attempt proved `express` v5 on this exact runtime). Add ONLY dependencies the
  code imports — the same discipline as CRM-17.
- **`docs/architecture.md`** lines 26–43: `app.js` is the composition root
  ("every injection happens here"); `platform/http/` is exactly "error
  middleware, request id, security headers". This story builds that folder and
  nothing else.
- **Request id:** `crypto.randomUUID()` (same id discipline as the schema).
  Honour an incoming `X-Request-Id` header; generate one when absent; always
  echo it in the response headers.
- **Security headers:** set the standard set by hand in one middleware rather
  than adding a dependency for it — the set must be named in the plan and
  asserted in a test.
- **Error shape:** one JSON shape decided by ONE terminal middleware — a `code`,
  the `requestId`, no stack trace (E-1, `scripts/rules.txt` line 27). The
  per-endpoint catalogue of documented codes is NOT this story
  (PLATFORM-5-API owns it) — this story ships the shape and the single
  decision point, with 404-unknown-route and 500-thrown-error as the two
  proofs.
- **Tests without a port collision:** `server.listen(0)` on an ephemeral port +
  built-in `fetch` inside `node:test`; no supertest, no new dev dependency.

## Out of scope

- Permission / role middleware — PLATFORM-4-API (CRM-19) owns it.
- The full error-code contract (every failure returns its documented code:
  400 401 403 404 409 422 429 500) — PLATFORM-5-API (CRM-20) owns it.
- `/api/v1` prefix, maximum page size, `/health`, structured logging —
  PLATFORM-6-API (CRM-21) owns them.
- The OpenAPI document and its route-coverage check — PLATFORM-7-API (CRM-22)
  owns it.
- Any feature route, service, or business rule — the features' own stories own
  them; this story wires an app that serves only the error chain.
- Translating error codes into sentences — clients translate
  (`scripts/criteria/platform.md` lines 61–62).
