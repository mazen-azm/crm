> **Fetched from jira:** [CRM-51](https://mazen-al-nabarawy.atlassian.net/browse/CRM-51)  
> *Fetched 2026-08-30T02:51:40.830Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** IDENTITY-7-API any — I change my own password, knowing the current one  
**Type:** Story  
**Status:** To Do  
**Labels:** any, backend, identity, pts-3, sprint-5

### Description

any — I change my own password, knowing the current one

Story folder: .squad/stories/identity/IDENTITY-7-API-change-own-password/

Rules this story owns:

	BR-2 — Every mutation is audited: actor, entity, action, before, after, timestamp.

Cannot ship before: IDENTITY-1-API

Points: 3 · Sprint: 5 · Layer: API

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/identity/CRM-51/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `identity`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-51` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `any, backend, identity, pts-3, sprint-5`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
IDENTITY-7-API any — I change my own password, knowing the current one
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
any — I change my own password, knowing the current one

Story folder: .squad/stories/identity/IDENTITY-7-API-change-own-password/

Rules this story owns:

	BR-2 — Every mutation is audited: actor, entity, action, before, after, timestamp.

Cannot ship before: IDENTITY-1-API

Points: 3 · Sprint: 5 · Layer: API
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/identity.md, section IDENTITY-7-API (line 155):

Anybody changes their own password, knowing the current one.

*Acceptance criteria*
- Given a signed-in user, when they send the current password and a new one,
  then the password changes and the new one signs them in.
- Given a wrong current password, then the answer is 401; given an
  unacceptable new one, then it is 422 naming the field. Sign-in deliberately
  gives one refusal for three causes, and that reasoning does not carry here:
  the caller is already authenticated and already knows the account exists, so
  telling them which half they got wrong leaks nothing and saves them guessing.
- Given the new password equal to the current one, then it is refused naming
  the field. A change that changes nothing is a change somebody believes they
  made.
- Given the change, then an audit row records it, carrying neither password
  (BR-2).
- Given any role, then the route is the same one — an admin changing their own
  password uses this, not IDENTITY-6-API.

*Out of scope*
- Ending other sessions — IDENTITY-8-API. Until it ships, a changed password
  leaves existing tokens valid until they expire, and that is a stated gap
  rather than an oversight.
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

- APIs, screens, services already discussed. Repos/roots: `api, web, android`. Primary language: `JavaScript`.

**One route, every role.** An admin changing their own password uses this, not
`IDENTITY-6-API (CRM-49)`. `requireSubject()` and nothing more.

**401 for a wrong current password, 422 for an unacceptable new one**, and the
comment beside it should say why this differs from sign-in. Sign-in gives one
refusal for a wrong password, an unknown address and a disabled account so the
response cannot be used to learn which addresses exist — read the note above
`errorUnauthenticated` in `web/src/shared/i18n/en.ts`. Here the caller is
already authenticated and already knows the account exists, so nothing is
leaked by saying which half they got wrong.

**A new password equal to the current one is refused naming the field.** A
change that changes nothing is a change somebody believes they made.

**Verify the current password with the same comparison sign-in uses**, from the
identity password module — not a second implementation. Read
`api/src/features/identity/` for the module that owns hashing and verifying.

**The audit row carries neither password** (BR-2), and the audit guarantee test
already asserts diffs hold no secrets.


## Out of scope

- What this story explicitly does **not** cover:

- **Ending other sessions** — `IDENTITY-8-API`, a later block. State the gap.
- **Any `web/` change** — `IDENTITY-7-WEB (CRM-52)`.

