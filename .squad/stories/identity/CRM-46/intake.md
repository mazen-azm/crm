> **Fetched from jira:** [CRM-46](https://mazen-al-nabarawy.atlassian.net/browse/CRM-46)  
> *Fetched 2026-08-29T01:01:30.132Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** IDENTITY-3-WEB any — an expired token returns me to sign-in, not a broken screen  
**Type:** Story  
**Status:** To Do  
**Labels:** any, identity, pts-3, sprint-2, web

### Description

any — an expired token returns me to sign-in, not a broken screen

Story folder: .squad/stories/identity/IDENTITY-3-WEB-token-expiry/

Owns no rule of its own.

Cannot ship before: IDENTITY-1-WEB

Points: 3 · Sprint: 2 · Layer: WEB

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/identity/CRM-46/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `identity`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-46` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `any, identity, pts-3, sprint-2, web`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
IDENTITY-3-WEB any — an expired token returns me to sign-in, not a broken screen
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
any — an expired token returns me to sign-in, not a broken screen

Story folder: .squad/stories/identity/IDENTITY-3-WEB-token-expiry/

Owns no rule of its own.

Cannot ship before: IDENTITY-1-WEB

Points: 3 · Sprint: 2 · Layer: WEB
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/identity.md, section IDENTITY-3-WEB:

- Given a token the API no longer accepts, when any request uses it, then the
  session is cleared and the reader is at sign-in — not on a screen that
  renders an error it cannot recover from.
- Given the sign-in request itself, when it answers 401 because the password
  was wrong, then that is not treated as an expired session: the message stays
  on the screen and nothing is cleared.
- Given a session ending mid-task, when the reader arrives at sign-in, then
  they are told the session ended rather than being dropped there with no
  explanation.
- Given several requests failing at once with the same expired token, when they
  land, then the reader is sent to sign-in once.
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

- APIs, screens, services already discussed. Repos/roots: `api, web, android`. Primary language: `JavaScript`. **TypeScript in `web/` only** — the API already refuses an expired token correctly and needs no change (SC-2: every rule is enforced in the API; this story is the client not making a mess of the refusal).

**The obvious implementation is now forbidden, and that is the interesting part
of this story.** The tempting move is for `web/src/shared/api/client.ts` to call
`signOut()` when it sees a 401. It cannot: `signOut` lives in
`web/src/app/auth-context.tsx`, and `shared` importing from `app` is an upward
import that `scripts/verify-architecture.mjs` (CRM-30) fails by name. Do not
disable or carry-list that rule to get past it.

Invert it instead. The client's job is to throw a well-shaped `ApiError`; the
app layer's job is to decide that a 401 means the session is over. Whatever
shape you choose — a subscription the auth provider registers on the client, a
handler passed in at composition, a reaction where the request hook surfaces
the error — the dependency must point **downward**. State the chosen shape and
why in one paragraph, and run `node scripts/verify-architecture.mjs` as part of
the verification.

**The sign-in request is the trap.** `POST /api/v1/sign-in` answers 401
`UNAUTHENTICATED` for a wrong password — that is the normal path, not an expired
session, and IDENTITY-1-API deliberately gives the same 401 for three different
truths. A blanket "401 means sign out" would clear a session that does not
exist, redirect a reader who is already on sign-in, and wipe the error message
they were meant to read. Exempt that one request explicitly and say so in a
comment, because the next person adding a global handler will not know.

**Nothing signs out on a 401 today** — `signOut` is only wired to the button in
`web/src/app/desk-shell/DeskShell.tsx`. So this is new behaviour, not a repair.

**Once, not once per request.** A screen that fires three requests with the same
dead token gets three 401s. Clearing the session three times and navigating
three times is a flicker at best and a redirect loop at worst. Make the
transition idempotent — the fourth criterion asks for it directly.

**"Told the session ended" needs a sentence, in both files.**
`t.errors.UNAUTHENTICATED` already says "Your session has ended. Sign in again
to continue." — it was written in CRM-31 for exactly this. Reuse it rather than
adding a second sentence that says the same thing differently. And note that
sign-in's own wrong-password message is a *different* sentence on purpose
(L-29); do not converge them.

**The token's life is eight hours** — `TOKEN_TTL_SECONDS` in
`api/src/features/identity/identity.rules.js`. A test does not need to wait: the
API test suite already moves an injected clock, and on the web the honest test
is a stubbed fetch answering 401, not a real expiry.

## Out of scope

- What this story explicitly does **not** cover:

- **Refreshing a token, or any silent renewal.** There is no refresh token and
  this story does not invent one.
- **Returning the reader to the page they were on after signing in again.**
  A reasonable thing to want, not asked for here, and it needs a decision about
  what is safe to restore. If the plan wants it, it argues for it separately.
- **Ending other sessions when a password changes** — `IDENTITY-8-API`, which
  is not built.
- **Any `api/` change.** The API already refuses an expired token with 401 and
  a test proves it (`identity.test.js`, "an expired token is refused").
- **Changing the sign-in screen's own error handling**, the throttle, or the
  `ApiError` shape.
- **Carrying or disabling a `verify-architecture.mjs` rule** to make the
  implementation simpler.
