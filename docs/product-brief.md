# Support Desk — the product, in one file

The business context every plan is written against. `scripts/rules.txt` derives
its rule ids from this file, and `verify-backlog.mjs` checks that every rule
here has an owning story.

Ported 2026-08-29 from the first attempt (`../support-crm/docs/product-brief.md`),
where it was written as the requirements source. The product rules are carried
word-for-word; only the structural references changed — one repository with
three roots instead of three repositories, and the OpenAPI document's real
path. It was not committed here at the start, and that absence had a price:
the seed shipped SLA targets that disagreed with rule S-2 on every priority,
because the planner could not read the promise it was implementing (the same
failure class as L-5, where an unnamed engine produced a Postgres plan).

## What the product is

A customer raises a request, an agent works it to resolution, and the organisation
can see how well that is going.

| Role | Sees | Can do |
|---|---|---|
| **customer** | their own tickets, published articles | raise a ticket, reply, reopen, rate a resolved ticket |
| **agent** | the whole queue, customers, internal notes | reply, note, assign, change status, resolve |
| **admin** | everything | manage users and roles, read the audit log, read reports |

Scope is **one organisation**. No departments, no branches, no routing between
them.

## The three applications

| | Root | Responsibility |
|---|---|---|
| **API** | `api/` — Node + Express + SQLite | Data, business rules, permissions, SLA computation |
| **WEB** | `web/` — React + Vite + TypeScript | The agent's desk, and the screens only the web has |
| **MOB** | `android/` — Kotlin + Compose | The agent away from the desk. Nothing administrative |

**Every rule is enforced in the API.** Neither client enforces anything, because a
rule that lives in a client can be bypassed by calling the API directly. The API
is the contract between the three roots; `api/openapi.json` is the written form
of it, and the contract test compares it to the router on every push.

## One person, two rows

A customer both signs in and is somebody support keeps records about. Different
concerns, different tables:

- `users` — credentials, role, enabled or not. What authentication needs.
- `customers` — name, contact details, notes, history. What support needs.
- `customers.user_id` links them, and is null until that person first signs in.

Identity resolution creates a customer the moment a request arrives from a new
address, long before that person has ever signed in. Forcing a `users` row then
would mean inventing credentials for somebody who has not asked for any.

## Global rules

These hold everywhere; no individual specification repeats them.

- **BR-1 — Nothing is hard-deleted.** Deletion sets `deleted_at`. The audit row survives.
- **BR-2 — Every mutation is audited.** Actor, entity, action, before, after, timestamp.
- **BR-3 — Time is UTC.** Stored as UTC ISO strings; formatted for the reader's locale on display.
- **BR-4 — No unbounded list.** Every list endpoint is paginated, filterable, sortable, with a maximum page size.
- **BR-5 — No silent overwrite.** A write carries the **revision** it read; a mismatch returns `409`. It applies to the four writes where two people realistically collide: **status change, assignment, priority change, and article edit.** Naming them is the point — a rule that applies to "writes" in general is a rule nobody can implement or test.

  *A counter, not the row's timestamp. The first implementation used `updated_at`,
  and two writes inside one millisecond share one, so a stale write whose version
  happened to equal the current one was accepted. It looked like a flaky test for
  a day, because that is what a race looks like from the outside.*
- **BR-6 — Two languages, always.** Every user-facing string exists in Arabic and English, in resource files, never hardcoded in a screen.

## The ticket

Statuses: `new` `open` `pending` `resolved` `closed` `reopened`. Priorities:
`low` `normal` `high` `urgent`.

- The first public reply by an agent moves `new` to `open` and stops the response
  clock, once.
- `new → resolved` is legal: a request answered immediately must be closeable.
- Resolving requires a resolution note.
- A reply to a resolved ticket reopens it, within a 14-day window.
- A resolved ticket auto-closes after 14 days.

## Service levels

Two clocks, both measured from creation: **response** (created → first public
reply) and **resolution** (created → resolved).

| Priority | Response | Resolution |
|---|---|---|
| urgent | 1h | 4h |
| high | 4h | 24h |
| normal | 8h | 72h |
| low | 24h | 168h |

Clocks run 24/7 — there is no working-hours calendar, and that is a decision, not
an oversight. Time spent `pending` (waiting on the customer) is not counted
against the resolution clock. A breach is a **stored row**, not a value
recomputed on read, so the queue and a report cannot disagree about the same
ticket. A resolution breach on an unresolved ticket raises its priority one level
and notifies an admin, exactly once — enforced by a database constraint, not by a
job remembering.

## Error contract

One shape, every failure, no stack trace.

| Code | Meaning |
|---|---|
| `400` | Malformed request |
| `401` | Not authenticated |
| `403` | Authenticated, not allowed |
| `404` | Not found |
| `409` | Illegal state transition, or a stale write |
| `422` | Failed validation |
| `429` | Rate limited |
| `500` | Unhandled — logged with a request id, never detailed to the caller |
| `501` | Named, and deliberately not built. A channel this system knows about and has decided against — not a `404`, which would say "no such thing" |

## Assumptions

Recorded because they were decided, not discovered. Each could reasonably have
gone the other way.

1. SLA clocks run 24/7.
2. One organisation, one queue.
3. Staff accounts are created by an admin. No self-registration; the first admin comes from the seed.
4. Email addresses identify customers. Two tickets from one address belong to one customer.
5. The demo database is generated. Schema plus seed produces a working system; no database file is committed.

## Built, and deliberately not built

| Area | Built | Specified only |
|---|---|---|
| Customers | profiles, contacts, derived history, internal notes | attachments |
| Tickets | create, queue, assign, status machine, history | merge, duplicate detection |
| Channels | the `Channel` interface and the web-form implementation | email, WhatsApp, SMS |
| Agent desk | queue, customer context, internal notes | quick replies, reminders |
| Service levels | targets, breach, one escalation rule, notifications | auto-assignment, working-hours calendar |
| Knowledge base | articles, publish, full-text search | article approval workflow |
| AI | ticket summary, suggested reply | chatbot, auto-categorisation |
| Customer portal | raising without an account, following your own tickets, replying, reopening, rating, reading articles | the portal as a separate application |
| Reports | status counts, SLA compliance, agent load, satisfaction | custom report builder |
| Security | users, roles, permissions, audit log, passwords set and changed | SSO, password reset by email |
| Integrations | the OpenAPI document as the integration surface | ERP, webhooks |
| Platform | Arabic and English, web and mobile | multi-department, multi-branch, custom branding |

A decision that is written down is a decision. A decision that is not written down
is an omission.

## Refinements this repository added

Three rules in `scripts/rules.txt` have no sentence here because they were
decided in this attempt, on top of the brief rather than against it:

- **T-7** — an illegal status change is refused **and the refusal names what is
  legal**. The brief's error contract already routes the refusal to `409`; the
  naming is the refinement.
- **D-1, D-2** — no colour literal outside the tokens file, and designed
  empty/loading/error states. Design promoted from vibes to rules.
