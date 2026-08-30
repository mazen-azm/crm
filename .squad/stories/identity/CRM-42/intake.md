> **Fetched from jira:** [CRM-42](https://mazen-al-nabarawy.atlassian.net/browse/CRM-42)  
> *Fetched 2026-08-28T03:11:23.177Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** IDENTITY-1-WEB agent — I sign in and reach my queue  
**Type:** Story  
**Status:** To Do  
**Labels:** agent, identity, pts-5, sprint-1, web

### Description

agent — I sign in and reach my queue

Story folder: .squad/stories/identity/IDENTITY-1-WEB-sign-in/

Rules this story owns:

	I-3 — Staff accounts are created by an admin; the first admin comes from the seed.

	SC-2 — Every rule is enforced in the API; no client enforces anything.

Cannot ship before: PLATFORM-4-API

Points: 5 · Sprint: 1 · Layer: WEB

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/identity/CRM-42/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `identity`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-42` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `agent, identity, pts-5, sprint-1, web`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
IDENTITY-1-WEB agent — I sign in and reach my queue
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
agent — I sign in and reach my queue

Story folder: .squad/stories/identity/IDENTITY-1-WEB-sign-in/

Rules this story owns:

	I-3 — Staff accounts are created by an admin; the first admin comes from the seed.

	SC-2 — Every rule is enforced in the API; no client enforces anything.

Cannot ship before: PLATFORM-4-API

Points: 5 · Sprint: 1 · Layer: WEB
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/identity.md, section ## IDENTITY-1-WEB — binding:

- Given the sign-in screen, when the form is submitted with an email and a
  password, then the API is called and the token it returns is what the
  session stores — no stub token remains anywhere.
- Given a refusal, when it arrives, then the screen shows the API's code
  rather than a generic failure, and the password field is cleared.
- Given a request in flight, when the screen renders, then the submit button
  is disabled and the loading state comes from the shared hook.
- Given a signed-in session, when the page is reloaded, then it survives.
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

- **The API this screen calls now exists and is documented.** IDENTITY-1-API
  (CRM-41) shipped `POST /api/v1/sign-in` and `GET /api/v1/me`, both listed in
  `api/openapi.json`. Sign-in takes `{ email, password }` and answers
  `{ token, user: { id, role, name } }`. It answers **401 UNAUTHENTICATED**
  for a wrong password, an unknown address and a disabled account alike —
  **the screen must not try to be more specific than the API was**, because
  the sameness is deliberate.
  **422 VALIDATION_FAILED** carries `fields` — names only — when the body is
  the wrong shape.
- **What exists in the web root and must be used, not rebuilt:**
  - `web/src/app/auth-context.tsx` — `signIn(token)`, `signOut()`,
    `isAuthenticated`, and the storage read on first render. **The stub is the
    literal `'stub-token'` written by `SignInPage`; that is what this story
    deletes.** The context itself does not change shape.
  - `web/src/shared/api/client.ts` — `request<T>(path, init)`, which already
    prefixes `/api/v1`, attaches the bearer token, and throws `ApiError` with
    `code`, `status`, `requestId` and `fields`.
  - `web/src/shared/hooks/useRequest.ts` — the loading hook the fourth
    criterion demands. A screen that reimplements it is the bug.
  - `web/src/shared/ui/` — Button, Field, Card, Stack, Heading, Text.
  - `web/src/shared/i18n/` — every string comes from here, in both languages,
    and the guard added by LANGUAGES-1-WEB (CRM-35) fails the suite on a
    literal in a page. New strings go in `en.ts` **and** `ar.ts` in the same
    change, or the typecheck fails.
  - `web/src/testing/render.tsx` — `renderWithProviders(ui, { route, language,
    signedIn })`, and a setup whose default `fetch` throws when unstubbed.
    A test that needs a response stubs it with `vi.stubGlobal`.
- **The token the API returns is what gets stored** — pass it to
  `signIn(token)`. Nothing may write `'stub-token'` after this story; say in
  the plan how that is proved rather than assumed.
- **Clearing the password on refusal** is a criterion, not a nicety: the field
  keeps a wrong password that the next submit would send again.
- **Do not translate the code into a sentence** in this story. The screen shows
  the code the API gave. Turning `UNAUTHENTICATED` into "Wrong email or
  password" is a translation, and translations live in the resource files —
  add the mapping there if the plan wants one, so both languages get it and
  the string is not written in the screen.
- Read `.squad/plan-lessons.md` (18 lessons). L-15: run `npm run build`, not
  only the suite. L-16: prove the guard fails. 33 web tests and 102 API tests
  pass today; none may break.
- APIs, screens, services already discussed. Repos/roots: `api, web, android`. Primary language: `JavaScript`.

## Out of scope

- What this story explicitly does **not** cover:
- An expired token returning the user to sign-in — IDENTITY-3-WEB. This story
  signs in; it does not handle the session ending mid-session.
- The account-management screens — IDENTITY-2-WEB.
- Changing a password — IDENTITY-6-WEB and IDENTITY-7-WEB.
- The desk shell around the screen — PLATFORM-12-WEB.
- Designed empty, loading and error states as a system — PLATFORM-16-WEB. This
  story wires the loading and error states this one screen needs, using the
  shared hook.
- Any API change. CRM-41 shipped the routes; if something is missing, the plan
  says so rather than adding it here.
