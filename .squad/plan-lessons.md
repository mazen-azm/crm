# Plan lessons — read before planning any story

One lesson per defect a plan review actually found. The planner reads this file
first (every intake points at it). A lesson is a rule plus the defect that paid
for it — never advice in general.

## L-1 — Story ids come from the backlog, never from prose

**Rule:** cite other stories only by the id in `scripts/backlog.txt` (or the
generated `BACKLOG.md`), with the Jira key beside it: `PLATFORM-13-ALL (CRM-28)`.
Never take an id from `docs/`, from a criteria file, or from memory.

**Paid for by:** the CRM-16 plan cited `PLT-10-ALL` and `PLT-14-ALL` — ids from
an abandoned naming scheme that stale docs still carried. Ten citations were
wrong; two pointed at the wrong story entirely.

## L-2 — Do not assert your own filename

**Rule:** a plan never states what its own file is called. The tool names it.

**Paid for by:** the CRM-16 plan said it was named `01-story-repo-conventions.md`;
it was named `01-story-crm-16.md`.

## L-3 — A branch you cut from must exist

**Rule:** if the branch model says story branches are cut from `sprint-N`, the
plan for the first story of a sprint carries a bootstrap step that creates
`sprint-N` from `main` first.

**Paid for by:** the CRM-16 plan told the executor to cut from `sprint-0`,
which no story had created.

## L-4 — The three intake sections are the plan's steering

**Rule:** a plan is only as good as the intake's Technical hints (which ~30
files to read), Out of scope (with the story ids that own each excluded
piece), and the note saying what already exists so the planner extends
instead of re-creating.

**Paid for by:** the first attempt's RPT-WEB plan burned its whole context
hunting a field that did not exist, because nothing told it what to read.

## L-5 — Name the engine before planning persistence

**Rule:** any plan that touches the database states the engine and cites where
`docs/architecture.md` declares it (SQLite via `node:sqlite`, `:memory:` in
tests). A plan written in another engine's dialect is wrong in every line, not
just one — types, locks, extensions, `EXPLAIN` syntax and the test harness all
follow from the engine.

**Paid for by:** the CRM-17 plan was written end-to-end for Postgres — `pg`
pool, `TIMESTAMPTZ`, `CITEXT`, `pgcrypto`, advisory locks, `createdb` — because
no committed document named the database, so the planner reached for the common
default. The stack decision lived only in an ignored note the planner never
reads. The fix was to the source, not the plan: architecture.md now names the
engine and its idioms.
