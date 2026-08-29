# Identity — acceptance criteria

Sign-in, users, roles, throttling, passwords, sessions. Every rule is enforced
in the API and no client enforces anything (SC-2); staff accounts are created
by an admin and the first admin comes from the seed (I-3).

Written 2026-08-28, when IDENTITY-1-API was planned and the feature had no
criteria file — the gap L-7 exists for.

## IDENTITY-1-API

An agent signs in and is given something the rest of the API accepts.

*Acceptance criteria*
- Given the seeded admin's email and password, when they are posted to the
  sign-in route, then the answer carries a token and the account's role and
  name, and never the password hash.
- Given a wrong password, when it is posted, then the answer is 401
  UNAUTHENTICATED — the same answer as an email nobody has, so the response
  cannot be used to learn which addresses exist.
- Given a disabled or soft-deleted account, when it signs in with the right
  password, then the answer is still 401.
- Given a token the API issued, when it is sent on a guarded route, then the
  subject is resolved from it and the route runs.
- Given a token that was tampered with, has expired, or was signed by anything
  else, when it is sent, then the answer is 401 and no subject is resolved.
- Given the stored password, when the row is read, then it is a hash with its
  own salt, and the same password stored twice produces two different hashes.

*Out of scope*
- Creating, disabling or re-enabling accounts — IDENTITY-2-API.
- Throttling repeated failures — IDENTITY-4-API.
- Changing or resetting a password — IDENTITY-6-API and IDENTITY-7-API.
- Ending other sessions — IDENTITY-8-API.

## IDENTITY-1-WEB

The sign-in screen stops being a stub.

*Acceptance criteria*
- Given the sign-in screen, when the form is submitted with an email and a
  password, then the API is called and the token it returns is what the
  session stores — no stub token remains anywhere.
- Given a refusal, when it arrives, then the screen shows the API's code
  rather than a generic failure, and the password field is cleared.
- Given a request in flight, when the screen renders, then the submit button
  is disabled and the loading state comes from the shared hook.
- Given a signed-in session, when the page is reloaded, then it survives.

## IDENTITY-2-API

An admin creates, disables and re-enables accounts, and sets roles.

*Acceptance criteria*
- Given an admin, when they create an account, then it exists with the role
  they chose and a password only the new person can use.
- Given a non-admin, when they attempt any of it, then the answer is 403 and
  the service never runs.
- Given a disabled account, when the same address is re-enabled, then it is
  the same row — nothing is hard-deleted (BR-2).
- Given an address that already belongs to a live account, when it is used
  again, then the answer is 409.

## IDENTITY-3-WEB

An expired token returns me to sign-in, not a broken screen.

*Acceptance criteria*
- Given a token the API no longer accepts, when any request uses it, then the
  session is cleared and the reader is at sign-in — not on a screen that
  renders an error it cannot recover from.
- Given the sign-in request itself, when it answers 401 because the password
  was wrong, then that is not treated as an expired session: the message stays
  on the screen and nothing is cleared.
- Given a session ending mid-task, when the reader arrives at sign-in, then
  they are told the session ended rather than being dropped there with no
  explanation.
- Given several requests failing at once with the same expired token, when they
  land, then the reader is sent to sign-in once.

## IDENTITY-4-API

Failed sign-ins are throttled, per account and per address.

*Acceptance criteria*
- Given repeated failures against one account, when the ceiling is passed,
  then further attempts answer 429 RATE_LIMITED even with the right password.
- Given repeated failures from one network address across many accounts, when
  the ceiling is passed, then that address is throttled too.
- Given the throttle, when it answers, then it says nothing about whether the
  account exists.
- Given time passing, when the window elapses, then the count resets without
  anybody clearing it by hand.

## IDENTITY-5-API

An agent reads the list of people a ticket can be assigned to.

*Acceptance criteria*
- Given the list, when it is read, then it contains live staff only — no
  disabled account and no customer.
- Given the list, when it is read, then it is paginated with the ceiling every
  list obeys (BR-4).
- Given a person on the list, when the row is read, then it carries the id,
  the name and the role, and nothing about the password.
