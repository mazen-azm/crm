> **Fetched from jira:** [CRM-79](https://mazen-al-nabarawy.atlassian.net/browse/CRM-79)  
> *Fetched 2026-08-29T15:14:27.133Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** TICKETS-4-API system — an illegal status change is refused with what is legal  
**Type:** Story  
**Status:** To Do  
**Labels:** backend, pts-5, sprint-3, system, tickets

### Description

system — an illegal status change is refused with what is legal

Story folder: .squad/stories/tickets/TICKETS-4-API-status-machine/

Rules this story owns:

	T-1 — Statuses: new open pending resolved closed reopened. Priorities: low normal high urgent.

	T-3 — new to resolved is legal.

	T-7 — An illegal status change is refused, and the refusal names what is legal.

Cannot ship before: TICKETS-1-API

Points: 5 · Sprint: 3 · Layer: API

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/tickets/CRM-79/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `tickets`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-79` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `backend, pts-5, sprint-3, system, tickets`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
TICKETS-4-API system — an illegal status change is refused with what is legal
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
system — an illegal status change is refused with what is legal

Story folder: .squad/stories/tickets/TICKETS-4-API-status-machine/

Rules this story owns:

	T-1 — Statuses: new open pending resolved closed reopened. Priorities: low normal high urgent.

	T-3 — new to resolved is legal.

	T-7 — An illegal status change is refused, and the refusal names what is legal.

Cannot ship before: TICKETS-1-API

Points: 5 · Sprint: 3 · Layer: API
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/tickets.md, section TICKETS-4-API:

- Given a status change that the machine does not allow, then the answer is 409
  and its body names the statuses that ARE legal from where the ticket is
  (T-7). A refusal that does not say what would have worked makes the caller
  guess.
- Given `new` to `resolved`, then it is legal (T-3) — the obvious-looking path
  a state machine written from intuition tends to forbid.
- Given a status change, when it succeeds, then an audit row records the move
  (BR-2), and a stale revision is refused with 409 (BR-5).
- Given the set of statuses, when the code enumerates them, then it enumerates
  exactly T-1's: new, open, pending, resolved, closed, reopened.
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
- **The package manager is npm**, and there is no workspace root. Commands run
  from the package directory: `cd api && npm test`, `cd web && npm run build`.
  Not pnpm, not yarn, no `--filter`, no `--prefix` — three plans in a row
  reached for pnpm, so every command in their verification steps was wrong.
- **The web suite does not typecheck.** `npm test` is vitest; `npm run build` is
  `tsc -b && vite build`. A change only vitest has seen is not verified.

- APIs, screens, services already discussed. Repos/roots: `api, web, android`. Primary language: `JavaScript`. **`api/` only.**

**T-7 cannot be satisfied by the error shape as it stands, and that is the
first thing to settle.** `errors.js:85–88` builds every failure as
`{ code, requestId }`, and adds exactly one more key — `fields` — and only for
a `ValidationError`. A 409 has nowhere to put "what would have worked".

Follow the precedent in that same file rather than inventing a second one: a
`ConflictError extends HttpError` carrying `allowed`, emitted by the error
middleware the way `fields` already is. E-1 says one shape for every failure,
and this keeps it — the base is unchanged and one documented key is added for
one documented case, which is exactly what `ValidationError` established.
`errors.js` belongs to `PLATFORM-5-API`; extending it here is sanctioned by
this intake, and the new key must be documented in `api/openapi.json` for every
route that can return it.

**The brief does not contain the transition table.** It pins five edges and
leaves the rest, so the table is a decision this story makes and records. What
is actually pinned:

| edge | pinned by |
|---|---|
| `new → open` | T-2, the first public reply |
| `new → resolved` | T-3, in as many words — "a request answered immediately must be closeable" |
| `resolved → reopened` | T-5, a reply within 14 days |
| `resolved → closed` | T-6, automatically after 14 days |
| `pending` exists | S-4, time waiting on the customer is not counted |

The first attempt drew this table, and it is worth reading as evidence rather
than copying (L-35) — `../support-crm/api/src/features/tickets/tickets.rules.js:12`:

```
new: [open, pending, resolved]   open: [pending, resolved]
pending: [open, resolved]        resolved: [closed, reopened]
closed: [reopened]               reopened: [open, pending, resolved]
```

**Its `closed → reopened` edge is the one to argue about.** T-5 gives reopening
a 14-day window and T-6 closes a resolved ticket after 14 days — so by the time
a ticket is closed, that window has passed, and an edge back out of `closed`
quietly makes the window unbounded. There is a case for it (an agent judging
that something was never actually fixed) and a case against (a rule with a
window that any status change can reset is not a window). **Decide, and write
the reason in the table** — an edge with no argument is the one that turns out
to be wrong.

**`from === to` is not a transition.** Assigning a status the ticket already
has should say so rather than bumping the revision and writing an audit row
recording that nothing happened.

**BR-5 applies — status change is one of the four writes it names.** Copy the
shape CRM-76 shipped: the revision in the `WHERE` clause, `revision =
revision + 1` in the `SET`, `changes === 0` as the refusal, and no re-read to
decide 404 versus 409 because the row was already read in the same transaction.
That story is the pattern; this one is the first copy of it.

**409 for the illegal transition, and 409 for the stale revision.** The brief's
error contract puts both under one code — "Illegal state transition, or a stale
write" — so they are told apart by their `code` field, not their status.

**Resolving does not require a note yet.** T-4 is `TICKETS-5-API` (CRM-80),
which the ordering report shows waiting on this story. Do not implement it
early: a resolution note arriving in this story would mean CRM-80 has nothing
to do and its criteria go unproven.

## Out of scope

- What this story explicitly does **not** cover:

- **Requiring a resolution note** — `TICKETS-5-API` (CRM-80), T-4. It comes
  next and it needs this story's machine to exist first.
- **The 14-day reopen window and the auto-close** — `TICKETS-11-API` and
  `TICKETS-14-API`, T-5 and T-6, both later sprints. This story decides which
  edges exist; it does not put a clock on any of them.
- **Stopping the response clock on the first public reply** — T-2 belongs to
  `CONVERSATION-1-API`. This story may allow `new → open`; it does not decide
  what causes it.
- **Any screen** — the web half of the state machine arrives with its own
  story.
- **Changing priority**, which BR-5 also names — a later story.
- **A migration.** `status` is already a TEXT column with the enum in a comment
  and the service as its enforcement, which `0002__tickets.sql:16` says
  outright.
- **Adding a CHECK constraint to `status`.** The schema deliberately has none.
