# Plan lessons — read before planning any story

One lesson per defect a plan review actually found. The planner reads this file
first (every intake points at it). A lesson is a rule plus the defect that paid
for it — never advice in general.

## L-1 — Story ids come from the backlog, never from prose

**Rule:** cite other stories only by the id in `scripts/backlog.txt` (or the
generated `BACKLOG.md`), with the Jira key beside it: `PLATFORM-13-ALL (CRM-28)`.
Never take an id from `docs/`, from a criteria file, or from memory. And the id
is the **slug spelled out in full** — the backlog's second column (`PLT`, `TCK`)
and the criteria files' headings are internal plumbing; reproducing them in a
plan resurrects the abbreviations this project killed.

**Paid for by:** twice. The CRM-16 plan cited `PLT-10-ALL` and `PLT-14-ALL` —
ids from an abandoned naming scheme that stale docs still carried; ten
citations were wrong, two pointed at the wrong story entirely. Then the CRM-18
plan, reading the backlog faithfully, copied the prefix column into every
citation and had to be de-abbreviated at review.

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

## L-6 — A check's scope excludes the surfaces the rules exempt

**Rule:** an automated guard must grep exactly the surface its rule governs.
The no-AI-attribution rule governs code, docs and commit messages — NOT
`.squad/` (the planning record is a scored deliverable whose generated headers
name the planner model by design) and NOT the gitignored root notes. A guard
scoped wider than its rule fails on day one and gets deleted instead of obeyed.

**Paid for by:** the CRM-18 plan proposed a test that greps the whole working
tree for assistant names — it would have failed immediately on `.squad/` plan
headers and the ignored notes, on content the project's own rules permit.

## L-7 — A ported document keeps its old world's ids

**Rule:** before any plan cites `scripts/criteria/*.md`, the section id it
cites must equal the story id in `scripts/backlog.txt` — not merely a section
that exists. A document carried over from an earlier attempt keeps that
attempt's numbering, and a citation into it is then wrong even though the
file, the section and the line number are all real.

**Paid for by:** `scripts/criteria/platform.md` was ported from the first
attempt: fourteen sections for a nineteen-story feature, every id from
section 4 onward pointing at a different story than the backlog's, and four
stories — permission-middleware among them — with no criteria at all. The
CRM-19 plan had to invent its own acceptance criteria; it invented sensible
ones, which is luck, not process. The same half-migration hid in
`verify-backlog.mjs`: ids went full-name at the naming pivot, needs stayed
prefixed, and the check had been failing with 166 errors that nobody saw
because nobody ran it. A check that is not run is not a check.

## L-8 — Never compute a tracker key

**Rule:** `scripts/backlog.txt` and `BACKLOG.md` contain no `CRM-N` keys, so a
key can only be **looked up in Jira**, never derived by counting rows. Cite a
future story by its full id alone (`IDENTITY-1-API`) and append the key only
when it came from the tracker or the intake.

**Paid for by:** one story, three answers. The CRM-19 plan computed the
sign-in story's key by counting and wrote CRM-24 (actually the React
skeleton); the session that reviewed the plan re-counted and "corrected" it
to CRM-39; Jira says CRM-41. Two different models both counted carefully and
both were wrong — the tracker is the only source that knows.
