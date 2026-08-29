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

**A discrepancy to settle before CUSTOMERS-6-API, not at plan time.**
`scripts/rules.txt` line 31 (I-1) says "users and customers are two tables;
`customers.user_id` is null until first sign-in". There is no `user_id` column
in the table. Either the rule names a column that needs a migration when
sign-in is granted to a customer, or the link belongs on `users` instead. It is
recorded here so that story starts from a decision rather than from a surprise.

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
