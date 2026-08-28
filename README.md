# Support Desk

One repository, three roots.

## The three roots

- `api/` — the JavaScript/Node HTTP service. Empty today.
- `web/` — the React client. Empty today.
- `android/` — the Kotlin mobile client. Empty today.

Each root has its own build, its own tests, and its own package manifest.
Each grows one story at a time.

## The planning system

- `.squad/` — the intake for each story, and the plan generated from it.
- `docs/` — the rules that outlive any one story: `taxonomy.md` (what things
  are called), `architecture.md` (where code goes), `git.md` (branches, tags
  and commits), `blocks.md` (the sprint plan), `ai-usage.md`.
- `scripts/` — the backlog and the checks that read it.

## The checks

Four scripts, each answering one question about the repository rather than
about the code inside it. Every one prints how many files it read, because a
check that passes over an empty set is worse than no check at all.

```
node scripts/verify-backlog.mjs     the backlog agrees with the rules, and with itself
node scripts/verify-plan.mjs        every plan cites things that exist and names them fully
node scripts/verify-taxonomy.mjs    every feature folder has a name, and every name one meaning
node scripts/verify-docs.mjs        every path and id a document cites can be followed
```

A document that legitimately names something not built yet marks the line
`(planned)`.

## Where to start

Read, in order:

1. `docs/taxonomy.md` — what things are called.
2. `docs/architecture.md` — where code goes.
3. `docs/git.md` — how branches, tags and commits work.
