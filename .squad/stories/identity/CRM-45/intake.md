> **Fetched from jira:** [CRM-45](https://mazen-al-nabarawy.atlassian.net/browse/CRM-45)  
> *Fetched 2026-09-02T08:13:03.750Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** IDENTITY-2-WEB admin — I create, disable and re-enable accounts, and set roles  
**Type:** Story  
**Status:** To Do  
**Labels:** admin, identity, pts-5, sprint-9, web

### Description

admin — I create, disable and re-enable accounts, and set roles

Story folder: .squad/stories/identity/IDENTITY-2-WEB-manage-accounts/

Rules this story owns:

	I-3 — Staff accounts are created by an admin; the first admin comes from the seed.

	BR-2 — Every mutation is audited: actor, entity, action, before, after, timestamp.

Cannot ship before: IDENTITY-1-API

Points: 5 · Sprint: 9 · Layer: WEB

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/identity/CRM-45/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `identity`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-45` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `admin, identity, pts-5, sprint-9, web`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
IDENTITY-2-WEB admin — I create, disable and re-enable accounts, and set roles
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
admin — I create, disable and re-enable accounts, and set roles

Story folder: .squad/stories/identity/IDENTITY-2-WEB-manage-accounts/

Rules this story owns:

	I-3 — Staff accounts are created by an admin; the first admin comes from the seed.

	BR-2 — Every mutation is audited: actor, entity, action, before, after, timestamp.

Cannot ship before: IDENTITY-1-API

Points: 5 · Sprint: 9 · Layer: WEB
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/identity.md, section IDENTITY-2-WEB (line 64):


The screen an admin manages accounts from.

*Acceptance criteria*
- Given an admin, when they open the screen, then they see the live and the
  disabled accounts together, each with its role and its state. A disabled
  account that is not listed can never be re-enabled, and the API's
  `/accounts/:id/re-enable` route would have no way to be reached.
- Given the roles an admin may hand out, when the form offers them, then it
  offers `admin` and `agent` and not `customer` — the API refuses a customer
  here on purpose (`identity.rules.js:116`), and a screen offering a choice the
  API refuses teaches the reader a rule that is not true.
- Given a disable, when it succeeds, then the number of tickets it unassigned
  is shown to the admin. The API returns that count beside the user precisely
  so it can be seen (`identity.service.js:293-295`); dropping it on the screen
  is where that care is lost, and zero is an answer worth showing.
- Given the last admin, when disabling them or changing their role is refused
  with 409, then the screen says which rule refused it. "Something went wrong"
  is what sends an admin to the database.
- Given an address that already belongs to an account, when it is used again,
  then the screen says the address is taken and points at re-enabling, because
  a taken address is often a disabled colleague rather than a mistake.
- Given the list, when there are more accounts than a page, then it is paged
  the way every other list here is paged (BR-4) — the API's `/accounts` takes
  limit and offset already.
- Given a reader who is not an admin, when they reach the address directly,
  then they do not see the screen, and the navigation never offered it.
- Given a password, when an account is created, then this screen neither shows
  one nor sets one: setting a password is its own route and its own screen
  (`/accounts/set-password`), and two ways to set a password are two sets of
  rules.
- Given both languages, when the screen renders, then every label, role name
  and state comes from the resource file (BR-6) and none is a raw `agent`.
- Given loading, empty and failed, when each happens, then it is a designed
  state (D-2) and not an accident.
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

**The API is already built and shipped.** `IDENTITY-2-API` put every route in
`api/src/features/identity/identity.routes.js:40-58` — create, list, change
role, disable, re-enable — all `adminOnly`. Read them and
`identity.service.js` before designing a screen, because the screen's job is to
show what those answers already contain.

**`disableAccount` returns `{ user, unassigned }`** —
`identity.service.js:317` — and the comment there says exactly why: an admin
deciding whether to disable somebody is deciding what happens to their work.
**Show that number.** Dropping it on the screen is where the API's care is
lost, and zero is an answer worth showing, not an omission.

**Disabled accounts must be in the list.** `/accounts` is the admin's view, not
the queue's; an account that is not shown can never be re-enabled, and
`/accounts/:id/re-enable` would be unreachable from the product.

**Offer only the roles the API accepts.** `identity.rules.js:116` refuses
`customer` here on purpose. A form offering a choice the API refuses teaches a
rule that is not true.

**Three different 409s, three different sentences.** The last admin, an address
already taken, and an account already in the state being asked for all answer
409. "Something went wrong" for any of them sends an admin to the database.

**The list is paged** — `listAccounts(actor, { limit, offset })` already takes
it (`identity.service.js:206`), and BR-4 applies.

**Passwords are not on this screen.** `/accounts/set-password` already exists
(`routes.tsx:118`) and is its own story's work. Two ways to set a password are
two sets of rules.

**Same page shape as `web/src/pages/audit/`**, same admin-only route treatment
as `/audit` (`routes.tsx:161`), and **do not fetch before the subject's role is
known** — L-63.

**`parity.test.ts`** fails a key in `en.ts` and not `ar.ts`;
**`no-hardcoded-strings.test.ts`** will see the page; roles and states are
resource keys, never a raw `agent`.

## Out of scope

- **Anything in the API.** `IDENTITY-2-API` shipped every route this screen
  calls; a plan that changes the API here has misread the story.
- **Setting or resetting a password** — `/accounts/set-password` is its own
  screen and its own route.
- **Deleting an account.** Nothing is hard-deleted (BR-1); disable is the verb.
- **Customers.** They are not accounts an admin creates
  (`identity.rules.js:113-116`), and they have their own screens.
- **The audit log of these changes** — `AUDIT-2-WEB (CRM-135)` shipped it.
