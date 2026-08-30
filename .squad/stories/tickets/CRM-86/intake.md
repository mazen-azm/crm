> **Fetched from jira:** [CRM-86](https://mazen-al-nabarawy.atlassian.net/browse/CRM-86)  
> *Fetched 2026-08-29T16:58:46.756Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** TICKETS-8-API system — a customer may act only on their own ticket, on every path  
**Type:** Story  
**Status:** To Do  
**Labels:** backend, pts-5, sprint-4, system, tickets

### Description

system — a customer may act only on their own ticket, on every path

Story folder: .squad/stories/tickets/TICKETS-8-API-ticket-ownership/

Rules this story owns:

	SC-2 — Every rule is enforced in the API; no client enforces anything.

Cannot ship before: TICKETS-1-API, PLATFORM-4-API

Points: 5 · Sprint: 4 · Layer: API

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/tickets/CRM-86/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `tickets`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-86` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `backend, pts-5, sprint-4, system, tickets`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
TICKETS-8-API system — a customer may act only on their own ticket, on every path
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
system — a customer may act only on their own ticket, on every path

Story folder: .squad/stories/tickets/TICKETS-8-API-ticket-ownership/

Rules this story owns:

	SC-2 — Every rule is enforced in the API; no client enforces anything.

Cannot ship before: TICKETS-1-API, PLATFORM-4-API

Points: 5 · Sprint: 4 · Layer: API
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/tickets.md, section TICKETS-8-API:

- Given a customer and a ticket that is not theirs, when they read it, then it is
  refused — and refused the same way a ticket that does not exist is, so the
  refusal does not confirm that somebody else's ticket exists.
- Given a customer and a ticket that is not theirs, when they act on it by any
  route that exists — status, assignment, reply, history — then each one refuses
  (SC-2). A route that enforces this on three paths out of four enforces nothing.
- Given a test, when a new route on a ticket is added, then it is enumerated by
  a check rather than remembered — the failure this rule guards against is a
  route added later that nobody thinks to protect.
- Given a staff member, when they act on any ticket, then they are not restricted
  by ownership: one organisation, one queue (SC-1).
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

- APIs, screens, services already discussed. Repos/roots: `api, web, android`. Primary language: `JavaScript`. **`api/` only.**

**The third criterion is the story.** Ownership enforced route by route is
ownership that lapses the first time somebody adds a route — so this needs the
same shape as the audit census: a test that enumerates every route the router
serves under `/tickets/:id`, compares it against a set the test itself drives,
and fails on one it has not seen. `audit.guarantee.test.js` is the working
example; read it before writing anything, including the comment about why
naming a route in the covered set without driving it satisfies the census with
a claim.

**404, not 403.** The first criterion says why: a refusal that distinguishes
"not yours" from "not there" tells a stranger that somebody else's ticket
exists. Same status, same code, same body.

**A customer subject may not exist yet — check before designing around it.**
`identitySubjectResolver` resolves a token to a subject; whether a customer can
hold one today depends on `I-1` (`customers.user_id` is null until first
sign-in) and on what `IDENTITY-*` shipped. If no customer can currently sign in,
say so plainly in the plan and build the guard anyway against a subject whose
role is customer — the rule is "no client enforces anything" (SC-2), and a guard
that waits for its first caller is a guard that arrives after the hole.

**Staff are not restricted.** SC-1 is one organisation, one queue: an agent
acts on any ticket. The guard keys on the subject's role, and the test pins both
halves — a guard that also blocks agents would break the queue this sprint's
predecessor just shipped.

**Where the check goes matters.** In the service, inside the transaction that
already reads the ticket — not in the route. A route-level guard is four copies
of one rule and is exactly what the census exists to catch.

## Out of scope

- What this story explicitly does **not** cover:

- **Any screen.** SC-2 is explicit: the API enforces, no client does.
- **The customer portal** — `PORTAL-*` stories own what a customer sees.
- **Replies** — `CONVERSATION-*` owns `messages`; if that route does not exist
  yet, the census covers the routes that do and gains the new one when it
  arrives, which is the point.
- **Roles beyond customer and staff.** The seed has `admin` and `agent`; both
  are staff for this rule.
