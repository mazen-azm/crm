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

### The API this screen needs, and the half of it that is missing

Written 2026-09-02 by reading `identity.routes.js` and `identity.service.js`
before planning the screen, which is the check that keeps finding this:

**`GET /accounts` returns live accounts only.** `listAccounts` calls
`listLiveUsers` (`identity.repository.js:84`), whose `WHERE deleted_at IS NULL`
is the whole query. So a disabled account appears in no listing anywhere in
this API — and `POST /accounts/:id/re-enable` takes an id that no client has
any way to learn. The route is served, documented and tested, and nothing that
is not a test can call it.

`IDENTITY-2-API`'s own criterion — "a disabled account, re-enabled, is the same
row" — passed because the service test already held the id from creating the
account. That is the fourth time a story's missing unit has turned out to be in
the layer the story was not in, and the first time the gap was in a route
rather than a screen.

**So this story includes the listing change**, small and stated rather than
discovered: `GET /accounts` gains a way to ask for disabled accounts, or for
all of them. It is API work inside a WEB story, and it is here because the
alternative is a screen that cannot do half of what the feature promises.

*Acceptance criteria*
- Given a disabled account, when an admin asks the API for accounts including
  disabled ones, then it is returned, with its state visible on the row —
  without this, `/accounts/:id/re-enable` is unreachable from any client.
- Given the default listing, when nothing is asked for, then it answers what it
  answers today: live accounts only. Existing callers do not change behaviour
  because a screen needed something new.
- Given an admin, when they open the screen, then they see the live and the
  disabled accounts, each with its role and its state, and can re-enable a
  disabled one from there.
- Given the roles an admin may hand out, when the form offers them, then it
  offers `admin` and `agent` and not `customer` — the API refuses a customer
  here on purpose (`identity.rules.js:116`), and a screen offering a choice the
  API refuses teaches the reader a rule that is not true.
- Given a new account, when it is created, then the initial password the API
  returns is shown to the admin once, plainly, with the fact that it will not
  be shown again. `createAccount` mints it and returns it
  (`identity.service.js:200-203`); an admin who never sees it has created an
  account nobody can sign in to.
- Given that same password, when the screen is done with it, then it is never
  put anywhere it will be read again — not in the URL, not in storage, not in
  a log. It is audited nowhere by design (`identity.service.js:99-101`), and
  the screen must not undo that.
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
- Given setting a password for somebody else, when an admin wants that, then it
  stays where it already is (`/accounts/set-password`): this screen shows the
  one password creation produces and sets none. Two ways to set a password are
  two sets of rules.
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

**Read `identity.routes.js:40-58` and `identity.service.js:178-300` before
designing anything.** Most of what this screen shows is already in those
answers, and one thing it needs is not there at all.

**The listing does not include disabled accounts, and this story fixes that.**
`listAccounts` calls `listLiveUsers` (`identity.repository.js:84`), whose whole
query is `WHERE deleted_at IS NULL`. So `POST /accounts/:id/re-enable` takes an
id no client can learn — it is served, documented, tested and unreachable
(**L-66**). Add a way to ask `GET /accounts` for disabled accounts, or for all
of them, and **leave the default exactly as it is** so existing callers do not
change behaviour. It is a small API change inside a WEB story, and it is
deliberate.

**`createAccount` returns `initialPassword`** (`identity.service.js:200-203`).
Show it once, plainly, and say it will not be shown again — an admin who never
sees it has created an account nobody can sign in to. Then never put it
anywhere it can be read again: not the URL, not storage, not a log. The audit
row for `user.create` deliberately holds no password and no hash
(`identity.service.js:99-101`), and the audit guarantee test asserts that of
every diff; the screen must not undo it.

**`disableAccount` returns `{ user, unassigned }`** (`identity.service.js:317`)
and the comment there says why: an admin deciding whether to disable somebody
is deciding what happens to their work. **Show that number.** Zero is an
answer, not an omission.

**Three different 409s, three different sentences.** The last admin, an address
already taken, and an account already in the state asked for all answer 409.
"Something went wrong" for any of them sends an admin to the database.

**The list is paged** — `listAccounts(actor, { limit, offset })`
(`identity.service.js:206`), and BR-4 applies.

**Setting somebody else's password stays where it is** —
`/accounts/set-password` (`routes.tsx:118`). This screen shows the password
creation produced and sets none.

**Same page shape as `web/src/pages/audit/`**, same admin-only route treatment
as `/audit` (`routes.tsx:161`) — the screen says so for a non-admin who
arrives, and there is no router-level role gate, deliberately. **Do not fetch
before the subject's role is known** — L-63.

**If `GET /accounts` changes, `api/openapi.json` changes with it**, or
`openapi-contract.test.js` fails.

**`parity.test.ts`** fails a key in `en.ts` and not `ar.ts`;
**`no-hardcoded-strings.test.ts`** will see the page; roles and states are
resource keys, never a raw `agent`.

## Out of scope

- **Any API change beyond letting the listing include disabled accounts.**
  Every other route this screen calls already exists and is correct.
- **Setting or resetting somebody else's password** — `/accounts/set-password`
  is its own screen and its own route.
- **Deleting an account.** Nothing is hard-deleted (BR-1); disable is the verb.
- **Customers.** They are not accounts an admin creates
  (`identity.rules.js:113-116`), and they have their own screens.
- **The audit log of these changes** — `AUDIT-2-WEB (CRM-135)` shipped it.
- **Changing what disable does to a person's tickets.**
  `IDENTITY-9-API (CRM-54)` decided that; this screen reports it.
