# Architecture

Where code goes, and which check enforces it. Every rule here is mechanical: if it
is only written down, it holds until somebody forgets.

---

## Organise by feature, then by layer inside it

Three independent sources say the same thing, and each was checked rather than
remembered:

- **Node.js Best Practices** — business components layered entry-point → domain →
  data-access, with web objects kept out of the domain.
- **Feature-Sliced Design** — slices by domain, imports pointing one way.
- **Google's Android guidance** — a UI layer and a data layer, with an optional
  domain layer between.

The feature names come from `taxonomy.md` and nowhere else.

---

## The API

```
api/src/
├── app.js                  the composition root · every injection happens here
├── platform/               knows no feature
│   ├── db/                 migrations, connection, seed
│   ├── http/               error middleware, request id, security headers
│   └── config/             environment, read once at startup
├── shared/                 knows no feature
└── features/<slug>/
    ├── index.js            the ONLY way in from outside this folder
    ├── <slug>.routes.js    HTTP · req and res stop here
    ├── <slug>.schema.js    well-formed → 422
    ├── <slug>.service.js   allowed → 409 · validation lives here
    ├── <slug>.rules.js     the pure part · no I/O
    ├── <slug>.mapper.js    row → wire
    ├── <slug>.repository.js  SQL · nowhere else
    ├── <slug>.jobs.js      what happens unasked
    └── <slug>.test.js
```

**The database is SQLite, through `node:sqlite`** — `DatabaseSync`, shipped with
the runtime, no dependency and no native module. One file per environment, named
by `DB_PATH`; the tests open `:memory:` so the suite needs no server and no
teardown. Timestamps are ISO-8601 `TEXT`, ids are `TEXT` UUIDs generated in code
(`crypto.randomUUID()`), and case-insensitive uniqueness is `COLLATE NOCASE` —
no `TIMESTAMPTZ`, no `CITEXT`, no extensions, no other engine's dialect anywhere.
A query plan is read with `EXPLAIN QUERY PLAN`.

**A feature reaches another only through its `index.js`.** Where one needs
another's capability it is injected in `app.js` — customers is handed a way to
create an account, tickets a way to notify, identity a way to release a queue.

`platform/db/seed.js` is a **second composition root**. It builds its own services
on purpose, so every service signature change has two call sites. Never write "the
only construction site" into a plan.

---

## The web

```
web/src/
├── app/          providers, router, the auth context
├── pages/        one folder per route
├── features/     a thing a user does that spans entities
├── entities/     one folder per domain noun · model + ui + api
├── shared/       api client, i18n, ui primitives · knows no feature
└── testing/      render helpers, fixtures
```

**The build is Vite, and the application is a single-page client.** React with
the router running in the browser, TypeScript, Vitest with Testing Library, and
no server-side framework. The reason is the rule the whole project is built on:
the API is the only contract. A framework that renders on a server invites a
second data path — a server component reaching a database directly, an action
that bypasses the documented route — and the day that happens the OpenAPI check
in PLATFORM-7-API stops describing how the product actually reads its data.
Vite has no such seam to fall through: the browser talks to `/api/v1` or it has
nothing. Server rendering buys page-load speed for a public site; this is an
internal desk behind a sign-in, so it buys nothing here.

Layers import **downward only**: `app → pages → features → entities → shared`.

**Two entity slices that relate use `@x`**, not a move to `shared`. A ticket needs
a customer's name; that cross-import is declared as `entities/customer/@x/ticket`
so the dependency is visible rather than laundered through a shared folder.

**The three states are components, not a habit.** `shared/ui` exports
`EmptyState`, `ErrorState` and `Skeleton`, and a screen driven by `useRequest`
renders one of them for `loading`, for `error`, and for a `success` that came
back with nothing. The error state's sentence comes from `t.errors[code]`,
which is typed against the API's frozen code catalogue so a new code cannot
ship without a meaning. Sign-in is the one screen that deliberately does not
read that map — it answers one sentence for every way a credential can be
wrong, because the API refuses to say which.

---

## Android

```
android/app/src/main/java/.../
├── core/         network, storage, design system · knows no feature
└── feature/<slug>/
    ├── data/     repository, dto, mapper
    ├── domain/   model, use case · imports nothing from Compose
    └── ui/       screen + state holder
```

Three rules carried over from an earlier Android project and enforced here:

- **A detail screen resolves an id**, it does not receive an object.
- **Model and data code imports nothing from Compose.**
- **A screen takes plain values and no navigator.**

---

## The checks

`scripts/verify-architecture.mjs` runs on every push and enforces:

| # | Rule | Root |
|---|---|---|
| 1 | A feature reaches another only through its `index.js` | api |
| 2 | `shared` and `platform` never know a feature | api |
| 3 | `req` and `res` stop at the route | api |
| 4 | SQL lives in repositories | api |
| 5 | Layers import downward only | web |
| 6 | Sibling slices only through `@x/<consumer>` | web |
| 7 | `core` knows no feature; features do not reach into each other | android |
| 8 | Model and data code imports nothing from Compose | android |
| 9 | A screen takes plain values and no navigator | android |
| 10 | Package scripts name files that exist | all |
| 11 | A variable `.env.example` declares is loaded by something | api |

**Every check prints the number of files it read.** A check that passes over an
empty set is worse than no check — one previously walked `.js` files in a
TypeScript project and reported `ok` for two blocks.

`scripts/verify-taxonomy.mjs` enforces that every feature folder in all three
roots appears in `taxonomy.md`, and every slug in `taxonomy.md` that owns code has
its folder. `scripts/verify-docs.mjs` refuses a path cited in any document that
does not exist.

Both are block-0 deliverables. They are written **before** the first feature, not
after nine violations have accumulated.

### Which check owns which rule

Written down because guessing wrong is easy and expensive: eight story intakes
once said `verify-i18n-parity.mjs` refuses a key present in one resource file
and missing from the other. It does not — it checks which roots carry resource
files at all, and says so in its own header. The comparison is a vitest suite.
A hint naming the wrong tool sends a reader to run something that can never
fail.

| Rule | Enforced by |
|---|---|
| Feature boundaries, layering, SQL placement | `scripts/verify-architecture.mjs` |
| Folder names match `taxonomy.md` | `scripts/verify-taxonomy.mjs` |
| A path cited in a document exists | `scripts/verify-docs.mjs` |
| A rule in `rules.txt` has an owning story | `scripts/verify-backlog.mjs` |
| The SLA table and the seed agree | `scripts/verify-backlog.mjs` |
| A criteria section names a real story | `scripts/verify-plan.mjs` |
| A plan's citations, ids, statuses and dialect | `scripts/verify-plan.mjs` |
| Those plan checks can see their own defects | `scripts/verify-plan.selftest.mjs` |
| Which roots carry resource files | `scripts/verify-i18n-parity.mjs` |
| **Both resource files hold the same keys** | `web/src/shared/i18n/parity.test.ts` |
| No string is written in a component | `web/src/pages/no-hardcoded-strings.test.ts` |
| Every served route is documented, and the reverse | the OpenAPI contract test |
| Every mutating route writes exactly one audit row | `api/src/features/audit/audit.guarantee.test.js` |
| No file in any code root mentions AI assistance | `api/src/platform/http/no-ai-attribution.test.js` |

Before adding a row, **break the rule and watch that check fail.** Four guards
were found blind that way in one afternoon, including one that read a single
root of three and reported green over the other two.
