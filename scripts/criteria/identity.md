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

## IDENTITY-2-WEB

The screen an admin manages accounts from.

*Acceptance criteria*
- Given an admin, when they open the screen, then they see the live and the
  disabled accounts together, each with its role and its state. A disabled
  account that is not listed can never be re-enabled, and the API's
  `/accounts/:id/re-enable` route would have no way to be reached.
- Given the roles an admin may hand out, when the form offers them, then it
  offers `admin` and `agent` and not `customer` — the API refuses a customer
  here on purpose (`identity.rules.js:116`), and a screen offering a choice the
  API refuses teaches the reader a rule that is not true.
- Given a disable, when it succeeds, then the number of tickets it unassigned
  is shown to the admin. The API returns that count beside the user precisely
  so it can be seen (`identity.service.js:293-295`); dropping it on the screen
  is where that care is lost, and zero is an answer worth showing.
- Given the last admin, when disabling them or changing their role is refused
  with 409, then the screen says which rule refused it. "Something went wrong"
  is what sends an admin to the database.
- Given an address that already belongs to an account, when it is used again,
  then the screen says the address is taken and points at re-enabling, because
  a taken address is often a disabled colleague rather than a mistake.
- Given the list, when there are more accounts than a page, then it is paged
  the way every other list here is paged (BR-4) — the API's `/accounts` takes
  limit and offset already.
- Given a reader who is not an admin, when they reach the address directly,
  then they do not see the screen, and the navigation never offered it.
- Given a password, when an account is created, then this screen neither shows
  one nor sets one: setting a password is its own route and its own screen
  (`/accounts/set-password`), and two ways to set a password are two sets of
  rules.
- Given both languages, when the screen renders, then every label, role name
  and state comes from the resource file (BR-6) and none is a raw `agent`.
- Given loading, empty and failed, when each happens, then it is a designed
  state (D-2) and not an accident.

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

## IDENTITY-6-API

An admin sets somebody's password, so a locked-out person gets back in.

Written 2026-08-30. There is no reset by email — `docs/product-brief.md` puts
"SSO, password reset by email" under Specified only, which is why a locked-out
person needs an admin rather than a link.

*Acceptance criteria*
- Given an admin, when they set another user's password, then that user can
  sign in with it and not with the old one.
- Given a non-admin, when they attempt it on anybody, then the answer is 403
  and the service never runs (SC-2).
- Given an admin setting their own password this way, then it is refused: the
  route is for somebody who is locked out, and changing your own is
  IDENTITY-7-API, which asks for the current one. An admin who can skip that
  check on themselves is a stolen session that never has to know a password.
- Given the new password, then it is stored as a hash with its own salt, and
  the answer never carries it back — the admin types it, so nothing needs to
  read it out.
- Given a set password, then an audit row records who set it and for whom, and
  the row carries no password and no hash, before or after (BR-2).
- Given a disabled or soft-deleted account, then setting a password on it is
  refused — bringing somebody back is re-enabling them (IDENTITY-2-API), and
  doing it by the back door leaves the account's state saying one thing and
  its access saying another.

*Out of scope*
- Ending the sessions the old password opened — IDENTITY-8-API.
- Any rule about what a password may contain. There is one length floor and no
  composition rules; a rule that forces a symbol is a rule that produces the
  same password with a symbol on the end.

## IDENTITY-6-WEB

The same, on a screen.

*Acceptance criteria*
- Given an admin on the people screen, when they set somebody's password, then
  the screen shows which account it was set for.
- Given the form, when the API refuses naming a field, then that field is
  marked and the sentence is the shared one for the code.
- Given a submission in flight, then the control cannot be pressed twice.
- Given a non-admin, then the control is not on their screen — and that is a
  courtesy, not the enforcement, which is the API's (SC-2).
- Given every string, then it came from a resource file, in both languages
  (BR-6).

## IDENTITY-7-API

Anybody changes their own password, knowing the current one.

*Acceptance criteria*
- Given a signed-in user, when they send the current password and a new one,
  then the password changes and the new one signs them in.
- Given a wrong current password, then the answer is 401; given an
  unacceptable new one, then it is 422 naming the field. Sign-in deliberately
  gives one refusal for three causes, and that reasoning does not carry here:
  the caller is already authenticated and already knows the account exists, so
  telling them which half they got wrong leaks nothing and saves them guessing.
- Given the new password equal to the current one, then it is refused naming
  the field. A change that changes nothing is a change somebody believes they
  made.
- Given the change, then an audit row records it, carrying neither password
  (BR-2).
- Given any role, then the route is the same one — an admin changing their own
  password uses this, not IDENTITY-6-API.

*Out of scope*
- Ending other sessions — IDENTITY-8-API. Until it ships, a changed password
  leaves existing tokens valid until they expire, and that is a stated gap
  rather than an oversight.

## IDENTITY-7-WEB

The same, on a screen.

*Acceptance criteria*
- Given a signed-in person, when they change their password, then the screen
  confirms it and does not sign them out.
- Given a wrong current password, then the current-password field is marked
  and the sentence is the shared one for 401.
- Given a submission in flight, then the control cannot be pressed twice.
- Given every string, then it came from a resource file, in both languages
  (BR-6).

## IDENTITY-8-API

Changing a password ends every other session.

Written 2026-08-31, with the sprint 7 stories.

*Acceptance criteria*
- Given a user signed in on two devices, when they change their password on
  one, then the token the other holds stops being accepted. Until this ships a
  changed password left old tokens working until they expired, which
  IDENTITY-7-API named as a stated gap rather than an oversight.
- Given the device that made the change, then it stays signed in. A password
  change that signs somebody out of the screen they changed it on looks like a
  failure, and they would change it again.
- Given the answer to the change, then it carries a token that works. This is
  what makes the previous criterion true without the two sessions having to be
  told apart by the second they were issued in — the clock here is whole
  seconds, and a token minted in the same second as the change is
  indistinguishable from one minted just before it by any comparison of times.
- Given a token issued before the change, then the refusal is 401
  UNAUTHENTICATED — the same answer an expired or forged token gets. That a
  token was once valid is not something the refusal should say.
- Given a password set by an admin (IDENTITY-6-API), then it ends the user's
  sessions too. The reason to end them is that the old password may be known
  to somebody else, and that is more true here, not less.
- Given the change, then the audit row is IDENTITY-7-API's and no second row is
  written. Ending the sessions is part of changing the password, not a
  separate act somebody performed.

*Out of scope*
- A list of active sessions, or ending one by name. Nothing in the backlog asks
  for it, and it needs a session record this deliberately does not create.
- Ending sessions when an account is disabled — already true, and by a
  different mechanism: the resolver re-reads the user row on every request, so
  a disabled account stops being a subject immediately.

## IDENTITY-9-API

Disabling somebody hands their queue back, and says how much of it there was.

Written 2026-08-31, with the sprint 7 stories.

*Acceptance criteria*
- Given an agent with tickets assigned to them, when an admin disables the
  account, then those tickets are unassigned and the answer says how many. An
  admin deciding whether to disable somebody is deciding what happens to their
  work, and a number they have to go and count is a number they will not
  count.
- Given the tickets that were unassigned, then each is audited as an
  assignment change like any other (BR-2), with the disabling admin as the
  actor. The trail must not show tickets that moved with nobody moving them.
- Given a closed ticket of theirs, then it is left alone. Unassigning is about
  work somebody still has to do, and rewriting who finished a closed ticket
  would make the record wrong to tidy a queue.
- Given the disable and the unassignments, then they happen together or not at
  all. An account disabled with its queue still assigned to it is worse than
  either outcome alone: the work is invisible and its owner cannot sign in.
- Given an agent with no tickets, then the count is zero and the disable is
  the same disable. Zero is an answer, not an error.
- Given somebody already disabled, then the answer is the one IDENTITY-2-API
  already gives, and no tickets move. Disabling twice is not two events.

*Out of scope*
- Choosing who the tickets go to instead. They go to nobody, which the queue
  already renders and TICKETS-3-API already allows; assigning them onward is a
  decision an admin makes afterwards with the screen that exists for it.
- Telling the disabled person anything. NOTIFICATIONS-1-API tells an agent
  when a ticket becomes theirs, and nothing tells anybody when one stops being.
