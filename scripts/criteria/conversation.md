# Conversation — acceptance criteria

Replies, internal notes, and the thread they make. What a ticket says, as
opposed to what state it is in.

Written 2026-08-30, before CONVERSATION-1-API was planned, because the feature
had no criteria file. That gap is L-7, and this is the fourth time it has been
closed ahead of a plan rather than by one.

Only the four stories in this sprint are written here.

**Two kinds of message, one table.** A public reply and an internal note are
the same shape — a ticket, an author, a body, a time — and differ in exactly
one column and in who may read it. Two tables would be two places to add a
column and two queries to keep in the same order, and the ordering of a thread
that mixed them would then be assembled in application code from two lists.

**The distinction is the feature's whole risk.** `SC-2` says every rule is
enforced in the API, and CONVERSATION-2-API's title says "in any response" —
so the check belongs where responses are made, and the test that holds it reads
the routes off the router rather than a list, the way the audit and ownership
censuses do. A note kept out of three responses and forgotten in a fourth has
leaked.

**The customer-notes table is not this.** `customer_notes` (CUSTOMERS-3-API) is
about a person and belongs to the customers feature; these are about a ticket.
The two look alike and answer different questions, which is why one is not
being widened into the other.

## CONVERSATION-1-API

An agent replies, and the first public reply opens the ticket and stops the
response clock — once.

*Acceptance criteria*
- Given an agent and a ticket, when they post a public reply, then a message is
  stored with the author, the body, the time and its kind, and an audit row
  records it (BR-2).
- Given a ticket whose status is `new`, when the first **public** reply is
  posted, then the ticket moves to `open` (T-2) and the `first_response` clock
  stops at the reply's own timestamp — not at whenever the stopping code ran.
- Given a second public reply, then neither happens again: the status is not
  moved and the clock is not re-stopped. "Once" is a property of the clock
  already being stopped, not of counting replies.
- Given an **internal note**, then it stops no clock and moves no status, at
  any point. A note is the desk talking to itself, and the promise T-2 makes is
  about answering the customer.
- Given a ticket that is not `new` — one already `open`, or `pending` — when a
  public reply is posted, then the status is left alone. T-2 names one
  transition and this route does not invent others.
- Given a reply, then it is refused with an empty or whitespace-only body, the
  way a customer note is, and the field is named.
- Given a ticket nobody has, then the answer is 404 — the same one every other
  route under a ticket gives.

*Out of scope*
- A customer replying — CONVERSATION-3-API.
- Keeping notes away from a customer — CONVERSATION-2-API. Until it ships, no
  route returns messages to a customer at all, which is a narrower gap than a
  leak and is stated rather than assumed.
- Paging the thread — CONVERSATION-4-API.
- Sending the reply anywhere. Nothing in this product sends email.

## CONVERSATION-1-WEB

The same, on a screen.

*Acceptance criteria*
- Given a ticket, when an agent posts a reply, then it appears in the thread
  without reloading everything already on the screen — the POST answers with
  the message it made.
- Given a blank or whitespace-only body, then it is refused before the request.
  The API refuses it too, so the round trip would return the answer the screen
  already had.
- Given the first public reply on a `new` ticket, then the status the screen
  shows follows it. A row still saying `new` after the reply that opened it is
  the screen disagreeing with the ticket.
- Given a failed post, then the draft survives. Losing what somebody typed
  because the server failed is a second failure on top of the first.
- Given every string, then it came from a resource file, in both languages
  (BR-6).

## CONVERSATION-2-API

An internal note never reaches a customer, in any response.

*Acceptance criteria*
- Given a customer, when they read their own ticket's messages, then public
  replies are returned and internal notes are not — not redacted, not marked as
  hidden, absent.
- Given a customer, when they ask for a note by any route that takes a message
  id, then the answer is the same 404 a message that does not exist gets. A
  refusal that told the two apart would confirm the note exists.
- Given every route this API serves that can return a message, then the rule
  holds on all of them, and the set is **read off the router** rather than
  listed. A new route either keeps notes from a customer or fails the test.
- Given staff, then they see both kinds, and each says which it is. Both halves
  are pinned: a filter that also hid notes from agents would make the feature
  useless to the desk.
- Given a count or a total alongside the messages, then it counts what the
  reader may see. A total that included notes would tell a customer how many
  there are, which is the leak wearing a number.

*Out of scope*
- The screens — CONVERSATION-2-WEB and PORTAL-3-WEB. A screen that does not
  draw a note is not the enforcement (SC-2).

## CONVERSATION-3-API

A customer replies on their own ticket, and replying to a resolved one reopens
it.

*Acceptance criteria*
- Given a customer and their own ticket, when they post a reply, then it is
  stored as a public message authored by them.
- Given somebody else's ticket, then the answer is the same 404 a missing
  ticket gets — the ownership rule, on one more path, and the census that reads
  the routes off the router is what says so.
- Given a **resolved** ticket and a reply inside the fourteen-day window, then
  the ticket moves to `reopened` (T-5) and the move is audited like any other
  status change.
- Given a resolved ticket whose window has passed, then the reply is refused
  and the ticket is not reopened. The window is measured from when the ticket
  was resolved, not from when it was last touched.
- Given a `closed` ticket, then a reply is refused: closed is terminal, which
  is the argument TICKETS-4-API already made and this does not reopen.
- Given a customer's reply, then it stops no first-response clock. The promise
  is about the desk answering, and a customer answering themselves is not that.
- Given a customer, then they cannot post an internal note by any request they
  can make — the kind is not theirs to choose.

*Out of scope*
- Reopening by any means other than a reply — TICKETS-11-API owns the rule and
  this uses it.

## CONVERSATION-4-API

A long thread pages rather than arriving whole.

*Acceptance criteria*
- Given a thread, when it is read, then it is paginated with the ceiling every
  list obeys, and the answer says what it gave and from where (BR-4).
- Given the order, then it is oldest first and stable: two messages written in
  the same second do not swap between two reads. The audit trail had this
  problem and solved it the same way.
- Given a page, then its total is the number of messages the reader may see —
  the same rule CONVERSATION-2-API states, applied to the count.
- Given a page window the rules refuse, then it is refused rather than clamped,
  and the field is named.

## CONVERSATION-2-WEB

The desk sees both kinds, and can tell them apart before typing.

*Acceptance criteria*
- Given the thread, then a public reply and an internal note are visibly
  different, and the difference is not only a word somebody has to read.
- Given the box an agent types into, then which kind they are writing is clear
  **before** they type — somebody about to write something they would not say
  to a customer needs to know which box they are in first.
- Given the screen, then it filters nothing: it shows what the API sent, and
  the API is what keeps notes from customers (SC-2). A test asserting this
  screen hides notes would be testing the wrong layer.
- Given every string, then it came from a resource file, in both languages
  (BR-6).

## CONVERSATION-3-WEB

A customer replies on their own ticket.

*Acceptance criteria*
- Given a resolved ticket inside the window, then the screen says that replying
  will reopen it, before it is replied to. A status change nobody expected
  reads as a fault.
- Given a reply, then it appears in the thread and the ticket's status follows
  if it changed.
- Given a refusal, then the sentence is the shared one for the code, unless the
  shared one is untrue here — read it before reusing it.
- Given every string, then it came from a resource file, in both languages
  (BR-6).

## CONVERSATION-4-WEB

A long thread pages on the screen too.

*Acceptance criteria*
- Given a thread longer than a page, then the screen pages it with the API's
  window and adds none of its own (BR-4).
- Given the page a reader lands on, then it is a decision with a reason
  attached, not whichever one the API returns first — in a thread ordered
  oldest first, the newest message is usually the one somebody came for.
- Given every string, then it came from a resource file, in both languages
  (BR-6).
