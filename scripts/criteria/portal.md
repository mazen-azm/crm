# Portal — acceptance criteria

The customer-facing surface. The same web application, not a second one — the
brief puts "the portal as a separate application" under Specified only.

Written 2026-08-30, before PORTAL-1-WEB was planned, because the feature had no
criteria file. That gap is L-7.

Only the two stories in this sprint are written here.

**One application, two audiences.** The desk's screens live behind
`RequireAuth` inside `DeskShell`, which renders a navigation bar for staff. A
customer sees neither: PORTAL-1-WEB is reached by somebody with no account at
all, and PORTAL-2-WEB by somebody whose role is `customer` and who must not be
offered the queue. The shell is the thing that has to learn the difference, and
this is the first story that gives it one.

**The ownership rule turns on here.** TICKETS-8-API refuses every subject whose
role is `customer`, on purpose and stated as such: no customer could hold a
token, and nothing said which customer they were. CUSTOMERS-6-API supplies the
link, and the guard becomes a comparison. A portal that shipped while the guard
still failed closed would be a set of screens answering 404 to everybody.

## PORTAL-1-WEB

A customer raises a ticket without an account.

*Acceptance criteria*
- Given somebody with no account, when they open the public form, then it
  renders without a sign-in and without the desk's navigation — nothing on it
  leads anywhere they cannot go.
- Given the form, when it is submitted, then it posts to the channel intake
  (CHANNELS-1-API) and to nothing else. A screen that wrote a ticket by
  another route would be the second write path the seam exists to prevent.
- Given a submitted request, when it succeeds, then the screen shows the
  reference the API returned, so the person has something to quote. Not a
  message saying it worked.
- Given a submission in flight, then the control cannot be pressed twice —
  this creates a ticket, so a second press is a second ticket.
- Given a refusal that names fields, then those fields are marked and the
  sentence is the shared one for the code, never composed from the names.
- Given 429 from the intake, then the screen says the request was refused for
  arriving too often, in words, rather than showing the same failure as a
  server error.
- Given every string on the screen, then it came from a resource file, in both
  languages, and the page reads in both directions (BR-6).

*Out of scope*
- Following the ticket afterwards — PORTAL-2-WEB.
- Attachments. The brief puts them under Specified only.

## PORTAL-2-WEB

A customer signs in and sees their tickets, and nothing else.

*Acceptance criteria*
- Given a customer's sign-in, when it succeeds, then they land on their own
  tickets rather than on the desk's queue, and the navigation they are shown
  contains no staff screen.
- Given a customer, when they read a ticket that is theirs, then it is shown;
  when they ask for one that is not, then the answer is the same 404 a missing
  ticket gets, so nothing confirms that somebody else's ticket exists
  (TICKETS-8-API).
- Given a customer, when the API is asked for the queue, the staff list, or
  another customer, then it refuses — the screen not offering it is not the
  enforcement, the API is (SC-2).
- Given an agent or an admin, when they sign in, then nothing about their
  experience changes. Both halves are pinned, because a guard that also
  narrowed staff would break the queue.
- Given the customer's list, then it is paginated like every list (BR-4), and
  an empty one says so rather than rendering blank (D-2).
- Given every string, then it came from a resource file, in both languages
  (BR-6).

*Out of scope*
- Replies and the internal-note distinction — PORTAL-3-WEB, next block.
- Reopening, rating, and reading articles. Later stories own each.
