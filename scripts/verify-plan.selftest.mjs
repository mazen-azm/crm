// Does verify-plan.mjs actually catch the defects it claims to?
//
// Nothing tested the checks themselves, and that is how a real hole survived:
// ID_RE required digits between the prefix and the layer, so an invented id
// shaped TICKETS-4B-API never matched, no check ran on it, and the script
// reported green. A guard is only as good as what it can SEE, and a guard
// nobody feeds a defect to is a guard nobody has tested (L-42).
//
// Each probe below is a plan fragment carrying one known defect, written into a
// throwaway plan file, run through verify-plan.mjs alone, and asserted to be
// reported. The last probe carries no defect and asserts silence — without it
// a check that flags everything would pass every other probe.
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
// The probe has to look like a plan or the script will not pick it up:
// planFiles matches /^\d{2,}-story-.+\.md$/ and refuses two files for one
// story. So it borrows a story that has an intake and criteria but no plan yet
// — CRM-32 — and is removed in a finally. While it exists, plan-next.sh would
// consider CRM-32 planned and skip it; the window is one process and the lock
// file makes a concurrent planner unlikely, but that is the trade being made.
const DIR = join(ROOT, '.squad/plans/platform')
const FILE = '99-story-CRM-32.md'
const PATH = join(DIR, FILE)

// A plan skeleton that passes on its own. The probes bolt one defect onto it,
// so a failure is attributable to the probe and not to the scaffolding.
const clean = (body) => `<!-- squad-kit: selftest -->

# Story 99 — Selftest (Story: CRM-32)

## Prerequisites

- The engine is SQLite via node:sqlite's DatabaseSync.

## Story Goal

A throwaway plan, written by scripts/verify-plan.selftest.mjs and deleted by it.

## Product rules (from story)

- PLATFORM-17-API is the story this stands in for.

## Implementation tasks

${body}

## Done Criteria

- [ ] Nothing. This file is deleted before the process exits.
`

const probes = [
  {
    lesson: 'L-1',
    what: 'a story id the backlog does not define',
    body: 'This depends on TICKETS-4-WEB, which does not exist.',
    expect: /cites TICKETS-4-WEB/,
  },
  {
    lesson: 'L-1',
    what: 'the same, with a non-numeric block — the shape that used to be invisible',
    body: 'This depends on TICKETS-4B-API, which does not exist.',
    expect: /cites TICKETS-4B-API/,
  },
  {
    lesson: 'L-5',
    what: "another engine's dialect",
    body: 'Add a `created_at TIMESTAMPTZ NOT NULL` column in the migration.',
    expect: /TIMESTAMPTZ/,
  },
  {
    lesson: 'L-11',
    what: 'a status outside rule E-2\'s catalogue',
    body: 'On a conflict the route answers `418 TEAPOT`.',
    expect: /418/,
  },
  {
    lesson: 'L-3',
    what: 'a file path that does not exist',
    body: 'Edit `api/src/platform/db/no-such-file.js` to add the guard.',
    expect: /no-such-file\.js/,
  },
  {
    lesson: 'L-5',
    what: 'a dialect the plan explicitly forbids — must stay silent',
    body: 'Do not use TIMESTAMPTZ here; the engine is SQLite.',
    expect: null,
  },
  {
    lesson: 'L-2',
    what: 'a plan that names its own file',
    body: 'Attach `.squad/plans/platform/99-story-CRM-32.md` to the session.',
    expect: /names its own file/,
  },
  {
    lesson: 'L-6',
    what: 'a guard proposed over the whole tree',
    body: 'Add a check that greps the whole tree for the forbidden token.',
    expect: /repo-wide grep/,
  },
  {
    lesson: 'L-6',
    what: 'the same, negated before the phrase — must stay silent',
    body: 'Scope the guard to api/src rather than the whole tree.',
    expect: null,
  },
  {
    lesson: '(control)',
    what: 'a plan with no defect at all',
    body: 'Edit `api/src/platform/db/seed.js` to walk the tickets through.',
    expect: null,
  },
]

const run = () => {
  try {
    return execFileSync('node', [join(ROOT, 'scripts/verify-plan.mjs'), FILE], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  } catch (e) {
    // A non-zero exit is the normal result for a probe: it means something was
    // reported. The output is what matters either way.
    return `${e.stdout ?? ''}${e.stderr ?? ''}`
  }
}

let failures = 0
mkdirSync(DIR, { recursive: true })
try {
  for (const probe of probes) {
    writeFileSync(PATH, clean(probe.body))
    const out = run()
    const reported = probe.expect ? probe.expect.test(out) : /all plan checks green/.test(out)
    const label = `${probe.lesson.padEnd(9)} ${probe.what}`
    if (reported) {
      console.log(`  ok    ${label}`)
    } else {
      failures += 1
      console.log(`  MISS  ${label}`)
      console.log(out.split('\n').filter((l) => l.trim()).slice(-6).map((l) => `          ${l}`).join('\n'))
    }
  }
} finally {
  if (existsSync(PATH)) rmSync(PATH)
}

console.log()
if (failures) {
  console.log(`${failures} check(s) did not see their own defect — the guard is blind there, not passing.`)
  process.exit(1)
}
console.log(`${probes.length} probes, every check saw its defect and the clean plan stayed silent.\n`)
