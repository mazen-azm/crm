# Support Desk

One repository, three roots.

## The three roots

- `api/` — the Node + Express service over SQLite. Signing in, accounts,
  customers, tickets, audit and service levels. 206 tests.
- `web/` — the React client, built with Vite. The desk shell, sign-in, the
  customer search, two languages and both writing directions. 100 tests.
- `android/` — the Kotlin mobile client. Not started; it is a whole sprint of
  its own, later.

Each root has its own build, its own tests, and its own package manifest.
Each grows one story at a time.

## The planning system

- `.squad/` — the intake for each story, and the plan generated from it.
- `docs/` — the rules that outlive any one story: `taxonomy.md` (what things
  are called), `architecture.md` (where code goes), `git.md` (branches, tags
  and commits), `blocks.md` (the sprint plan), `ai-usage.md`.
- `scripts/` — the backlog and the checks that read it.

## Running it

The API does **not** migrate itself on boot — a service that changes the schema
while starting is a service that can change it while you are not looking. So
migrating is a step you take:

```
cd api
npm ci
npm run migrate     # safe to run twice; it skips what is already applied
npm run seed        # prints the admin password it set, once
npm start           # http://localhost:3000/api/v1/health
```

```
cd web
npm ci
npm run dev
```

Two things worth knowing before they cost you an afternoon:

- **Run `npm run migrate` after pulling.** The server will start against a
  database missing a column and fail on the first request that needs it, saying
  only `no such column`.
- **`npm run seed` does not update rows that already exist** — it inserts what
  is missing and leaves the rest, which is what makes it safe to run twice. If a
  seeded *value* changed, delete `api/data/` and build again; re-seeding will
  not correct it.

## The checks

Six scripts, each answering one question about the repository rather than
about the code inside it. Every one prints how many files it read, because a
check that passes over an empty set is worse than no check at all.

```
node scripts/verify-backlog.mjs       the backlog agrees with the rules, and with itself
node scripts/verify-plan.mjs          every plan cites things that exist and names them fully
node scripts/verify-taxonomy.mjs      every feature folder has a name, and every name one meaning
node scripts/verify-docs.mjs          every path and id a document cites can be followed
node scripts/verify-architecture.mjs  the structure rules, in every root
node scripts/verify-i18n-parity.mjs   which roots carry resource files, and whether they agree
```

They run on every push, alongside both suites and the web build. A rule that
reads nothing reports itself as *not in force* rather than as passing.

A document that legitimately names something not built yet marks the line
`(planned)`.

## Where to start

Read, in order:

1. `docs/product-brief.md` — what the product promises. Every rule in
   `scripts/rules.txt` derives from it.
2. `docs/taxonomy.md` — what things are called.
3. `docs/architecture.md` — where code goes.
4. `docs/git.md` — how branches, tags and commits work.
