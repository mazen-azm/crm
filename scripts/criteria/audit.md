# Audit — acceptance criteria

The record of every change. Rules BR-1 and BR-2 (`scripts/rules.txt` lines 5
and 6) are the whole feature: nothing is hard-deleted, and every mutation
leaves a row naming who did it, to what, when, and what changed.

Written 2026-08-28, before AUDIT-1-API was planned, because the feature had no
criteria file — the third time that gap has been found (L-7), and the first
time it was found before a plan rather than by one.

The table already exists: `api/src/platform/db/migrations/0004__audit_events.sql`,
shipped by PLATFORM-2-API. This feature is not about creating it. It is about
making "every mutation writes one" a property the codebase holds rather than a
habit each feature is trusted to remember.

## AUDIT-1-API

Every change writes an audit row.

*Acceptance criteria*
- Given any mutation of a persisted thing, when it succeeds, then exactly one
  audit row exists for it, carrying the actor, the entity, the entity id, the
  verb, the time, and the before/after difference (BR-2).
- Given a mutation that fails, when the error leaves the service, then no audit
  row survives it — the row and the change are written in one transaction, so
  neither can exist without the other.
- Given a mutation the system performs with nobody signed in, when it is
  audited, then the actor is recorded as absent rather than invented.
- Given a new mutating route added later, when it does not write an audit row,
  then a check fails — the guarantee is enforced, not documented. A rule that
  relies on every future author remembering it is not a rule.
- Given an audit row, when anything tries to change or delete it, then it
  cannot: the rows are append-only, and BR-1 protects them.
- Given an audit row, when it is read, then it contains no password, no token
  and no secret — a diff records that a field changed, and names it, without
  carrying a value that must stay unreadable.

## AUDIT-2-API

An admin reads the audit log, filtered by person, thing or date.

*Acceptance criteria*
- Given the log, when it is read, then it is paginated with the ceiling every
  list obeys (BR-4).
- Given a filter by actor, by entity and id, or by a date range, when it is
  applied, then only matching rows are returned, and the filters combine.
- Given two rows written in the same second, when the log is read in order,
  then their order is the order they were written — the timestamp does not
  decide it (L-19).
- Given anybody who is not an admin, when they read the log, then the answer is
  403 and no row travels.

## AUDIT-2-WEB

An admin reads the audit log on a screen.

*Acceptance criteria*
- Given the screen, when it loads, then it shows the log through the API's own
  filters and paging, and adds none of its own.
- Given every string on the screen, when it is read, then it came from a
  resource file, in both languages (BR-6).
