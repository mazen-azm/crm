> **Fetched from jira:** [CRM-41](https://mazen-al-nabarawy.atlassian.net/browse/CRM-41)  
> *Fetched 2026-08-28T02:58:38.966Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** IDENTITY-1-API agent — I sign in and reach my queue  
**Type:** Story  
**Status:** To Do  
**Labels:** agent, backend, identity, pts-5, sprint-1

### Description

agent — I sign in and reach my queue

Story folder: .squad/stories/identity/IDENTITY-1-API-sign-in/

Rules this story owns:

	I-3 — Staff accounts are created by an admin; the first admin comes from the seed.

	SC-2 — Every rule is enforced in the API; no client enforces anything.

Cannot ship before: PLATFORM-4-API

Points: 5 · Sprint: 1 · Layer: API

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/identity/CRM-41/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `identity`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-41` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `agent, backend, identity, pts-5, sprint-1`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
IDENTITY-1-API agent — I sign in and reach my queue
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
agent — I sign in and reach my queue

Story folder: .squad/stories/identity/IDENTITY-1-API-sign-in/

Rules this story owns:

	I-3 — Staff accounts are created by an admin; the first admin comes from the seed.

	SC-2 — Every rule is enforced in the API; no client enforces anything.

Cannot ship before: PLATFORM-4-API

Points: 5 · Sprint: 1 · Layer: API
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/identity.md, section ## IDENTITY-1-API — binding:

- Given the seeded admin's email and password, when they are posted to the
  sign-in route, then the answer carries a token and the account's role and
  name, and never the password hash.
- Given a wrong password, when it is posted, then the answer is 401
  UNAUTHENTICATED — the same answer as an email nobody has.
- Given a disabled or soft-deleted account, when it signs in with the right
  password, then the answer is still 401.
- Given a token the API issued, when it is sent on a guarded route, then the
  subject is resolved from it and the route runs.
- Given a token that was tampered with, has expired, or was signed by anything
  else, when it is sent, then the answer is 401 and no subject is resolved.
- Given the stored password, when the row is read, then it is a hash with its
  own salt, and the same password stored twice produces two different hashes.

Rules owned: I-3 (staff accounts are created by an admin; the first admin
comes from the seed) and SC-2 (every rule is enforced in the API).
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

- **This is the first feature in `api/src/features/`.** Everything before it
  was platform. Follow `docs/architecture.md`'s feature layout exactly —
  `index.js` as the only way in, `identity.routes.js` where req and res stop,
  `identity.service.js`, `identity.repository.js` for the SQL, and
  `identity.rules.js` for the pure part. The route mounts through the seam in
  `api/src/app.js`, which today only carries health and the OpenAPI document.
- **What already exists and must be used, not rebuilt:**
  - `api/src/platform/http/permission.js` — `attachSubject(resolver)`,
    `requireSubject()`, `requirePermission(policy)`. **`createApp` already
    takes `deps.subjectResolver`**; this story supplies the real one. The seam
    was built for exactly this and must not be redesigned.
  - `api/src/platform/http/errors.js` — `DOCUMENTED` (the eight statuses),
    `HttpError`, `unprocessable(fields)`. 401 is `UNAUTHENTICATED`, already
    used by the permission middleware.
  - `api/src/platform/db/seed.js` — **`hashPassword(plaintext)` is exported**
    and produces `salt:hash` hex with scrypt. The verifier is its other half
    and belongs beside it or in this feature's rules file; decide and say why.
    The seeded admin's row is what the first criterion signs in as.
  - `api/openapi.json` and the contract test: **a route added without an entry
    fails the suite**. The new routes must be documented in the same commit.
  - `api/src/platform/http/pagination.js`, `route-table.js`, `prefix.js`.
- **The token.** No jsonwebtoken, no jose — `node:crypto` has HMAC, and the
  format is a decision to make explicitly: payload + signature, base64url,
  with an expiry inside the signed part. State the algorithm, the secret's
  source (`.env.example` must declare it and `config/index.js` must read it —
  architecture check 11), and what happens when the secret is absent in
  development versus production. A random per-boot secret is honest for
  development and wrong for production; say which this ships and why.
- **Timing.** Comparing a wrong password must not be faster than comparing a
  right one in a way that leaks whether the account exists. Look up, and if
  there is no row, still perform a hash comparison against a dummy value
  before answering — and say so in a comment, because the code otherwise
  looks like pointless work and somebody will delete it.
- **Validation before authentication.** A malformed body is 422 with the field
  names (`unprocessable(['email'])`), never 401 — the shape of the request and
  the truth of the credential are different questions.
- **Node 26, SQLite via `node:sqlite`, no new dependency.** Tests are
  `node --test`, `:memory:`, `server.listen(0)` + built-in fetch. 82 API tests
  pass today and none may break.
- Read `.squad/plan-lessons.md` (17 lessons). L-11: every status must be one
  of the eight. L-16: prove the guard fails.
- APIs, screens, services already discussed. Repos/roots: `api, web, android`. Primary language: `JavaScript`.

## Out of scope

- What this story explicitly does **not** cover:
- The sign-in screen — IDENTITY-1-WEB (CRM-42), which comes next and replaces
  the stub token the web skeleton ships with.
- Creating, disabling or re-enabling accounts, or setting roles —
  IDENTITY-2-API (CRM-44).
- Throttling repeated failures — IDENTITY-4-API (CRM-47). This story must not
  invent a half of it; 429 stays unused here.
- The assignable-agents list — IDENTITY-5-API (CRM-48).
- Changing or resetting a password, and ending other sessions — IDENTITY-6,
  7 and 8.
- Customers signing in. Rule I-1 keeps users and customers as two tables and
  the portal is a later feature.
- Refresh tokens. One token with an expiry; a story that needs refresh can
  argue for it then.
