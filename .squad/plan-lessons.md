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

## L-28 — A helper that makes one rule honest can make another rule impossible

**Rule:** when several checks share a normaliser, ask of **each** rule what the
normaliser removes and whether the thing that rule hunts is inside it. Strip
comments for everyone, because a comment explaining a rule reads exactly like a
breach of it — but strip no further by default. A rule whose subject lives in
string literals must not be handed source with the strings taken out, or it
becomes a check that reads every file, finds nothing, and cannot fail.

**Paid for by:** CRM-30's plan gave every rule `stripCommentsAndStrings`,
correctly for the import matcher — `import … from '<string>'` is a fixed
grammar and stripping strings first stops a quoted path in a comment counting.
But the SQL-outside-a-repository rule hunts SQL, and every statement in this
codebase is inside a string or template literal: `db.prepare('SELECT … FROM
users …')`. That rule would have scanned 137 files, reported zero findings and
a green tick, and stayed green no matter what anybody wrote. Two helpers now:
`stripComments` for all, `stripStrings` composed on top for the one rule that
can afford it.

**Related:** [[L-13]] is why comments are stripped at all; this is the other
edge of the same knife.

## L-29 — Two callers of one code can owe the reader different sentences

**Rule:** before folding several call sites onto one shared message map, ask
whether any of them says what it says **on purpose**. A screen that is
deliberately vague — because the API refused to distinguish, and the screen
must keep that refusal — is not a duplicate of a generic mapper. Consolidate the
generic meaning, leave the deliberate one alone, and put a comment on it naming
the rule and the story that set it, or the next reader deletes it as
duplication.

**Paid for by:** CRM-31's intake said sign-in's local `messageFor` was "the
accidental version of this story" and should be lifted onto a shared map. It is
the opposite. IDENTITY-1-API answers 401 `UNAUTHENTICATED` for a wrong
password, an unknown address and a disabled account alike so the response is not
a directory of who works here, and `t.signIn.errorUnauthenticated` is one
sentence covering three truths to keep that promise on the screen. Every other
screen means "your session ended" by the same code. One map cannot say both:
folding them would have leaked the distinction the API spends a dummy hash
computation to hide.

**Where the steering came from matters here:** the wrong instruction was in the
intake, written at gate 1, and the plan followed it faithfully. Gate 2 is the
only thing that catches a gate-1 mistake, which is the argument for both gates
being read by someone rather than one of them being trusted.

## L-30 — A stubbed Response is single-use, so a mock that resolves one instance lies on the second call

**Rule:** a `fetch` stub must build a **fresh** `Response` per call —
`vi.fn(() => Promise.resolve(makeResponse()))`, never
`vi.fn().mockResolvedValue(makeResponse())`. A `Response` body can be read
once; the second caller gets a consumed one and `.json()` throws. And the
symptom names nothing: a screen sits in its loading state and the test waits out
its full timeout, so it reads as a race, a missing `await`, or a component that
never re-renders — anything but a body that was already read.

**Paid for by:** CRM-56's paging test, which spent 298 seconds failing to find
a button. The list was never re-rendering because the second search's `.json()`
threw. Chained `mockResolvedValueOnce` calls hid it in the neighbouring tests,
since each `Once` was given its own instance.

The same stub was already in CRM-46's tests and passing — by luck. The client's
failure path catches a `.json()` error and falls back to an empty body, and the
handler keys off the status, which survives. The first assertion about the
response's `code` would have ended that, on a story that had nothing to do with
the change.

## L-31 — A global rule does not stop applying because one story's criteria forgot to repeat it

**Rule:** when a plan declines a rule marked `global` in `scripts/rules.txt`,
that is a defect however well it argues. The story's own acceptance criteria are
a floor, not a fence: they say what this story must do, not what it is excused
from. Check a plan's decisions against the global rules as well as against the
criteria, and treat "this story's criteria do not mention it" as the shape of
the mistake rather than the reason.

**And distrust any reason that is a prediction about data.** "Small in this
sprint" is a guess about volume made by somebody who will not be there when it
is wrong. A ceiling that refuses exists precisely so nobody has to be right
about that in advance.

**Paid for by:** CRM-60's plan shipped an unbounded list of a customer's notes,
reasoning that the criterion was "about order, not about paging" and that the
volume would be small. BR-4 is global — "No unbounded list: paginated,
filterable, sortable, with a maximum page size" — and every list this API
serves already pages through one reader: `/accounts`, `/assignees`,
`/customers`, three of three. The intake had also said to reuse
`readPagination` if reading turned out to be in scope, which the same plan
decided it was, two paragraphs earlier.

## L-32 — Owning a rule is not the same as the rule being true

**Rule:** a check that every rule has an owning story proves only that somebody
is answerable for it. Where a rule's text carries **values** — durations,
limits, thresholds, enumerations — something must compare those values to the
code that implements them, or the two drift silently and the rule becomes
decoration. Parse the rule, import the implementation, compare. And when a rule
and the code disagree, settle it by **provenance** — which is older, which
document claims to be the source, what the implementing story's plan actually
cited — not by whichever is easier to change.

**Paid for by:** rule S-2 states the SLA targets as urgent 1h/4h, high 4h/24h,
normal 8h/72h, low 24h/168h. The seed shipped 15min/4h, 1h/8h, 4h/24h and
24h/96h — every priority different. It went unnoticed for a day and a half
while `verify-backlog` reported the rule as owned and green.

The first reading of the clause "fixed by the seed, by decision" was that the
seed was therefore authoritative. It is not: `CLAUDE.md` records that clause as
meaning there is no admin screen for the targets. The rule predates the seed by
a day, `rules.txt` calls itself the product's promises, and the seed's plan
justified its numbers as "the ones the criteria assume" — while the criteria
state no number at all. The seed had invented them.

## L-33 — Whoever writes criteria is a planner too, and needs the same source in front of them

**Rule:** acceptance criteria are steering, and steering written from intuition
carries the same authority as steering written from the requirements — that is
what makes it dangerous. Before a criteria file ships, every claim in it that
the source document can answer must be checked against that document, and the
document must be **committed in this repository** where both the person and the
planner can read it. A requirements file that exists only in another repo is,
for every practical purpose, a requirements file that does not exist (L-5's
failure class, one level up).

**Paid for by:** two findings in one deep check, both mine. `criteria/tickets.md`
said an illegal status change answers 422 — written from intuition, when the
brief's error contract routes "illegal state transition" to **409**, and
`errors.js`'s own comment already anticipated 409 for exactly this. CRM-79
would have been planned against the wrong code. And the same file hedged an
assignee criterion as "422 or 404" — a criterion that offers a choice is a
decision deferred to whoever implements it. Both were only found because the
original brief was finally read; it had been sitting in the first attempt's
repository the whole time, while `rules.txt` cited it as `docs/product-brief.md`
— a path that had never existed here. The brief is now ported, adapted only in
its structural references, and the SLA fix was re-confirmed against it: the
first attempt's own harness seeded the correct numbers, so the wrong ones were
never inherited — they were invented.

## L-34 — "No dependency on a later sprint" says nothing about order inside one

**Rule:** a check that dependencies never point at a future block is necessary
and not sufficient. Two stories in one sprint may still have an order, and file
order is not it. Before picking the next story, read which units in the block
wait on which, and pick one with nothing left ahead of it. If that information
is only derivable, derive it and print it — an ordering somebody has to notice
is an ordering somebody will eventually not notice.

**Paid for by:** the loop's own selection rule said "inside a sprint, by the
order in `scripts/backlog.txt`". `TICKETS-1-API` needs `SERVICE-LEVELS-1-API`,
both are block 3, and the tickets feature is written first in that file — so
following the rule would have built a ticket that starts service-level clocks
nothing had created. `verify-backlog` was green throughout, correctly: it
refuses a dependency on a later block and same-block dependencies are legal.
It now prints them, and the loop picks by dependency with backlog order as the
tie-break. Checked backwards over sprints 0–2 as well; every story there had in
fact been built in a legal order.

## L-35 — The first attempt is a source, and its migrations are its confessions

**Rule:** before building a feature this project has built once before, read the
old repository's schema **and its migration comments**. A migration that adds a
column later is a record of something learned the hard way, dated and explained
by somebody who had already paid for it. Read them for what to copy and, just
as carefully, for what not to: the old code also contains niceties nobody asked
for, and porting those is scope arriving disguised as precedent.

**Paid for by:** `tickets` here has no `revision` column, and BR-5 needs one for
status change, assignment and priority change — two of which are stories later
in this same sprint. The first attempt shipped without it too, used `updated_at`
as the token, and wrote its own postmortem into
`003_ticket_revision.sql`: two writes inside one millisecond share a timestamp,
so a stale write whose version happened to match was accepted, and it showed up
as "a test that passed alone and failed about one run in five". This repository
was one story away from repeating it exactly.

The same reading said what **not** to take: the old schema's human-readable
ticket `number` is not in the brief, and its stored `response_due_at` /
`resolution_due_at` contradict the derived deadlines SERVICE-LEVELS-1-API
shipped here deliberately. Precedent is evidence, not instruction.

## L-36 — A guard has a boundary, and describing it too strongly is how it gets trusted past it

**Rule:** when you write a comment claiming a guard protects something, try the
thing. The audit guard refuses a COMMIT that changed a table without recording
it — inside a transaction. It is deliberately inert **outside** one, so the seed
and the migration runner can write. So it catches "forgot the audit row"; it
does not catch "took the whole block out of the transaction", which is the
larger mistake. Counting rows cannot tell those apart either: hoisted code still
writes both rows, so the counts agree and everything is green. Only forcing a
failure **between** the two writes distinguishes atomic from merely-both.

**Paid for by:** a comment I wrote in `tickets.service.js` — "hoisting any of
this out would not simplify it, it would make the ticket disappear". It would
not: the ticket would land, unaudited and unnoticed. Found by running the
rehearsal that the comment implied would fail, and watching sixteen tests pass.
The comment now says what the guard actually does and where it stops, and a test
forces the audit write to throw and asserts the ticket, its clocks and its row
all went back together. That test reddens on the hoist; nothing else did.

**Related:** [[L-16]] is prove the guard fails. This is prove the *claim about*
the guard fails — a sentence in a comment is a claim, and an unverified one
teaches the next reader something untrue.

## L-37 — Some guards cannot be rehearsed, and saying so is the honest move

**Rule:** [[L-16]] says prove a guard fails. Sometimes it cannot be made to,
because it defends against behaviour a dependency leaves *unspecified* and which
currently happens to be benign. When that is the case: keep the guard, try the
removal anyway, and write down that the suite stayed green. What you must not
do is leave a test standing that passes either way while implying it is the
proof — a reader who trusts it will delete the guard on the strength of a test
that never watched it.

**Paid for by:** the queue's `ORDER BY created_at DESC, rowid ASC`. The
tiebreaker exists so tickets sharing a second cannot swap between pages (L-19).
Deleting it and re-running the suite passed every test, and a direct probe
confirmed why: SQLite returns equal keys in rowid order on both of the query
plans this endpoint uses, filtered and unfiltered. So the clause is currently
unobservable — and stays, because an engine's present kindness is not a
contract. The comment beside it now says the rehearsal was run and what it
showed, so nobody reads the green suite as permission.

## L-38 — A caveat in a comment does not reach the person reading the terminal

**Rule:** when a program prints something an operator will act on, the caveat
belongs in the **output**, not in a comment beside the `console.log`. A comment
reaches whoever opens that file; the person who needs it is looking at a
terminal, at a line that reads like an answer. If a value is only sometimes
meaningful, print which case you are in — or do not print it.

**Paid for by:** `npm run seed` on an already-seeded database printed
`admin password: <a fresh random string>`. The insert had done nothing —
`ON CONFLICT … DO NOTHING`, which is what makes a second run safe and is a
criterion — so the string had never been stored and did not sign anybody in.
The file said so, three lines above the print, in a comment nobody in a
terminal can see.

It cost about an hour: sign-in answered 401, and I went looking at the token,
the port and the throttle, because the seed had just told me what to type. The
seed now reports whether the admin row was actually written and prints the
password only then; otherwise it says the account already existed and nothing
was rewritten. A test pins it, and reverting the check reddens that test alone.

## L-39 — "absent" and "empty" are two answers; a plan that flattens them loses one

**Rule:** when a plan adds an optional key to a response, decide separately what
an **empty** value means and what a **missing** key means. If both can occur and
they say different things, the render condition is presence (`!== undefined`),
never truthiness or `.length > 0`. Write which is which in the code, because the
next reader will copy the nearest sibling and the nearest sibling is usually the
other rule.

**Where it came from:** CRM-79. T-7 requires an illegal status change to name
the statuses that were legal, so the plan added `allowed` to the 409 body and —
copying `ValidationError`'s `fields`, three lines above it — rendered it only
when `length > 0`. That works everywhere except the one case it exists for: a
`closed` ticket has no legal moves, so `allowed` is `[]`, so the key vanishes,
so the response becomes byte-identical to a stale-revision refusal, which is a
different failure with a different fix. The copied condition was right for
`fields`, where an empty list carries nothing, and wrong here, where an empty
list is the entire answer. Caught at plan review by noticing the plan's own test
("409 with `allowed: []`") could not pass against the plan's own middleware
rule. Three tests now fail on the flattening.

## L-40 — For a story about what already exists, run it before planning it

**Rule:** when a story's premise is "expose something the schema already has",
**exercise the existing behaviour first** — a throwaway script against an
in-memory database, driving the real HTTP layer — and put what it actually did
into the intake. Reading the schema tells you what is declared. Running it tells
you what happens, and those are different answers wherever a guarantee is split
between the database and the service.

**Where it came from:** CRM-82. The intake said the story was "mostly about
exposing what exists" and expected a small change. Twenty lines of throwaway
script found two defects that no amount of reading would have shown, because
both live in the gap between a declared constraint and the code above it:

- A category id that does not exist returned **500 INTERNAL**. The foreign key
  is declared, `PRAGMA foreign_keys = ON` is set, and SQLite refused the insert
  exactly as intended — then its own error escaped the service unhandled. The
  schema was right and the behaviour was wrong.
- A **retired** category was accepted with 201. A foreign key can see that a row
  exists; it cannot see that `deleted_at` took it off the list. The one thing
  the story's acceptance criteria forbid was the one thing the constraint could
  not enforce.

Both went into the intake as findings before the plan was generated, so the plan
was written to fix them rather than to describe the route it thought was there.
A story that had been planned from the schema alone would have shipped a list
endpoint and left both in place.

## L-41 — A plan that says it could not read the files is a draft, not a plan

**Rule:** read the plan's own generation header and preamble before acting on
it. When the planner reports a tool failure or a budget cap — squad-kit writes
this into the file — **every claim about the surroundings is a guess**, and the
plan is a draft to be checked line by line rather than a specification to
follow. Check each cited symbol, field name, file and API shape against the
code, correct the plan in place with a note saying what the code actually does,
and only then implement. Do not silently fix them while coding: the plan is a
deliverable, and a plan that still contains the wrong claim teaches the next
reader the wrong thing.

**Where it came from:** CRM-72. The plan's first line was the planner saying it
had hit a tool budget cap and would write from the intake's hints instead. Five
claims were wrong: a pagination cursor the API does not send (it is
`limit`/`offset`), a `retired` boolean the category list does not return
(retired categories are simply absent), a `description` field the API calls
`body`, a `CustomersPage.css` that does not exist (no page in the app has a
stylesheet), and a `t('key')` function that is a plain object read as
`t.customers.title`. Following any one of them would have shipped something
that does not work; the `description` one would have made the 422's
`fields: ['body']` name a field the form does not have, and marked the wrong
input.

## L-42 — A recogniser stricter than the mistake it hunts finds only near-misses

**Rule:** when a check's job is to catch malformed input, the pattern that
*finds candidates* must be **looser** than the thing it is validating, not the
same shape. Match anything that looks like the construct, then judge it. A
regex that only matches well-formed ids will report the invented ones that
happen to be well-formed and stay silent on the rest — which is the worse half,
because a wrong id that is nearly right is the one a reader would have spotted
anyway.

**Where it came from:** CRM-81's plan invented two story ids in adjacent lines:
`TICKETS-4-WEB` and `TICKETS-4B-API`. `verify-plan.mjs` reported the first and
said nothing about the second. Not because the second passed a check — because
`ID_RE` was `(SLUG)-(\d+)-(API|WEB|MOB|ALL)` and `4B` is not `\d+`, so the match
never began and no check ever ran on it. The fix is one character class:
`([A-Za-z0-9]+)`, which finds the candidate and lets the existing
`ids.has(...)` test decide. Three malformed shapes now redden it and the 42
existing plans still pass, so the looser pattern costs no false positives.

The general form of this is worth carrying: **a guard is only as good as what
it can see.** Before trusting one, feed it the defect it is supposed to catch.

## L-43 — A negation test that reads the whole line lets the text switch the check off

**Rule:** when a check skips a match because the surrounding prose negates it,
read only the text **before** the match, not the whole line. A line-wide test
hands the document a way to disable the check by accident — and the accident is
usually a word that has nothing to do with the rule.

**Where it came from:** the L-5 dialect check skipped any line whose text
matched `NEGATED`, and `NEGATED` carried a bare `NOT` with no word boundaries
under an `/i` flag. So `created_at TIMESTAMPTZ NOT NULL` — the commonest way a
Postgres column can possibly appear in a plan — switched off the check that
exists to catch it. So did any line containing "another", "nothing" or
"cannot", because each contains the letters n-o-t. The bare `NOT` was redundant
next to `\bnot\b` under `/i`; removing it and scoping the test to the text
before the token fixed both halves.

The same shape appears wherever a check asks "is this line saying not to do
it?" — L-6's repo-wide-grep check still tests the whole line, and should be
read with this in mind.
