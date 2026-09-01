# Service levels — acceptance criteria

The promise about time, pauses, breaches, escalation.

Written 2026-08-29, before SERVICE-LEVELS-1-API was planned, because the
feature had no criteria file. That gap is L-7.

## The targets, and how they came to be wrong

`scripts/rules.txt` line 21 (S-2) is the promise:

```
urgent 1h/4h · high 4h/24h · normal 8h/72h · low 24h/168h
```

For a day and a half the seed shipped different numbers — different on **all
four** priorities — and nothing said so. Settled 2026-08-29 by reading rather
than by choosing:

- `rules.txt` describes itself as "every rule the product promises", derived
  from the product brief. It is the requirement.
- "fixed by the seed, by decision" is about **configurability** — there is no
  admin screen for these targets (the brief's built/not-built table lists SLA
  screens under "specified only"). It never meant that whatever the seed
  contains becomes the promise.
- S-2 was written 2026-08-27 with the backlog. `seed.data.js` came 2026-08-28,
  a day later, and its plan justified the values as "the ones the criteria
  assume" — while PLATFORM-8-API's criteria say only that targets *exist*. No
  criteria ever stated a number.

So the seed was corrected, not the rule. `verify-backlog.mjs` now parses S-2
and compares it to `seed.data.js`, because owning a rule means a story is
answerable for it — not that the rule is true.

**The source itself is now committed.** `docs/product-brief.md` was ported
2026-08-29 from the first attempt, where it was written as the requirements
source; its service-levels table states these same four targets, so the fix is
confirmed against the primary document rather than by provenance inference.
The first attempt's own test harness seeded the correct numbers too — the
wrong ones were never inherited from anywhere; the planner invented them.

## SERVICE-LEVELS-1-API

A ticket carries both deadlines from the moment it is raised.

*Acceptance criteria*
- Given a ticket is raised, when it is stored, then two clocks exist for it —
  first response and resolution — both started at its creation (S-1).
- Given a clock, when its deadline is computed, then it comes from the target
  row for that ticket's priority, read from the database rather than from a
  constant in code (S-2).
- Given a ticket whose priority changes, when the deadlines are read again,
  then they follow the new priority — the promise is about the ticket as it is,
  not as it was raised.
- Given a clock, when time passes, then it runs continuously: there is no
  working-hours calendar and no weekend (S-3, by decision).
- Given a ticket, when clocks are created, then there is exactly one of each
  kind for it — enforced by the unique constraint, not by hoping.
- Given the clocks, when they are read, then a deadline that has passed is
  visible as such without a breach row being written: recording a breach is
  SERVICE-LEVELS-3-API's job, and S-5 says a breach is stored, never
  recomputed on read.

## SERVICE-LEVELS-2-API

Time spent waiting on the customer is not counted against the desk.

Written 2026-08-31, with the sprint 8 stories.

*Acceptance criteria*
- Given a ticket moved to `pending`, then the resolution clock stops
  accumulating from that moment; given it leaves `pending`, then the time in
  between is added to what the clock has already been paused for (S-4).
- Given the first-response clock, then it does **not** pause. Pending means
  waiting on the customer, which can only happen after somebody answered them —
  and a promise about answering that could be paused by the answer is not a
  promise. S-4 names the resolution clock and means it.
- Given a ticket resolved while still pending, then the pause is closed at that
  moment and counted. A clock stopped mid-pause with the pause never added
  would make the resolution look slower than it was, which is the opposite of
  what S-4 is for.
- Given a ticket that goes to `pending` twice, then both pauses count. The
  column is a total, not a single interval, and a second visit that overwrote
  the first would quietly give the time back.
- Given the paused total, then it is stored as it accrues rather than derived
  from the history at read time. Deriving it would make every read of a queue
  a walk of the audit trail, and would produce a different answer the first
  time a status row was added for any other reason.
- Given the clock's own unit, then the pause is recorded in the same one it
  is. The column is named `paused_ms` and the application clock is whole
  seconds; whichever survives, the two must agree, and a test must say which
  it is rather than leaving a factor of a thousand to be discovered.

*Out of scope*
- Pausing for anything other than `pending` — a weekend, an out-of-hours
  window, a public holiday. S-3 says the clocks run continuously and that is a
  decision, not an omission.
- Showing the pause anywhere. What the queue displays is
  SERVICE-LEVELS-3-WEB's.

## SERVICE-LEVELS-3-API

A missed deadline is recorded once, as a fact rather than a calculation.

Written 2026-08-31, with the sprint 8 stories.

*Acceptance criteria*
- Given a clock whose deadline has passed and which has not stopped, when the
  breach is recorded, then a row exists saying which ticket, which clock, and
  when it was missed (S-5).
- Given the same clock a second time, then no second row is written. Once is
  enforced by a unique constraint on the ticket and the kind, not by a check
  that ran first — a check is a race and a constraint is not.
- Given a clock that stopped before its deadline, then nothing is recorded.
  The desk answered in time; there is nothing to say.
- Given the paused time, then it counts: a resolution deadline is missed only
  when the time actually owed has passed (S-4). A breach recorded against a
  ticket that spent a week waiting on the customer would be the product
  blaming the desk for the customer's silence.
- Given a read of a ticket or of the queue, then the breach comes from the
  stored row and is never recomputed (S-5). A number computed on read is a
  number that changes when nobody changed anything.
- Given this application has no scheduler, then the sweep that records breaches
  is triggered the way `TICKETS-14-API`'s already is — a route an operator or a
  cron calls — and the plan says so rather than inventing a runtime.
- Given a sweep that finds nothing, then it writes nothing and is not an
  error. Most sweeps will find nothing.

*Out of scope*
- Raising the priority, or telling anybody — `SERVICE-LEVELS-4-API`. This story
  records the fact; that one acts on it.
- Un-recording a breach. A deadline that was missed stays missed; resolving the
  ticket afterwards does not unmake it (BR-1's spirit, applied to a fact
  rather than a row).

## SERVICE-LEVELS-3-WEB

The queue shows which tickets are late, and which are about to be.

Written 2026-08-31, with the sprint 8 stories.

*Acceptance criteria*
- Given a ticket with a recorded breach, then the row says so — visibly, not
  only in a word somebody has to read, the same way an internal note is drawn
  differently from a reply.
- Given a ticket whose deadline has not passed, then the row does not claim it
  has. The screen shows what the API sent and computes no deadline of its own:
  a second place that decides what "late" means is a second answer to it.
- Given both a response breach and a resolution breach, then the row says
  which. They are different promises and an agent's next action differs.
- Given every string, then it came from a resource file, in both languages
  (BR-6), and no time is formatted by the screen without the reader's locale
  (BR-3).

*Out of scope*
- Filtering or sorting the queue by lateness. `TICKETS-2-WEB` owns the queue's
  filters and no story asks for this one.
- A dashboard, a chart, or a count of breaches — those are the reports
  feature's, and its stories are not in this sprint.

## SERVICE-LEVELS-4-API

A missed resolution deadline raises the ticket and tells an admin — once.

Written 2026-08-31, with the sprint 8 stories.

*Acceptance criteria*
- Given a recorded resolution breach, then the ticket's priority rises one
  level and an admin is notified (S-6).
- Given the same breach again, then neither happens a second time. Once is
  enforced by a constraint, not by a check: two sweeps racing must not produce
  two escalations, and the only thing that can promise that is the database.
- Given an `urgent` ticket, then there is no level above it: the notification
  is still sent and the priority stays where it is. A rule that silently did
  nothing for the most urgent tickets would be worst exactly where it matters
  most.
- Given the priority change, then it is audited like any other (BR-2), with no
  human actor — the rule decided it, and the rule has no name.
- Given the new priority, then the deadlines follow it, because
  `SERVICE-LEVELS-1-API` says the promise is about the ticket as it is. A
  ticket escalated for missing a deadline must not thereby be given a later
  one: the breach that has already been recorded stays recorded.
- Given a **first-response** breach, then nothing is escalated. S-6 names the
  resolution deadline, and the two promises are not interchangeable.
- Given no admin exists, then the escalation still happens and the absence is
  not an error. Notifying nobody is a fact about the roster, not a failure of
  the rule.

*Out of scope*
- Escalating more than one level, or repeatedly as time passes. S-6 says one
  level, once.
- A screen for any of it. Nothing in this sprint draws one.

## SERVICE-LEVELS-5-API

The seeded database is one where the escalation has already run.

Written 2026-08-31, with the sprint 8 stories.

*Acceptance criteria*
- Given a freshly seeded database, then it contains a ticket whose resolution
  deadline was missed, its recorded breach, its raised priority and the
  admin's notification — so that somebody opening the product sees the feature
  rather than an empty table (SC-3).
- Given the seed run twice, then there is still exactly one of each. The seed
  is idempotent everywhere else here and this is not the place to stop being.
- Given the seeded breach, then it was produced by the same code path a real
  breach uses, not written directly into the table. A fixture that bypasses the
  rule proves the fixture, and the demo would survive a bug that the product
  would not.
- Given the seed, then it does not move the clock or depend on the machine's
  date: the ticket's timestamps are relative to the seed's own `now`, so the
  demo looks the same on any day.

*Out of scope*
- Seeding a breach for every priority, or a realistic spread of them. One is
  what SC-3 asks for: a working system, not a populated one.
