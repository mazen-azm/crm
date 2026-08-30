# Customers — acceptance criteria

The customer record, contacts, search, identity resolution.

Written 2026-08-28, before CUSTOMERS-1-API was planned, because the feature had
no criteria file. That gap is L-7 and this is the second time it has been
closed ahead of a plan rather than by one.

Only the stories in reach are written here. Criteria invented years ahead of
the code they describe are a wish, and the planner reads them as a contract.

The table exists — `api/src/platform/db/migrations/0001__customers.sql`,
shipped by PLATFORM-2-API: `id, name, email, phone, address, created_at,
updated_at, deleted_at`, with a partial unique index on `email` that lets two
rows share an address once one is soft-deleted.

**Settled 2026-08-29 against `docs/product-brief.md`** ("One person, two rows"):
rule I-1's `customers.user_id` is the brief's own words — the link lives on
`customers`, and it is null until that person first signs in. The column is not
in `0001__customers.sql` because no story has needed it yet; CUSTOMERS-6-API
(grant-sign-in) adds it with a migration. The earlier version of this note
treated the rule as possibly wrong; the brief confirms the rule and dates the
column.

## CUSTOMERS-1-API

An agent searches by name, address or number.

*Acceptance criteria*
- Given a search term, when it matches a name, an email address or a phone
  number, then the customer is returned — one search, not three parameters.
- Given the results, when they are read, then they are paginated with the
  ceiling every list obeys, and refused rather than clamped above it (BR-4).
- Given a soft-deleted customer, when a search would otherwise match them, then
  they are not returned.
- Given a term that matches nothing, when the search runs, then the answer is
  an empty page with a total of zero — not a 404. Nothing was missing; nothing
  matched.
- Given no search term at all, when the list is read, then it is the customers
  themselves, paginated, rather than an error.
- Given a search, when it runs, then it writes no audit row: a read is not a
  mutation.

## CUSTOMERS-1-WEB

The same search on a screen.

*Acceptance criteria*
- Given the screen, when a search returns nothing, then the empty state says so
  and offers the next action, rather than showing a blank region (D-2).
- Given a search in flight, when the screen renders, then it shows the shared
  loading state and does not jump when the results arrive.
- Given a failed search, when the screen renders, then it shows the documented
  code's meaning and offers retry.
- Given every string on the screen, when it is read, then it came from a
  resource file, in both languages (BR-6).
- Given the results, when they are paged, then the screen uses the API's paging
  and adds none of its own.

## CUSTOMERS-3-API

An agent writes an internal note about a customer.

*Acceptance criteria*
- Given a note, when it is written, then it is attached to the customer and
  carries who wrote it and when.
- Given a note, when it is written, then an audit row is written in the same
  transaction (BR-2).
- Given a note on a customer who does not exist, or on a soft-deleted one, then
  the answer is 404 and nothing is written.
- Given an empty or whitespace-only note, then the answer is 422 naming the
  field, and nothing is written.
- Given the notes on a customer, when they are read, then they are in the order
  they were written — by `rowid`, because two notes can share a timestamp
  (L-19).
- Given a note, when it is read, then it is internal: nothing in the customer
  portal's own responses ever carries it.

## CUSTOMERS-2-API

Everything about one customer, in one answer.

*Acceptance criteria*
- Given a customer id, when the screen's data is read, then contacts, open
  tickets and the notes come back together — a screen that assembles this from
  four requests shows four different moments as if they were one.
- Given a customer with many tickets, when they are read, then the tickets are
  paginated with the ceiling every list obeys (BR-4); the customer's own fields
  are not.
- Given a customer id that is not on file, then the answer is 404 rather than an
  empty shape that looks like a customer with nothing.
- Given a retired customer, when they are read, then they still read back — a
  removed customer is not a missing one, and their tickets did not stop existing.
- Given the read, then it writes no audit row.

## CUSTOMERS-2-WEB

The same, on a screen.

*Acceptance criteria*
- Given the screen, when it loads, then the customer, their open tickets and
  their notes are one request, not four.
- Given a customer with no tickets, when the screen renders, then the empty
  state says so and offers to raise one (D-2).
- Given a ticket in the list, when it is read, then its status and priority are
  words from the resource files, not the API's raw values (BR-6).
- Given a failed load, when the screen renders, then it shows the documented
  code's meaning and offers retry.

## CUSTOMERS-4-API

Adding a customer while the phone is still ringing.

*Acceptance criteria*
- Given a new customer, when they are added, then a `customers` row is written
  and no `users` row is — the two are separate tables and `user_id` stays null
  until a first sign-in (I-1).
- Given an email address already on file, when a customer is added with it, then
  the request is refused naming the field rather than creating a second customer
  for one person (I-4).
- Given a customer added with no email address, then it is accepted — somebody
  who telephones may not have one, and the desk still needs them on file.
- Given a successful add, then an audit row records it (BR-2), and the answer is
  the customer that was created.

## CUSTOMERS-4-WEB

The same, on a screen.

*Acceptance criteria*
- Given the form, when a field the API named is refused, then that field is
  marked and the message is the shared one for the code.
- Given a submission in flight, then the control cannot be pressed twice — this
  request creates a row, so a second press is a second customer.
- Given a created customer, then the screen shows the customer it created,
  rather than a message saying it worked.
- Given every string on the screen, then it came from a resource file, in both
  languages (BR-6).

## CUSTOMERS-3-WEB

An internal note about a customer, on a screen.

*Acceptance criteria*
- Given a note, when it is written, then it appears in the customer's notes
  without the screen reloading everything it already had.
- Given a blank or whitespace-only note, when it is submitted, then the screen
  refuses it the way the API does and says so on the field.
- Given the notes, when they are read, then the author and the time are shown,
  because a note nobody can attribute is a note nobody trusts (BR-2, BR-3).
- Given every string on the screen, then it came from a resource file, in both
  languages (BR-6).

## CUSTOMERS-5-API

An arriving request matches a customer by address, or creates one.

Written 2026-08-30. This is I-2 and I-4 made mechanical: *"Identity resolution
creates a customer the moment a request arrives from a new address"* and
*"Email addresses identify customers."*

*Acceptance criteria*
- Given an address already on a live customer, when a request arrives from it,
  then that customer is matched and no second row is written (I-4).
- Given an address that differs only in case, then it matches the same
  customer — the column is `COLLATE NOCASE` and two spellings of one address
  are one person.
- Given an address nobody has, when a request arrives from it, then a customer
  is created for it, then and there (I-2), and an audit row records the
  creation with the system as its actor — nobody was signed in, and "the seed"
  or a borrowed staff id would be an answer nobody can follow up (BR-2).
- Given a name arriving with the request, when the address already belongs to
  somebody, then the stored name is left alone. A stranger typing into a
  public form must not be able to rename a customer on file.
- Given an address belonging only to a soft-deleted customer, then a new
  customer is created rather than the removed one being revived. The partial
  unique index permits exactly this, and BR-1 says a removed row is kept for
  the trail, not for writing to.
- Given a request with no address at all, then it is refused naming the field:
  addresses identify customers, and a request that cannot be attributed cannot
  be resolved (I-4).
- Given resolution, then it never writes a `users` row — a customer who has
  been resolved has not signed in, and `user_id` stays null (I-1).

*Out of scope*
- Matching by phone number. Rule I-4 names the address, and a second key is a
  second answer to who somebody is.
- The route that calls this — CHANNELS-1-API.

## CUSTOMERS-6-API

An agent gives a customer a sign-in.

*Acceptance criteria*
- Given a customer with an email address, when an agent grants them a sign-in,
  then a `users` row is created with the role `customer`, and
  `customers.user_id` points at it (I-1). The column arrives with this story;
  the migration is part of it.
- Given the grant, then the answer carries an initial password once, the way
  creating a staff account does, and nothing can read it back afterwards.
- Given a customer with no email address, then the grant is refused naming the
  field — the address is what they would sign in with (I-4).
- Given a customer who already has a sign-in, then a second grant is refused
  rather than creating a second account for one person.
- Given a soft-deleted customer, then the grant is refused (BR-1).
- Given the new user, then their role is `customer` and no permission an agent
  has comes with it — the queue, the staff list and other customers all refuse
  them.
- Given the link now existing, then TICKETS-8-API's ownership guard stops
  failing closed and becomes the comparison its own comment promises: a
  customer reaches their own ticket and gets the same 404 as a stranger for
  anybody else's. Both halves are pinned. A guard left refusing every customer
  would make the portal a set of screens that answer 404 to their own users.
- Given the grant, then an audit row records it, carrying no password (BR-2).

*Out of scope*
- The screen — CUSTOMERS-6-WEB.
- A customer choosing their own password afterwards — that is IDENTITY-7-API,
  and it already works for any role.

## CUSTOMERS-6-WEB

The same, on a screen.

*Acceptance criteria*
- Given a customer with no sign-in, when an agent grants one from the customer
  screen, then the initial password is shown once, plainly, because the agent
  has to read it to them.
- Given a customer who already has one, then the control says so rather than
  offering an action that will be refused.
- Given a refusal naming a field, then that field is marked and the sentence
  is the shared one for the code.
- Given a submission in flight, then the control cannot be pressed twice —
  this creates an account.
- Given every string, then it came from a resource file, in both languages
  (BR-6).
