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

## Where to start

Read, in order:

1. `docs/taxonomy.md` — what things are called.
2. `docs/architecture.md` — where code goes.
3. `docs/git.md` — how branches, tags and commits work.
