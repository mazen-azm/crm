> **Fetched from jira:** [CRM-53](https://mazen-al-nabarawy.atlassian.net/browse/CRM-53)  
> *Fetched 2026-08-31T00:36:35.309Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** IDENTITY-8-API any — changing my password ends every other session  
**Type:** Story  
**Status:** To Do  
**Labels:** any, backend, identity, pts-3, sprint-7

### Description

any — changing my password ends every other session

Story folder: .squad/stories/identity/IDENTITY-8-API-session-invalidation/

Owns no rule of its own.

Cannot ship before: IDENTITY-7-API

Points: 3 · Sprint: 7 · Layer: API

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/identity/CRM-53/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `identity`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-53` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `any, backend, identity, pts-3, sprint-7`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
IDENTITY-8-API any — changing my password ends every other session
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
any — changing my password ends every other session

Story folder: .squad/stories/identity/IDENTITY-8-API-session-invalidation/

Owns no rule of its own.

Cannot ship before: IDENTITY-7-API

Points: 3 · Sprint: 7 · Layer: API
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/identity.md, section IDENTITY-8-API (line 193):

Changing a password ends every other session.

Written 2026-08-31, with the sprint 7 stories.

*Acceptance criteria*
- Given a user signed in on two devices, when they change their password on
  one, then the token the other holds stops being accepted. Until this ships a
  changed password left old tokens working until they expired, which
  IDENTITY-7-API named as a stated gap rather than an oversight.
- Given the device that made the change, then it stays signed in. A password
  change that signs somebody out of the screen they changed it on looks like a
  failure, and they would change it again.
- Given the answer to the change, then it carries a token that works. This is
  what makes the previous criterion true without the two sessions having to be
  told apart by the second they were issued in — the clock here is whole
  seconds, and a token minted in the same second as the change is
  indistinguishable from one minted just before it by any comparison of times.
- Given a token issued before the change, then the refusal is 401
  UNAUTHENTICATED — the same answer an expired or forged token gets. That a
  token was once valid is not something the refusal should say.
- Given a password set by an admin (IDENTITY-6-API), then it ends the user's
  sessions too. The reason to end them is that the old password may be known
  to somebody else, and that is more true here, not less.
- Given the change, then the audit row is IDENTITY-7-API's and no second row is
  written. Ending the sessions is part of changing the password, not a
  separate act somebody performed.

*Out of scope*
- A list of active sessions, or ending one by name. Nothing in the backlog asks
  for it, and it needs a session record this deliberately does not create.
- Ending sessions when an account is disabled — already true, and by a
  different mechanism: the resolver re-reads the user row on every request, so
  a disabled account stops being a subject immediately.
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
  out by counting — two plans did, and both named the wrong story.
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
**The token is `{ sub, role, exp }` and nothing else** — minted at
`api/src/features/identity/identity.service.js:153`, verified by `verifyToken`
in `identity.rules.js`, and turned into a subject by
`identity.subject-resolver.js`. There is **no `iat`**. Ending old sessions needs
one, or needs something else that distinguishes a token minted before a moment
from one minted after it.

**The clock is whole seconds** — `now = () => Math.floor(Date.now() / 1000)`,
injected everywhere and replaced in tests. A token minted in the same second as
the password change is indistinguishable from one minted just before it by any
comparison of times. This has already bitten twice (two messages sharing a
second, and a clock stop that could not be told from "now"). Do not design a
rule whose correctness depends on sub-second ordering.

**The resolver already re-reads the user row on every request**, which is how a
disabled account stops being a subject immediately. Whatever ends a session
belongs in the same place, for the same reason: it is one question asked once.

**Two routes set a password**, not one: `POST /me/password` (IDENTITY-7-API)
and the admin's set-password (IDENTITY-6-API). The criteria say both end
sessions. A rule written into one of them is a rule the other does not have.

**A migration is `NNNN__name.sql` under `api/src/platform/db/migrations/`**, next
number 0013. `rowid` cannot be indexed — SQLite refused that once already.


## Out of scope

- **A list of active sessions, or ending one by name.** Nothing asks for it and
  it needs a session record this deliberately does not create.
- **Ending sessions when an account is disabled.** Already true by a different
  mechanism — the resolver re-reads the user row on every request.
- **Changing how long a token lasts.** `TOKEN_TTL_SECONDS` is not this story's.
- **Any screen.** No WEB half exists for this story.
