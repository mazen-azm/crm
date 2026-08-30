# Channels — acceptance criteria

How a request enters the system from outside. An API seam, not a screen — the
screen that uses it is the portal's.

Written 2026-08-30, before CHANNELS-1-API was planned, because the feature had
no criteria file. That gap is L-7.

Only the three stories in this sprint are written here. Criteria invented ahead
of the code they describe are a wish, and the planner reads them as a contract.

**What the brief settles, and what it leaves open.** `docs/product-brief.md`
puts "the `Channel` interface and the web-form implementation" under Built and
"email, WhatsApp, SMS" under Specified only, and it gives `501` its own row in
the error table: *"Named, and deliberately not built. A channel this system
knows about and has decided against — not a `404`, which would say 'no such
thing'."* One interface, one implementation, three names that answer 501. That
is the whole feature, and it is the clearest place in this product where a
decision is visible in a status code.

**What the interface is for.** Not indirection for its own sake. A request from
outside has to reach the same ticket the desk raises by hand — the same
validation, the same audit row, the same state machine — because SC-2 says
every rule is enforced in the API and a second write path is a second set of
rules that agree until they do not. The interface is the seam that makes that
true by construction rather than by discipline.

## CHANNELS-1-API

A ticket enters through the channel interface, not around it.

*Acceptance criteria*
- Given a request arriving on the public intake, when it is accepted, then the
  ticket it produces is written by the same tickets service the desk uses —
  not a second insert (SC-2). Bypassing the service must fail a test.
- Given the intake, then it is unauthenticated: the caller is a stranger with
  no token, which is the point of it.
- Given an arriving request, when it carries an email address, then the
  customer is resolved or created by identity resolution (CUSTOMERS-5-API)
  before the ticket is raised, and the ticket belongs to that customer.
- Given the ticket that results, then it records which channel it arrived
  through, and the audit row for its creation says so too (BR-2).
- Given the intake, when nobody is signed in, then the audit row's actor is
  the system rather than a person — an absent actor is an answer, not a gap.
- Given a request missing what a ticket needs, then it is refused 422 naming
  the fields, in the shape every other refusal uses (E-1).
- Given the resulting ticket, then it is `new` and unassigned, like any other
  new ticket. Arriving from outside is not a priority.

*Out of scope*
- The screen that posts to it — PORTAL-1-WEB.
- Throttling it — CHANNELS-3-API.
- Answering for a channel that is not built — CHANNELS-2-API.
- Replying back out through a channel. Nothing sends email.

## CHANNELS-2-API

An unimplemented channel says so rather than failing quietly.

*Acceptance criteria*
- Given a channel this system knows about and has decided against — email,
  WhatsApp, SMS — when a request arrives for it, then the answer is 501 and
  the body names the channel (E-3).
- Given a name no channel has, when a request arrives for it, then the answer
  is 404. The two answers are different on purpose: 501 says "we know what you
  mean and it is not built", 404 says "there is no such thing".
- Given the list of known channels, then it lives in one place, and the web
  form is the only entry in it that is implemented.
- Given 501, then it is in the documented catalogue and in the OpenAPI
  document, like every other code the API can send (E-2).

*Out of scope*
- Building any of the named channels. They are named so that deciding against
  them is visible; building one is not this product.

## CHANNELS-3-API

The public intake is throttled per address.

*Acceptance criteria*
- Given repeated requests from one network address, when the ceiling is
  passed, then further requests answer 429 RATE_LIMITED (E-2).
- Given the throttle, then it counts every request rather than only the failed
  ones — sign-in throttles failures because a success is a legitimate person
  arriving, and an intake's successes are exactly what a flood is made of.
- Given time passing, when the window elapses, then the count resets without
  anybody clearing it by hand.
- Given the counter, then it is the one `identity.throttle.js` already
  implements rather than a second one written beside it. Two counters are two
  answers to how long a window is.
- Given the same limitations that counter already carries — process-local, and
  "address" means whatever the route hands it — then they are restated where
  this one is wired, because a limitation nobody repeats is a limitation
  somebody discovers.
