> **Fetched from jira:** [CRM-122](https://mazen-al-nabarawy.atlassian.net/browse/CRM-122)  
> *Fetched 2026-08-30T02:51:43.079Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** PORTAL-2-WEB customer — I sign in and see my tickets and nothing else  
**Type:** Story  
**Status:** To Do  
**Labels:** customer, portal, pts-5, sprint-5, web

### Description

customer — I sign in and see my tickets and nothing else

Story folder: .squad/stories/portal/PORTAL-2-WEB-my-tickets-only/

Rules this story owns:

	SC-2 — Every rule is enforced in the API; no client enforces anything.

Cannot ship before: CUSTOMERS-6-API, TICKETS-8-API

Points: 5 · Sprint: 5 · Layer: WEB

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/portal/CRM-122/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `portal`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-122` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `customer, portal, pts-5, sprint-5, web`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
PORTAL-2-WEB customer — I sign in and see my tickets and nothing else
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
customer — I sign in and see my tickets and nothing else

Story folder: .squad/stories/portal/PORTAL-2-WEB-my-tickets-only/

Rules this story owns:

	SC-2 — Every rule is enforced in the API; no client enforces anything.

Cannot ship before: CUSTOMERS-6-API, TICKETS-8-API

Points: 5 · Sprint: 5 · Layer: WEB
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/portal.md, section PORTAL-2-WEB (line 52):

A customer signs in and sees their tickets, and nothing else.

*Acceptance criteria*
- Given a customer's sign-in, when it succeeds, then they land on their own
  tickets rather than on the desk's queue, and the navigation they are shown
  contains no staff screen.
- Given a customer, when they read a ticket that is theirs, then it is shown;
  when they ask for one that is not, then the answer is the same 404 a missing
  ticket gets, so nothing confirms that somebody else's ticket exists
  (TICKETS-8-API).
- Given a customer, when the API is asked for the queue, the staff list, or
  another customer, then it refuses — the screen not offering it is not the
  enforcement, the API is (SC-2).
- Given an agent or an admin, when they sign in, then nothing about their
  experience changes. Both halves are pinned, because a guard that also
  narrowed staff would break the queue.
- Given the customer's list, then it is paginated like every list (BR-4), and
  an empty one says so rather than rendering blank (D-2).
- Given every string, then it came from a resource file, in both languages
  (BR-6).

*Out of scope*
- Replies and the internal-note distinction — PORTAL-3-WEB, next block.
- Reopening, rating, and reading articles. Later stories own each.
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

**This cannot ship before `CUSTOMERS-6-API (CRM-65)`.** Until that story lands,
`api/src/features/tickets/tickets.service.js` refuses every subject whose role
is `customer` outright — deliberately, and its comment says so. A portal built
over that guard is a set of screens that answer 404 to their own users. Confirm
the guard has become a comparison before planning against it.

**The shell has to learn there are two audiences.** Read
`web/src/app/desk-shell/` — its navigation names Home, Customers, The queue and
Raise a ticket, all of them staff screens. A customer must be shown none of
them. Decide whether that is a second shell or one shell that reads the role,
and say why; either is defensible and a plan that does neither leaves a
customer looking at the queue link.

**The screen not offering something is not the enforcement.** SC-2 says every
rule is enforced in the API. A test should assert the API refuses a customer
asking for the queue, the staff list or another customer — not only that the
link is absent.

**Both halves are pinned.** An agent's and an admin's experience must not
change. A guard that also narrowed staff would break the queue the previous
sprint shipped, and only a test for the staff side catches that.

**`web/src/pages/tickets/TicketQueuePage.tsx` reads a paginated list** and is
the closest thing to this screen; take its paging and its empty state (D-2) and
none of its assign or status controls.

**BR-6, L-30, L-51** apply as everywhere.


## Out of scope

- What this story explicitly does **not** cover:

- **Replies, and keeping internal notes away from a customer** — `PORTAL-3-WEB`,
  next block. This story shows the ticket's own fields, not its conversation.
- **Reopening, rating, and reading articles.** A later story owns each.
- **Any `api/` change.** If the API refuses something it should not, that is a
  finding to raise, not a change to make here.

