#!/usr/bin/env node
// Fill an intake's three hand-written sections from files on disk:
//   node scripts/fill-intake.mjs <intake.md> <criteria.txt> <hints.md> <out-of-scope.md>
//
// GATE 1 is a person writing these three; this only puts them where the
// planner reads them, so the writing is never lost to a mis-paste.
import { readFileSync, writeFileSync } from 'node:fs'

const [intake, criteria, hints, scope] = process.argv.slice(2)
if (!intake || !criteria || !hints || !scope) {
  console.error('usage: node scripts/fill-intake.mjs <intake.md> <criteria.txt> <hints.md> <out-of-scope.md>')
  process.exit(1)
}

let s = readFileSync(intake, 'utf8')

// The blank fenced block under "## Acceptance criteria" — the only empty fence
// in a fresh intake that follows that heading.
const acHead = '## Acceptance criteria\n'
const i = s.indexOf(acHead)
if (i < 0) { console.error('no acceptance criteria heading'); process.exit(1) }
const open = s.indexOf('```', i)
const close = s.indexOf('```', open + 3)
if (open < 0 || close < 0) { console.error('no fence under acceptance criteria'); process.exit(1) }
s = s.slice(0, open + 4) + readFileSync(criteria, 'utf8').trimEnd() + '\n' + s.slice(close)

// The hints go after the standing block's last line, replacing the tool's
// own placeholder sentence.
// Everything between the tool's own placeholder line and the out-of-scope
// heading is this story's hints, so a second run REPLACES them rather than
// appending a second copy. Run once and it fills; run again after correcting
// the hints and it corrects. Appending produced an intake carrying both the
// wrong hint and its replacement, which is worse than either.
const placeholder = '- APIs, screens, services already discussed. Repos/roots: `api, web, android`. Primary language: `JavaScript`.\n'
const scopeHead = '## Out of scope\n'
const p = s.indexOf(placeholder)
const j = s.indexOf(scopeHead)
if (p < 0) { console.error('no technical-hints placeholder'); process.exit(1) }
if (j < 0 || j < p) { console.error('no out-of-scope heading after the hints'); process.exit(1) }
s = s.slice(0, p + placeholder.length)
  + '\n' + readFileSync(hints, 'utf8').trimEnd() + '\n\n'
  + scopeHead + '\n' + readFileSync(scope, 'utf8').trimEnd() + '\n'

writeFileSync(intake, s)
console.log('filled', intake)
