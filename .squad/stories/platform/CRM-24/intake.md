> **Fetched from jira:** [CRM-24](https://mazen-al-nabarawy.atlassian.net/browse/CRM-24)  
> *Fetched 2026-08-28T02:09:29.997Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** PLATFORM-9-WEB developer — a React skeleton: router, auth context, client, loading hook  
**Type:** Story  
**Status:** To Do  
**Labels:** developer, platform, pts-5, sprint-0, web

### Description

developer — a React skeleton: router, auth context, client, loading hook

Story folder: .squad/stories/platform/PLATFORM-9-WEB-react-skeleton/

Owns no rule of its own.

Cannot ship before: PLATFORM-6-API

Points: 5 · Sprint: 0 · Layer: WEB

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/platform/CRM-24/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `platform`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-24` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `developer, platform, pts-5, sprint-0, web`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
PLATFORM-9-WEB developer — a React skeleton: router, auth context, client, loading hook
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
developer — a React skeleton: router, auth context, client, loading hook

Story folder: .squad/stories/platform/PLATFORM-9-WEB-react-skeleton/

Owns no rule of its own.

Cannot ship before: PLATFORM-6-API

Points: 5 · Sprint: 0 · Layer: WEB
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/platform.md, section ## PLATFORM-9-WEB (lines 131-144) — binding:

- Given the application, when it starts, then the router resolves and an
  unauthenticated visitor lands on sign-in.
- Given a signed-in session, when the page is reloaded, then the session survives.
- Given an API call, when it returns an error code, then the client surfaces the
  code rather than a generic failure.
- Given a slow request, when it is in flight, then the loading state is
  observable, and the hook that owns it is used by every screen rather than
  reimplemented.
- Given the layers, when an import points upward, then the structure check fails.
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

- **The build is decided and committed: Vite, single-page, React + TypeScript,
  Vitest + Testing Library.** `docs/architecture.md` (section "The web") states
  it and why — the API is meant to be the only contract, and a server-rendering
  framework offers a second data path straight past the documented routes,
  which would quietly hollow out the OpenAPI check that PLATFORM-7-API just
  shipped. Do not propose Next.js, Remix, or SSR of any kind.
- **`web/` is empty** — it holds only `.gitkeep`. This story stands the root up.
  The layer folders and the import direction are already specified in
  `docs/architecture.md` ("The web"): `app -> pages -> features -> entities ->
  shared`, and sibling entity slices cross only through `@x/<consumer>`.
  Create the folders this story actually fills; do not scaffold empty ones for
  layers nothing uses yet.
- **The API contract is real and running.** Every response the client must
  understand already exists: an error is `{ code, requestId }` and nothing
  else, a 422 adds `fields` (names only), and the eight statuses are frozen in
  `api/src/platform/http/errors.js` as `DOCUMENTED`. Routes live under
  `/api/v1`, and `GET /api/v1/openapi.json` serves the contract. The client
  surfaces **the code**, never a generic "something went wrong" — that is the
  third criterion, and the codes are the shared vocabulary the API already
  promises.
- **The session survives a reload** — that is the second criterion. There is no
  real sign-in yet (IDENTITY-1-API owns it), so this story ships the seam: an
  auth context that reads a stored token on boot, a route guard that sends an
  unauthenticated visitor to sign-in, and a sign-in page that is a form with no
  real endpoint behind it yet. Say clearly in the plan that the token is
  stubbed and which story replaces the stub.
- **The loading hook is written once and used by every screen** — the fourth
  criterion says a screen that reimplements it is the failure. One hook in
  `shared/`, owning loading / error / data, and the pages consume it.
- **Node 26 is the runtime.** `npm create vite` templates change; pin what you
  add and let the plan name exact packages. This root gets its own
  `web/package.json`; do not touch `api/package.json`.
- **Tests run without network.** Vitest with jsdom, and — noted in the
  workspace CLAUDE.md as already-diagnosed — **Node 26 defines a `localStorage`
  global that throws unless started with a flag, and jsdom's returns
  `undefined`**, so the test setup must provide its own. That trap is
  PLATFORM-11-WEB's story to prove, but this story will hit it the moment the
  auth context reads a stored token in a test.
- Read `.squad/plan-lessons.md` (13 lessons). L-10 and L-13: do not propose a
  source-text scan; the import-direction rule is PLATFORM-15-ALL's script.
- APIs, screens, services already discussed. Repos/roots: `api, web, android`. Primary language: `JavaScript`.

## Out of scope

- What this story explicitly does **not** cover:
- Real authentication — signing in against the API, tokens, refresh, roles.
  IDENTITY-1-API (CRM-41) owns it; this story ships the seam and a stub.
- The design tokens and UI primitives — PLATFORM-10-WEB (CRM-25). This story
  uses plain, unstyled markup; no colour literal is invented here, because
  the rule that forbids them arrives with the tokens file.
- The desk shell (navigation, header, theme) — PLATFORM-12-WEB.
- The full web test setup and its first tests — PLATFORM-11-WEB. This story
  carries only the tests that prove its own criteria.
- The structure check that enforces import direction — PLATFORM-15-ALL. This
  story obeys the direction; it does not build the script that polices it.
- Any feature screen — each feature's own `-WEB` story.
