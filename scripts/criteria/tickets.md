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
- Given an assignee who is not live staff, then the answer is 422 or 404 and
  nothing is written — the list of who may be assigned is IDENTITY-5-API's.
- Given an assignment, when the caller did not send the revision it read, or
  sent a stale one, then the answer is 409 and nothing is written (BR-5).
- Given an unassignment, when it is asked for, then it is legal and audited the
  same way — a ticket may return to nobody.

## TICKETS-4-API

An illegal status change is refused, and the refusal names what is legal.

*Acceptance criteria*
- Given a status change that the machine does not allow, then the answer is 422
  and its body names the statuses that **are** legal from where the ticket is
  (T-7). A refusal that does not say what would have worked makes the caller
  guess.
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
