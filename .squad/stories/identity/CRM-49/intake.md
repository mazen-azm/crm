> **Fetched from jira:** [CRM-49](https://mazen-al-nabarawy.atlassian.net/browse/CRM-49)  
> *Fetched 2026-08-30T02:51:40.000Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** IDENTITY-6-API admin — I set a user's password, so a locked-out person gets back in  
**Type:** Story  
**Status:** To Do  
**Labels:** admin, backend, identity, pts-3, sprint-5

### Description

admin — I set a user's password, so a locked-out person gets back in

Story folder: .squad/stories/identity/IDENTITY-6-API-admin-set-password/

Rules this story owns:

	BR-2 — Every mutation is audited: actor, entity, action, before, after, timestamp.

Cannot ship before: IDENTITY-2-API

Points: 3 · Sprint: 5 · Layer: API

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/identity/CRM-49/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `identity`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-49` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `admin, backend, identity, pts-3, sprint-5`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
IDENTITY-6-API admin — I set a user's password, so a locked-out person gets back in
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
admin — I set a user's password, so a locked-out person gets back in

Story folder: .squad/stories/identity/IDENTITY-6-API-admin-set-password/

Rules this story owns:

	BR-2 — Every mutation is audited: actor, entity, action, before, after, timestamp.

Cannot ship before: IDENTITY-2-API

Points: 3 · Sprint: 5 · Layer: API
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/identity.md, section IDENTITY-6-API (line 107):

An admin sets somebody's password, so a locked-out person gets back in.

Written 2026-08-30. There is no reset by email — `docs/product-brief.md` puts
"SSO, password reset by email" under Specified only, which is why a locked-out
person needs an admin rather than a link.

*Acceptance criteria*
- Given an admin, when they set another user's password, then that user can
  sign in with it and not with the old one.
- Given a non-admin, when they attempt it on anybody, then the answer is 403
  and the service never runs (SC-2).
- Given an admin setting their own password this way, then it is refused: the
  route is for somebody who is locked out, and changing your own is
  IDENTITY-7-API, which asks for the current one. An admin who can skip that
  check on themselves is a stolen session that never has to know a password.
- Given the new password, then it is stored as a hash with its own salt, and
  the answer never carries it back — the admin types it, so nothing needs to
  read it out.
- Given a set password, then an audit row records who set it and for whom, and
  the row carries no password and no hash, before or after (BR-2).
- Given a disabled or soft-deleted account, then setting a password on it is
  refused — bringing somebody back is re-enabling them (IDENTITY-2-API), and
  doing it by the back door leaves the account's state saying one thing and
  its access saying another.

*Out of scope*
- Ending the sessions the old password opened — IDENTITY-8-API.
- Any rule about what a password may contain. There is one length floor and no
  composition rules; a rule that forces a symbol is a rule that produces the
  same password with a symbol on the end.
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

**Read `api/src/features/identity/identity.service.js` first** — account
creation already hashes a password and returns an `initialPassword` once. This
route reuses that hashing, and returns nothing: the admin typed the password,
so nothing needs to read it back.

**`adminOnly` already exists** as `requirePermission((s) => s.role === 'admin')`
— read `identity.routes.js` for how the existing admin routes use it. The
refusal is 403 and the service never runs (SC-2).

**An admin may not use this on themselves**, and that is the decision most
likely to be missed. Changing your own password is `IDENTITY-7-API (CRM-51)`
and asks for the current one; an admin who can skip that check on themselves
turns a stolen session into a permanent one. Refuse it, and put the reason
beside the check.

**A disabled or soft-deleted account is refused too.** Bringing somebody back is
`IDENTITY-2-API`'s re-enable; doing it through this door leaves the account's
state saying one thing and its access saying another.

**The audit row carries no password and no hash.** There is a guarantee test in
the audit feature that asserts diffs never carry secrets — read it before
choosing what to put in `before`/`after` (BR-2).


## Out of scope

- What this story explicitly does **not** cover:

- **Ending the sessions the old password opened** — `IDENTITY-8-API`, a later
  block. Until it ships, existing tokens stay valid until they expire; say so
  in a comment rather than half-implementing it.
- **Password composition rules.** One length floor, nothing else.
- **Any `web/` change** — `IDENTITY-6-WEB (CRM-50)`.

