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

## L-9 — An error body names the field, never the value

**Rule:** any plan for an error contract, a validation response, or a failure
log states that the payload carries **identifiers only** — field names,
paths, codes, request ids — and **never a value the caller submitted**. A
value can be a password, a token, or personal data; echoing it to satisfy
"tell me which field" sends it back to the client and writes it into every
log that touches the response. The carrier type enforces this (keep only
strings; drop objects and scalars), it is not left to the caller's goodwill.

**Paid for by:** the CRM-20 plan's first draft shaped the 422 body's `fields`
as `[{ field, message }]` and its e2e test threw
`unprocessable([{ field: 'name', message: 'required' }])` — one careless
future schema writing `message: \`got ${input.password}\`` would have leaked
the password to the client and the logs. Gate 2 cut it to a list of names,
with the `ValidationError` constructor filtering non-strings out.

## L-10 — Do not hand-roll a source scan for an invariant a guard enforces

**Rule:** when an invariant can be enforced **structurally** — a constructor
that throws, a type that will not compile, a frozen map — the plan enforces
it there and proves it with **one unit test on the guard**. It does not also
propose a test that greps or parses source files for call sites. A
text-scan check is brittle (misses a value built from a variable, a call
split oddly across lines), and worse, file-content structure checks are a
named story's job (**PLATFORM-15-ALL-structure-check, CRM-30**) — a plan that
builds one early is doing another story's work with a weaker tool.

**Paid for by:** the CRM-20 plan's first draft added
`documented-codes.test.js`, a tree-walk over `api/src` regex-matching
`new HttpError(<literal>` and asserting each status was in the catalogue —
on top of a constructor that already throws on an undocumented status. Gate 2
deleted the file, the acceptance-criteria bullet that demanded it, and the
edge-case notes apologising for the regex's blind spots.

## L-11 — A status outside rule E-2's catalogue is a promise the rules forbid

**Rule:** rule E-2 names the whole catalogue — 400 401 403 404 409 422 429 500.
Any other 4xx/5xx a plan promises is a rule violation wearing a number. If a
story genuinely needs one (E-3's 501), the story that owns that rule extends
the catalogue; every other plan stays inside it.

**Paid for by:** two of them in one evening. The CRM-18 plan left a breadcrumb
promising CRM-20 would map an oversized body to `413/PAYLOAD_TOO_LARGE` — 413
is not in the catalogue, so honouring the promise breaks E-2 and ignoring it
leaves a dead promise in the code. The CRM-19 draft would have let a strict
catalogue guard block CHANNELS-2-API from ever throwing its 501. Both are now
caught by `scripts/verify-plan.mjs` before a human reads the plan.

## L-12 — When a mount moves, every test that uses the seam moves with it

**Rule:** a plan that relocates a mount point must list **every** test file
that reaches through it, not the one it happened to read. And after the move,
check the tests that still pass: a test that asserts something true of every
response — a header, a shape — keeps passing against a 404 and stops proving
what it was written to prove.

**Paid for by:** the CRM-21 plan enumerated thirteen URLs in `app.test.js`
and missed `request-id.test.js` and `security-headers.test.js`, which mount
through the same seam. The first went red immediately, which is the good
case. The second stayed **green while asserting security headers on a 404** —
it would have shipped as a test that could no longer fail for its own reason.

## L-13 — A guard that reads source text must read its grammar, not its prose

**Rule:** when a check has to inspect source (and L-10 says prefer not to),
it parses the construct it governs — import specifiers, a call expression —
never the whole file as a string. A file that explains a rule contains the
words of the rule, and a substring search cannot tell an explanation from a
violation.

**Paid for by:** the CRM-23 test asserting the seed imports nothing from the
application searched the file for `'app.js'` and matched the comment saying
"it imports nothing from app.js". The test failed on the sentence documenting
that it passes. Reading only the `import … from '…'` specifiers fixed it —
and the same shape had already been forbidden once, in L-10.

## L-14 — A plan's version numbers are stale the moment it is written

**Rule:** a plan that stands up a new toolchain names the **packages**, not
their versions. Let the package manager resolve, then record what actually
landed in the commit message. A pinned major in a plan is a guess about the
day the plan runs, and following it installs an old world on purpose.

**Paid for by:** the CRM-24 plan specified React 18, react-router v6, Vite 5
and TypeScript 5. Installing without pins gave React 19, router 7, Vite 8 and
TypeScript 7 — four majors ahead across the board. Two of those gaps had
teeth: Vitest 4 needs `defineConfig` from `vitest/config`, not from `vite`,
and the plan's config would not have typechecked.

## L-15 — A test suite passing is not the build passing

**Rule:** a story that adds a typed root runs the **build** as its own
verification step, not only the tests. A test runner transpiles per file and
does not typecheck the project; `tsc -b` reads the whole graph and sees what
the runner never looks at.

**Paid for by:** the CRM-24 web tests went 14/14 green while `npm run build`
failed on five type errors in one of those very test files — a caught error
typed `unknown` that every assertion then read fields off. The suite was
green about code that does not compile.

## L-16 — Prove a guard fails before believing it passes

**Rule:** a story whose deliverable is a check does not ship on a green run.
Break the invariant on purpose, watch the check go red and name the offender,
put the file back, and only then tick the box. A green check and an absent
check look identical from the outside.

**Paid for by:** twice in one sprint, in opposite directions. CRM-22's
contract check was broken deliberately in both directions and named the
route each time — that is what a working guard looks like. CRM-25's
colour-literal guard passed a file containing `background: #ff0000` because
its regex anchored each declaration to the start of a line, so every rule
written on one line was invisible to it. It had been green all along, over
nothing.

## L-17 — TypeScript 7 ships no JavaScript compiler API

**Rule:** a plan that walks a TypeScript AST cannot reach for the `typescript`
package on this project. Version 7 is the native port, and its npm package
exports `version` and `versionMajorMinor` — nothing else. `ts.createSourceFile`,
`ts.ScriptTarget`, the visitors: none of them exist. Use `@babel/parser` with
the `typescript` and `jsx` plugins, as a dev dependency of the guard that needs
it.

**Paid for by:** the CRM-35 plan chose the TypeScript AST specifically to avoid
a dependency, noting `typescript` was already installed. It is — and it is
version 7, so the guard threw `Cannot read properties of undefined (reading
'Latest')` on its first run. The plan's own fallback was right; what was wrong
was assuming an installed package still has the API its name used to imply.

## L-18 — A contract check must inspect the application production runs

**Rule:** when a check compares a document, a schema or a route table against
"the application", it builds the application the way production does. Extract
that composition into one function both the entry point and the check import.
A check that assembles its own arrangement is checking something nobody runs.

**Paid for by:** CRM-41 mounted the first feature and the OpenAPI contract test
went red — correctly. The test built `createApp()` with no features, so the two
documented routes were "documented but not served". Feeding the test the
production composition was the fix; teaching the document to expect a
featureless app would have been the bug.

## L-19 — A timestamp is not an order

**Rule:** an audit trail, an event log or anything else that must be read "in
the order it happened" needs a monotonic key, not a clock. A second-resolution
timestamp cannot order two rows written in the same second, and a
millisecond one cannot order two written in the same millisecond. In SQLite
the insertion order is `rowid` and it is free; a table that will be read in
order should say so, in the query and in a comment.

**Paid for by:** CRM-44's audit assertion read "the latest row for this
account" as `ORDER BY at DESC LIMIT 1` and got the creation row instead of the
role change — both happened inside one second, so the timestamps were equal
and the order was whatever the engine felt like. The test looked wrong and the
data was right.

## L-20 — A counter a success resets is a counter the attacker resets

**Rule:** when a throttle keeps one counter per *victim* and one per *origin*,
a successful attempt may clear the victim's counter and must never clear the
origin's. The per-account counter exists to protect one account, and the
person who just proved the password owns it; the per-address counter exists to
stop one host sweeping many accounts, and a sweep that lands anywhere would
otherwise buy itself a fresh budget. State which counters a success clears,
and why, in the same sentence.

**Paid for by:** CRM-47's plan gave `recordSuccess` both keys — "a person who
mistypes twice and then signs in is not one failure away from being locked out
tomorrow", which is right about the account and wrong about the address.
Credential stuffing succeeds *sometimes*; that is its whole shape. Every hit
would have wiped the address ceiling, so the second acceptance criterion could
never fire against a real attacker while firing happily against an office
behind one NAT.

## L-21 — A plan asserts the world it was generated in; check it, it is already stale

**Rule:** treat every claim a plan makes about the *surroundings* — how many
plans exist, what has been built, which story is first, what version is
installed — as unverified. The planner reads a snapshot and writes it as fact.
Claims about the code it cites are checked mechanically; claims about the
repository around it are not.

**Paid for by:** CRM-47's plan opened with "No other plans exist yet; this is
the first entry in `.squad/plans/identity/`" and titled itself "Story 01" —
with three identity plans already sitting beside it and its own filename
reading `18-`. Nothing downstream depended on it, which is exactly why it
would have survived into the record unchallenged. Compare [[L-14]].

## L-22 — A test that needs a seam the story forbids is not a test

**Rule:** before writing a test into a plan, name the seam it turns. If the
plan's own scope forbids that seam, the test cannot be written and the
assertion has to move to the layer that owns the parameter — usually the unit,
where the value is an argument rather than a property of the transport.

**Paid for by:** CRM-47's integration list said "a different simulated address
is still 401". Every request in that suite comes from one socket peer, and the
only way to vary `req.ip` is `app.set('trust proxy')` plus a forwarded header —
which the same plan explicitly forbids, correctly. The isolation belongs in the
throttle's unit test, where the address is just a string.

## L-23 — A contract check has a direction, and the missing one is the dangerous one

**Rule:** when a check compares code to a document, say out loud which way it
reads. "Everything documented is real" and "everything real is documented" are
two checks, and a plan that names one and relies on the other is trusting a
guard that is not there. For response statuses the second direction cannot be
had statically — nothing tells you what a handler throws — so it has to be
bought at run time: record the `(method, path, status)` the suite actually
observes and assert each one is documented.

**Paid for by:** CRM-47's plan said the OpenAPI contract test "runs on every
build and reads this file; failing to update it will break it". It does not.
Deleting the new `429` from `api/openapi.json` left all four contract tests
green, because the suite checks routes served-versus-documented in both
directions but statuses in one — documented statuses must be in E-2's
catalogue, and that is all. The `429` entry is therefore correct and entirely
unenforced. Found by deleting it and watching for red, which is [[L-16]] doing
its job on a guard rather than on a feature.

## L-24 — A guarantee checked against a hand-written list is a guarantee the next author opts out of by forgetting

**Rule:** when the criterion is "anything added later that breaks this rule is
caught", the set of things checked has to be **derived from the system**, not
typed into the test. The author who forgets the rule is the same author who
forgets to add their case to the list, so a hand-written set makes the check
depend on exactly the memory it was written to replace. Walk the router, read
the directory, enumerate the exports — then assert the derived set equals the
covered set, and fail naming both directions.

**Paid for by:** CRM-133's plan proved BR-2 by driving the four mutating routes
that exist today, listed by hand. A fifth route added next sprint would have
been audited by nobody and reported by nothing, while the suite stayed green and
the story's own acceptance criterion — "a new mutating route that does not write
an audit row fails a check" — read as satisfied. The walker to derive it from
already existed: `collectRoutes` in `api/src/platform/http/route-table.js`,
extracted by PLATFORM-7-API for the OpenAPI contract check.

## L-25 — A guard on one path to a resource is a guard with a second door

**Rule:** before trusting an interceptor, enumerate every way the thing it
guards can be reached. A wrapper around one method of an object is not a
wrapper around the object. Name the doors in a comment, and make the guard
classify traffic through all of them identically — or say in writing which door
is deliberately unguarded and why.

**Paid for by:** CRM-133's plan wrapped `db.prepare(...).run(...)` to classify
mutations, and read `db.exec` only for `BEGIN`/`COMMIT`/`ROLLBACK`. But `exec`
takes arbitrary SQL: `db.exec('DELETE FROM users WHERE …')` inside an open
transaction is a mutation that never touches `prepare`, so it would have
committed unaudited through a guard written specifically to make that
impossible. Both doors now get the same classifier.

## L-26 — A check that reads the working tree passes for reasons CI will not have

**Rule:** before a check script is put in CI, run it against a **clean checkout
of the committed tree** — `git ls-files` into an empty directory, no
`node_modules`, no untracked files, no credentials. Anything it touches that is
gitignored or merely lying around locally is a pass it will not get on a
runner. And when a check resolves paths, teach it that a git-ignored path is
*deliberately* absent: ask `git check-ignore` rather than treating every
missing file as a mistake.

**Paid for by:** CRM-28. `verify-docs` was green on this machine and red in the
dry run, because `docs/ai-usage.md` cites `.squad/secrets.yaml` — in a sentence
that says "git-ignored" three words later. The citation was right, the file is
absent on purpose, and the check could not tell that from a typo. Had the
workflow been pushed first, the repository's first CI run would have been red
for a defect in the checker rather than in the code, on the story whose whole
point is that a red run means something.

## L-27 — Half a criterion is not a criterion

**Rule:** when an acceptance criterion needs a step that cannot be taken from
inside the repository — a repository setting, a DNS record, a permission
granted in somebody's console — write down the exact steps, name who must take
them, and **leave the box unticked**. A ticked box is a claim the thing is
true. Splitting the criterion in the plan is honest; ticking it because the
committed half is done is not.

**Paid for by:** CRM-28's second criterion is "given a failing test, when a
merge is attempted, then it is blocked". `ci.yml` makes the suites run and
report; blocking comes from a branch-protection rule on `main` that lives in
GitHub's settings, needs admin rights, and no committed file can turn on. The
workflow being green proves the suites run — not that a red one stops anything.
`.github/BRANCH_PROTECTION.md` carries the steps and the exact check names, and
that box stays open until a person has clicked it.
