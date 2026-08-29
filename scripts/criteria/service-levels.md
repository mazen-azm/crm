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
