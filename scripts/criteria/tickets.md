# Tickets — acceptance criteria

The ticket, the queue, the state machine, categories, search.

Written 2026-08-29, before TICKETS-1-API was planned, because the feature had
no criteria file. That gap is L-7 and this is the third time it has been closed
ahead of a plan rather than by one.

Only the stories in reach are written. The `tickets` and `ticket_categories`
tables already exist — `api/src/platform/db/migrations/0002__tickets.sql`,
shipped by PLATFORM-2-API, along with the four queue indexes each filter uses.
The status and priority enumerations live in that file as comments and in rule
T-1; the schema stores them as TEXT and says plainly that the service enforces
them.

## TICKETS-1-API

An agent raises a ticket for a customer.

*Acceptance criteria*
- Given a ticket is raised, when it is stored, then it carries the customer, a
  subject, a body, a priority and a status of `new` (T-1).
- Given a priority that is not one of low, normal, high or urgent, then the
  answer is 422 naming the field, and nothing is written (T-1).
- Given a customer who does not exist or has been removed, then the answer is
  404 and nothing is written.
- Given a ticket is raised, when it succeeds, then an audit row is written in
  the same transaction (BR-2).
- Given a raised ticket, when it is read back, then it belongs to one queue —
  there is no organisation or team to choose (SC-1).
- Given a ticket is raised, when it is stored, then its service-level clocks
  start from that moment (S-1) — see `scripts/criteria/service-levels.md`.

## TICKETS-2-API

An agent filters and sorts the queue, and sees all of it.

*Acceptance criteria*
- Given the queue, when it is read, then it is paginated with the ceiling every
  list obeys, refused rather than clamped above it (BR-4).
- Given a filter by status, by assignee, by priority or by category, when it is
  applied, then only matching tickets are returned, and the filters combine.
- Given a sort, when it is asked for, then it is one the API names; an unknown
  sort is refused rather than silently ignored, because a queue in an order
  nobody asked for looks like data loss.
- Given an agent, when they read the queue, then they see every ticket in it —
  not only their own. "An agent sees all of it" is the story's title and the
  point: this is one shared queue (SC-1).
- Given a soft-deleted ticket, then it is never in the queue.

## TICKETS-3-API

An agent assigns a ticket.

*Acceptance criteria*
- Given an assignment, when it succeeds, then the ticket names the assignee and
  an audit row records who changed it, from what, to what (BR-2).
- Given an assignee who is not live staff, then the answer is 422 naming
  `assigneeId`, and nothing is written. 422 and not 404: the ticket — the
  resource being acted on — exists; it is a value in the request that is
  wrong, and the list of who may be assigned is IDENTITY-5-API's. (This file's
  first version hedged "422 or 404"; a criterion that offers a choice is a
  decision deferred to whoever implements it.)
- Given an assignment, when the caller did not send the revision it read, or
  sent a stale one, then the answer is 409 and nothing is written (BR-5).
- Given an unassignment, when it is asked for, then it is legal and audited the
  same way — a ticket may return to nobody.

## TICKETS-4-API

An illegal status change is refused, and the refusal names what is legal.

*Acceptance criteria*
- Given a status change that the machine does not allow, then the answer is
  **409** and its body names the statuses that **are** legal from where the
  ticket is (T-7). 409, not 422: the brief's error contract routes "illegal
  state transition, or a stale write" to 409, and `errors.js` already
  anticipates it ("409 CONFLICT and 409 REVISION_MISMATCH are both honest
  answers"). The request was well-formed; the ticket's state is what refuses
  it. The first version of this file said 422, written from intuition without
  the brief — corrected 2026-08-29 against `docs/product-brief.md` before
  TICKETS-4-API was planned. A refusal that does not say what would have
  worked makes the caller guess.
- Given `new` to `resolved`, then it is legal (T-3) — the obvious-looking path
  a state machine written from intuition tends to forbid.
- Given a status change, when it succeeds, then an audit row records the move
  (BR-2), and a stale revision is refused with 409 (BR-5).
- Given the set of statuses, when the code enumerates them, then it enumerates
  exactly T-1's: new, open, pending, resolved, closed, reopened.

## TICKETS-5-API

Resolving a ticket needs a resolution note.

*Acceptance criteria*
- Given a resolution without a note, then the answer is 422 naming the field,
  the ticket stays where it was, and nothing is written (T-4).
- Given a resolution with a note, when it succeeds, then the note is stored
  with the ticket and the audit row records the resolution.
- Given a note that is only whitespace, then it is not a note.

## TICKETS-6-API

The categories are readable, so a form has something to offer.

*Acceptance criteria*
- Given the categories, when they are read, then they are paginated with the
  ceiling every list obeys (BR-4).
- Given a retired category, then it is not in the list a form offers — but a
  ticket that already carries it still reads correctly.
- Given the list, when it is read, then it writes no audit row.

## TICKETS-1-WEB

Raising a ticket, on a screen.

*Acceptance criteria*
- Given the form, when a required field is missing, then the field the API named
  is the field the screen marks — the message is not invented on the client.
- Given a category, when the form offers one, then the list came from the API and
  a retired category is not among the choices.
- Given a submission in flight, when the screen renders, then the submit control
  cannot be pressed twice and the shared loading state is shown.
- Given a raised ticket, when the API answers, then the screen shows the ticket
  it created rather than a message saying it worked.
- Given every string on the screen, when it is read, then it came from a resource
  file, in both languages (BR-6).

## TICKETS-2-WEB

The queue, filtered and sorted, on a screen.

*Acceptance criteria*
- Given the filters, when one is applied, then the API is asked and the screen
  does not filter what it already holds.
- Given an empty result, when the screen renders, then the empty state says which
  filters produced it and offers to clear them (D-2).
- Given the queue, when it is paged, then the screen uses the API's paging and
  adds none of its own (BR-4).
- Given a filter and a page, when the screen is reloaded, then the same rows come
  back — the filter lives in the URL, not only in memory.
- Given every string on the screen, when it is read, then it came from a resource
  file, in both languages (BR-6).

## TICKETS-3-WEB

Assigning a ticket, on a screen.

*Acceptance criteria*
- Given the assignee list, when the screen offers it, then it came from the API's
  live staff and includes the option of nobody.
- Given a stale revision, when the API refuses with 409, then the screen says the
  ticket changed underneath and offers to reload, rather than reporting a failure
  the agent cannot act on.
- Given a successful assignment, when the API answers, then the screen holds the
  new revision — a second assignment from the same screen must not be refused.
- Given every string on the screen, when it is read, then it came from a resource
  file, in both languages (BR-6).

## TICKETS-5-WEB

Resolving a ticket, on a screen.

*Acceptance criteria*
- Given the resolve control, when it is pressed, then the screen asks for a note
  before it calls the API — the requirement is stated, not discovered by a 422.
- Given a note that is only whitespace, when resolve is pressed, then the screen
  refuses it the same way the API does, and says so on the field.
- Given a resolved ticket, when the screen renders it afterwards, then the note
  is readable on the ticket.
- Given a status the machine does not allow, when the screen offers the moves,
  then that status is not among them — the 409 is a backstop, not the interface.
- Given every string on the screen, when it is read, then it came from a resource
  file, in both languages (BR-6).
