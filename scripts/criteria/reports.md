# Reports — acceptance criteria

Numbers an admin can act on: the queue by status, the share of promises met,
load per agent, and a day boundary that belongs to the reader rather than to
the server.

Written 2026-09-02, before REPORTS-1-API was planned, because the feature had
no criteria file. That gap is L-7.

## What a report is here, and what it is not

A report is an **aggregate**, and that makes it a different shape from every
other read in this product. Three consequences, decided once and applying to
all four stories:

- **It is not a list**, so BR-4 (`scripts/rules.txt` line 8 — no unbounded
  list, paginated and filterable with a maximum page size) does not apply to
  its body. It applies to its *inputs*: a report over a range still bounds the
  range. The response is a fixed-size object whose size depends on the number
  of statuses and the number of live staff, not on the number of tickets.
- **It never invents a number the rest of the product does not already hold.**
  S-5 (line 24) says a breach is a stored row, never recomputed on read. A
  report that recomputes deadlines to decide who met their promise will
  disagree with the queue the moment the sweep has not run, and there is no way
  to tell which of the two is lying. The report reads `sla_breaches`.
- **Every report is admin-only**, refused in middleware before any service
  runs (SC-2, line 37). The staff-only census already reads the routes off the
  router; a reports route that forgets `adminOnly` fails it without a new test
  being written.

## The zero problem, stated once

REPORTS-3-API's title says it — *idle agents shown as zero* — but it is the same
defect in all three of the first stories, and it is the reason each is worth
building rather than being one `GROUP BY`:

> A query grouped over tickets can only produce rows for things that have
> tickets. The statuses nobody is in, and the agents holding nothing, vanish —
> and a report whose empty rows are missing reads as a report with nothing
> wrong in it.

An admin looks at a load report to find the person who is *not* busy. That
person is exactly the row a `GROUP BY tickets.assignee_id` cannot return. The
same is true of a status count: `pending: 0` is the number that says the desk
is not stalling anybody, and its absence is indistinguishable from a status
that was never asked about.

So in each case the shape comes from the **known set** — `STATUSES` in
`api/src/features/tickets/tickets.rules.js:3`, the live staff rows for agents —
and the counts are joined onto it, with zero where nothing joins.

## REPORTS-1-API

An admin sees how many tickets are in each status.

*Acceptance criteria*
- Given the six statuses (T-1, `scripts/rules.txt` line 12), when the report is
  read, then all six appear, and a status no ticket is in appears with a count
  of zero rather than being absent.
- Given a soft-deleted ticket, when the report is read, then it is in no count —
  nothing is hard-deleted (BR-1, line 5), so `deleted_at IS NULL` is what makes
  the report agree with the queue.
- Given the report, when its counts are added up, then the total equals the
  number of live tickets: no ticket is counted twice and none is dropped.
- Given a non-admin, when they read it, then the answer is 403 and the service
  never runs (SC-2).
- Given the six statuses in code, when a seventh is added to `STATUSES`, then
  the report carries it without being edited — the set is read, not retyped.
- Given a desk with no tickets at all, when the report is read, then it answers
  six zeros and 200, not an empty body and not 404.

## REPORTS-1-WEB

An admin reads the queue by status on a screen.

*Acceptance criteria*
- Given the report, when it renders, then every status is shown with its count,
  including the zeros — the screen does not filter out what the API was careful
  to include.
- Given a status name, when it is displayed, then it comes from the resource
  file in the reader's language and is never a raw `pending` (BR-6, line 10).
- Given the screen, when it is loading, when it is empty and when it failed,
  then each of those states is designed rather than accidental (D-2), matching
  the states the rest of the desk already uses.
- Given a reader who is not an admin, when they reach the address directly,
  then they do not see the screen, and the navigation never offered it.
- Given both languages, when the screen is read in Arabic, then the layout is
  the mirror of the English one and no number is reversed by the direction.

## REPORTS-2-API

An admin sees what share of tickets met their promise.

This is the report that is easiest to get wrong in a way that flatters the
desk, so its criteria are about the denominator.

*Acceptance criteria*
- Given the two kinds of clock (S-1, line 20 — first response and resolution),
  when the share is reported, then there is a share **per kind**. One number
  mixing them answers no question anybody has.
- Given a ticket whose clock is still running and whose deadline has not
  passed, when the share is computed, then that ticket is in neither the
  numerator nor the denominator: it has not met its promise, it has simply not
  broken it yet. `met = total − breached` is the wrong formula, and it reads
  best on the day the desk opens.
- Given a clock, when it is counted as settled, then it is settled because it
  stopped or because a breach row exists for it — the two ways a promise
  finishes.
- Given a breach, when it is counted, then it is counted from `sla_breaches`
  and never by comparing a deadline to the clock (S-5, line 24). A report that
  recomputes will disagree with the queue whenever the sweep is behind.
- Given a period in which nothing settled, when the share is read, then the
  answer says there is no data — not zero per cent, which is the same shape as
  a desk that missed everything.
- Given the counts and the share, when both are returned, then the share is
  derived from those exact counts, so a reader can check the arithmetic and a
  rounded percentage never contradicts the numbers beside it.
- Given a non-admin, when they read it, then 403, decided before the service.

## REPORTS-2-WEB

An admin reads the share of promises met.

*Acceptance criteria*
- Given the two kinds, when they render, then each is labelled as what it is —
  a first response and a resolution are different promises to the same person.
- Given a share, when it is shown, then the counts it rests on are shown with
  it: "82% (41 of 50)". A bare percentage cannot be acted on, because 100% of
  two tickets and 100% of two hundred are different facts.
- Given a period with nothing settled, when it renders, then the screen says so
  in words, and shows no percentage at all.
- Given both languages, when the numbers render, then they are formatted for
  the reader's locale, and the sentence around them is built the way the other
  sentences with slots are — not by concatenation (L-51).

## REPORTS-3-API

An admin sees load per agent, with idle agents shown as zero.

*Acceptance criteria*
- Given the live staff, when the report is read, then every one of them has a
  row, and an agent holding nothing appears with zero rather than being absent.
  This is the story's whole point; see *The zero problem* above.
- Given a disabled account, when the report is read, then it has no row — the
  question is who can take work now, and a disabled account cannot.
- Given a customer, when the report is read, then they never appear: only staff
  roles hold tickets (`STAFF_ROLES`,
  `api/src/features/identity/identity.rules.js:106`).
- Given load, when it is counted, then it means work still on the person:
  tickets assigned to them that are not resolved and not closed. A count of
  everything they have ever touched is a career total, not a workload.
- Given tickets nobody is assigned, when the report is read, then they are not
  attributed to any agent, and their number is reported as its own figure —
  unassigned work is the thing an admin most needs to see, and hiding it inside
  nobody's row is how it goes unnoticed.
- Given a non-admin, when they read it, then 403, decided before the service.

## REPORTS-3-WEB

An admin reads load per agent.

*Acceptance criteria*
- Given the agents, when they render, then the idle ones are visible with zero,
  in the same list as the busy ones — sorting by load must not push them off.
- Given unassigned work, when it is shown, then it is visibly not an agent: it
  is a separate figure, not a row in the list called something like "nobody".
- Given a desk with one agent, when it renders, then the screen is still a
  report and not an error.
- Given both languages, when a name is displayed, then it is the person's own
  name, untranslated, and the label around it comes from the resource file.

## REPORTS-4-API

Today means today where the reader is, not in UTC.

BR-3 (`scripts/rules.txt` line 7): time is UTC in storage, the reader's locale
on display. A day boundary is where that rule stops being about formatting and
starts being about which rows are counted.

*Acceptance criteria*
- Given a reader in a zone ahead of UTC, when they ask for today, then a ticket
  raised at 01:30 their time is in the answer — even though it is stored as
  22:30 on the previous UTC day. This is the concrete failure the story exists
  to prevent, and a report built on `date(created_at)` has it.
- Given a reader in a zone behind UTC, when they ask for today, then a ticket
  stored at 02:00 UTC is **not** in their today if it is still yesterday
  evening where they are.
- Given the window, when it is computed, then it is computed once — one module,
  one refusal path, one place that says what a day is.
- Given a report whose answer is a **snapshot**, when a window is offered to it,
  then it does not take one. **Amended 2026-09-02**, while reviewing this
  story's plan, because the first draft of this criterion said "used by every
  report" and that turned out to force a report that lies.

  Agent load is *work still on the person, now*. Filtered to today it would say
  an agent holding five week-old tickets has a load of zero, which is simply
  untrue — and `REPORTS-3-API`'s own criteria define load as what is still on
  them. The queue by status is a snapshot too: filtered to today, `closed: 104`
  becomes `closed: 0`, and the report stops answering the question it is named
  for.

  So the window belongs where a period means something — which promises
  finished, which tickets were raised — and a report that takes one **echoes it
  in the answer**, so a reader knows which of the two questions was answered.
  The listing of accounts settled the same shape when it started taking a
  `state`.
- Given a zone the runtime does not know, when it is passed, then the answer is
  422 naming the field (E-2, line 28), and never a silent fall back to UTC: a
  report quietly answering about the wrong day is worse than one refusing.
- Given no zone at all, when a report is read, then the behaviour is stated in
  the contract rather than assumed — the document says what the default is, and
  the test proves it.
- Given a stored timestamp, when it is compared to the window, then storage is
  still UTC: the zone moves the boundary, it never rewrites a row (BR-3).
- Given a range longer than a day, when it is asked for, then it is bounded —
  the input has a maximum, which is BR-4 applied where it belongs on an
  aggregate.

## REPORTS-4-WEB

The reader's day, on the screen.

*Acceptance criteria*
- Given a reader, when a report loads, then the zone sent is the one their
  browser is actually in, read from the runtime rather than typed into a
  constant.
- Given the report, when it renders, then the period it covers is stated on the
  screen. A number with no period beside it cannot be acted on and cannot be
  checked.
- Given a reader who changes the period, when the new report arrives, then the
  stated period changes with it, and a stale number is never shown under a new
  label.
- Given both languages, when the period renders, then its dates are formatted
  for the reader's locale (BR-3), and the sentence carrying them is built with
  the isolate-wrapped slot pattern the rest of the desk uses (L-51).
