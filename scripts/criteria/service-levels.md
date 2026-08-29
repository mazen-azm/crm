# Service levels — acceptance criteria

The promise about time, pauses, breaches, escalation.

Written 2026-08-29, before SERVICE-LEVELS-1-API was planned, because the
feature had no criteria file. That gap is L-7.

## An unresolved contradiction, recorded before anybody plans against it

`scripts/rules.txt` line 21 (S-2) enumerates the targets **and** says they are
"fixed by the seed, by decision". The two disagree, on every priority:

| priority | S-2 says | the seed ships |
|---|---|---|
| urgent | 60 / 240 | **15** / 240 |
| high | 240 / 1440 | **60** / **480** |
| normal | 480 / 4320 | **240** / **1440** |
| low | 1440 / 10080 | 1440 / **5760** |

(minutes: first response / resolution. `api/src/platform/db/seed.data.js`
lines 43–48.)

By the rule's own words the seed is the authority, so the seed wins and the
numbers written into S-2 are stale prose. **That reading needs confirming**, and
until it is, a story must not quietly pick one — the numbers are the whole
promise this feature makes.

Nothing checks these two against each other today. `verify-backlog.mjs` checks
that every rule is *owned*, not that a rule and the code agree, which is the
difference between a rule having a home and a rule being true.

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
