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

## TICKETS-7-API

The whole history of one ticket, in order.

*Acceptance criteria*
- Given a ticket, when its history is read, then every audited change to it is
  returned oldest first, and the order does not depend on two rows having
  different timestamps.
- Given a history entry, when it is read, then it says who, what changed, and
  from what to what — an entry that records only the new value cannot answer
  "who took it off me".
- Given a ticket with a long history, when it is read, then it is paginated with
  the ceiling every list obeys (BR-4).
- Given a ticket that is not on file, then the answer is 404 rather than an empty
  history.
- Given the read, then it writes no audit row.

## TICKETS-7-WEB

The same, on a screen.

*Acceptance criteria*
- Given the history, when it renders, then each entry reads as a sentence a
  person can follow, built from resource strings rather than the raw verb (BR-6).
- Given a timestamp, when it is shown, then it is in the reader's locale, not the
  stored UTC string (BR-3).
- Given a ticket with no history yet, then the empty state says so (D-2).
- Given the history, when it is paged, then the screen uses the API's paging and
  adds none of its own (BR-4).

## TICKETS-8-API

A customer may act only on their own ticket, on every path.

*Acceptance criteria*
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

## TICKETS-9-API

An admin adds, renames and retires a category without touching the seed.

Written 2026-08-30. The seed fills the reference data (SC-3) and that is where
categories come from today; this is the story that lets them change afterwards
without a migration or a re-seed.

*Acceptance criteria*
- Given an admin, when they add a category, then it exists and the ticket form
  offers it. A non-admin is refused 403 and the service never runs (SC-2).
- Given a name a live category already has, then the add is refused naming the
  field rather than creating a second category people cannot tell apart.
  Case-insensitively: two categories differing only in case are one category
  typed twice.
- Given a rename, then every ticket already carrying that category shows the
  new name — because a ticket references the category rather than copying its
  name, and that is what makes a rename possible at all.
- Given a retire, then the category is soft-deleted (BR-1): it leaves the list
  the ticket form offers, and the tickets that already have it keep it and
  still read back. A category that vanished from its tickets would rewrite
  history to tidy a list.
- Given a retired category, then a new ticket cannot be raised into it — which
  TICKETS-1-API already enforces by checking the category is live, and this
  story does not weaken.
- Given a retired category's name, then it may be used again for a new one: the
  uniqueness rule is about live categories, the same way a customer's address
  is.
- Given any of these, then an audit row records it with before and after
  (BR-2).

*Out of scope*
- The screen — TICKETS-9-WEB.
- Merging two categories, or moving tickets between them. Nothing asks for it,
  and it is a different verb from renaming.

## TICKETS-9-WEB

The same, on a screen.

*Acceptance criteria*
- Given an admin, when they add, rename or retire a category, then the list on
  the screen shows the result without a reload.
- Given a name already taken, then the field is marked and the sentence is the
  shared one for the code.
- Given a retire, then it asks first. It is the one action here that changes
  what other people see and cannot be undone from this screen.
- Given a non-admin, then the screen says so rather than drawing controls that
  will be refused — and that is courtesy, not enforcement (SC-2).
- Given every string, then it came from a resource file, in both languages
  (BR-6).

## TICKETS-10-API

An agent changes a ticket's category.

*Acceptance criteria*
- Given a ticket and a live category, when an agent changes it, then the ticket
  carries the new one and an audit row records both sides (BR-2).
- Given a revision that is not the ticket's, then the change is refused 409
  (BR-5) — the same guard assignment and status changes already carry, for the
  same reason.
- Given a retired category, then the change is refused: what may not be chosen
  for a new ticket may not be chosen for an old one.
- Given `null`, then it is accepted and means no category — the column allows
  it and a ticket may legitimately have none.
- Given a category id that does not exist, then the answer names the field
  rather than letting the foreign key fire, which would be a 500 telling the
  caller their mistake was ours.

*Out of scope*
- The screen — TICKETS-10-WEB.
- Changing several tickets at once.

## TICKETS-10-WEB

The same, on a screen.

*Acceptance criteria*
- Given the ticket in the queue, when its category is changed, then the row
  shows the new one without reloading the queue.
- Given a stale revision, then the screen says the ticket changed while it was
  being read, and offers to reload — the same shape assignment and status
  already use.
- Given the picker, then it offers live categories and "no category", and
  nothing else.
- Given every string, then it came from a resource file, in both languages
  (BR-6).

## TICKETS-11-API

A customer reopens a resolved ticket inside the window.

*Acceptance criteria*
- Given a resolved ticket and a reopen inside fourteen days of its resolution,
  then it moves to `reopened` and the move is audited (BR-2).
- Given the same ticket after the window has passed, then the reopen is refused
  and the ticket stays resolved. The window runs from when it was resolved, not
  from when it was last touched by anything.
- Given a `closed` ticket, then the reopen is refused. Closed is terminal —
  TICKETS-4-API's argument, unchanged.
- Given a ticket that is not resolved at all, then the reopen is refused as an
  illegal transition, naming what would have been legal (T-7).
- Given a customer, then they may reopen their own ticket and no other, and the
  refusal is the same 404 a missing ticket gets.
- Given the reopen, then the resolution note the ticket carries is left alone.
  It records what was done when it was resolved, and that remains true.

*Out of scope*
- Reopening by replying — CONVERSATION-3-API calls this.
- The fourteen-day auto-close — TICKETS-14-API, a later block.

## TICKETS-11-WEB

The same, on a screen.

*Acceptance criteria*
- Given a resolved ticket of theirs inside the window, then a customer is
  offered the reopen; outside it, they are not offered an action that will be
  refused.
- Given a refusal, then the sentence is the shared one for the code.
- Given every string, then it came from a resource file, in both languages
  (BR-6).

## TICKETS-12-WEB

An agent's own tickets are one click away.

*Acceptance criteria*
- Given a signed-in agent, then the queue can be narrowed to the tickets
  assigned to them in one action, without typing their own id.
- Given that view, then it is the queue with a filter and not a second screen:
  the same rows, the same paging, the same words.
- Given the filter, then it is in the address — a view somebody can send to a
  colleague, and one the browser's back button returns to. The queue already
  keeps its filters there.
- Given every string, then it came from a resource file, in both languages
  (BR-6).

## TICKETS-13-API

A write is refused if somebody edited the ticket while it was being read, on
every path that writes.

Written 2026-08-31, with the sprint 7 stories.

*Acceptance criteria*
- Given a ticket read at one revision, when a write carries that revision and
  the ticket has since changed, then it is refused 409 REVISION_MISMATCH and
  nothing is written (BR-5). The status move, the assignment and the category
  change already do this; this story is about the word *every*.
- Given every route that writes to a ticket, read off the router rather than
  listed, then each either carries a revision or is named as not needing one,
  with the reason. A rule enforced on three paths out of four protects nothing
  — the same argument the ownership, audit, staff-only and note-leak censuses
  already make, and the fourth census of that shape.
- Given a write with no revision, then it is refused naming the field, not
  accepted as "no opinion". A caller that forgot the revision is a caller whose
  read was stale and does not know it.
- Given a write carrying a revision that is not a number, or one from the
  future, then it is refused the same way. A revision nobody issued cannot
  match, and pretending it might is worse than saying so.
- Given a successful write, then the answer carries the ticket at its new
  revision, so the next write from the same screen is not refused by the
  first.
- Given a refusal, then the audit trail has no row for it. A refused write did
  not happen.

*Out of scope*
- Applying BR-5 outside tickets. The rule names the writes it covers, and a
  customer's contact details are not among them (CUSTOMERS-7-API says so).
- Telling the caller what changed, or who changed it. The refusal says the
  ticket moved; the history says the rest, and it is one request away.

## TICKETS-13-WEB

The same, on a screen.

Written 2026-08-31, with the sprint 7 stories.

*Acceptance criteria*
- Given any control on the queue row that writes, when the write is refused as
  stale, then the screen says the ticket changed while it was being read and
  offers to look again — in the same words, whichever control it was. Three
  controls with three sentences for one cause teach somebody that it is three
  causes.
- Given that refusal, then it is not reported as a failure. Nothing went wrong:
  somebody else got there first, and the useful next action is to look.
- Given a successful write, then the row carries the new revision, so an
  agent's second change is not refused by their own first. This is already true
  of each control; the story is that it stays true when a new one is added.
- Given every string, then it came from a resource file, in both languages
  (BR-6).

## TICKETS-14-API

A resolved ticket closes itself once the window passes.

Written 2026-08-31, with the sprint 7 stories.

*Acceptance criteria*
- Given a ticket resolved more than fourteen days ago, then it is closed (T-6)
  — the same fourteen days after which a customer can no longer reopen it by
  replying (T-5), read from the same rule rather than from a second constant.
- Given a ticket resolved inside the window, then it is left alone, and a
  customer replying still reopens it. The two rules meet exactly: there is no
  day on which a ticket is too old to reopen and not yet closed, and none on
  which it is closed and still reopenable.
- Given the close, then it is audited with no human actor (BR-2) — the trail
  already renders a null actor as the system, and a close attributed to
  whichever admin happened to call the route would be a false record.
- Given the close, then it obeys the state machine: only a resolved ticket
  closes this way, and a ticket already closed is not closed twice.
- Given this application has no scheduler, then how the sweep is triggered is
  stated in the plan and not invented in a comment. The honest options are a
  route an operator or a cron can call, and evaluating on read; the second
  makes every read a write and is refused for that reason. Whichever is built,
  a ticket that is never read must still close.
- Given a sweep that closes nothing, then it is not an error and writes no
  rows. Most sweeps will close nothing.

*Out of scope*
- Reopening a ticket the sweep closed. Closed is terminal — TICKETS-4-API's
  argument, which this does not weaken. After fourteen days there was nothing
  to reopen anyway.
- Telling anybody it happened. Nothing in the backlog asks, and a notification
  per auto-close would be one per resolved ticket a fortnight later.
