#!/usr/bin/env node
// Run after `squad new-story`, before `/squad-plan`:
//   node scripts/prepare-intake.mjs .squad/stories/<feature>/<KEY>/intake.md
//
// Injects the standing block every intake must carry: the lessons file, the
// authority files for ids and structure, and the no-attribution rule. The
// squad-kit intake template cannot be customised without forking the tool,
// so the block is injected here instead — idempotently.

import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const path = process.argv[2]
if (!path || !existsSync(path)) {
  console.error('usage: node scripts/prepare-intake.mjs <intake.md>')
  process.exit(1)
}

const MARK = '<!-- standing-hints -->'
const BLOCK = `${MARK}
- **Read first, before anything else:** \`.squad/plan-lessons.md\` — one rule per
  defect an earlier plan review found. A plan that repeats a listed defect is
  rejected in review.
- **Ids:** cite other stories only from \`scripts/backlog.txt\` (or the generated
  \`BACKLOG.md\`), as FULL-NAME ids with the Jira key: \`PLATFORM-13-ALL (CRM-28)\`.
  Documents under \`docs/\` may lag; the backlog is the authority.
- **Structure:** \`docs/taxonomy.md\` (names), \`docs/architecture.md\` (where code
  goes), \`docs/git.md\` (branches and commits) — cite them, do not restate them.
- **Nothing committed may mention AI assistance** — commits, docs, or ignore-file
  entries. Verification steps must include the grep that proves it.
- **The package manager is npm**, and there is no workspace root. Commands run
  from the package directory: \`cd api && npm test\`, \`cd web && npm run build\`.
  Not pnpm, not yarn, no \`--filter\`, no \`--prefix\` — three plans in a row
  reached for pnpm, so every command in their verification steps was wrong.
- **The web suite does not typecheck.** \`npm test\` is vitest; \`npm run build\` is
  \`tsc -b && vite build\`. A change only vitest has seen is not verified.`

let s = readFileSync(path, 'utf8')
if (s.includes(MARK)) { console.log('standing hints already present'); process.exit(0) }

const anchor = '## Technical hints (optional)\n'
if (!s.includes(anchor)) { console.error('intake has no Technical hints section'); process.exit(1) }
s = s.replace(anchor, anchor + '\n' + BLOCK + '\n')
writeFileSync(path, s)
console.log('standing hints injected into', path)
